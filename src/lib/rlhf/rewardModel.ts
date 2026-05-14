/**
 * RLHF reward model.
 *
 *   R(topic) = Σ weight_s · clamp_s(aggregate(events_s))
 *
 * Pipeline per source:
 *   1. Filter events for this topic + source.
 *   2. Sort by timestamp desc, take latest K=8.
 *   3. Aggregate with exponential recency decay (RECENCY_DECAY) and
 *      per-event confidence: `Σ(decay^i × confidence × rating) / Σ(decay^i × confidence)`.
 *   4. Clamp into SOURCE_CLAMP for that source.
 *   5. Apply weight (possibly shifted by exam proximity).
 *
 * Exam-proximity shift:
 *   < 14 days  → teacher +0.10, peer −0.05, self −0.05
 *   < 30 days  → teacher +0.05, peer −0.025, self −0.025
 *   otherwise base weights.
 *
 * Contradiction detection:
 *   Compares system reward vs. average of teacher+parent+self+peer over
 *   the last `CONTRADICTION_WINDOW` topics. Sets `contradiction = true`
 *   when |Δ| > CONTRADICTION_THRESHOLD — the reranker uses this to
 *   suppress correction (don't trust noisy signal).
 */

import type {
  FeedbackEvent,
  FeedbackSource,
  PerSourceReward,
  RewardBreakdown,
} from '../../types/rlhf'
import {
  CONTRADICTION_THRESHOLD,
  RECENCY_DECAY,
  SOURCE_BASE_WEIGHTS,
  SOURCE_CLAMP,
} from '../../types/rlhf'

const ALL_SOURCES: FeedbackSource[] = ['system', 'teacher', 'parent', 'self', 'peer']

const RECENT_K = 8

// ---------------------------------------------------------------------------
// Weights — exam-proximity adjustment
// ---------------------------------------------------------------------------

export function adjustedWeights(daysToExam: number | null): Record<FeedbackSource, number> {
  if (daysToExam === null) return { ...SOURCE_BASE_WEIGHTS }
  if (daysToExam < 14) {
    return {
      system: 0.35,
      teacher: 0.35,
      parent: 0.15,
      self: 0.10,
      peer: 0.05,
    }
  }
  if (daysToExam < 30) {
    return {
      system: 0.35,
      teacher: 0.30,
      parent: 0.15,
      self: 0.125,
      peer: 0.075,
    }
  }
  return { ...SOURCE_BASE_WEIGHTS }
}

// ---------------------------------------------------------------------------
// Recency-weighted aggregation per source
// ---------------------------------------------------------------------------

function aggregateEvents(events: FeedbackEvent[]): { raw: number; count: number } {
  if (events.length === 0) return { raw: 0, count: 0 }
  // Sort newest first.
  const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const window = sorted.slice(0, RECENT_K)
  let num = 0
  let den = 0
  for (let i = 0; i < window.length; i++) {
    const decay = Math.pow(RECENCY_DECAY, i)
    const w = decay * Math.max(0, Math.min(1, window[i].confidence))
    num += w * window[i].rating
    den += w
  }
  const raw = den > 0 ? num / den : 0
  return { raw, count: window.length }
}

function clampRange(value: number, source: FeedbackSource): number {
  const [lo, hi] = SOURCE_CLAMP[source]
  return Math.max(lo, Math.min(hi, value))
}

// ---------------------------------------------------------------------------
// Public — compute breakdown for a single topic
// ---------------------------------------------------------------------------

export function computeRewardForTopic(args: {
  topicId: string
  events: FeedbackEvent[]
  daysToExam: number | null
}): RewardBreakdown {
  const weights = adjustedWeights(args.daysToExam)
  const perSource: PerSourceReward[] = []

  for (const source of ALL_SOURCES) {
    const subset = args.events.filter(
      (e) =>
        e.source === source &&
        (e.topicId === args.topicId || e.topicId === undefined && source === 'parent'),
    )
    const { raw, count } = aggregateEvents(subset)
    const clamped = clampRange(raw, source)
    const weight = weights[source]
    perSource.push({
      source,
      raw,
      clamped,
      weight,
      contribution: weight * clamped,
      eventCount: count,
    })
  }

  const totalReward = perSource.reduce((s, p) => s + p.contribution, 0)
  const contradiction = detectContradiction(perSource)

  return {
    topicId: args.topicId,
    totalReward,
    perSource,
    contradiction,
    daysToExam: args.daysToExam,
    builtAt: new Date().toISOString(),
  }
}

function detectContradiction(perSource: PerSourceReward[]): boolean {
  const system = perSource.find((p) => p.source === 'system')
  if (!system || system.eventCount === 0) return false
  const human = perSource.filter((p) => p.source !== 'system' && p.eventCount > 0)
  if (human.length === 0) return false
  const humanAvg =
    human.reduce((s, p) => s + p.clamped, 0) / human.length
  return Math.abs(system.clamped - humanAvg) > CONTRADICTION_THRESHOLD
}

// ---------------------------------------------------------------------------
// Helpers — system feedback generation from session metrics
// ---------------------------------------------------------------------------

/**
 * Derive a system rating in [-1,+1] from a finished session:
 *   accuracy 0..1, masteryDelta -1..+1.
 *   rating  = 0.6 · (accuracy − 0.5)·2 + 0.4 · sign(Δ) · sqrt(|Δ|·2)
 * Clipped to [-1, 1]. Confidence proportional to question count.
 */
export function systemRatingFromSession(args: {
  accuracy: number
  masteryDelta: number
  questionCount: number
}): { rating: number; confidence: number } {
  const accComp = (args.accuracy - 0.5) * 2
  const deltaSign = args.masteryDelta >= 0 ? 1 : -1
  const deltaComp = deltaSign * Math.sqrt(Math.min(1, Math.abs(args.masteryDelta) * 2))
  const rating = Math.max(-1, Math.min(1, 0.6 * accComp + 0.4 * deltaComp))
  const confidence = Math.max(0.3, Math.min(1, args.questionCount / 10))
  return { rating, confidence }
}

/**
 * Compute days between today and an ISO deadline.
 */
export function daysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null
  const dl = Date.parse(deadline)
  if (!Number.isFinite(dl)) return null
  return Math.max(0, (dl - Date.now()) / 86_400_000)
}

// ---------------------------------------------------------------------------
// Roll-up summary for the audit page
// ---------------------------------------------------------------------------

export interface FeedbackRollup {
  source: FeedbackSource
  count: number
  meanRating: number
  meanConfidence: number
  latest: FeedbackEvent | null
}

export function rollupBySource(events: FeedbackEvent[]): FeedbackRollup[] {
  const out: FeedbackRollup[] = []
  for (const source of ALL_SOURCES) {
    const subset = events.filter((e) => e.source === source)
    if (subset.length === 0) {
      out.push({ source, count: 0, meanRating: 0, meanConfidence: 0, latest: null })
      continue
    }
    const sumR = subset.reduce((s, e) => s + e.rating, 0)
    const sumC = subset.reduce((s, e) => s + e.confidence, 0)
    const latest = [...subset].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
    out.push({
      source,
      count: subset.length,
      meanRating: sumR / subset.length,
      meanConfidence: sumC / subset.length,
      latest,
    })
  }
  return out
}
