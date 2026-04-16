/**
 * Item Response Theory — 3-parameter logistic (3PL) model with a Gaussian
 * prior on θ (Maximum A Posteriori estimation).
 *
 * All functions here are pure: they take explicit inputs and return numbers,
 * no side effects, no globals. Easy to unit-test and reason about.
 *
 *   P(θ) = c + (1 − c) · σ(a·(θ − b))
 *
 * where σ is the logistic sigmoid.
 *
 * θ estimation was MLE in Phase 2 but diverged catastrophically for ladder
 * sessions — at saturated P (θ far from b) Fisher information tends to 0,
 * so the Newton-Raphson step `score/info` blew up and clamped to the θ
 * bounds after only 3-4 responses. Phase 4 switches to MAP with a weak
 * N(0, 2²) prior on θ: it adds a constant `1/σ²` to the observed
 * information, guaranteeing info ≥ 0.25 so Newton-Raphson always converges.
 *
 * The prior also provides sensible shrinkage toward the population mean
 * when responses are sparse or all saturated in one direction.
 *
 * References:
 *  - van der Linden & Hambleton (1997), Handbook of Modern IRT
 *  - Birnbaum (1968), 3PL derivation
 *  - Bock & Mislevy (1982), Adaptive EAP estimation
 */

import type { IrtParams, SessionResponse } from '../types/question'
import { CAT_CONFIG } from '../types/question'

/**
 * Prior variance σ² for θ. With σ = 2, 95% of prior mass is in [-4, +4]
 * (matching our clamps) — weak enough not to swamp the data once we have
 * enough responses, strong enough to anchor estimates in early steps.
 */
const PRIOR_VARIANCE = 4

/** Max per-iteration step size for Newton-Raphson — guards against overshoot. */
const MAX_NEWTON_STEP = 0.75

/** Logistic sigmoid. */
function sigmoid(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x)
    return 1 / (1 + e)
  }
  // numerically stable branch for very negative x
  const e = Math.exp(x)
  return e / (1 + e)
}

/**
 * 3PL probability of correct response.
 */
export function probabilityCorrect(theta: number, item: IrtParams): number {
  const logit = item.a * (theta - item.b)
  const s = sigmoid(logit)
  return item.c + (1 - item.c) * s
}

/**
 * Fisher information for a single 3PL item at a given θ.
 *
 *   I(θ) = a² · (1 − P) · (P − c)² / ((1 − c)² · P)
 *
 * This is the variance of the score function and tells us how much an item
 * tightens our θ estimate — the higher I(θ), the more informative the item.
 */
export function itemInformation(theta: number, item: IrtParams): number {
  const P = probabilityCorrect(theta, item)
  if (P <= 1e-9 || P >= 1 - 1e-9) return 0
  const Q = 1 - P
  const numerator = item.a * item.a * Q * Math.pow(P - item.c, 2)
  const denominator = Math.pow(1 - item.c, 2) * P
  if (denominator <= 1e-12) return 0
  return numerator / denominator
}

/**
 * Score function for MAP: first derivative of log-posterior w.r.t. θ.
 *
 *   dL/dθ = Σ a·(u − P)·(P − c) / (P·(1 − c))  +  (-θ / σ²)
 *                    ^^^^^^^^^^^^^^^^^^^^^^^^       ^^^^^^^^
 *                    3PL likelihood term             Gaussian prior term
 */
function scoreFunction(
  theta: number,
  items: IrtParams[],
  responses: number[],
): number {
  let sum = 0
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const u = responses[i]
    const P = probabilityCorrect(theta, item)
    if (P <= 1e-9 || P >= 1 - 1e-9) continue
    sum += (item.a * (u - P) * (P - item.c)) / (P * (1 - item.c))
  }
  // Prior contribution: -θ/σ² (pulls estimate toward 0).
  sum -= theta / PRIOR_VARIANCE
  return sum
}

/**
 * Total information = observed Fisher information + prior information.
 *
 * Adding `1/σ²` guarantees the denominator in Newton-Raphson is never zero
 * even when every item is saturated — this was the divergence source in
 * Phase 2 MLE. With σ² = 4 the floor is 0.25, so the largest possible step
 * from a single extreme score is ~4 in one iteration, which we further
 * clamp via MAX_NEWTON_STEP.
 */
function totalInformation(theta: number, items: IrtParams[]): number {
  let total = 1 / PRIOR_VARIANCE
  for (const item of items) total += itemInformation(theta, item)
  return total
}

interface ThetaEstimate {
  theta: number
  standardError: number
}

/**
 * Maximum A Posteriori estimate of θ via Newton-Raphson on the log-posterior.
 *
 * The Gaussian prior N(0, σ²) in `scoreFunction` + `totalInformation` means:
 *   - `info` is always ≥ 1/σ² (no divide-by-zero)
 *   - "all correct" and "all wrong" patterns don't need special cases — the
 *     prior pulls the estimate back toward 0 automatically
 *   - Newton step is clamped to MAX_NEWTON_STEP to guard against overshoot
 *     when the combined info is still small (first few responses)
 */
export function estimateTheta(
  items: IrtParams[],
  responses: number[],
  options: { startingTheta?: number; maxIterations?: number } = {},
): ThetaEstimate {
  if (items.length !== responses.length) {
    throw new Error('items and responses must have the same length')
  }
  if (items.length === 0) {
    // No data → prior-only: θ = 0, SE = σ.
    return { theta: 0, standardError: Math.sqrt(PRIOR_VARIANCE) }
  }

  const startingTheta = options.startingTheta ?? 0
  const maxIter = options.maxIterations ?? 30
  const tolerance = 1e-4

  let theta = startingTheta
  for (let iter = 0; iter < maxIter; iter++) {
    const score = scoreFunction(theta, items, responses)
    const info = totalInformation(theta, items)
    let delta = score / info
    // Guard against Newton overshoot when info is small (early responses).
    if (delta > MAX_NEWTON_STEP) delta = MAX_NEWTON_STEP
    if (delta < -MAX_NEWTON_STEP) delta = -MAX_NEWTON_STEP
    theta += delta
    if (theta < CAT_CONFIG.thetaMin) theta = CAT_CONFIG.thetaMin
    if (theta > CAT_CONFIG.thetaMax) theta = CAT_CONFIG.thetaMax
    if (Math.abs(delta) < tolerance) break
  }

  const info = totalInformation(theta, items)
  const se = 1 / Math.sqrt(info)
  return { theta, standardError: se }
}

/**
 * Convenience wrapper: take the full `SessionResponse[]` + the lookup of
 * their IRT params, and return the refreshed θ estimate.
 *
 * `getItem` is the caller's responsibility because the session responses only
 * store question ids — we don't want to couple this module to the React
 * context or the bundled JSON.
 */
export function estimateThetaFromSession(
  responses: SessionResponse[],
  getItem: (questionId: string) => IrtParams | null,
  options: { startingTheta?: number } = {},
): ThetaEstimate {
  const items: IrtParams[] = []
  const scores: number[] = []
  for (const r of responses) {
    if (!r.answered) continue
    const item = getItem(r.questionId)
    if (!item) continue
    items.push(item)
    scores.push(r.score)
  }
  return estimateTheta(items, scores, options)
}

/**
 * Map Phase-1 self-assessment level to a reasonable starting θ so the first
 * item shown is roughly appropriate instead of always being "medium".
 */
export function startingThetaFromSelfLevel(
  selfLevel: 'yeu' | 'tb' | 'kha' | 'gioi',
): number {
  switch (selfLevel) {
    case 'yeu':
      return -1.0
    case 'tb':
      return -0.3
    case 'kha':
      return 0.5
    case 'gioi':
      return 1.2
  }
}
