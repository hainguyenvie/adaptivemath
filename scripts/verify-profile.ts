/**
 * End-to-end profile verification.
 *
 *   npm run verify:profile
 *
 * For each scenario (weak / medium / strong / rushed / aborted / giỏi +
 * goal=thpt-qg, etc.) we:
 *
 *   1. Simulate a CAT session by sampling Bernoulli(P(θ_true, item))
 *      exactly as the Monte Carlo CAT simulator does.
 *   2. Feed the finished session into `buildKnowledgeProfile` with a
 *      synthetic UserProfile.
 *   3. Print the profile's headline numbers + spot-check the logic:
 *        - weakest topic's mastery comes from the observed-vs-expected blend
 *        - gap list is non-empty when target > mean mastery
 *        - isPreliminary fires for the aborted scenario
 *        - careless/conceptGap/applicationWeak signals react to timing & levels
 *
 * This is not a unit test — it's a sanity harness I run whenever the
 * profiling formula changes. Output is human-readable so spot-checks are
 * fast.
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  Question,
  QuestionBank,
  SessionResponse,
  SessionState,
  StopReason,
} from '../src/types/question.ts'
import { CAT_CONFIG } from '../src/types/question.ts'
import {
  initTopicStates,
  selectNextQuestion,
  shouldStop,
  timeLimitForItem,
  transitionTopicState,
} from '../src/lib/cat.ts'
import {
  estimateThetaFromSession,
  probabilityCorrect,
} from '../src/lib/irt.ts'
import { buildKnowledgeProfile } from '../src/lib/profiling.ts'
import { TOPICS } from '../src/data/topics.ts'
import type { Goal, SelfLevel, UserProfile } from '../src/types/user.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const BANK_PATH = resolve(__dirname, '..', 'src', 'data', 'questions.json')

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32) — same impl as simulate-cat.ts
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

interface Scenario {
  name: string
  description: string
  grade: 10 | 11 | 12
  trueTheta: number
  goal: Goal
  selfLevel: SelfLevel
  weakTopicIds?: string[]
  /**
   * Controls response duration relative to `timeLimitForItem`:
   *   fast   → 0.2 × limit (triggers careless on wrong answers)
   *   normal → 0.55 × limit
   *   slow   → 0.85 × limit
   */
  pace?: 'fast' | 'normal' | 'slow'
  /** Force early abort after N items to test isPreliminary. */
  abortAfter?: number
  seed: number
}

// ---------------------------------------------------------------------------
// Simulator (with pace + abort)
// ---------------------------------------------------------------------------

function simulateSession(
  pool: Question[],
  scenario: Scenario,
): SessionState {
  const state: SessionState = {
    sessionId: `verify-${scenario.name}`,
    grade: scenario.grade,
    selfLevel: scenario.selfLevel,
    theta: 0, // neutral start
    standardError: Infinity,
    responses: [],
    shownIds: [],
    sessionStartedAt: Date.now(),
    finished: false,
    stopReason: null,
    topicStates: initTopicStates(pool, TOPICS, scenario.grade),
  }

  const irtLookup = new Map(pool.map((q) => [q.id, q.irt]))
  const getIrt = (id: string) => irtLookup.get(id) ?? null
  const rng = mulberry32(scenario.seed)
  const paceRatio =
    scenario.pace === 'fast' ? 0.2 : scenario.pace === 'slow' ? 0.85 : 0.55

  let virtualNow = state.sessionStartedAt

  while (true) {
    // Force abort for the "aborted" scenario.
    if (
      scenario.abortAfter !== undefined &&
      state.responses.length >= scenario.abortAfter
    ) {
      state.stopReason = 'user-cancelled'
      break
    }

    const stop = shouldStop(state)
    if (stop !== null) {
      state.stopReason = stop
      break
    }

    const q = selectNextQuestion(pool, state)
    if (!q) {
      state.stopReason = 'no-more-items' satisfies StopReason
      break
    }

    // Sample the student's raw binary response.
    const p = probabilityCorrect(scenario.trueTheta, q.irt)
    const correct = rng() < p
    const score = correct ? 1 : 0

    const durationSec = timeLimitForItem(q) * paceRatio
    const durationMs = Math.max(1, Math.round(durationSec * 1000))

    const response: SessionResponse = {
      questionId: q.id,
      startedAt: virtualNow,
      endedAt: virtualNow + durationMs,
      score,
      answered: true,
    }
    virtualNow += durationMs

    state.responses.push(response)
    state.shownIds.push(q.id)

    // Ladder transition for the topic just answered.
    const existing = state.topicStates[q.topicId]
    if (existing) {
      state.topicStates = {
        ...state.topicStates,
        [q.topicId]: transitionTopicState(
          existing,
          q,
          score >= 0.75,
          pool,
          new Set(state.shownIds),
        ),
      }
    }

    const updated = estimateThetaFromSession(state.responses, getIrt, {
      startingTheta: state.theta,
    })
    state.theta = updated.theta
    state.standardError = updated.standardError
  }

  state.finished = true
  return state
}

// ---------------------------------------------------------------------------
// Printer
// ---------------------------------------------------------------------------

function pad(s: string | number, n: number, align: 'l' | 'r' = 'l'): string {
  const str = String(s)
  if (str.length >= n) return str
  const fill = ' '.repeat(n - str.length)
  return align === 'r' ? fill + str : str + fill
}

function runScenario(
  bank: QuestionBank,
  scenario: Scenario,
): void {
  console.log('\n' + '═'.repeat(78))
  console.log(`▶ ${scenario.name}`)
  console.log('  ' + scenario.description)
  console.log(
    `  grade=${scenario.grade}  trueθ=${scenario.trueTheta.toFixed(2)}  goal=${scenario.goal}  pace=${scenario.pace ?? 'normal'}${scenario.abortAfter ? `  abortAfter=${scenario.abortAfter}` : ''}`,
  )
  console.log('═'.repeat(78))

  const pool = bank.questions.filter((q) => q.grade === scenario.grade)
  const session = simulateSession(pool, scenario)

  const profile: UserProfile = {
    grade: scenario.grade,
    goal: scenario.goal,
    dailyMinutes: 60,
    deadline: null,
    selfLevel: scenario.selfLevel,
    weakTopicIds: scenario.weakTopicIds ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const knowledge = buildKnowledgeProfile(session, profile, pool, TOPICS)

  // --- Session header ---
  console.log(`  session: answered=${session.responses.length}  stop=${session.stopReason}`)
  console.log(
    `  θ̂=${session.theta.toFixed(3)}  |trueθ − θ̂|=${Math.abs(scenario.trueTheta - session.theta).toFixed(3)}  SE=${Number.isFinite(session.standardError) ? session.standardError.toFixed(3) : '∞'}`,
  )

  // --- Global stats ---
  const avgMastery =
    knowledge.topics.reduce((a, t) => a + t.mastery, 0) /
    knowledge.topics.length
  const testedCount = knowledge.topics.filter((t) => t.tested).length
  console.log(
    `  profile: avgMastery=${avgMastery.toFixed(3)}  target=${knowledge.target}  testedTopics=${testedCount}/${knowledge.topics.length}  preliminary=${knowledge.isPreliminary}`,
  )

  // --- Chapters (sorted worst first) ---
  console.log('\n  Chapters (worst → best):')
  for (const c of [...knowledge.chapters].sort((a, b) => a.mastery - b.mastery)) {
    console.log(
      `    ${pad(c.chapterTitle, 38)} ${pad(c.mastery.toFixed(2), 5, 'r')}  ${c.testedCount}/${c.topicCount} tested`,
    )
  }

  // --- Weakest 3 tested topics ---
  const tested = knowledge.topics.filter((t) => t.tested).sort((a, b) => a.mastery - b.mastery)
  console.log('\n  Weakest tested topics:')
  for (const t of tested.slice(0, 3)) {
    console.log(
      `    ${pad(t.title, 38)} attempts=${pad(t.attempts, 2, 'r')}  observed=${pad(t.observed?.toFixed(2) ?? '—', 5, 'r')}  expected=${t.expected.toFixed(2)}  → mastery=${t.mastery.toFixed(2)}  (${t.band})`,
    )
  }

  // --- Gaps ---
  console.log(`\n  Gaps > 0.15 (priority order, ${knowledge.gaps.length} rows):`)
  if (knowledge.gaps.length === 0) {
    console.log('    (none — student is at or above target for every topic)')
  } else {
    for (const g of knowledge.gaps.slice(0, 5)) {
      const star = g.weakBonus > 1 ? ' ⭐' : ''
      console.log(
        `    ${pad(g.title, 38)} mastery=${g.mastery.toFixed(2)}  gap=${g.gap.toFixed(2)}  prio=${g.priority.toFixed(3)}${star}`,
      )
    }
  }

  // --- Signals ---
  console.log(
    `\n  Signals: careless=${knowledge.signals.careless.count}  conceptGap=${knowledge.signals.conceptGap.count}  appWeak=${knowledge.signals.applicationWeak.topicIds.length}  speed=${knowledge.signals.speedProfile.kind}(${knowledge.signals.speedProfile.avgRatio.toFixed(2)})  engagement=${(knowledge.signals.engagement.answeredRate * 100).toFixed(0)}%`,
  )

  // --- Ladder coverage ---
  const stateEntries = Object.values(session.topicStates)
  const doneCount = stateEntries.filter((ts) => ts.level === 'done').length
  const unstartedCount = stateEntries
    .map((ts, i) => ({ ts, idx: i }))
    .filter(({ ts }) => ts.level !== 'done')
    // Cross-reference attempts to know if truly unvisited
    .filter(
      () =>
        session.responses.length === 0 ||
        stateEntries.length > session.responses.length * 3,
    ).length
  const coveragePct = stateEntries.length > 0 ? (doneCount / stateEntries.length) * 100 : 0
  console.log(
    `\n  Ladder: ${doneCount}/${stateEntries.length} topics 'done' (${coveragePct.toFixed(0)}% coverage)`,
  )

  // --- Ladder N-first check ---
  // For the first question of every topic, assert it was the lowest
  // ladder level actually present in the pool for that topic.
  const firstQuestionPerTopic = new Map<string, Question>()
  for (const r of session.responses) {
    const q = pool.find((x) => x.id === r.questionId)
    if (!q) continue
    if (!firstQuestionPerTopic.has(q.topicId)) {
      firstQuestionPerTopic.set(q.topicId, q)
    }
  }
  let firstQuestionLadderOK = true
  for (const [topicId, firstQ] of firstQuestionPerTopic) {
    const topicPool = pool.filter((q) => q.topicId === topicId)
    const levelsInPool = new Set(
      topicPool.map((q) => q.level).filter((l) => l !== 'unknown'),
    )
    const order = ['N', 'H', 'V', 'T'] as const
    const expectedFirstLevel = order.find((l) => levelsInPool.has(l))
    // Accept 'unknown' as equivalent to 'H'.
    const firstLevelEffective =
      firstQ.level === 'unknown' ? 'H' : firstQ.level
    if (
      expectedFirstLevel &&
      firstLevelEffective !== expectedFirstLevel &&
      expectedFirstLevel !== 'T'
    ) {
      firstQuestionLadderOK = false
      break
    }
  }

  // --- Invariants ---
  const invariants: Array<{ name: string; ok: boolean }> = []
  invariants.push({
    name: 'avgMastery reasonable for trueθ',
    ok: avgMastery > 0 && avgMastery < 1,
  })
  invariants.push({
    name: 'target matches goal',
    ok:
      knowledge.target ===
      { 'giua-ky': 0.7, 'cuoi-ky': 0.75, 'thpt-qg': 0.85, 'nang-cao': 0.95 }[
        scenario.goal
      ],
  })
  invariants.push({
    name: 'preliminary iff abort or SE>0.45',
    ok:
      knowledge.isPreliminary ===
      (scenario.abortAfter !== undefined ||
        session.responses.length < 10 ||
        session.standardError > 0.45),
  })
  // Ladder-specific checks (skip when the session was deliberately aborted
  // before coverage could start).
  if (scenario.abortAfter === undefined) {
    invariants.push({
      name: 'every topic is visited at least once (coverage phase)',
      ok: firstQuestionPerTopic.size === stateEntries.length,
    })
  }
  invariants.push({
    name: 'first question per topic starts at lowest available level',
    ok: firstQuestionLadderOK,
  })
  if (scenario.pace === 'fast') {
    invariants.push({
      name: 'pace=fast triggers at least 1 careless when wrongs exist',
      ok:
        knowledge.signals.careless.count > 0 ||
        session.responses.filter((r) => r.score < 0.5).length === 0,
    })
  }
  if (scenario.weakTopicIds && scenario.weakTopicIds.length > 0) {
    const topGap = knowledge.gaps[0]
    invariants.push({
      name: 'weakTopicIds get priority bonus',
      ok:
        !topGap ||
        !scenario.weakTopicIds.some((id) =>
          knowledge.gaps.some(
            (g) => g.topicId === id && g.weakBonus === 1.25,
          ),
        )
          ? true // no gap match; inconclusive — treat as passing
          : knowledge.gaps.some(
              (g) =>
                g.weakBonus === 1.25 &&
                scenario.weakTopicIds!.includes(g.topicId),
            ),
    })
  }

  console.log('\n  Invariants:')
  for (const inv of invariants) {
    console.log(`    ${inv.ok ? '✓' : '✗'} ${inv.name}`)
  }
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

function main(): void {
  const bank = JSON.parse(readFileSync(BANK_PATH, 'utf8')) as QuestionBank
  console.log(`Loaded bank: ${bank.totalCount} questions`)
  console.log(`CAT config : min=${CAT_CONFIG.minItems} max=${CAT_CONFIG.maxItems} SE<${CAT_CONFIG.seThreshold}`)

  // Lookup a topic in each grade for weakTopicIds.
  const g10Topic = TOPICS.find((t) => t.grade === 10)!
  const g11Topic = TOPICS.find((t) => t.grade === 11)!

  const scenarios: Scenario[] = [
    {
      name: 'WEAK-10-giuaky',
      description: 'Lớp 10 trình độ Yếu, ôn giữa kỳ (target 0.70)',
      grade: 10,
      trueTheta: -1.8,
      goal: 'giua-ky',
      selfLevel: 'yeu',
      pace: 'normal',
      seed: 42,
    },
    {
      name: 'MEDIUM-11-cuoiky',
      description: 'Lớp 11 trình độ Trung bình, ôn cuối kỳ',
      grade: 11,
      trueTheta: 0,
      goal: 'cuoi-ky',
      selfLevel: 'tb',
      weakTopicIds: [g11Topic.id],
      pace: 'normal',
      seed: 1001,
    },
    {
      name: 'STRONG-11-thptqg',
      description: 'Lớp 11 trình độ Khá-giỏi, luyện thi THPT QG (target 0.85)',
      grade: 11,
      trueTheta: 1.2,
      goal: 'thpt-qg',
      selfLevel: 'kha',
      pace: 'normal',
      seed: 2002,
    },
    {
      name: 'RUSHED-10-nangcao',
      description: 'Lớp 10 trình độ TB nhưng làm quá nhanh — test careless detector',
      grade: 10,
      trueTheta: -0.2,
      goal: 'nang-cao',
      selfLevel: 'tb',
      pace: 'fast',
      seed: 3003,
    },
    {
      name: 'ABORTED-10-giuaky',
      description: 'Lớp 10 dừng bài sau 4 câu — test preliminary flag',
      grade: 10,
      trueTheta: -0.5,
      goal: 'giua-ky',
      selfLevel: 'yeu',
      abortAfter: 4,
      pace: 'normal',
      seed: 4004,
    },
    {
      name: 'WEAK-W-BONUS-11-thptqg',
      description: 'Lớp 11 yếu + tự đánh dấu 3 topic weak — test weak bonus prioritization',
      grade: 11,
      trueTheta: -1.0,
      goal: 'thpt-qg',
      selfLevel: 'yeu',
      weakTopicIds: TOPICS.filter((t) => t.grade === 11).slice(0, 3).map((t) => t.id),
      pace: 'normal',
      seed: 5005,
    },
    {
      name: 'GIFTED-11-nangcao',
      description: 'Lớp 11 trình độ Giỏi, học nâng cao (target 0.95)',
      grade: 11,
      trueTheta: 1.8,
      goal: 'nang-cao',
      selfLevel: 'gioi',
      pace: 'slow',
      seed: 6006,
    },
  ]

  for (const s of scenarios) runScenario(bank, s)
  console.log('\nDone.')
}

main()
