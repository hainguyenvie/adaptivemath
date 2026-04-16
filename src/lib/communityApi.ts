/**
 * Community API — CRUD operations on shared learning paths via Supabase.
 */

import { supabase, getDeviceId } from './supabase'
import type { SharedPath, ShareFormData, SprintSummary, Comment } from '../types/community'
import type { LearningPath } from '../types/learningPath'
import type { UserProfile } from '../types/user'
import type { LearnerState } from '../types/learner'
import { xpToLevel } from '../types/learner'

// ---------------------------------------------------------------------------
// Share a path
// ---------------------------------------------------------------------------

export async function sharePath(
  form: ShareFormData,
  profile: UserProfile,
  path: LearningPath,
  learner: LearnerState,
  completionPct: number,
): Promise<{ success: boolean; error?: string }> {
  const deviceId = getDeviceId()

  // Build sprint summary (compact, no private data).
  const sprintSummary: SprintSummary[] = path.sprints.map((s) => {
    let learnCount = 0
    let practiceCount = 0
    let reviewCount = 0
    for (const d of s.days) {
      for (const a of d.activities) {
        if (a.type === 'theory' || a.type === 'learn') learnCount++
        else if (a.type === 'practice') practiceCount++
        else if (a.type === 'review') reviewCount++
      }
    }
    return {
      weekNumber: s.weekNumber,
      topicNames: s.topicSummary.slice(0, 5),
      activityCount: s.days.reduce((n, d) => n + d.activities.length, 0),
      learnCount,
      practiceCount,
      reviewCount,
    }
  })

  // Compute velocity (activities per week).
  const totalActivities = sprintSummary.reduce((s, sp) => s + sp.activityCount, 0)
  const completedCount = Math.round((completionPct / 100) * totalActivities)
  const weeksElapsed = Math.max(1, path.sprints.length)
  const velocity = completedCount / weeksElapsed

  const { error } = await supabase.from('shared_paths').insert({
    display_name: form.displayName.trim() || 'Học sinh',
    avatar: form.avatar,
    grade: profile.grade,
    goal: profile.goal,
    daily_minutes: profile.dailyMinutes,
    total_topics: path.totalTopics,
    total_days: path.totalDays,
    sprint_count: path.sprints.length,
    completion_pct: completionPct,
    xp: learner.gamification.xp,
    level: xpToLevel(learner.gamification.xp),
    current_streak: learner.gamification.currentStreak,
    longest_streak: learner.gamification.longestStreak,
    badges: learner.gamification.badges,
    total_questions: learner.gamification.totalQuestionsAttempted,
    study_tools: form.studyTools,
    motivation: form.motivation.trim().slice(0, 200),
    completion_velocity: Math.round(velocity * 10) / 10,
    sprint_summary: sprintSummary,
    device_id: deviceId,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// Browse community
// ---------------------------------------------------------------------------

export interface BrowseOptions {
  grade?: 10 | 11 | 12
  goal?: string
  sortBy?: 'newest' | 'most-inspired' | 'highest-xp'
  limit?: number
  offset?: number
}

export async function browsePaths(
  options: BrowseOptions = {},
): Promise<{ data: SharedPath[]; error?: string }> {
  let query = supabase
    .from('shared_paths')
    .select('*')

  if (options.grade) query = query.eq('grade', options.grade)
  if (options.goal) query = query.eq('goal', options.goal)

  switch (options.sortBy) {
    case 'most-inspired':
      query = query.order('inspire_count', { ascending: false })
      break
    case 'highest-xp':
      query = query.order('xp', { ascending: false })
      break
    default:
      query = query.order('shared_at', { ascending: false })
  }

  query = query.range(
    options.offset ?? 0,
    (options.offset ?? 0) + (options.limit ?? 20) - 1,
  )

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: (data as SharedPath[]) ?? [] }
}

// ---------------------------------------------------------------------------
// Inspire
// ---------------------------------------------------------------------------

export async function inspirePath(
  pathId: string,
): Promise<{ count: number; alreadyInspired: boolean }> {
  const deviceId = getDeviceId()

  const { data, error } = await supabase.rpc('increment_inspire', {
    path_uuid: pathId,
    dev_id: deviceId,
  })

  if (error) {
    return { count: 0, alreadyInspired: true }
  }

  return { count: data as number, alreadyInspired: false }
}

/** Check if current device has already inspired a path. */
export async function hasInspired(pathId: string): Promise<boolean> {
  const deviceId = getDeviceId()
  const { data } = await supabase
    .from('inspires')
    .select('id')
    .eq('path_id', pathId)
    .eq('device_id', deviceId)
    .limit(1)

  return (data?.length ?? 0) > 0
}

/** Get paths shared by current device. */
export async function getMySharedPaths(): Promise<SharedPath[]> {
  const deviceId = getDeviceId()
  const { data } = await supabase
    .from('shared_paths')
    .select('*')
    .eq('device_id', deviceId)
    .order('shared_at', { ascending: false })

  return (data as SharedPath[]) ?? []
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/** Fetch comments for a shared path, newest first. */
export async function getComments(pathId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('path_id', pathId)
    .order('created_at', { ascending: true })
    .limit(50)

  return (data as Comment[]) ?? []
}

/** Post a new comment on a shared path. */
export async function postComment(
  pathId: string,
  content: string,
  displayName: string,
  avatar: string,
): Promise<{ success: boolean; comment?: Comment; error?: string }> {
  const deviceId = getDeviceId()
  const trimmed = content.trim()

  if (!trimmed || trimmed.length > 500) {
    return { success: false, error: 'Comment phải từ 1-500 ký tự.' }
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      path_id: pathId,
      device_id: deviceId,
      display_name: displayName || 'Học sinh',
      avatar,
      content: trimmed,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, comment: data as Comment }
}

/** Delete own comment. */
export async function deleteComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('device_id', getDeviceId())

  return !error
}
