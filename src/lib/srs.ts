/**
 * SM-2 Spaced Repetition Scheduler.
 *
 * After a topic reaches BKT mastery (p(L) ≥ 0.85), SRS takes over to
 * schedule periodic reviews that prevent forgetting. The interval between
 * reviews grows exponentially as the student demonstrates continued recall.
 *
 * SM-2 algorithm (Piotr Woźniak, 1987):
 *   - Review quality is mapped to 0–5 from the student's practice score.
 *   - Quality ≥ 3 → successful review → interval grows.
 *   - Quality < 3 → failed review → reset interval to 1 day.
 *   - Easiness factor (EF) adjusts how fast intervals grow.
 *
 * All functions are pure.
 */

import type { SrsState } from '../types/learner'

/**
 * Create initial SRS state when a topic first reaches mastery.
 * First review is scheduled for tomorrow.
 */
export function initSrsState(): SrsState {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return {
    nextReviewDate: tomorrow.toISOString().slice(0, 10),
    intervalDays: 1,
    easinessFactor: 2.5,
    consecutiveCorrect: 0,
  }
}

/**
 * Map a practice session accuracy (0..1) to SM-2 quality (0..5).
 */
export function accuracyToQuality(accuracy: number): number {
  if (accuracy >= 0.9) return 5
  if (accuracy >= 0.8) return 4
  if (accuracy >= 0.6) return 3
  if (accuracy >= 0.4) return 2
  if (accuracy >= 0.2) return 1
  return 0
}

/**
 * Schedule the next review based on the quality of this review session.
 *
 * SM-2 interval schedule:
 *   1st success: 1 day
 *   2nd success: 3 days
 *   3rd+ success: interval × easiness_factor
 *
 * Quality < 3: reset streak, interval back to 1 day, EF decreases.
 */
export function scheduleReview(
  srs: SrsState,
  quality: number,
): SrsState {
  let { easinessFactor, intervalDays, consecutiveCorrect } = srs

  if (quality >= 3) {
    // Successful review.
    consecutiveCorrect++
    if (consecutiveCorrect === 1) intervalDays = 1
    else if (consecutiveCorrect === 2) intervalDays = 3
    else intervalDays = Math.round(intervalDays * easinessFactor)

    // Update easiness factor.
    easinessFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  } else {
    // Failed review — reset.
    consecutiveCorrect = 0
    intervalDays = 1
    easinessFactor -= 0.2
  }

  // EF floor at 1.3 (SM-2 recommendation).
  easinessFactor = Math.max(1.3, easinessFactor)

  // Cap interval at 180 days.
  intervalDays = Math.min(180, intervalDays)

  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + intervalDays)

  return {
    nextReviewDate: nextDate.toISOString().slice(0, 10),
    intervalDays,
    easinessFactor,
    consecutiveCorrect,
  }
}

/**
 * Check if a topic's review is due today or overdue.
 */
export function isReviewDue(srs: SrsState): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return srs.nextReviewDate <= today
}

/**
 * Get all topic IDs with overdue reviews from the SRS state map.
 */
export function getDueReviews(
  srsMap: Record<string, SrsState>,
): string[] {
  return Object.entries(srsMap)
    .filter(([_, srs]) => isReviewDue(srs))
    .map(([topicId]) => topicId)
}
