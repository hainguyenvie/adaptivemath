/**
 * Phase 3 — Knowledge Profile data model.
 *
 * Pure types only. All computation lives in `lib/profiling.ts`. The whole
 * profile is rebuilt from scratch each time the user visits `/profile` —
 * there is no persisted profile blob, only the source diagnostic session
 * in localStorage.
 */

import type { Goal } from './user'

/** Five-band mastery classification used across the profile UI. */
export type MasteryBand =
  | 'chua-biet' // 0.00–0.30
  | 'dang-hoc' // 0.30–0.50
  | 'so-cap' // 0.50–0.70
  | 'kha' // 0.70–0.85
  | 'thanh-thao' // 0.85–1.00

export const MASTERY_BANDS: ReadonlyArray<{
  id: MasteryBand
  label: string
  min: number
  /** inclusive max (except the last band) */
  max: number
  /** Tailwind color token for bars + chips. */
  color: 'rose' | 'orange' | 'amber' | 'teal' | 'emerald'
}> = [
  { id: 'chua-biet', label: 'Chưa biết', min: 0, max: 0.3, color: 'rose' },
  { id: 'dang-hoc', label: 'Đang học', min: 0.3, max: 0.5, color: 'orange' },
  { id: 'so-cap', label: 'Sơ cấp', min: 0.5, max: 0.7, color: 'amber' },
  { id: 'kha', label: 'Khá', min: 0.7, max: 0.85, color: 'teal' },
  {
    id: 'thanh-thao',
    label: 'Thành thạo',
    min: 0.85,
    max: 1.0001, // slight epsilon so 1.0 sits in the last band
    color: 'emerald',
  },
]

/** Per-topic mastery — one per Topic in the student's grade. */
export interface TopicMastery {
  topicId: string
  title: string
  chapterTitle: string
  grade: 10 | 11 | 12
  /** Number of responses whose questionId belongs to this topic. */
  attempts: number
  /** Σ of response.score (accounts for partial TF scores). */
  correctWeighted: number
  /** correctWeighted / attempts — null if attempts === 0. */
  observed: number | null
  /**
   * Expected mastery for this topic at the student's current θ:
   *   mean(P(θ, q.irt)) across every q in the pool with q.topicId === t.
   * Acts as a Bayesian prior when attempts are few.
   */
  expected: number
  /** Confidence in the observed signal — min(1, attempts / 5). */
  confidence: number
  /** Final blended mastery — `confidence × observed + (1−c) × expected`. */
  mastery: number
  band: MasteryBand
  /** True when attempts > 0 — UI uses this to differentiate tested vs prior-only. */
  tested: boolean
  /**
   * Per-level response breakdown for this topic (only levels actually hit).
   * Empty keys stay at zero counts so the renderer can iterate safely.
   */
  levelBreakdown: Record<
    'N' | 'H' | 'V' | 'T' | 'unknown',
    { attempts: number; avgScore: number }
  >
  /** Mean end − start duration across answered responses. */
  avgDurationMs: number | null
}

/** Chapter-level rollup — one per distinct chapterTitle in the grade. */
export interface ChapterMastery {
  chapterTitle: string
  /** Weighted mean of topic mastery, weights = (attempts + 1). */
  mastery: number
  topicCount: number
  testedCount: number
}

/** Gap-analysis row — only topics with gap > 0.15 are included. */
export interface GapInfo {
  topicId: string
  title: string
  mastery: number
  target: number
  /** max(0, target − mastery). */
  gap: number
  /** 1.25 if topicId is in profile.weakTopicIds, else 1.0. */
  weakBonus: number
  /** gap × weakBonus — used for sort. */
  priority: number
}

/** Inferable error signals — 3 patterns plus meta. */
export interface ErrorSignals {
  /** Wrong answers submitted in < 30% of the per-item time cap. */
  careless: { count: number; examples: string[] }
  /** Wrong on items flagged as N (Nhận biết). */
  conceptGap: { count: number; examples: string[] }
  /**
   * Topics where the student passes N/H items but fails V/T items.
   * Requires ≥1 item in each bucket for a topic to qualify.
   */
  applicationWeak: { topicIds: string[] }
  /** Aggregate speed profile over the whole session. */
  speedProfile: {
    kind: 'fast' | 'medium' | 'slow'
    /** Mean of (duration / timeLimitForItem(q)) across answered responses. */
    avgRatio: number
  }
  /** Engagement heuristic — non-answer rate. */
  engagement: {
    answeredRate: number
    skippedCount: number
  }
}

/** Goal → target mastery lookup used by gap analysis. */
export const TARGET_BY_GOAL: Record<Goal, number> = {
  'giua-ky': 0.7,
  'cuoi-ky': 0.75,
  'thpt-qg': 0.85,
  'nang-cao': 0.95,
}

/** The final shape consumed by `KnowledgeProfilePage`. */
export interface KnowledgeProfile {
  /** ISO timestamp when this profile was derived. */
  builtAt: string
  grade: 10 | 11 | 12
  /** From the underlying session (clone, not live). */
  theta: number
  standardError: number
  /**
   * True if the estimate shouldn't be trusted yet — either SE is wide,
   * fewer than 10 responses were recorded, or the session was cancelled
   * manually. The UI surfaces this as an amber banner.
   */
  isPreliminary: boolean
  target: number
  /** Every topic in the student's grade, tested or not. */
  topics: TopicMastery[]
  chapters: ChapterMastery[]
  /** Filtered gap > 0.15, sorted by priority desc, capped at 8. */
  gaps: GapInfo[]
  signals: ErrorSignals
  stats: {
    totalAnswered: number
    totalCorrect: number
    avgDurationMs: number
    /** Debug: responses whose questionId was not in the pool. */
    orphanResponses: number
  }
}
