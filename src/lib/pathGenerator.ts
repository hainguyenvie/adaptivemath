/**
 * Phase 4 — Learning Path generator (v2).
 *
 * Given the student's KnowledgeProfile + UserProfile + question pool,
 * produce a concrete day-by-day study schedule with theory reading,
 * multi-level practice (N → H → V), and interleaved review days.
 *
 * Each gap topic generates multiple sessions:
 *   1. Theory — read definitions + worked examples (~10 min)
 *   2. Practice N — 5 questions at Nhận biết level (~15 min)
 *   3. Practice H — 5 questions at Thông hiểu level (~15 min)
 *   4. Practice V — 5 questions at Vận dụng level (~15 min) [if gap exists]
 *
 * Sessions are packed into daily slots respecting `dailyMinutes`,
 * interleaved with review days every 3 learn days. Topics are ordered by
 * composite priority score and curriculum order tiebreak.
 */

import type { KnowledgeProfile, TopicMastery } from '../types/profile'
import type { Question } from '../types/question'
import type { UserProfile } from '../types/user'
import type { Topic } from '../data/topics'
import type {
  Activity,
  DaySession,
  LearningPath,
  Sprint,
  TopicPriority,
} from '../types/learningPath'
import type { LevelLetter } from '../types/question'
import { TOPICS } from '../data/topics'
import { QUESTION_BANK } from './questionBank'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUESTIONS_PER_SESSION = 5
const QUESTIONS_PER_REVIEW = 3
const REVIEW_EVERY_N_DAYS = 4
const MAX_NEW_TOPICS_PER_DAY = 2
const THEORY_MINUTES = 10
const PRACTICE_MINUTES = 15
const MAX_DAYS = 90

const PRIORITY_WEIGHTS = {
  gap: 0.40,
  urgency: 0.25,
  weak: 0.20,
  exam: 0.15,
}

function todayVN(): Date {
  const now = new Date()
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const dateStr = vnTime.toISOString().slice(0, 10)
  return new Date(dateStr + 'T00:00:00')
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// A "session" is the smallest unit of work — one activity slot.
// The packer fills days with these.
// ---------------------------------------------------------------------------

interface SessionSlot {
  activity: Activity
  topicId: string
  /** Used to sort within a day — theory before practice. */
  phase: number // 0=theory, 1=practiceN, 2=practiceH, 3=practiceV
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function generateLearningPath(
  profile: UserProfile,
  knowledge: KnowledgeProfile,
  pool: Question[],
): LearningPath {
  const startDate = todayVN()
  const priorityList = buildPriorityList(profile, knowledge, pool)
  stabilitySort(priorityList)

  // Generate all session slots for every gap topic.
  const allSlots = generateSessionSlots(priorityList)

  // Pack into days with review interleaving.
  const days = packIntoDays(allSlots, profile.dailyMinutes, startDate)

  // Group into sprints.
  const sprints = groupIntoSprints(days, startDate)

  const lastDay = days.at(-1)
  const estCompletion = lastDay ? lastDay.date : dateStr(startDate)

  return {
    builtAt: new Date().toISOString(),
    grade: knowledge.grade,
    goal: profile.goal,
    dailyMinutes: profile.dailyMinutes,
    deadline: profile.deadline,
    estimatedCompletionDate: estCompletion,
    totalDays: days.length,
    totalTopics: priorityList.length,
    sprints,
    priorityList,
  }
}

// ---------------------------------------------------------------------------
// Priority scoring (unchanged logic, cleaner code)
// ---------------------------------------------------------------------------

function buildPriorityList(
  profile: UserProfile,
  knowledge: KnowledgeProfile,
  pool: Question[],
): TopicPriority[] {
  const weakSet = new Set(profile.weakTopicIds)
  const examCountByTopic = new Map<string, number>()
  const totalCountByTopic = new Map<string, number>()
  for (const q of pool) {
    totalCountByTopic.set(q.topicId, (totalCountByTopic.get(q.topicId) ?? 0) + 1)
    if (q.source) {
      examCountByTopic.set(q.topicId, (examCountByTopic.get(q.topicId) ?? 0) + 1)
    }
  }
  const urgency = computeUrgency(profile.deadline)

  const list: TopicPriority[] = []
  for (const gap of knowledge.gaps) {
    const tm = knowledge.topics.find((t) => t.topicId === gap.topicId)
    if (!tm) continue
    const examTotal = totalCountByTopic.get(gap.topicId) ?? 1
    const examSourced = examCountByTopic.get(gap.topicId) ?? 0
    const examDensity = examSourced / examTotal
    const weakBonus = weakSet.has(gap.topicId) ? 1.0 : 0.0
    const score =
      PRIORITY_WEIGHTS.gap * gap.gap +
      PRIORITY_WEIGHTS.urgency * urgency +
      PRIORITY_WEIGHTS.weak * weakBonus +
      PRIORITY_WEIGHTS.exam * examDensity

    const gapLevels = computeGapLevels(tm, knowledge.target)
    // Time = theory + one session per gap level.
    const estMinutes = THEORY_MINUTES + gapLevels.length * PRACTICE_MINUTES

    list.push({
      topicId: gap.topicId,
      title: gap.title,
      mastery: gap.mastery,
      gap: gap.gap,
      urgency,
      weakBonus,
      examDensity,
      score,
      estimatedMinutes: estMinutes,
      gapLevels,
    })
  }
  list.sort((a, b) => b.score - a.score)
  return list
}

function computeUrgency(deadline: string | null): number {
  if (!deadline) return 0.5
  const daysLeft = Math.max(
    0,
    (new Date(deadline).getTime() - Date.now()) / 86_400_000,
  )
  if (daysLeft <= 0) return 1.0
  return Math.max(0, 1 - daysLeft / 90)
}

function computeGapLevels(
  tm: TopicMastery,
  target: number,
): LevelLetter[] {
  const levels: LevelLetter[] = []
  for (const lv of ['N', 'H', 'V'] as const) {
    const b = tm.levelBreakdown[lv]
    if (b.attempts === 0 || b.avgScore < target) levels.push(lv)
  }
  if (levels.length === 0 && tm.mastery < target) levels.push('N')
  return levels
}

// ---------------------------------------------------------------------------
// Stability sort
// ---------------------------------------------------------------------------

function stabilitySort(list: TopicPriority[]): void {
  const meta = new Map<string, Topic>()
  for (const t of TOPICS) meta.set(t.id, t)
  for (let i = 0; i < list.length - 1; i++) {
    if (Math.abs(list[i].score - list[i + 1].score) < 0.1) {
      const a = meta.get(list[i].topicId)
      const b = meta.get(list[i + 1].topicId)
      if (a && b && a.chapter * 100 + a.lesson > b.chapter * 100 + b.lesson) {
        ;[list[i], list[i + 1]] = [list[i + 1], list[i]]
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Session slot generation
// ---------------------------------------------------------------------------

/**
 * For each gap topic, generate the sequence of session slots:
 *   theory → N practice → H practice → V practice (if gap exists at that level)
 * This is the "N → H → V progression" the user asked for.
 */
function generateSessionSlots(priorities: TopicPriority[]): SessionSlot[] {
  const theoryByTopic = new Map(
    QUESTION_BANK.theory.map((t) => [t.topicId, t]),
  )
  const slots: SessionSlot[] = []

  for (const p of priorities) {
    const theory = theoryByTopic.get(p.topicId)
    const knowledgeCount =
      theory?.knowledgeBlocks.filter((b) => b.type !== 'section').length ?? 0
    const exampleCount =
      theory?.methodBlocks.filter((b) => b.type === 'vd').length ?? 0

    // Phase 0: Theory reading (always first).
    if (knowledgeCount + exampleCount > 0) {
      slots.push({
        topicId: p.topicId,
        phase: 0,
        activity: {
          activityId: `${p.topicId}::theory`,
          type: 'theory',
          topicId: p.topicId,
          topicTitle: p.title,
          levels: [],
          questionCount: 0,
          theoryBlockCount: knowledgeCount,
          workedExampleCount: exampleCount,
          estimatedMinutes: THEORY_MINUTES,
          reason: `${knowledgeCount} khái niệm + ${exampleCount} ví dụ mẫu`,
        },
      })
    }

    // Phase 1-3: Practice sessions per gap level — each gets a UNIQUE ID
    // including the level so that "learn N" and "practice H" for the same
    // topic are tracked independently.
    for (let i = 0; i < p.gapLevels.length; i++) {
      const lv = p.gapLevels[i]
      const type = i === 0 ? 'learn' : 'practice'
      slots.push({
        topicId: p.topicId,
        phase: i + 1,
        activity: {
          activityId: `${p.topicId}::${type}-${lv}`,
          type,
          topicId: p.topicId,
          topicTitle: p.title,
          levels: [lv],
          questionCount: QUESTIONS_PER_SESSION,
          theoryBlockCount: 0,
          workedExampleCount: 0,
          estimatedMinutes: PRACTICE_MINUTES,
          reason: `gap ${p.gap.toFixed(2)}, level ${lv}, prio ${p.score.toFixed(3)}`,
        },
      })
    }
  }

  return slots
}

// ---------------------------------------------------------------------------
// Day packing
// ---------------------------------------------------------------------------

function packIntoDays(
  slots: SessionSlot[],
  dailyMinutes: number,
  startDate: Date,
): DaySession[] {
  if (slots.length === 0) return []

  const days: DaySession[] = []
  const queue = [...slots]
  const recentTopics: Array<{
    topicId: string
    title: string
    levels: LevelLetter[]
  }> = []
  let learnDaysSinceReview = 0
  let dayNumber = 0

  while (queue.length > 0 || (learnDaysSinceReview > 0 && recentTopics.length > 0)) {
    dayNumber++
    if (dayNumber > MAX_DAYS) break

    const date = addDays(startDate, dayNumber - 1)
    const ds = dateStr(date)

    // Review day?
    const shouldReview =
      recentTopics.length > 0 &&
      (learnDaysSinceReview >= REVIEW_EVERY_N_DAYS - 1 || queue.length === 0)

    if (shouldReview) {
      const reviewActs = buildReviewActivities(recentTopics.slice(-6))
      days.push({
        dayNumber,
        date: ds,
        activities: reviewActs,
        estimatedMinutes: reviewActs.reduce((s, a) => s + a.estimatedMinutes, 0),
        isReviewDay: true,
      })
      learnDaysSinceReview = 0
      recentTopics.length = 0
      continue
    }

    if (queue.length === 0) break

    // Fill the day with sessions from the queue.
    const activities: Activity[] = []
    let minutesLeft = dailyMinutes
    let newTopicsToday = 0
    const topicsSeenToday = new Set<string>()

    while (queue.length > 0 && minutesLeft >= 5) {
      const next = queue[0]

      // Check new-topic cap: if this slot's topic hasn't been in any
      // previous day and we've already started 2 new topics today, skip.
      const isNewTopic = !recentTopics.some((r) => r.topicId === next.topicId) &&
        !topicsSeenToday.has(next.topicId)
      if (isNewTopic && newTopicsToday >= MAX_NEW_TOPICS_PER_DAY) break

      if (next.activity.estimatedMinutes > minutesLeft && activities.length > 0) {
        // Can't fit this session today but already have some → stop filling.
        break
      }

      queue.shift()
      activities.push(next.activity)
      minutesLeft -= next.activity.estimatedMinutes

      if (isNewTopic) {
        newTopicsToday++
        topicsSeenToday.add(next.topicId)
      }

      // Track for review scheduling.
      if (next.activity.type !== 'theory') {
        if (!recentTopics.some((r) => r.topicId === next.topicId)) {
          recentTopics.push({
            topicId: next.topicId,
            title: next.activity.topicTitle,
            levels: next.activity.levels,
          })
        }
      }
    }

    if (activities.length > 0) {
      days.push({
        dayNumber,
        date: ds,
        activities,
        estimatedMinutes: activities.reduce((s, a) => s + a.estimatedMinutes, 0),
        isReviewDay: false,
      })
      learnDaysSinceReview++
    } else {
      break
    }
  }

  return days
}

function buildReviewActivities(
  topics: Array<{ topicId: string; title: string; levels: LevelLetter[] }>,
): Activity[] {
  const seen = new Map<string, (typeof topics)[number]>()
  for (const t of topics) seen.set(t.topicId, t)
  return Array.from(seen.values())
    .slice(0, 3)
    .map((t, i) => ({
      activityId: `review-${Date.now()}-${t.topicId}-${i}`,
      type: 'review' as const,
      topicId: t.topicId,
      topicTitle: t.title,
      levels: t.levels.slice(0, 1),
      questionCount: QUESTIONS_PER_REVIEW,
      theoryBlockCount: 0,
      workedExampleCount: 0,
      estimatedMinutes: Math.round(
        (QUESTIONS_PER_REVIEW * 90) / 60,
      ),
      reason: 'ôn tập sau 3 ngày học',
    }))
}

// ---------------------------------------------------------------------------
// Sprint grouping
// ---------------------------------------------------------------------------

function groupIntoSprints(days: DaySession[], startDate: Date): Sprint[] {
  if (days.length === 0) return []
  const sprints: Sprint[] = []
  let weekStart = new Date(startDate)
  let weekNumber = 1
  let dayIdx = 0

  while (dayIdx < days.length) {
    const weekEnd = addDays(weekStart, 6)
    const sprintDays: DaySession[] = []
    while (dayIdx < days.length) {
      const dayDate = new Date(days[dayIdx].date)
      if (dayDate > weekEnd) break
      sprintDays.push(days[dayIdx])
      dayIdx++
    }
    if (sprintDays.length > 0) {
      const topicSet = new Set<string>()
      for (const d of sprintDays)
        for (const a of d.activities) topicSet.add(a.topicTitle)
      sprints.push({
        weekNumber,
        label: `Tuần ${weekNumber}`,
        startDate: dateStr(weekStart),
        endDate: dateStr(weekEnd),
        days: sprintDays,
        topicSummary: Array.from(topicSet),
      })
    }
    weekStart = addDays(weekEnd, 1)
    weekNumber++
    if (weekNumber > 15) break
  }
  return sprints
}
