/**
 * Knowledge Tree — 4-stage growth model.
 *
 * Maps each Topic to one of 4 stages (Mầm non / Chồi non / Vươn thân /
 * Ra hoa – kết quả) using a `stability` score blended from mastery, BKT,
 * SRS streak, unresolved errors, and learning regularity.
 *
 * The tree is rebuilt on every page visit from `KnowledgeProfile` +
 * `LearnerState` — no persistence.
 */

import type { Grade } from './user'

export type TreeStage = 'mam-non' | 'choi-non' | 'vuon-than' | 'ra-hoa'

export interface TreeStageMeta {
  id: TreeStage
  label: string
  min: number
  /** Inclusive max (except the last band, which extends past 1.0 by epsilon). */
  max: number
  icon: string
  /** Hex used for leaf fill + chip color. */
  color: string
  /** Tailwind ring/border accent. */
  accent: string
  description: string
}

export const TREE_STAGES: ReadonlyArray<TreeStageMeta> = [
  {
    id: 'mam-non',
    label: 'Mầm non',
    min: 0.0,
    max: 0.3,
    icon: '🌱',
    color: '#fb7185',
    accent: 'border-rose-200 bg-rose-50 text-rose-700',
    description: 'Rễ còn nông, cần học nền tảng',
  },
  {
    id: 'choi-non',
    label: 'Chồi non',
    min: 0.3,
    max: 0.55,
    icon: '🌿',
    color: '#f59e0b',
    accent: 'border-amber-200 bg-amber-50 text-amber-700',
    description: 'Đã hiểu cơ bản nhưng chưa ổn định',
  },
  {
    id: 'vuon-than',
    label: 'Vươn thân',
    min: 0.55,
    max: 0.8,
    icon: '🌳',
    color: '#14b8a6',
    accent: 'border-teal-200 bg-teal-50 text-teal-700',
    description: 'Thân chắc, có thể vận dụng',
  },
  {
    id: 'ra-hoa',
    label: 'Ra hoa – kết quả',
    min: 0.8,
    max: 1.01,
    icon: '🌸',
    color: '#059669',
    accent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    description: 'Nắm chắc, có thể hỗ trợ bạn khác',
  },
]

/** Per-topic node — the "leaf" of the tree. */
export interface TopicTreeNode {
  topicId: string
  title: string
  chapterTitle: string
  chapterNumber: number
  grade: Grade
  /** Blended mastery from `TopicMastery` (0..1). */
  mastery: number
  /** Stability score 0..1 — drives stage. */
  stability: number
  /** 1 − stability. Surfaces to Priority formula. */
  fragility: number
  stage: TreeStage
  tested: boolean
  attempts: number
  unresolvedErrors: number
  consecutiveCorrect: number
  /** Lowest level with attempts === 0 or avgScore < target. */
  weakestLevel: 'N' | 'H' | 'V' | 'T' | null
  /** Days since the most recent error on this topic. `null` if no errors. */
  recentErrorDays: number | null
}

/** One chapter's worth of topics — the "main branch" of the tree. */
export interface ChapterTreeBranch {
  chapterTitle: string
  chapterNumber: number
  topics: TopicTreeNode[]
  avgMastery: number
  avgStability: number
  stage: TreeStage
}

/** Top-level tree model consumed by visualization components. */
export interface KnowledgeTreeModel {
  grade: Grade
  /** 0..1 — drives trunk height visually. */
  trunkStrength: number
  overallStage: TreeStage
  branches: ChapterTreeBranch[]
  /** Counts per stage across every topic — used by MiniKnowledgeTree chips. */
  stageCounts: Record<TreeStage, number>
  builtAt: string
}
