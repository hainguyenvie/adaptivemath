/**
 * RLHF — multi-source human feedback for activity reranking.
 *
 * Thesis Approach #3: every recommended activity is re-ranked through a
 * weighted reward function:
 *
 *   R = 0.35·R_system + 0.25·R_teacher + 0.15·R_parent + 0.15·R_self + 0.10·R_peer
 *
 * Weights shift toward the teacher near exam deadlines. Self & peer ratings
 * are clamped to [-0.5, +0.5] to suppress noise. When human feedback
 * persistently contradicts the system signal, the model flags "needs more
 * data" and refuses to over-correct.
 *
 * All feedback is stored as `FeedbackEvent` records keyed by source, topic,
 * and timestamp — the reranker reads the most recent K and applies
 * exponential recency decay.
 */

export type FeedbackSource =
  | 'system' // auto-derived from session metrics
  | 'teacher' // marked priority / comment / approval
  | 'parent' // regularity & motivation observations
  | 'self' // post-session confidence / overload / interest
  | 'peer' // community inspire / peer-outcome similarity

export type FeedbackKind =
  // Teacher kinds
  | 'priority' // teacher marks a topic as high-priority
  | 'comment' // free-text comment
  | 'approve' // teacher approves a suggested activity
  | 'reject' // teacher rejects / wants to delay an activity
  | 'suitability' // teacher confirms suitability score (0..1)
  // Parent kinds
  | 'regularity' // observation on study cadence
  | 'mood' // motivation / focus observation
  | 'concern' // flagged concern about a topic / habit
  | 'goal' // parent-set focus area for the week
  // Self kinds
  | 'confidence' // 1..5 → 0..1
  | 'overload' // 1..5 → 0..1 (HIGH overload = NEGATIVE rating)
  | 'interest' // 1..5 → 0..1
  | 'session_self' // composite self rating from a session form
  // Peer kinds
  | 'peer_outcome' // peer cohort improved via similar activity
  | 'peer_inspire' // community inspire count
  | 'peer_comment' // community comment sentiment
  // System kind
  | 'session_outcome' // accuracy + mastery delta from a finalized session

export interface FeedbackEvent {
  id: string
  source: FeedbackSource
  kind: FeedbackKind
  /**
   * Subject — topic id this feedback concerns. Most feedback is attached
   * to a topic so the reranker can ask "what's the topic reward?". For
   * activity-specific feedback, also set `activityId`.
   */
  topicId?: string
  /** Activity id (from LearningPath) — optional, for activity-level feedback. */
  activityId?: string
  /**
   * Normalized rating in [-1, +1]:
   *   +1 = strong positive ("học sinh nên đẩy chủ đề này")
   *   −1 = strong negative ("nên hoãn")
   *   0  = neutral / no information
   */
  rating: number
  /** Confidence in this single event 0..1 — used as multiplier. */
  confidence: number
  /** ISO timestamp of the observation. */
  timestamp: string
  /** Free-text note (optional). */
  note?: string
  /** Who created it — for teacher/parent, references the seed id. */
  authorId?: string
  /** Display name for audit log. */
  authorName?: string
  /** Extra metadata blob. */
  metadata?: Record<string, unknown>
}

export const SOURCE_BASE_WEIGHTS: Record<FeedbackSource, number> = {
  system: 0.35,
  teacher: 0.25,
  parent: 0.15,
  self: 0.15,
  peer: 0.1,
}

/**
 * Clamp ranges per source — applied **before** weighting. Self & peer are
 * known to be noisier so we squash them to ±0.5.
 */
export const SOURCE_CLAMP: Record<FeedbackSource, [number, number]> = {
  system: [-1, 1],
  teacher: [-1, 1],
  parent: [-0.75, 0.75],
  self: [-0.5, 0.5],
  peer: [-0.5, 0.5],
}

/** Decay used by recency aggregation: `weight_i = decay^i` for the i-th event back. */
export const RECENCY_DECAY = 0.7

/** Threshold for contradiction flag — |R_system − R_human| over N sessions. */
export const CONTRADICTION_THRESHOLD = 0.45
export const CONTRADICTION_WINDOW = 3

// ---------------------------------------------------------------------------
// Reward breakdown — what the reranker emits per topic / activity
// ---------------------------------------------------------------------------

export interface PerSourceReward {
  source: FeedbackSource
  /** Raw rating in [-1,+1] aggregated across recent events. */
  raw: number
  /** Clamped rating. */
  clamped: number
  /** Final weight applied (may differ from base due to exam shift). */
  weight: number
  /** weight × clamped. */
  contribution: number
  /** Number of feedback events used. */
  eventCount: number
}

export interface RewardBreakdown {
  topicId: string
  /** Sum of contributions → in roughly [-1, +1]. */
  totalReward: number
  perSource: PerSourceReward[]
  /** True when human feedback contradicts system signal recently. */
  contradiction: boolean
  /** Days to exam deadline — null if no deadline. */
  daysToExam: number | null
  /** ISO timestamp the breakdown was computed at. */
  builtAt: string
}

// ---------------------------------------------------------------------------
// Reranker output
// ---------------------------------------------------------------------------

export interface RerankedTopic {
  topicId: string
  /** Original score from pathGenerator (gap/urgency/fragility/exam/weak). */
  baseScore: number
  /** Reward in [-1,+1] from RewardBreakdown. */
  reward: number
  /** Final score = baseScore × (1 + α·reward). */
  finalScore: number
  /** Pre-rerank rank (1-based). */
  oldRank: number
  /** Post-rerank rank (1-based). */
  newRank: number
  /** Δ rank (positive = promoted, negative = demoted). */
  rankDelta: number
  breakdown: RewardBreakdown
}

export interface RerankerOutput {
  topics: RerankedTopic[]
  /** α parameter used. */
  alpha: number
  /** Whether any topic was flagged as needing more data. */
  needsMoreData: boolean
  /** Map topicId → flag. */
  flagsByTopic: Record<string, string>
}

// ---------------------------------------------------------------------------
// Role identity — current viewer's role (student / teacher / parent)
// ---------------------------------------------------------------------------

export type ViewerRole = 'student' | 'teacher' | 'parent'

export const ROLE_META: Record<
  ViewerRole,
  { label: string; icon: string; color: string }
> = {
  student: { label: 'Học sinh', icon: 'school', color: '#003527' },
  teacher: { label: 'Giáo viên', icon: 'co_present', color: '#1d4ed8' },
  parent: { label: 'Phụ huynh', icon: 'family_restroom', color: '#a16207' },
}

export const SOURCE_META: Record<
  FeedbackSource,
  { label: string; icon: string; color: string; tint: string }
> = {
  system: { label: 'Hệ thống', icon: 'bolt', color: '#0e7490', tint: 'bg-cyan-50 border-cyan-200 text-cyan-900' },
  teacher: { label: 'Giáo viên', icon: 'co_present', color: '#1d4ed8', tint: 'bg-blue-50 border-blue-200 text-blue-900' },
  parent: { label: 'Phụ huynh', icon: 'family_restroom', color: '#a16207', tint: 'bg-amber-50 border-amber-200 text-amber-900' },
  self: { label: 'Bản thân', icon: 'self_improvement', color: '#0f766e', tint: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  peer: { label: 'Bạn bè', icon: 'group', color: '#7e22ce', tint: 'bg-purple-50 border-purple-200 text-purple-900' },
}
