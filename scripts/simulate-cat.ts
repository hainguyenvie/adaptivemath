/**
 * Monte Carlo simulator for the Phase 4 ladder CAT selector.
 *
 *   npm run simulate:cat
 *
 * Purpose: verify that the ladder selector + IRT θ estimator behave well
 * across a range of synthetic student abilities. Reports for each true θ:
 *
 *   - mean θ̂ and bias
 *   - RMSE of θ̂ vs true θ
 *   - mean SE at stop
 *   - mean item count
 *   - coverage (% of topics reaching 'done')
 *   - stop-reason distribution
 *
 * The ladder's main quality signal is coverage — not θ recovery — because
 * the selector no longer optimizes for information gain. θ estimation
 * still runs in the background for reporting, so we track its accuracy
 * to confirm the profile page's numbers stay meaningful.
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
  transitionTopicState,
} from '../src/lib/cat.ts'
import {
  estimateThetaFromSession,
  probabilityCorrect,
} from '../src/lib/irt.ts'
import { TOPICS } from '../src/data/topics.ts'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const WEB_ROOT = resolve(__dirname, '..')
const BANK_PATH = join(WEB_ROOT, 'src', 'data', 'questions.json')

// ---------------------------------------------------------------------------
// Seeded RNG
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
// Simulator
// ---------------------------------------------------------------------------

interface SimResult {
  trueTheta: number
  estTheta: number
  finalSE: number
  itemCount: number
  stopReason: StopReason
  /** Fraction of topics visited at least once — the practical "coverage". */
  visitPct: number
  /** Fraction of topics reaching ladder 'done' — fully evaluated. */
  donePct: number
}

function makeSession(
  pool: Question[],
  grade: 10 | 11 | 12,
  trial: number,
): SessionState {
  return {
    sessionId: `sim-g${grade}-t${trial}`,
    grade,
    selfLevel: 'tb',
    theta: 0,
    standardError: Infinity,
    responses: [],
    shownIds: [],
    sessionStartedAt: Date.now(),
    finished: false,
    stopReason: null,
    topicStates: initTopicStates(pool, TOPICS, grade),
  }
}

function simulate(
  pool: Question[],
  grade: 10 | 11 | 12,
  trueTheta: number,
  rng: () => number,
  trial: number,
): SimResult {
  const state = makeSession(pool, grade, trial)
  const irtLookup = new Map(pool.map((q) => [q.id, q.irt]))
  const getIrt = (id: string) => irtLookup.get(id) ?? null

  while (true) {
    const stop = shouldStop(state)
    if (stop !== null) {
      state.stopReason = stop
      break
    }

    const q = selectNextQuestion(pool, state)
    if (!q) {
      state.stopReason = 'no-more-items'
      break
    }

    // Sample response from the 3PL probability at the true θ.
    const p = probabilityCorrect(trueTheta, q.irt)
    const correct = rng() < p
    const score = correct ? 1 : 0

    const response: SessionResponse = {
      questionId: q.id,
      startedAt: 0,
      endedAt: 1,
      score,
      answered: true,
    }
    state.responses.push(response)
    state.shownIds.push(q.id)

    // Ladder transition.
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

    // θ re-estimation (reported only).
    const updated = estimateThetaFromSession(state.responses, getIrt, {
      startingTheta: state.theta,
    })
    state.theta = updated.theta
    state.standardError = updated.standardError
  }

  const totalTopics = Object.keys(state.topicStates).length
  const doneTopics = Object.values(state.topicStates).filter(
    (ts) => ts.level === 'done',
  ).length

  // Topics that got at least one response.
  const visitedTopics = new Set<string>()
  const poolById = new Map(pool.map((q) => [q.id, q]))
  for (const r of state.responses) {
    const q = poolById.get(r.questionId)
    if (q) visitedTopics.add(q.topicId)
  }

  return {
    trueTheta,
    estTheta: state.theta,
    finalSE: state.standardError,
    itemCount: state.responses.length,
    stopReason: state.stopReason ?? 'user-cancelled',
    visitPct: totalTopics > 0 ? visitedTopics.size / totalTopics : 0,
    donePct: totalTopics > 0 ? doneTopics / totalTopics : 0,
  }
}

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function countBy(values: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const v of values) out[v] = (out[v] ?? 0) + 1
  return out
}

function pad(x: string | number, n: number, align: 'l' | 'r' = 'r'): string {
  const str = String(x)
  if (str.length >= n) return str
  const fill = ' '.repeat(n - str.length)
  return align === 'r' ? fill + str : str + fill
}

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return 'inf'
  return n.toFixed(digits)
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

function runGrade(
  bank: QuestionBank,
  grade: 10 | 11 | 12,
): void {
  const pool = bank.questions.filter((q) => q.grade === grade)
  const topicCount = new Set(pool.map((q) => q.topicId)).size

  const trueThetas = [-2.5, -1.5, -0.5, 0, 0.5, 1.5, 2.5]
  const trialsPerTheta = 40

  console.log(`\n### Grade ${grade} — pool=${pool.length}, topics=${topicCount}`)
  console.log(
    'true θ │ mean θ̂ │  bias  │ RMSE │ mean SE │ items │ visit% │ done% │ stops',
  )
  console.log(
    '───────┼────────┼────────┼──────┼─────────┼───────┼────────┼───────┼──────────────────',
  )

  for (const trueTheta of trueThetas) {
    const results: SimResult[] = []
    for (let t = 0; t < trialsPerTheta; t++) {
      const rng = mulberry32(0xbeef ^ Math.round(trueTheta * 1000) ^ t * 7919)
      results.push(simulate(pool, grade, trueTheta, rng, t))
    }

    const estThetas = results.map((r) => r.estTheta)
    const meanEst = mean(estThetas)
    const bias = meanEst - trueTheta
    const rmse = Math.sqrt(
      mean(estThetas.map((x) => (x - trueTheta) ** 2)),
    )
    const meanSE = mean(
      results.map((r) => (Number.isFinite(r.finalSE) ? r.finalSE : 5)),
    )
    const meanItems = mean(results.map((r) => r.itemCount))
    const meanVisit = mean(results.map((r) => r.visitPct))
    const meanDone = mean(results.map((r) => r.donePct))
    const stops = countBy(results.map((r) => r.stopReason))
    const topStop = Object.entries(stops)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .slice(0, 2)
      .join(' ')

    console.log(
      `${pad(fmt(trueTheta, 1), 6)} │ ${pad(fmt(meanEst), 6)} │ ${pad(
        fmt(bias, 2),
        6,
      )} │ ${pad(fmt(rmse), 4)} │  ${pad(fmt(meanSE), 5)}  │ ${pad(
        fmt(meanItems, 1),
        5,
      )} │  ${pad(fmt(meanVisit * 100, 0), 3)}%  │ ${pad(fmt(meanDone * 100, 0), 3)}% │ ${topStop}`,
    )
  }
}

function main(): void {
  const bank = JSON.parse(readFileSync(BANK_PATH, 'utf8')) as QuestionBank

  console.log('CAT Monte Carlo simulation — Phase 4 ladder selector')
  console.log('═══════════════════════════════════════════════════════')
  console.log(
    `Config: maxItems=${CAT_CONFIG.maxItems}  session=${CAT_CONFIG.sessionTimeLimitMs / 60000}min`,
  )
  console.log(`Bank  : ${bank.totalCount} questions`)

  runGrade(bank, 10)
  runGrade(bank, 11)
  runGrade(bank, 12)
}

main()
