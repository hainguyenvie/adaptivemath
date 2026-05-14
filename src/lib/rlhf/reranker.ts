/**
 * RLHF reranker.
 *
 * Given a base `TopicPriority[]` from `pathGenerator`, recompute final
 * scores using the multi-source reward function and emit a `RerankerOutput`
 * with promotion / demotion deltas + per-topic breakdowns.
 *
 *   finalScore = baseScore × (1 + α · reward)
 *
 * where `α` defaults to 0.6 (capped so reward can never flip the sign of
 * baseScore). When the contradiction flag fires for a topic, we shrink α
 * locally to 0.2 — RLHF refuses to override the system blindly.
 */

import type { TopicPriority } from '../../types/learningPath'
import type { FeedbackEvent, RerankedTopic, RerankerOutput, RewardBreakdown } from '../../types/rlhf'
import { computeRewardForTopic, daysUntilDeadline } from './rewardModel'

export interface RerankInput {
  priorityList: TopicPriority[]
  events: FeedbackEvent[]
  deadline: string | null
  /** Reward leverage — how much R bends the base score. */
  alpha?: number
}

const DEFAULT_ALPHA = 0.6
const SHRUNK_ALPHA = 0.2

export function rerankPriorities(input: RerankInput): RerankerOutput {
  const daysToExam = daysUntilDeadline(input.deadline)
  const alpha = input.alpha ?? DEFAULT_ALPHA
  const flagsByTopic: Record<string, string> = {}
  let needsMoreData = false

  // Compute breakdowns + finalScore.
  const enriched: Array<{
    base: TopicPriority
    breakdown: RewardBreakdown
    finalScore: number
    effectiveAlpha: number
  }> = []
  for (const p of input.priorityList) {
    const breakdown = computeRewardForTopic({
      topicId: p.topicId,
      events: input.events,
      daysToExam,
    })
    const effectiveAlpha = breakdown.contradiction ? SHRUNK_ALPHA : alpha
    const finalScore = p.score * (1 + effectiveAlpha * breakdown.totalReward)
    if (breakdown.contradiction) {
      needsMoreData = true
      flagsByTopic[p.topicId] = 'Phản hồi mâu thuẫn — cần thêm dữ liệu trước khi điều chỉnh.'
    }
    enriched.push({ base: p, breakdown, finalScore, effectiveAlpha })
  }

  // Capture old ranks before sort.
  const oldRankByTopic = new Map<string, number>()
  input.priorityList.forEach((p, i) => oldRankByTopic.set(p.topicId, i + 1))

  // Sort by finalScore desc.
  enriched.sort((a, b) => b.finalScore - a.finalScore)

  const topics: RerankedTopic[] = enriched.map((e, idx) => {
    const newRank = idx + 1
    const oldRank = oldRankByTopic.get(e.base.topicId) ?? newRank
    return {
      topicId: e.base.topicId,
      baseScore: e.base.score,
      reward: e.breakdown.totalReward,
      finalScore: e.finalScore,
      oldRank,
      newRank,
      rankDelta: oldRank - newRank, // positive = moved up
      breakdown: e.breakdown,
    }
  })

  return {
    topics,
    alpha,
    needsMoreData,
    flagsByTopic,
  }
}

// ---------------------------------------------------------------------------
// Convenience: reorder a path's priorityList in place using reranker output
// ---------------------------------------------------------------------------

/**
 * Given a `TopicPriority[]` and a `RerankerOutput`, produce a new array
 * sorted to match the reranker's new ranks.
 */
export function applyRerankerToList(
  priorityList: TopicPriority[],
  reranker: RerankerOutput,
): TopicPriority[] {
  const rankByTopic = new Map<string, number>()
  for (const r of reranker.topics) rankByTopic.set(r.topicId, r.newRank)
  return [...priorityList].sort(
    (a, b) =>
      (rankByTopic.get(a.topicId) ?? 99) - (rankByTopic.get(b.topicId) ?? 99),
  )
}

/**
 * Quick numeric summary for the UI banner.
 */
export function summarizeReranker(reranker: RerankerOutput): {
  promoted: number
  demoted: number
  unchanged: number
  maxPromotion: number
} {
  let promoted = 0
  let demoted = 0
  let unchanged = 0
  let maxPromotion = 0
  for (const r of reranker.topics) {
    if (r.rankDelta > 0) {
      promoted += 1
      if (r.rankDelta > maxPromotion) maxPromotion = r.rankDelta
    } else if (r.rankDelta < 0) {
      demoted += 1
    } else {
      unchanged += 1
    }
  }
  return { promoted, demoted, unchanged, maxPromotion }
}
