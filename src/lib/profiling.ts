/**
 * Phase 3 — Knowledge profiling pipeline.
 *
 * Given a finished CAT session plus the student's profile and the full
 * question pool, this module produces a `KnowledgeProfile` blob that the
 * `/profile` page renders. Every helper is a pure function so the logic is
 * easy to unit-test and to re-run offline in the Monte Carlo simulator.
 *
 *   session  ─┐
 *   profile  ─┤── buildKnowledgeProfile ──► KnowledgeProfile
 *   pool     ─┤                           (topics, chapters, gaps, signals, stats)
 *   topics   ─┘
 *
 * Numerical model (per topic `t`):
 *
 *   attempts   = #responses whose question belongs to topic t
 *   observed   = Σ score / attempts                   (or null if 0 attempts)
 *   expected   = mean(P(θ, q.irt) for q in pool if q.topicId == t)
 *   confidence = min(1, attempts / 5)
 *   mastery    = confidence·observed + (1−confidence)·expected
 *
 * When `attempts === 0` the formula degenerates to pure `expected`, so a
 * topic the student never saw still gets a calibrated estimate from the
 * student's overall θ.
 */

import type { Question, SessionState } from '../types/question'
import type { Topic } from '../data/topics'
import type { UserProfile } from '../types/user'
import { probabilityCorrect } from './irt'
import { timeLimitForItem } from './cat'
import {
  MASTERY_BANDS,
  TARGET_BY_GOAL,
  type ChapterMastery,
  type ErrorSignals,
  type GapInfo,
  type KnowledgeProfile,
  type MasteryBand,
  type TopicMastery,
} from '../types/profile'

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function buildKnowledgeProfile(
  session: SessionState,
  profile: UserProfile,
  pool: Question[],
  topics: ReadonlyArray<Topic>,
): KnowledgeProfile {
  // 1. Bucket pool + responses by topic for O(1) per-topic lookup later.
  const poolByTopic = bucketBy(pool, (q) => q.topicId)
  const poolById = new Map<string, Question>(pool.map((q) => [q.id, q]))

  const respByTopic = new Map<string, ResponseWithQuestion[]>()
  let orphanResponses = 0
  for (const r of session.responses) {
    const q = poolById.get(r.questionId)
    if (!q) {
      orphanResponses++
      continue
    }
    const bucket = respByTopic.get(q.topicId) ?? []
    bucket.push({ response: r, question: q })
    respByTopic.set(q.topicId, bucket)
  }

  // 2. Per-topic mastery for every topic in the student's grade.
  const gradeTopics = topics.filter((t) => t.grade === profile.grade)
  const topicMasteries: TopicMastery[] = gradeTopics.map((topic) =>
    computeTopicMastery(
      topic,
      poolByTopic.get(topic.id) ?? [],
      respByTopic.get(topic.id) ?? [],
      session.theta,
    ),
  )

  // 3. Chapter rollup.
  const chapters = computeChapterMastery(topicMasteries)

  // 4. Gap analysis.
  const target = TARGET_BY_GOAL[profile.goal]
  const weakSet = new Set(profile.weakTopicIds)
  const gaps = computeGaps(topicMasteries, target, weakSet)

  // 5. Error patterns + speed profile.
  const signals = detectSignals(session, poolById)

  // 6. Global stats.
  const answered = session.responses.filter((r) => r.answered)
  const totalCorrect = answered.filter((r) => r.score >= 0.75).length
  const avgDurationMs =
    answered.length > 0
      ? answered.reduce((a, r) => a + durationOf(r), 0) / answered.length
      : 0

  return {
    builtAt: new Date().toISOString(),
    grade: profile.grade,
    theta: session.theta,
    standardError: session.standardError,
    isPreliminary: isPreliminary(session),
    target,
    topics: topicMasteries,
    chapters,
    gaps,
    signals,
    stats: {
      totalAnswered: answered.length,
      totalCorrect,
      avgDurationMs,
      orphanResponses,
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers — exported so tests and the debug panel can reach them
// ---------------------------------------------------------------------------

interface ResponseWithQuestion {
  response: SessionState['responses'][number]
  question: Question
}

/** Classify a 0..1 mastery value into one of the 5 bands. */
export function classifyBand(mastery: number): MasteryBand {
  for (const band of MASTERY_BANDS) {
    if (mastery >= band.min && mastery < band.max) return band.id
  }
  // Defensive clamp.
  return mastery >= 1 ? 'thanh-thao' : 'chua-biet'
}

/**
 * Compute mastery for a single topic. Purely functional — the caller has
 * already sliced the pool and responses down to this topic.
 */
export function computeTopicMastery(
  topic: Topic,
  poolForTopic: Question[],
  responsesForTopic: ResponseWithQuestion[],
  theta: number,
): TopicMastery {
  const attempts = responsesForTopic.length
  const correctWeighted = responsesForTopic.reduce(
    (acc, r) => acc + r.response.score,
    0,
  )
  const observed = attempts > 0 ? correctWeighted / attempts : null

  // Expected = mean P(θ, item) across every pool item in this topic.
  const expected =
    poolForTopic.length > 0
      ? poolForTopic.reduce((acc, q) => acc + probabilityCorrect(theta, q.irt), 0) /
        poolForTopic.length
      : // Neutral fallback so empty-slice topics still get a sensible prior.
        probabilityCorrect(theta, { a: 1.2, b: 0, c: 0.25 })

  const confidence = Math.min(1, attempts / 5)
  const mastery =
    observed === null
      ? expected
      : confidence * observed + (1 - confidence) * expected

  // Per-level breakdown — seed all 5 keys so downstream code can iterate.
  const levelBreakdown: TopicMastery['levelBreakdown'] = {
    N: { attempts: 0, correct: 0 },
    H: { attempts: 0, correct: 0 },
    V: { attempts: 0, correct: 0 },
    T: { attempts: 0, correct: 0 },
    unknown: { attempts: 0, correct: 0 },
  } as unknown as TopicMastery['levelBreakdown']
  // Scores are accumulated as correct (sum) then divided by attempts → avgScore.
  const scoreSum: Record<string, number> = {}
  for (const { response, question } of responsesForTopic) {
    const bucket = levelBreakdown[question.level]
    bucket.attempts += 1
    scoreSum[question.level] = (scoreSum[question.level] ?? 0) + response.score
  }
  for (const key of Object.keys(levelBreakdown) as Array<
    keyof typeof levelBreakdown
  >) {
    const b = levelBreakdown[key]
    b.avgScore = b.attempts > 0 ? (scoreSum[key] ?? 0) / b.attempts : 0
  }

  // Mean answered duration.
  const durations = responsesForTopic
    .filter((r) => r.response.answered && r.response.endedAt !== null)
    .map((r) => durationOf(r.response))
  const avgDurationMs =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null

  return {
    topicId: topic.id,
    title: topic.title,
    chapterTitle: topic.chapterTitle,
    grade: topic.grade,
    attempts,
    correctWeighted,
    observed,
    expected,
    confidence,
    mastery,
    band: classifyBand(mastery),
    tested: attempts > 0,
    levelBreakdown,
    avgDurationMs,
  }
}

/**
 * Group topic masteries by chapter and compute a weighted mean where each
 * topic contributes `(attempts + 1)` — so tested topics dominate but zero-
 * attempt topics still pull the chapter toward the student's θ-expected
 * level instead of being ignored.
 */
export function computeChapterMastery(
  topicMasteries: TopicMastery[],
): ChapterMastery[] {
  const byChapter = new Map<
    string,
    { weightedSum: number; weight: number; count: number; tested: number }
  >()
  for (const t of topicMasteries) {
    const w = t.attempts + 1
    const bucket = byChapter.get(t.chapterTitle) ?? {
      weightedSum: 0,
      weight: 0,
      count: 0,
      tested: 0,
    }
    bucket.weightedSum += t.mastery * w
    bucket.weight += w
    bucket.count += 1
    if (t.tested) bucket.tested += 1
    byChapter.set(t.chapterTitle, bucket)
  }
  return Array.from(byChapter.entries()).map(([chapterTitle, v]) => ({
    chapterTitle,
    mastery: v.weight > 0 ? v.weightedSum / v.weight : 0,
    topicCount: v.count,
    testedCount: v.tested,
  }))
}

/**
 * Gap analysis — pick topics below target by a meaningful margin, sorted
 * by `gap × weakBonus` desc. Cap at 8 so the UI stays scannable.
 */
export function computeGaps(
  topicMasteries: TopicMastery[],
  target: number,
  weakSet: Set<string>,
): GapInfo[] {
  const GAP_CUTOFF = 0.15
  const rows: GapInfo[] = []
  for (const t of topicMasteries) {
    const gap = Math.max(0, target - t.mastery)
    if (gap <= GAP_CUTOFF) continue
    const weakBonus = weakSet.has(t.topicId) ? 1.25 : 1.0
    rows.push({
      topicId: t.topicId,
      title: t.title,
      mastery: t.mastery,
      target,
      gap,
      weakBonus,
      priority: gap * weakBonus,
    })
  }
  rows.sort((a, b) => b.priority - a.priority)
  return rows.slice(0, 8)
}

/**
 * Detect inferable error patterns + speed profile + engagement. Everything
 * runs on timing and level metadata — there is no attempt at deep semantic
 * error classification (that would need solution-step analysis we don't have).
 */
export function detectSignals(
  session: SessionState,
  poolById: Map<string, Question>,
): ErrorSignals {
  const carelessExamples: string[] = []
  const conceptExamples: string[] = []

  // Per-topic buckets for the application-weak pattern.
  const perTopic = new Map<
    string,
    {
      nhAttempts: number
      nhCorrect: number
      vtAttempts: number
      vtCorrect: number
    }
  >()

  let durationRatioSum = 0
  let durationRatioN = 0

  for (const r of session.responses) {
    const q = poolById.get(r.questionId)
    if (!q) continue

    const duration = durationOf(r)
    const limitSec = timeLimitForItem(q)
    const ratio = duration / (limitSec * 1000)

    if (r.answered) {
      durationRatioSum += ratio
      durationRatioN += 1
    }

    // --- Careless: wrong + very fast ---
    if (r.answered && r.score < 0.5 && ratio < 0.3) {
      carelessExamples.push(q.id)
    }

    // --- Concept gap: wrong on N-level ---
    if (r.answered && r.score < 0.5 && q.level === 'N') {
      conceptExamples.push(q.id)
    }

    // --- Application weak: accumulate N/H vs V/T per topic ---
    const bucket = perTopic.get(q.topicId) ?? {
      nhAttempts: 0,
      nhCorrect: 0,
      vtAttempts: 0,
      vtCorrect: 0,
    }
    if (q.level === 'N' || q.level === 'H') {
      bucket.nhAttempts += 1
      if (r.score >= 0.75) bucket.nhCorrect += 1
    } else if (q.level === 'V' || q.level === 'T') {
      bucket.vtAttempts += 1
      if (r.score >= 0.75) bucket.vtCorrect += 1
    }
    perTopic.set(q.topicId, bucket)
  }

  const applicationWeakTopics: string[] = []
  for (const [topicId, b] of perTopic) {
    if (b.nhAttempts === 0 || b.vtAttempts === 0) continue
    const nh = b.nhCorrect / b.nhAttempts
    const vt = b.vtCorrect / b.vtAttempts
    if (nh >= 0.6 && vt <= 0.3) applicationWeakTopics.push(topicId)
  }

  const avgRatio = durationRatioN > 0 ? durationRatioSum / durationRatioN : 0
  const speedKind: ErrorSignals['speedProfile']['kind'] =
    avgRatio < 0.4 ? 'fast' : avgRatio > 0.75 ? 'slow' : 'medium'

  const answeredCount = session.responses.filter((r) => r.answered).length
  const skippedCount = session.responses.length - answeredCount
  const answeredRate =
    session.responses.length > 0
      ? answeredCount / session.responses.length
      : 1

  return {
    careless: { count: carelessExamples.length, examples: carelessExamples },
    conceptGap: {
      count: conceptExamples.length,
      examples: conceptExamples,
    },
    applicationWeak: { topicIds: applicationWeakTopics },
    speedProfile: { kind: speedKind, avgRatio },
    engagement: { answeredRate, skippedCount },
  }
}

/**
 * A session is "preliminary" when the estimate isn't trustworthy yet —
 * either SE is still wide, the student answered very few items, or they
 * cancelled mid-session. The UI uses this to show a banner and render the
 * radar polygon with a dashed stroke.
 */
export function isPreliminary(session: SessionState): boolean {
  if (session.stopReason === 'user-cancelled') return true
  if (session.responses.length < 10) return true
  if (Number.isFinite(session.standardError) && session.standardError > 0.45) {
    return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Tiny utilities
// ---------------------------------------------------------------------------

function bucketBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const bucket = map.get(k) ?? []
    bucket.push(item)
    map.set(k, bucket)
  }
  return map
}

function durationOf(r: SessionState['responses'][number]): number {
  if (r.endedAt === null) return 0
  return Math.max(0, r.endedAt - r.startedAt)
}
