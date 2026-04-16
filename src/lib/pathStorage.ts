/**
 * Persist the generated learning path so it survives page reloads.
 *
 * Key: `kntt.learningPath.v1`
 *
 * The path is regenerated explicitly when the student clicks "Tạo lại"
 * or after a new diagnostic session. On normal page load, if a saved
 * path exists it's restored instantly — no re-computation, no loading
 * animation.
 */

import { z } from 'zod'
import type { LearningPath } from '../types/learningPath'

export const PATH_STORAGE_KEY = 'kntt.learningPath.v1'

const activitySchema = z.object({
  activityId: z.string(),
  type: z.enum(['theory', 'learn', 'practice', 'review']),
  topicId: z.string(),
  topicTitle: z.string(),
  levels: z.array(z.string()),
  questionCount: z.number(),
  theoryBlockCount: z.number(),
  workedExampleCount: z.number(),
  estimatedMinutes: z.number(),
  reason: z.string(),
})

const daySchema = z.object({
  dayNumber: z.number(),
  date: z.string(),
  activities: z.array(activitySchema),
  estimatedMinutes: z.number(),
  isReviewDay: z.boolean(),
})

const sprintSchema = z.object({
  weekNumber: z.number(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  days: z.array(daySchema),
  topicSummary: z.array(z.string()),
})

const pathSchema = z.object({
  builtAt: z.string(),
  grade: z.union([z.literal(10), z.literal(11), z.literal(12)]),
  goal: z.enum(['giua-ky', 'cuoi-ky', 'thpt-qg', 'nang-cao']),
  dailyMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]),
  deadline: z.string().nullable(),
  estimatedCompletionDate: z.string(),
  totalDays: z.number(),
  totalTopics: z.number(),
  sprints: z.array(sprintSchema),
  priorityList: z.array(z.any()),
})

export function saveLearningPath(path: LearningPath): void {
  try {
    window.localStorage.setItem(PATH_STORAGE_KEY, JSON.stringify(path))
  } catch {
    // Quota exceeded — silently fail, path will just need to be regenerated.
  }
}

export function loadLearningPath(): LearningPath | null {
  const raw = window.localStorage.getItem(PATH_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = pathSchema.safeParse(JSON.parse(raw))
    if (parsed.success) return parsed.data as LearningPath
    window.localStorage.removeItem(PATH_STORAGE_KEY)
    return null
  } catch {
    window.localStorage.removeItem(PATH_STORAGE_KEY)
    return null
  }
}

export function clearLearningPath(): void {
  window.localStorage.removeItem(PATH_STORAGE_KEY)
}
