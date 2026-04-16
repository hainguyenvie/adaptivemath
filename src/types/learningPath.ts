/**
 * Phase 4 — Learning Path data model.
 *
 * A LearningPath is a **static schedule** computed from the student's
 * KnowledgeProfile + UserProfile. It is NOT persisted — recomputed each
 * time the page loads so any change in diagnostic results or onboarding
 * settings immediately reflects.
 *
 * The path is organized as:
 *   LearningPath → Sprint[] → DaySession[] → Activity[]
 *
 * Each Sprint = 1 calendar week. Each DaySession = 1 study day within
 * the student's `dailyMinutes` budget. Each Activity = one focused block
 * (learn new material, practice at a level, or review a past topic).
 */

import type { Goal, DailyMinutes } from './user'
import type { LevelLetter } from './question'

export interface LearningPath {
  builtAt: string
  grade: 10 | 11 | 12
  goal: Goal
  dailyMinutes: DailyMinutes
  deadline: string | null
  estimatedCompletionDate: string
  totalDays: number
  totalTopics: number
  sprints: Sprint[]
  /** Debug: the ordered priority list that drove scheduling. */
  priorityList: TopicPriority[]
}

export interface TopicPriority {
  topicId: string
  title: string
  mastery: number
  gap: number
  urgency: number
  weakBonus: number
  examDensity: number
  /** Composite priority score — higher = scheduled earlier. */
  score: number
  /** Estimated minutes to bring this topic to target. */
  estimatedMinutes: number
  /** Which levels need work (below target mastery at that level). */
  gapLevels: LevelLetter[]
}

export interface Sprint {
  weekNumber: number
  label: string
  startDate: string
  endDate: string
  days: DaySession[]
  topicSummary: string[]
}

export interface DaySession {
  /** 1-based across whole path. */
  dayNumber: number
  date: string
  activities: Activity[]
  estimatedMinutes: number
  isReviewDay: boolean
}

export type ActivityType = 'theory' | 'learn' | 'practice' | 'review'

export interface Activity {
  /**
   * Unique ID for this specific activity instance in the path.
   * Format: `d{dayNumber}-{topicId}-{type}-{level}` e.g. "d1-0-KNTT-C1B1-X-theory"
   * Used as the completion key in LearnerState.completedActivities.
   */
  activityId: string
  type: ActivityType
  topicId: string
  topicTitle: string
  /** Which level(s) to focus on this session (for practice/review). */
  levels: LevelLetter[]
  /** How many questions to attempt (0 for theory activities). */
  questionCount: number
  /** Estimated minutes for this activity. */
  estimatedMinutes: number
  /** For 'theory' type: count of definitions + notes to read. */
  theoryBlockCount: number
  /** For 'theory' type: count of worked examples to study. */
  workedExampleCount: number
  /** Why this topic appears here — shown in debug panel + as tooltip. */
  reason: string
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  theory: 'Đọc lý thuyết',
  learn: 'Học qua ví dụ',
  practice: 'Luyện tập',
  review: 'Ôn tập',
}

export const ACTIVITY_COLORS: Record<
  ActivityType,
  { bg: string; text: string; border: string; icon: string }
> = {
  theory: {
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    border: 'border-violet-200',
    icon: '📖',
  },
  learn: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: '🟢',
  },
  practice: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    icon: '🔵',
  },
  review: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: '🟡',
  },
}
