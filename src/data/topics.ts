/**
 * Static KNTT topic seed — 39 lessons extracted from data/*.tex in the parent repo.
 *
 * This file is manually curated for Phase 1 onboarding. In Phase 2 we will
 * generate it automatically from a LaTeX parser over `../../../data/*.tex`.
 *
 * Ordering matches `Mathtex-kntt.tex` lines 57–95 so that "grade → chapter → lesson"
 * naturally reflects the curriculum sequence.
 */

import type { Grade } from '../types/user'

export interface Topic {
  /** Stable id = filename without extension, e.g. "0-KNTT-C1B1-X". */
  id: string
  grade: Grade
  chapter: number
  lesson: number
  /** Human-readable lesson title (Vietnamese). */
  title: string
  /** Chapter group label, for future section headers. */
  chapterTitle: string
  /** Original contributor for attribution. */
  teacher: string
}

export const TOPICS: ReadonlyArray<Topic> = [
  // ===== LỚP 10 — 15 bài =====
  {
    id: '0-KNTT-C1B1-X',
    grade: 10,
    chapter: 1,
    lesson: 1,
    title: 'Mệnh đề',
    chapterTitle: 'Mệnh đề & Tập hợp',
    teacher: 'Huỳnh Văn Quy',
  },
  {
    id: '0-KNTT-C1B2-X',
    grade: 10,
    chapter: 1,
    lesson: 2,
    title: 'Tập hợp và các phép toán',
    chapterTitle: 'Mệnh đề & Tập hợp',
    teacher: 'Nguyễn Tuấn',
  },
  {
    id: '0-KNTT-C2B3-X',
    grade: 10,
    chapter: 2,
    lesson: 3,
    title: 'Bất phương trình bậc nhất hai ẩn',
    chapterTitle: 'Bất phương trình & Hệ',
    teacher: 'Hồ Ngọc Nhất Linh',
  },
  {
    id: '0-KNTT-C2B4-X',
    grade: 10,
    chapter: 2,
    lesson: 4,
    title: 'Hệ bất phương trình bậc nhất hai ẩn',
    chapterTitle: 'Bất phương trình & Hệ',
    teacher: 'Trịnh Ngọc Minh',
  },
  {
    id: '0-KNTT-C3B5-X',
    grade: 10,
    chapter: 3,
    lesson: 5,
    title: 'Giá trị lượng giác của một góc',
    chapterTitle: 'Hệ thức lượng trong tam giác',
    teacher: 'Bùi Lợi',
  },
  {
    id: '0-KNTT-C3B6-X',
    grade: 10,
    chapter: 3,
    lesson: 6,
    title: 'Hệ thức lượng trong tam giác',
    chapterTitle: 'Hệ thức lượng trong tam giác',
    teacher: 'Đình Nguyên',
  },
  {
    id: '0-KNTT-C4B7-X',
    grade: 10,
    chapter: 4,
    lesson: 7,
    title: 'Khái niệm vectơ',
    chapterTitle: 'Vectơ',
    teacher: 'Mai Thái Phong',
  },
  {
    id: '0-KNTT-C4B8-X',
    grade: 10,
    chapter: 4,
    lesson: 8,
    title: 'Tổng và hiệu hai vectơ',
    chapterTitle: 'Vectơ',
    teacher: 'Huỳnh Công Minh',
  },
  {
    id: '0-KNTT-C4B9-X',
    grade: 10,
    chapter: 4,
    lesson: 9,
    title: 'Tích của vectơ với một số',
    chapterTitle: 'Vectơ',
    teacher: 'Lê Minh Cường',
  },
  {
    id: '0-KNTT-C4B10-X',
    grade: 10,
    chapter: 4,
    lesson: 10,
    title: 'Vectơ trong mặt phẳng toạ độ',
    chapterTitle: 'Vectơ',
    teacher: 'Huỳnh Trí Thiện',
  },
  {
    id: '0-KNTT-C4B11-X',
    grade: 10,
    chapter: 4,
    lesson: 11,
    title: 'Tích vô hướng của hai vectơ',
    chapterTitle: 'Vectơ',
    teacher: 'Nguyễn Hữu Trung Kiên',
  },
  {
    id: '0-KNTT-C5B12-X',
    grade: 10,
    chapter: 5,
    lesson: 12,
    title: 'Số gần đúng và sai số',
    chapterTitle: 'Thống kê',
    teacher: 'Bồ Văn Hậu',
  },
  {
    id: '0-KNTT-C5B13-X',
    grade: 10,
    chapter: 5,
    lesson: 13,
    title: 'Các số đặc trưng đo xu thế trung tâm',
    chapterTitle: 'Thống kê',
    teacher: 'Nguyễn Trí Minh Tuấn',
  },
  {
    id: '0-KNTT-C5B14-X',
    grade: 10,
    chapter: 5,
    lesson: 14,
    title: 'Các số đặc trưng đo độ phân tán',
    chapterTitle: 'Thống kê',
    teacher: 'Phúc Hậu',
  },
  {
    id: '0-KNTT-C8B25-X',
    grade: 10,
    chapter: 8,
    lesson: 25,
    title: 'Nhị thức Newton',
    chapterTitle: 'Đại số tổ hợp',
    teacher: 'Dương Xuân Lợi',
  },

  // ===== LỚP 11 — 20 bài =====
  {
    id: '1-KNTT-C1B1-X',
    grade: 11,
    chapter: 1,
    lesson: 1,
    title: 'Giá trị lượng giác của góc lượng giác',
    chapterTitle: 'Hàm số lượng giác',
    teacher: 'Phú Thạch',
  },
  {
    id: '1-KNTT-C1B2-X',
    grade: 11,
    chapter: 1,
    lesson: 2,
    title: 'Công thức lượng giác',
    chapterTitle: 'Hàm số lượng giác',
    teacher: 'Lê Phúc',
  },
  {
    id: '1-KNTT-C1B3-X',
    grade: 11,
    chapter: 1,
    lesson: 3,
    title: 'Hàm số lượng giác',
    chapterTitle: 'Hàm số lượng giác',
    teacher: 'Huynh Pham Minh Nguyen',
  },
  {
    id: '1-KNTT-C1B4-X',
    grade: 11,
    chapter: 1,
    lesson: 4,
    title: 'Phương trình lượng giác cơ bản',
    chapterTitle: 'Hàm số lượng giác',
    teacher: 'Hải Phụng',
  },
  {
    id: '1-KNTT-C2B5-X',
    grade: 11,
    chapter: 2,
    lesson: 5,
    title: 'Dãy số',
    chapterTitle: 'Dãy số — Cấp số',
    teacher: 'Nguyễn Liên Phúc Quỳnh',
  },
  {
    id: '1-KNTT-C2B6-X',
    grade: 11,
    chapter: 2,
    lesson: 6,
    title: 'Cấp số cộng',
    chapterTitle: 'Dãy số — Cấp số',
    teacher: 'Khổng Xuân Thạnh',
  },
  {
    id: '1-KNTT-C2B7-X',
    grade: 11,
    chapter: 2,
    lesson: 7,
    title: 'Cấp số nhân',
    chapterTitle: 'Dãy số — Cấp số',
    teacher: 'Dương Công Tạo',
  },
  {
    id: '1-KNTT-C3B8-X',
    grade: 11,
    chapter: 3,
    lesson: 8,
    title: 'Mẫu số liệu ghép nhóm',
    chapterTitle: 'Thống kê',
    teacher: 'Võ Hiệp',
  },
  {
    id: '1-KNTT-C3B9-X',
    grade: 11,
    chapter: 3,
    lesson: 9,
    title: 'Các số đặc trưng của mẫu ghép nhóm',
    chapterTitle: 'Thống kê',
    teacher: 'Lê Tấn Tuyên',
  },
  {
    id: '1-KNTT-C4B10-X',
    grade: 11,
    chapter: 4,
    lesson: 10,
    title: 'Đường thẳng và mặt phẳng trong không gian',
    chapterTitle: 'Quan hệ song song',
    teacher: 'Vương',
  },
  {
    id: '1-KNTT-C4B11-X',
    grade: 11,
    chapter: 4,
    lesson: 11,
    title: 'Hai đường thẳng song song',
    chapterTitle: 'Quan hệ song song',
    teacher: 'Huỳnh Quốc Đạt',
  },
  {
    id: '1-KNTT-C4B12-X',
    grade: 11,
    chapter: 4,
    lesson: 12,
    title: 'Đường thẳng và mặt phẳng song song',
    chapterTitle: 'Quan hệ song song',
    teacher: 'Vũ Hồng Toàn',
  },
  {
    id: '1-KNTT-C4B13-X',
    grade: 11,
    chapter: 4,
    lesson: 13,
    title: 'Hai mặt phẳng song song',
    chapterTitle: 'Quan hệ song song',
    teacher: 'Kiều Hòa Luân',
  },
  {
    id: '1-KNTT-C4B14-X',
    grade: 11,
    chapter: 4,
    lesson: 14,
    title: 'Phép chiếu song song',
    chapterTitle: 'Quan hệ song song',
    teacher: 'Liên Nguyễn',
  },
  {
    id: '1-KNTT-C5B15-X',
    grade: 11,
    chapter: 5,
    lesson: 15,
    title: 'Giới hạn của dãy số',
    chapterTitle: 'Giới hạn — Hàm số liên tục',
    teacher: 'Nhã Nguyễn',
  },
  {
    id: '1-KNTT-C5B16-X',
    grade: 11,
    chapter: 5,
    lesson: 16,
    title: 'Giới hạn của hàm số',
    chapterTitle: 'Giới hạn — Hàm số liên tục',
    teacher: 'Đoàn Văn Mùi',
  },
  {
    id: '1-KNTT-C5B17-X',
    grade: 11,
    chapter: 5,
    lesson: 17,
    title: 'Hàm số liên tục',
    chapterTitle: 'Giới hạn — Hàm số liên tục',
    teacher: 'Nguyễn Mạnh Trung Anh',
  },
  {
    id: '1-KNTT-C7B26-X',
    grade: 11,
    chapter: 7,
    lesson: 26,
    title: 'Khoảng cách trong không gian',
    chapterTitle: 'Quan hệ vuông góc',
    teacher: 'Trần Lê Vĩnh Phúc',
  },
  {
    id: '1-KNTT-C7B27-X',
    grade: 11,
    chapter: 7,
    lesson: 27,
    title: 'Thể tích khối đa diện',
    chapterTitle: 'Quan hệ vuông góc',
    teacher: 'Do Tan Loc / Nguyễn Cường / Nguyễn Đức Lợi',
  },
  {
    id: '1-KNTT-C9B31-X',
    grade: 11,
    chapter: 9,
    lesson: 31,
    title: 'Đạo hàm và ý nghĩa',
    chapterTitle: 'Đạo hàm',
    teacher: 'Trần Xuân Hoà',
  },

  // ===== LỚP 12 — 4 bài =====
  {
    id: '2-KNTT-C1B1-X',
    grade: 12,
    chapter: 1,
    lesson: 1,
    title: 'Tính đơn điệu và cực trị của hàm số',
    chapterTitle: 'Ứng dụng đạo hàm',
    teacher: 'Nguyễn Đức Tuấn Anh',
  },
  {
    id: '2-KNTT-C3B9-X',
    grade: 12,
    chapter: 3,
    lesson: 9,
    title: 'Khoảng biến thiên và khoảng tứ phân vị',
    chapterTitle: 'Thống kê',
    teacher: 'Huy Trần',
  },
  {
    id: '2-KNTT-C3B10-X',
    grade: 12,
    chapter: 3,
    lesson: 10,
    title: 'Phương sai và độ lệch chuẩn',
    chapterTitle: 'Thống kê',
    teacher: 'Nguyễn Hữu Cường',
  },
  {
    id: '2-KNTT-C5B17-X',
    grade: 12,
    chapter: 5,
    lesson: 17,
    title: 'Phương trình mặt cầu',
    chapterTitle: 'Phương pháp toạ độ trong không gian',
    teacher: 'Thien Tran Xuan',
  },
]

export function getTopicsByGrade(grade: Grade): ReadonlyArray<Topic> {
  return TOPICS.filter((topic) => topic.grade === grade)
}

export function getTopicById(id: string): Topic | undefined {
  return TOPICS.find((topic) => topic.id === id)
}

/**
 * Group topics of a given grade by chapterTitle, preserving insertion order.
 * Useful for rendering grouped checkbox lists in the WeakTopics step.
 */
export function groupTopicsByChapter(
  grade: Grade,
): ReadonlyArray<{ chapter: string; topics: ReadonlyArray<Topic> }> {
  const groups = new Map<string, Topic[]>()
  for (const topic of getTopicsByGrade(grade)) {
    const bucket = groups.get(topic.chapterTitle) ?? []
    bucket.push(topic)
    groups.set(topic.chapterTitle, bucket)
  }
  return Array.from(groups.entries()).map(([chapter, topics]) => ({
    chapter,
    topics,
  }))
}
