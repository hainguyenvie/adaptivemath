/**
 * Phase 5 — Learner state persisted across practice sessions.
 *
 * This is the "living" state of a student — updated every time they answer
 * a question, complete a review, or earn XP. Stored in localStorage under
 * `kntt.learner.v1` as a single JSON blob (~50–300 KB depending on how
 * many questions have been attempted).
 *
 * Separate from `UserProfile` (onboarding prefs) and `SessionState`
 * (single diagnostic run) — LearnerState accumulates across all sessions.
 */

export interface LearnerState {
  /** Schema version for future migrations. */
  version: 1
  /** BKT mastery probability per topic (keyed by topicId). */
  bkt: Record<string, BktState>
  /** SRS review schedule per topic (keyed by topicId). */
  srs: Record<string, SrsState>
  /** Every wrong answer the student has ever made. */
  errors: ErrorEntry[]
  /** XP, streak, badges. */
  gamification: GamificationState
  /** Compact summary of each completed practice session. */
  sessions: PracticeSessionSummary[]
  /** IDs of questions already used in practice (to avoid repeats). */
  usedQuestionIds: string[]
  /**
   * Keys of completed activities in the learning path.
   * Format: `${topicId}::${activityType}` e.g. "0-KNTT-C1B1-X::theory"
   * Used to show done/not-done state on activity chips.
   */
  completedActivities: string[]
}

/** Bayesian Knowledge Tracing state for one topic. */
export interface BktState {
  /** P(learned) — probability the student has mastered this skill. 0..1. */
  pL: number
  /** P(transition) — prob of learning from each practice opportunity. */
  pT: number
  /** P(guess) — prob of correct answer without true mastery. */
  pG: number
  /** P(slip) — prob of wrong answer despite true mastery. */
  pS: number
  /** Total practice attempts on this topic (across all sessions). */
  totalAttempts: number
  /** ISO timestamp of last update. */
  updatedAt: string
}

/** SM-2 Spaced Repetition state for one topic. */
export interface SrsState {
  /** ISO date (YYYY-MM-DD) of next scheduled review. */
  nextReviewDate: string
  /** Current inter-review interval in days. */
  intervalDays: number
  /** SM-2 easiness factor (≥ 1.3). Higher = easier topic = longer intervals. */
  easinessFactor: number
  /** Number of successful consecutive reviews (reset on failure). */
  consecutiveCorrect: number
}

/** One wrong answer in the error journal. */
export interface ErrorEntry {
  questionId: string
  topicId: string
  /** What the student chose/typed (serialized for all question types). */
  studentAnswer: string
  /** Correct answer (serialized). */
  correctAnswer: string
  /** Score achieved (0..1, 0 for fully wrong). */
  score: number
  /** ISO timestamp. */
  timestamp: string
  /** True once the student re-attempts the question and gets it right. */
  resolved: boolean
}

export interface GamificationState {
  xp: number
  level: number
  currentStreak: number
  longestStreak: number
  /** ISO date (YYYY-MM-DD) of the last completed practice session, or null. */
  lastPracticeDate: string | null
  /** Badge IDs the student has earned. */
  badges: string[]
  /** Total questions ever attempted (across all sessions). */
  totalQuestionsAttempted: number
  /** Total SRS reviews completed. */
  totalReviewsCompleted: number
}

/** Compact summary of one completed practice session. */
export interface PracticeSessionSummary {
  sessionId: string
  topicId: string
  /** ISO date. */
  date: string
  questionsAttempted: number
  correctCount: number
  /** BKT p(L) BEFORE this session. */
  masteryBefore: number
  /** BKT p(L) AFTER this session. */
  masteryAfter: number
  xpEarned: number
  durationMs: number
  /** Adaptive engine state transitions during this session. */
  adaptiveTransitions: AdaptiveTransition[]
}

/** A notable state change recorded by the adaptive engine. */
export interface AdaptiveTransition {
  /** Which question triggered the transition. */
  questionNumber: number
  /** New state after the transition. */
  state: 'normal' | 'frustration' | 'boredom' | 'flow'
  /** ZPD offset applied. */
  offset: number
  /** Accuracy at the time of transition (0..1). */
  accuracy: number
  /** Optional suggestion shown to the student. */
  suggestion: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** XP awards. */
export const XP = {
  perCorrect: 10,
  perAttempted: 5,
  perTopicMastered: 50,
  perReviewCompleted: 20,
} as const

/** Level thresholds: level = floor(sqrt(xp / 100)). */
export function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100))
}

/** Badge definitions. */
export const BADGE_DEFINITIONS: ReadonlyArray<{
  id: string
  label: string
  icon: string
  description: string
}> = [
  {
    id: 'first-practice',
    label: 'Bước đầu',
    icon: '🎯',
    description: 'Hoàn thành phiên luyện tập đầu tiên',
  },
  {
    id: 'streak-5',
    label: 'Kiên trì',
    icon: '🔥',
    description: '5 ngày liên tiếp luyện tập',
  },
  {
    id: 'streak-10',
    label: 'Chuyên cần',
    icon: '💪',
    description: '10 ngày liên tiếp luyện tập',
  },
  {
    id: 'q-100',
    label: 'Bách chiến',
    icon: '⚔️',
    description: 'Trả lời 100 câu hỏi',
  },
  {
    id: 'q-500',
    label: 'Thiên lý',
    icon: '🏆',
    description: 'Trả lời 500 câu hỏi',
  },
  {
    id: 'first-mastery',
    label: 'Master đầu tiên',
    icon: '⭐',
    description: 'Thành thạo chủ đề đầu tiên (BKT ≥ 85%)',
  },
  {
    id: 'perfect-assessment',
    label: 'Hoàn hảo',
    icon: '💯',
    description: '100% đúng trong mini assessment',
  },
  {
    id: 'review-10',
    label: 'Ôn tập tốt',
    icon: '📖',
    description: 'Hoàn thành 10 phiên ôn tập SRS',
  },
]
