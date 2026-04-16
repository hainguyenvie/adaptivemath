/**
 * Bayesian Knowledge Tracing (BKT) — per-topic mastery estimation.
 *
 * BKT models the student's knowledge of a skill as a hidden Markov model
 * with two states (learned / not-learned) and updates the probability of
 * being in the "learned" state after each practice response.
 *
 * Four parameters per skill:
 *   p(L)  — prior probability of mastery (init from diagnostic)
 *   p(T)  — transition probability: chance of learning per opportunity
 *   p(G)  — guess probability: correct answer without mastery
 *   p(S)  — slip probability: wrong answer despite mastery
 *
 * All functions are pure — they take BktState in, return BktState out.
 */

import type { BktState } from '../types/learner'

/** Default BKT parameters for new topics. */
export const BKT_DEFAULTS = {
  pT: 0.15, // Conservative learning rate.
  pG: 0.25, // 4-option MCQ baseline.
  pS: 0.10, // Small slip rate.
} as const

/** Mastery threshold: p(L) ≥ this → topic is considered mastered. */
export const MASTERY_THRESHOLD = 0.85

/**
 * Create initial BKT state for a topic. If diagnostic mastery data is
 * available, use it as the prior p(L); otherwise start at 0.1.
 */
export function initBktState(
  diagnosticMastery: number | null,
): BktState {
  return {
    pL: diagnosticMastery !== null ? Math.max(0.01, Math.min(0.99, diagnosticMastery)) : 0.1,
    pT: BKT_DEFAULTS.pT,
    pG: BKT_DEFAULTS.pG,
    pS: BKT_DEFAULTS.pS,
    totalAttempts: 0,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Update BKT state after a single response.
 *
 * Step 1 — Posterior update (Bayes' rule):
 *   If correct:  p(L|correct) = p(L)(1−p(S)) / [p(L)(1−p(S)) + (1−p(L))p(G)]
 *   If wrong:    p(L|wrong)   = p(L)p(S)     / [p(L)p(S)     + (1−p(L))(1−p(G))]
 *
 * Step 2 — Transition:
 *   p(L_new) = p(L|obs) + (1 − p(L|obs)) × p(T)
 *
 * The transition step models the chance that even if the student wasn't in
 * the "learned" state, they might have learned from this opportunity.
 */
export function updateBkt(
  state: BktState,
  correct: boolean,
): BktState {
  const { pL, pT, pG, pS } = state

  // Step 1: Posterior
  let pLPosterior: number
  if (correct) {
    const num = pL * (1 - pS)
    const denom = pL * (1 - pS) + (1 - pL) * pG
    pLPosterior = denom > 0 ? num / denom : pL
  } else {
    const num = pL * pS
    const denom = pL * pS + (1 - pL) * (1 - pG)
    pLPosterior = denom > 0 ? num / denom : pL
  }

  // Step 2: Transition
  const pLNew = pLPosterior + (1 - pLPosterior) * pT

  return {
    ...state,
    pL: clamp(pLNew, 0.001, 0.999),
    totalAttempts: state.totalAttempts + 1,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Batch-update BKT from multiple responses in one pass. Used when a
 * practice session has N responses to process.
 */
export function updateBktBatch(
  state: BktState,
  responses: ReadonlyArray<{ correct: boolean }>,
): BktState {
  let current = state
  for (const r of responses) {
    current = updateBkt(current, r.correct)
  }
  return current
}

/** True if the student has demonstrated mastery of this topic. */
export function isMastered(state: BktState): boolean {
  return state.pL >= MASTERY_THRESHOLD
}

/** Human-readable mastery label. */
export function masteryLabel(pL: number): string {
  if (pL >= 0.85) return 'Thành thạo'
  if (pL >= 0.7) return 'Khá'
  if (pL >= 0.5) return 'Sơ cấp'
  if (pL >= 0.3) return 'Đang học'
  return 'Chưa biết'
}

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x))
}
