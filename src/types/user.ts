/**
 * Core profile types for Phase 1 Onboarding.
 * These enums are intentionally string-literal unions (per TS style rules)
 * so they serialize cleanly to localStorage and remain narrow at the type level.
 */

export type Grade = 10 | 11 | 12

export type Goal = 'giua-ky' | 'cuoi-ky' | 'thpt-qg' | 'nang-cao'

export type DailyMinutes = 30 | 45 | 60 | 90

export type SelfLevel = 'yeu' | 'tb' | 'kha' | 'gioi'

export interface UserProfile {
  grade: Grade
  goal: Goal
  dailyMinutes: DailyMinutes
  /** ISO date string (YYYY-MM-DD) or null if student has no deadline */
  deadline: string | null
  selfLevel: SelfLevel
  /** Topic IDs matching Topic.id in data/topics.ts */
  weakTopicIds: string[]
  /** ISO datetime — set once on first save */
  createdAt: string
  /** ISO datetime — bumped on every save */
  updatedAt: string
}

export const GRADE_LABELS: Record<Grade, string> = {
  10: 'Lớp 10',
  11: 'Lớp 11',
  12: 'Lớp 12',
}

export const GOAL_OPTIONS: ReadonlyArray<{
  value: Goal
  label: string
  description: string
}> = [
  {
    value: 'giua-ky',
    label: 'Ôn thi giữa kỳ',
    description: 'Tập trung kiến thức nửa học kỳ gần nhất.',
  },
  {
    value: 'cuoi-ky',
    label: 'Ôn thi cuối kỳ',
    description: 'Phủ toàn bộ chương trình học kỳ.',
  },
  {
    value: 'thpt-qg',
    label: 'Thi THPT Quốc gia',
    description: 'Luyện đề tổng hợp lớp 10–12, mức nâng cao.',
  },
  {
    value: 'nang-cao',
    label: 'Học nâng cao / HSG',
    description: 'Tiến xa hơn chương trình chuẩn, bài khó.',
  },
]

export const DAILY_MINUTES_OPTIONS: ReadonlyArray<{
  value: DailyMinutes
  label: string
  description: string
}> = [
  { value: 30, label: '30 phút', description: 'Nhẹ nhàng, duy trì nhịp học.' },
  { value: 45, label: '45 phút', description: 'Phù hợp đa số học sinh.' },
  { value: 60, label: '60 phút', description: 'Tiến độ nhanh, rõ kết quả.' },
  { value: 90, label: '90 phút', description: 'Tập trung ôn thi, cường độ cao.' },
]

export const SELF_LEVEL_OPTIONS: ReadonlyArray<{
  value: SelfLevel
  label: string
  description: string
}> = [
  {
    value: 'yeu',
    label: 'Yếu',
    description: 'Còn hổng nhiều kiến thức nền, cần bắt đầu lại từ cơ bản.',
  },
  {
    value: 'tb',
    label: 'Trung bình',
    description: 'Nắm được căn bản, nhưng chưa vững khi gặp bài khó.',
  },
  {
    value: 'kha',
    label: 'Khá',
    description: 'Làm tốt bài chuẩn, đang hướng tới mức vận dụng cao.',
  },
  {
    value: 'gioi',
    label: 'Giỏi',
    description: 'Tự tin mọi chương, muốn luyện chuyên sâu.',
  },
]
