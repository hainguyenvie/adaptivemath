/**
 * Tree stability — blends KnowledgeProfile signals with persisted LearnerState
 * (BKT, SRS, errors, streak) into a single 0..1 stability score per topic,
 * then maps to one of 4 growth stages.
 *
 * Pure functions only — no localStorage access here; caller passes in both
 * the KnowledgeProfile (diagnostic snapshot) and LearnerState (accumulated).
 */

import type { KnowledgeProfile, TopicMastery } from '../types/profile'
import type {
  BktState,
  ErrorEntry,
  LearnerState,
  SrsState,
} from '../types/learner'
import type {
  ChapterTreeBranch,
  KnowledgeTreeModel,
  TopicTreeNode,
  TreeStage,
} from '../types/knowledgeTree'
import { TREE_STAGES } from '../types/knowledgeTree'
import { getTopicById } from '../data/topics'

const STABILITY_WEIGHTS = {
  mastery: 0.35,
  bkt: 0.2,
  srsStreak: 0.15,
  resolution: 0.15,
  recency: 0.1,
  regularity: 0.05,
}

const SRS_STREAK_TARGET = 5
const REGULARITY_TARGET = 7
const RECENCY_FRESH_DAYS = 2
const RECENCY_HEALED_DAYS = 30

const MS_PER_DAY = 86_400_000

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

/** Map 0..1 stability → growth stage. */
export function classifyStage(stability: number): TreeStage {
  for (const s of TREE_STAGES) {
    if (stability >= s.min && stability < s.max) return s.id
  }
  return stability >= 1 ? 'ra-hoa' : 'mam-non'
}

export interface StabilityResult {
  stability: number
  unresolvedErrors: number
  recentErrorDays: number | null
}

/**
 * Compute the stability score and supporting counts for a single topic.
 * Returns a value in [0, 1].
 */
export function computeStability(
  topic: TopicMastery,
  bkt: BktState | undefined,
  srs: SrsState | undefined,
  errorsForTopic: ErrorEntry[],
  currentStreak: number,
): StabilityResult {
  const masteryComponent = clamp01(topic.mastery)
  const bktComponent = clamp01(bkt?.pL ?? topic.mastery)

  const srsStreak = srs?.consecutiveCorrect ?? 0
  const srsComponent = clamp01(srsStreak / SRS_STREAK_TARGET)

  const unresolvedErrors = errorsForTopic.filter((e) => !e.resolved).length
  // Denominator: prefer attempts so we don't punish a brand-new topic with
  // zero attempts. If no attempts, treat resolution as neutral 1.0.
  const denom = Math.max(topic.attempts, 1)
  const unresolvedRatio = clamp01(unresolvedErrors / denom)
  const resolutionComponent = topic.attempts === 0 ? 1 : 1 - unresolvedRatio

  let recentErrorDays: number | null = null
  if (errorsForTopic.length > 0) {
    const newest = errorsForTopic.reduce((max, e) => {
      const t = Date.parse(e.timestamp)
      return Number.isFinite(t) && t > max ? t : max
    }, 0)
    if (newest > 0) {
      recentErrorDays = Math.max(0, (Date.now() - newest) / MS_PER_DAY)
    }
  }
  const recencyComponent =
    recentErrorDays === null
      ? 1
      : clamp01(
          (recentErrorDays - RECENCY_FRESH_DAYS) /
            (RECENCY_HEALED_DAYS - RECENCY_FRESH_DAYS),
        )

  const regularityComponent = clamp01(currentStreak / REGULARITY_TARGET)

  const stability = clamp01(
    STABILITY_WEIGHTS.mastery * masteryComponent +
      STABILITY_WEIGHTS.bkt * bktComponent +
      STABILITY_WEIGHTS.srsStreak * srsComponent +
      STABILITY_WEIGHTS.resolution * resolutionComponent +
      STABILITY_WEIGHTS.recency * recencyComponent +
      STABILITY_WEIGHTS.regularity * regularityComponent,
  )

  return { stability, unresolvedErrors, recentErrorDays }
}

/**
 * Pick the lowest Bloom level that needs attention. Returns null if every
 * level is either solid or untested with target met overall.
 */
function pickWeakestLevel(
  topic: TopicMastery,
  target: number,
): TopicTreeNode['weakestLevel'] {
  const order: Array<'N' | 'H' | 'V' | 'T'> = ['N', 'H', 'V', 'T']
  for (const lv of order) {
    const b = topic.levelBreakdown[lv]
    if (!b) continue
    if (b.attempts === 0 || b.avgScore < target) return lv
  }
  return null
}

/**
 * Build the full tree model from the diagnostic profile + persisted learner
 * state. Caller passes both; either may be empty/missing (handled gracefully).
 */
export function buildKnowledgeTree(
  knowledge: KnowledgeProfile,
  learner: LearnerState,
): KnowledgeTreeModel {
  const errorsByTopic = new Map<string, ErrorEntry[]>()
  for (const e of learner.errors) {
    const bucket = errorsByTopic.get(e.topicId) ?? []
    bucket.push(e)
    errorsByTopic.set(e.topicId, bucket)
  }

  const currentStreak = learner.gamification.currentStreak

  const nodes: TopicTreeNode[] = knowledge.topics.map((tm) => {
    const meta = getTopicById(tm.topicId)
    const chapterNumber = meta?.chapter ?? 0
    const bkt = learner.bkt[tm.topicId]
    const srs = learner.srs[tm.topicId]
    const errors = errorsByTopic.get(tm.topicId) ?? []
    const { stability, unresolvedErrors, recentErrorDays } = computeStability(
      tm,
      bkt,
      srs,
      errors,
      currentStreak,
    )
    const stage = classifyStage(stability)
    return {
      topicId: tm.topicId,
      title: tm.title,
      chapterTitle: tm.chapterTitle,
      chapterNumber,
      grade: tm.grade,
      mastery: tm.mastery,
      stability,
      fragility: clamp01(1 - stability),
      stage,
      tested: tm.tested,
      attempts: tm.attempts,
      unresolvedErrors,
      consecutiveCorrect: srs?.consecutiveCorrect ?? 0,
      weakestLevel: pickWeakestLevel(tm, knowledge.target),
      recentErrorDays,
    }
  })

  // Group into chapter branches, preserve curriculum order.
  const branchMap = new Map<string, TopicTreeNode[]>()
  const chapterOrder = new Map<string, number>()
  for (const n of nodes) {
    const bucket = branchMap.get(n.chapterTitle) ?? []
    bucket.push(n)
    branchMap.set(n.chapterTitle, bucket)
    const existing = chapterOrder.get(n.chapterTitle)
    if (existing === undefined || n.chapterNumber < existing) {
      chapterOrder.set(n.chapterTitle, n.chapterNumber)
    }
  }

  const branches: ChapterTreeBranch[] = Array.from(branchMap.entries())
    .map(([chapterTitle, topics]) => {
      const sortedTopics = [...topics].sort(
        (a, b) =>
          a.chapterNumber - b.chapterNumber || a.topicId.localeCompare(b.topicId),
      )
      const avgMastery =
        sortedTopics.reduce((s, t) => s + t.mastery, 0) / sortedTopics.length
      const avgStability =
        sortedTopics.reduce((s, t) => s + t.stability, 0) / sortedTopics.length
      return {
        chapterTitle,
        chapterNumber: chapterOrder.get(chapterTitle) ?? 0,
        topics: sortedTopics,
        avgMastery,
        avgStability,
        stage: classifyStage(avgStability),
      }
    })
    .sort((a, b) => a.chapterNumber - b.chapterNumber)

  const trunkStrength =
    branches.length > 0
      ? clamp01(
          branches.reduce((s, b) => s + b.avgStability, 0) / branches.length,
        )
      : 0

  const stageCounts: Record<TreeStage, number> = {
    'mam-non': 0,
    'choi-non': 0,
    'vuon-than': 0,
    'ra-hoa': 0,
  }
  for (const n of nodes) stageCounts[n.stage] += 1

  return {
    grade: knowledge.grade,
    trunkStrength,
    overallStage: classifyStage(trunkStrength),
    branches,
    stageCounts,
    builtAt: new Date().toISOString(),
  }
}
