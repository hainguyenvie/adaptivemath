/**
 * Adaptive Engine — real-time difficulty + content adjustment during practice.
 *
 * Runs synchronously after each student response. Tracks three signal groups:
 *
 * 1. **Performance** — accuracy, streak, BKT p(L)
 * 2. **Engagement** — response time ratio, skip rate
 * 3. **Behavioral** — frustration / boredom / flow detection
 *
 * Outputs:
 *   - `targetDifficulty`: IRT b-value offset for the next question
 *   - `state`: 'frustration' | 'boredom' | 'flow' | 'normal'
 *   - `suggestion`: UI message for the student (optional)
 *
 * Design: pure functions, no side effects. The PracticeRunner passes in the
 * running session metrics; this module returns the next difficulty target
 * and any behavioral signals. The Runner then uses the target to filter
 * the question pool before picking the next item.
 */

import type { Question } from '../types/question'
import { timeLimitForItem } from './cat'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Accumulated metrics from the running practice session. */
export interface SessionMetrics {
  /** Total responses so far. */
  totalResponses: number
  /** Correct responses (score >= 0.75). */
  correctCount: number
  /** Current consecutive-correct streak. */
  streak: number
  /** Current consecutive-wrong streak. */
  wrongStreak: number
  /** Response time ratios (duration / timeLimit) for the last 5 responses. */
  recentTimeRatios: number[]
  /** Scores for the last 5 responses (0..1). */
  recentScores: number[]
  /** Number of questions skipped (timeout or explicit skip). */
  skipCount: number
  /** Number of times student revisited theory sidebar. */
  theoryRevisitCount: number
}

export type StudentState = 'normal' | 'frustration' | 'boredom' | 'flow'

export interface AdaptiveDecision {
  /** Detected behavioral state of the student. */
  state: StudentState
  /**
   * Target IRT difficulty (b-value) for the next question. The Runner
   * filters the pool to pick the question whose b is closest to this target.
   */
  targetDifficulty: number
  /** ZPD offset applied (for debug panel display). */
  offset: number
  /** Optional message to show the student. */
  suggestion: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ZPD_OFFSETS: Record<StudentState, number> = {
  normal: 0.3,
  frustration: -0.5,
  boredom: 0.8,
  flow: 0.4,
}

const FRUSTRATION_THRESHOLD = {
  wrongStreak: 3,
  skipRate: 0.3,
  accuracy: 0.3,
  timeRatioIncrease: 0.3, // avg time ratio > 70% = struggling
}

const BOREDOM_THRESHOLD = {
  streak: 5,
  accuracy: 0.85,
  timeRatioFast: 0.25, // avg time < 25% of limit = too easy
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the next adaptive decision based on the running session metrics.
 *
 * Called after each response. The returned `targetDifficulty` tells the
 * Runner what IRT b-value to aim for when picking the next question.
 *
 * @param metrics   Running session metrics (updated by the Runner).
 * @param theta     Current IRT θ estimate (from BKT or diagnostic).
 */
export function computeAdaptiveDecision(
  metrics: SessionMetrics,
  theta: number,
): AdaptiveDecision {
  const state = detectState(metrics)
  let offset = ZPD_OFFSETS[state]

  // Streak adjustments (on top of state-based offset).
  if (metrics.streak >= 5) offset += 0.2 // Push harder after 5 consecutive correct.
  if (metrics.wrongStreak >= 3) offset -= 0.3 // Pull back after 3 consecutive wrong.

  // Clamp the target to a reasonable range.
  const targetDifficulty = Math.max(-3, Math.min(3, theta + offset))

  // Generate student-facing suggestion.
  const suggestion = buildSuggestion(state, metrics)

  return {
    state,
    targetDifficulty,
    offset,
    suggestion,
  }
}

/**
 * Create an empty metrics accumulator for a new session.
 */
export function emptySessionMetrics(): SessionMetrics {
  return {
    totalResponses: 0,
    correctCount: 0,
    streak: 0,
    wrongStreak: 0,
    recentTimeRatios: [],
    recentScores: [],
    skipCount: 0,
    theoryRevisitCount: 0,
  }
}

/**
 * Update metrics after a response. Returns a new metrics object (immutable).
 */
export function updateMetrics(
  prev: SessionMetrics,
  question: Question,
  score: number,
  durationMs: number,
  skipped: boolean,
): SessionMetrics {
  const correct = score >= 0.75
  const timeLimitMs = timeLimitForItem(question) * 1000
  const timeRatio = timeLimitMs > 0 ? durationMs / timeLimitMs : 0.5

  return {
    totalResponses: prev.totalResponses + 1,
    correctCount: prev.correctCount + (correct ? 1 : 0),
    streak: correct ? prev.streak + 1 : 0,
    wrongStreak: correct ? 0 : prev.wrongStreak + 1,
    recentTimeRatios: [...prev.recentTimeRatios, timeRatio].slice(-5),
    recentScores: [...prev.recentScores, score].slice(-5),
    skipCount: prev.skipCount + (skipped ? 1 : 0),
    theoryRevisitCount: prev.theoryRevisitCount,
  }
}

/**
 * Given the adaptive decision's target difficulty, pick the best-matching
 * question from the pool. Returns the question whose IRT b-value is closest
 * to the target, preferring unseen questions.
 */
export function pickQuestionByDifficulty(
  pool: Question[],
  targetB: number,
  shownIds: Set<string>,
): Question | null {
  const unseen = pool.filter((q) => !shownIds.has(q.id))
  const candidates = unseen.length > 0 ? unseen : pool
  if (candidates.length === 0) return null

  // Sort by distance to target b, pick closest.
  const sorted = [...candidates].sort(
    (a, b) => Math.abs(a.irt.b - targetB) - Math.abs(b.irt.b - targetB),
  )
  return sorted[0]
}

// ---------------------------------------------------------------------------
// Behavioral state detection
// ---------------------------------------------------------------------------

function detectState(metrics: SessionMetrics): StudentState {
  if (metrics.totalResponses < 3) return 'normal' // Not enough data yet.

  const accuracy =
    metrics.totalResponses > 0
      ? metrics.correctCount / metrics.totalResponses
      : 0
  const avgTimeRatio = mean(metrics.recentTimeRatios)
  const skipRate =
    metrics.totalResponses > 0
      ? metrics.skipCount / metrics.totalResponses
      : 0

  // --- Frustration: accuracy dropping + slow + skipping ---
  if (
    metrics.wrongStreak >= FRUSTRATION_THRESHOLD.wrongStreak ||
    (accuracy < FRUSTRATION_THRESHOLD.accuracy && avgTimeRatio > 0.7) ||
    skipRate > FRUSTRATION_THRESHOLD.skipRate
  ) {
    return 'frustration'
  }

  // --- Boredom: very fast + very accurate ---
  if (
    metrics.streak >= BOREDOM_THRESHOLD.streak &&
    accuracy >= BOREDOM_THRESHOLD.accuracy &&
    avgTimeRatio < BOREDOM_THRESHOLD.timeRatioFast
  ) {
    return 'boredom'
  }

  // --- Flow: stable timing + good accuracy (70-90%) ---
  if (
    accuracy >= 0.6 &&
    accuracy <= 0.9 &&
    avgTimeRatio >= 0.3 &&
    avgTimeRatio <= 0.7 &&
    skipRate < 0.1
  ) {
    return 'flow'
  }

  return 'normal'
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

function buildSuggestion(
  state: StudentState,
  metrics: SessionMetrics,
): string | null {
  if (state === 'frustration' && metrics.wrongStreak >= 3) {
    return 'Có vẻ phần này hơi khó. Mình sẽ chuyển sang câu dễ hơn nhé!'
  }
  if (state === 'boredom' && metrics.streak >= 5) {
    return 'Tuyệt vời! Bạn đang rất giỏi. Thử thách khó hơn nhé? 🚀'
  }
  if (state === 'flow') {
    return null // Don't interrupt flow state.
  }
  if (metrics.streak >= 10) {
    return 'Chuỗi 10 câu đúng liên tiếp! Xuất sắc! 🔥'
  }
  return null
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}
