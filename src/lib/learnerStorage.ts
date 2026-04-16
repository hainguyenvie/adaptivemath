/**
 * Persistence layer for LearnerState — the living practice/mastery data
 * that accumulates across sessions.
 *
 * Single localStorage key: `kntt.learner.v1`.
 *
 * Design decisions:
 *   - Zod validation on read (like all other storage in this app).
 *   - No encryption (no auth, no sensitive data beyond study progress).
 *   - Prune oldest sessions if blob exceeds ~500 KB (keep last 50).
 *   - Version field enables future migrations.
 */

import { z } from 'zod'
import type { LearnerState } from '../types/learner'

export const LEARNER_STORAGE_KEY = 'kntt.learner.v1'

const bktSchema = z.object({
  pL: z.number(),
  pT: z.number(),
  pG: z.number(),
  pS: z.number(),
  totalAttempts: z.number(),
  updatedAt: z.string(),
})

const srsSchema = z.object({
  nextReviewDate: z.string(),
  intervalDays: z.number(),
  easinessFactor: z.number(),
  consecutiveCorrect: z.number(),
})

const errorSchema = z.object({
  questionId: z.string(),
  topicId: z.string(),
  studentAnswer: z.string(),
  correctAnswer: z.string(),
  score: z.number(),
  timestamp: z.string(),
  resolved: z.boolean(),
})

const gamificationSchema = z.object({
  xp: z.number(),
  level: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  lastPracticeDate: z.string().nullable(),
  badges: z.array(z.string()),
  totalQuestionsAttempted: z.number().default(0),
  totalReviewsCompleted: z.number().default(0),
})

const adaptiveTransitionSchema = z.object({
  questionNumber: z.number(),
  state: z.enum(['normal', 'frustration', 'boredom', 'flow']),
  offset: z.number(),
  accuracy: z.number(),
  suggestion: z.string().nullable(),
})

const sessionSummarySchema = z.object({
  sessionId: z.string(),
  topicId: z.string(),
  date: z.string(),
  questionsAttempted: z.number(),
  correctCount: z.number(),
  masteryBefore: z.number(),
  masteryAfter: z.number(),
  xpEarned: z.number(),
  durationMs: z.number(),
  adaptiveTransitions: z.array(adaptiveTransitionSchema).default([]),
})

const learnerSchema = z.object({
  version: z.literal(1),
  bkt: z.record(z.string(), bktSchema).default({}),
  srs: z.record(z.string(), srsSchema).default({}),
  errors: z.array(errorSchema).default([]),
  gamification: gamificationSchema.default({
    xp: 0,
    level: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    badges: [],
    totalQuestionsAttempted: 0,
    totalReviewsCompleted: 0,
  }),
  sessions: z.array(sessionSummarySchema).default([]),
  usedQuestionIds: z.array(z.string()).default([]),
  completedActivities: z.array(z.string()).default([]),
})

/** Create an empty learner state (first-time student). */
export function emptyLearnerState(): LearnerState {
  return {
    version: 1,
    bkt: {},
    srs: {},
    errors: [],
    gamification: {
      xp: 0,
      level: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: null,
      badges: [],
      totalQuestionsAttempted: 0,
      totalReviewsCompleted: 0,
    },
    sessions: [],
    usedQuestionIds: [],
    completedActivities: [],
  }
}

/**
 * Load the current learner state from localStorage.
 * Returns an empty state if nothing exists or the stored shape is invalid.
 */
export function loadLearnerState(): LearnerState {
  const raw = window.localStorage.getItem(LEARNER_STORAGE_KEY)
  if (!raw) return emptyLearnerState()

  try {
    const parsed: unknown = JSON.parse(raw)
    const validated = learnerSchema.safeParse(parsed)
    if (validated.success) return validated.data
    // Corrupt shape → start fresh rather than lose all data silently.
    // (In a real app you'd attempt a partial recovery here.)
    return emptyLearnerState()
  } catch {
    return emptyLearnerState()
  }
}

/**
 * Save learner state. Prunes oldest sessions if the blob is too large.
 */
export function saveLearnerState(state: LearnerState): void {
  // Prune sessions if more than 50 (keep most recent).
  const pruned: LearnerState = {
    ...state,
    sessions: state.sessions.slice(-50),
    // Prune errors if more than 500 (keep most recent).
    errors: state.errors.slice(-500),
    // Prune used question IDs if more than 2000.
    usedQuestionIds: state.usedQuestionIds.slice(-2000),
  }

  try {
    const serialized = JSON.stringify(pruned)
    window.localStorage.setItem(LEARNER_STORAGE_KEY, serialized)
  } catch {
    // localStorage quota exceeded — try with more aggressive pruning.
    try {
      const aggressive: LearnerState = {
        ...pruned,
        sessions: pruned.sessions.slice(-20),
        errors: pruned.errors.slice(-200),
        usedQuestionIds: pruned.usedQuestionIds.slice(-500),
      }
      window.localStorage.setItem(
        LEARNER_STORAGE_KEY,
        JSON.stringify(aggressive),
      )
    } catch {
      // Give up — the user's browser is full.
    }
  }
}

/** Clear all learner data (for "reset" functionality). */
export function clearLearnerState(): void {
  window.localStorage.removeItem(LEARNER_STORAGE_KEY)
}
