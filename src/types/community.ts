import type { Goal } from './user'

export interface SharedPath {
  id: string
  display_name: string
  avatar: string
  grade: 10 | 11 | 12
  goal: Goal
  daily_minutes: number
  total_topics: number
  total_days: number
  sprint_count: number
  completion_pct: number
  xp: number
  level: number
  current_streak: number
  longest_streak: number
  badges: string[]
  total_questions: number
  study_tools: string[]
  motivation: string
  completion_velocity: number
  sprint_summary: SprintSummary[]
  shared_at: string
  inspire_count: number
  device_id: string | null
}

export interface SprintSummary {
  weekNumber: number
  topicNames: string[]
  activityCount: number
  learnCount: number
  practiceCount: number
  reviewCount: number
}

export interface ShareFormData {
  displayName: string
  avatar: string
  motivation: string
  studyTools: string[]
}

export interface Comment {
  id: string
  path_id: string
  device_id: string
  display_name: string
  avatar: string
  content: string
  created_at: string
}

export const AVATAR_OPTIONS = ['📚', '🎯', '🚀', '⭐', '💪', '📖', '🔥', '🏆', '🧠', '✨', '🎓', '🌟']

export const STUDY_TOOL_OPTIONS = [
  'Sách giáo khoa',
  'YouTube',
  'Gia sư',
  'App học thêm',
  'Nhóm học',
  'Đề thi các năm',
  'Ghi chú tay',
  'Flashcard',
]
