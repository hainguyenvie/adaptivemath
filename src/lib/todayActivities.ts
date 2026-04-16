/**
 * Compute "Hôm nay cần làm" — the daily task list shown on the home dashboard.
 *
 * Merges three sources:
 *   1. SRS reviews due today (highest priority — forgetting curve!)
 *   2. Learning path activities for today's date
 *   3. Unfinished activities from previous days (catch-up)
 *
 * Returns at most 5 activities to avoid overwhelm.
 */

import type { LearningPath, Activity } from '../types/learningPath'
import type { LearnerState } from '../types/learner'
// Activity is used for the isDone helper's type parameter.
import { getTopicById } from '../data/topics'

export interface TodayActivity {
  /** Unique key for React rendering. */
  key: string
  /** Source of this activity. */
  source: 'srs' | 'path' | 'catchup'
  /** The activity data (same shape as learning path activities). */
  activity: Activity
  /** Human-readable reason why this is in today's list. */
  reason: string
}

/**
 * Get today's date as YYYY-MM-DD in Vietnam timezone.
 */
function todayDateStr(): string {
  const now = new Date()
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return vnTime.toISOString().slice(0, 10)
}

export function computeTodayActivities(
  path: LearningPath | null,
  learner: LearnerState,
): TodayActivity[] {
  const today = todayDateStr()
  const activities: TodayActivity[] = []
  const completedSet = new Set(learner.completedActivities)

  /** Check if a specific activity instance has been completed. */
  const isDone = (act: Activity) =>
    completedSet.has(act.activityId)

  // --- 1. SRS reviews due today (highest priority) ---
  for (const [topicId, srs] of Object.entries(learner.srs)) {
    if (srs.nextReviewDate <= today) {
      const topic = getTopicById(topicId)
      activities.push({
        key: `srs-${topicId}`,
        source: 'srs',
        activity: {
          activityId: `srs-${topicId}-${today}`,
          type: 'review',
          topicId,
          topicTitle: topic?.title ?? topicId,
          levels: ['N', 'H'],
          questionCount: 3,
          theoryBlockCount: 0,
          workedExampleCount: 0,
          estimatedMinutes: 5,
          reason: `SRS review (interval ${srs.intervalDays}d)`,
        },
        reason: 'Ôn tập theo lịch SRS',
      })
    }
  }

  // --- 2. Today's learning path activities (skip already completed) ---
  if (path) {
    for (const sprint of path.sprints) {
      for (const day of sprint.days) {
        if (day.date === today) {
          for (const act of day.activities) {
            if (isDone(act)) continue
            if (activities.some((a) => a.activity.topicId === act.topicId && a.source === 'srs')) {
              continue
            }
            activities.push({
              key: `path-${act.topicId}-${act.type}`,
              source: 'path',
              activity: act,
              reason: `Lộ trình ngày ${day.dayNumber}`,
            })
          }
        }
      }
    }
  }

  // --- 3. Catch-up: unfinished activities from previous days ---
  if (path && activities.length < 3) {
    for (const sprint of path.sprints) {
      for (const day of sprint.days) {
        if (day.date >= today) break
        for (const act of day.activities) {
          if (activities.length >= 5) break
          if (isDone(act)) continue
          if (activities.some((a) => a.activity.topicId === act.topicId && a.activity.type === act.type)) {
            continue
          }
          const bkt = learner.bkt[act.topicId]
          if (bkt && bkt.pL >= 0.85 && act.type !== 'review') continue

          activities.push({
            key: `catchup-${act.topicId}-${act.type}`,
            source: 'catchup',
            activity: act,
            reason: 'Bù từ ngày trước',
          })
        }
      }
    }
  }

  // Cap at 5 activities.
  return activities.slice(0, 5)
}

/**
 * Compute overall progress stats for the dashboard.
 */
export interface ProgressStats {
  /** Number of topics with BKT mastery ≥ 0.85. */
  masteredTopics: number
  /** Total topics in the grade. */
  totalTopics: number
  /** Average BKT mastery across all practiced topics. */
  avgMastery: number
  /** Total practice sessions completed. */
  totalSessions: number
  /** Total questions attempted. */
  totalQuestions: number
  /** Estimated completion date from learning path. */
  estimatedCompletion: string | null
  /** Days completed in the learning path. */
  pathDaysCompleted: number
  pathDaysTotal: number
}

export function computeProgressStats(
  path: LearningPath | null,
  learner: LearnerState,
  totalTopicsInGrade: number,
): ProgressStats {
  const bktEntries = Object.values(learner.bkt)
  const masteredTopics = bktEntries.filter((b) => b.pL >= 0.85).length

  // Average mastery: use BKT if available, else use diagnostic-derived value.
  // Include all topics in grade (not just those with BKT entries).
  const avgMastery =
    bktEntries.length > 0
      ? bktEntries.reduce((s, b) => s + b.pL, 0) / totalTopicsInGrade
      : 0

  // Count completed activities from path.
  const completedSet = new Set(learner.completedActivities)
  let totalActivities = 0
  let completedActivities = 0
  if (path) {
    for (const sprint of path.sprints) {
      for (const day of sprint.days) {
        for (const act of day.activities) {
          totalActivities++
          if (completedSet.has(act.activityId)) {
            completedActivities++
          }
        }
      }
    }
  }

  return {
    masteredTopics,
    totalTopics: totalTopicsInGrade,
    avgMastery,
    totalSessions: learner.sessions.length,
    totalQuestions: learner.gamification.totalQuestionsAttempted,
    estimatedCompletion: path?.estimatedCompletionDate ?? null,
    pathDaysCompleted: completedActivities,
    pathDaysTotal: totalActivities,
  }
}

/**
 * Get dates this month when the student practiced (for mini calendar).
 */
export function getPracticeDatesThisMonth(learner: LearnerState): Set<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const dates = new Set<string>()
  for (const session of learner.sessions) {
    const d = new Date(session.date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      dates.add(session.date)
    }
  }
  return dates
}
