/**
 * Phase 4 — Ladder-based CAT selector.
 *
 * Replaces the IRT-max-info selector from Phase 2. Driven by direct user
 * feedback: the previous selector picked items by Fisher information at the
 * current θ, which meant low-level (N) items with `b ≈ -1.5` lost to
 * mid-level (H) items with `b ≈ -0.5` whenever the student started near
 * θ = 0. As a result students were being shown "Thông hiểu" questions
 * before ever seeing "Nhận biết", and there was no guarantee every topic
 * would be covered, no retry-to-verify on wrong answers, and no
 * randomization across sessions.
 *
 * The new selector enforces four invariants:
 *
 *   1. Per-topic ladder progression N → H → V → T, starting at the lowest
 *      level present in the topic's pool.
 *   2. Verification retry on wrong: one more item at the same level before
 *      marking the topic 'done' as confirmed weak.
 *   3. Topic coverage: round-robin rotation prefers topics with the fewest
 *      attempts, so every topic is visited before any topic is revisited.
 *   4. Randomization: a mulberry32 RNG seeded from `sessionId + step` picks
 *      between otherwise-equivalent candidates. Deterministic within a
 *      session, varied across sessions.
 *
 * IRT θ estimation still runs on every response (via
 * `estimateThetaFromSession` in irt.ts), but it's consumed by the profile
 * pipeline only — not by the selector.
 */

import {
  CAT_CONFIG,
  LADDER_ORDER,
  type LadderLevel,
  type LevelLetter,
  type Question,
  type SessionState,
  type StopReason,
  type TopicState,
} from '../types/question'
import type { Topic } from '../data/topics'

// ---------------------------------------------------------------------------
// Level helpers
// ---------------------------------------------------------------------------

/** Next ladder level up, or 'done' when already at the top. */
export function nextLadderLevel(l: LadderLevel): LadderLevel | 'done' {
  const idx = LADDER_ORDER.indexOf(l)
  if (idx === -1 || idx === LADDER_ORDER.length - 1) return 'done'
  return LADDER_ORDER[idx + 1]
}

/**
 * True if question `q` can be shown while the ladder sits at `target`.
 *
 * `unknown`-level items count as 'H' (mid difficulty) — many corpus blocks
 * have no pedagogy tag and end up tagged `unknown`; treating them as H
 * gives them a chance to be used.
 */
export function ladderEquals(
  q: Question,
  target: LadderLevel | 'done',
): boolean {
  if (target === 'done') return false
  if (q.level === target) return true
  if (q.level === 'unknown' && target === 'H') return true
  return false
}

/** Which ladder levels are actually represented in this topic's pool. */
function ladderLevelsForTopic(
  pool: Question[],
  topicId: string,
): Set<LadderLevel> {
  const set = new Set<LadderLevel>()
  for (const q of pool) {
    if (q.topicId !== topicId) continue
    const lv: LevelLetter = q.level
    if (lv === 'N' || lv === 'H' || lv === 'V' || lv === 'T') {
      set.add(lv)
    } else if (lv === 'unknown') {
      set.add('H')
    }
  }
  return set
}

/**
 * Seed the ladder for every topic in a grade. Topics with no pool items
 * collapse straight to `'done'`. Otherwise the starting level is the
 * lowest one present in the pool (N if available, else H, etc).
 */
export function initTopicStates(
  pool: Question[],
  topics: ReadonlyArray<Topic>,
  grade: 10 | 11 | 12,
): Record<string, TopicState> {
  const states: Record<string, TopicState> = {}
  for (const topic of topics) {
    if (topic.grade !== grade) continue

    const levels = ladderLevelsForTopic(pool, topic.id)
    if (levels.size === 0) {
      states[topic.id] = {
        level: 'done',
        wrongsAtLevel: 0,
        ceilingLevel: 'none',
      }
      continue
    }

    let startLevel: LadderLevel = 'N'
    for (const l of LADDER_ORDER) {
      if (levels.has(l)) {
        startLevel = l
        break
      }
    }

    states[topic.id] = {
      level: startLevel,
      wrongsAtLevel: 0,
      ceilingLevel: 'none',
    }
  }
  return states
}

/**
 * Apply a response to a topic's ladder state. Pure function — returns the
 * new state, caller splices it into `session.topicStates`.
 *
 * Correct at level L:
 *   - bump ceiling to L
 *   - advance to next level in the pool
 *   - reset wrongsAtLevel
 *
 * Wrong at level L with wrongsAtLevel === 0:
 *   - if another item at L is still available → stay, wrongsAtLevel = 1
 *   - else no verification possible → jump to 'done' with unchanged ceiling
 *
 * Wrong at level L with wrongsAtLevel === 1:
 *   - confirmed weak at L → 'done', ceiling stays at whatever was achieved
 */
export function transitionTopicState(
  current: TopicState,
  question: Question,
  correct: boolean,
  pool: Question[],
  shownIds: Set<string>,
): TopicState {
  if (current.level === 'done') return current

  if (correct) {
    const levels = ladderLevelsForTopic(pool, question.topicId)
    let next: LadderLevel | 'done' = nextLadderLevel(current.level)
    while (next !== 'done' && !levels.has(next)) {
      next = nextLadderLevel(next)
    }
    return {
      level: next,
      wrongsAtLevel: 0,
      ceilingLevel: current.level, // the level the student just passed
    }
  }

  // Wrong answer branch
  if (current.wrongsAtLevel === 0) {
    const hasMoreAtLevel = pool.some(
      (q) =>
        q.topicId === question.topicId &&
        ladderEquals(q, current.level) &&
        !shownIds.has(q.id),
    )
    if (hasMoreAtLevel) {
      return { ...current, wrongsAtLevel: 1 }
    }
  }
  return {
    level: 'done',
    wrongsAtLevel: 0,
    ceilingLevel: current.ceilingLevel,
  }
}

// ---------------------------------------------------------------------------
// Selector
// ---------------------------------------------------------------------------

export interface SelectionDebug {
  /** How the top N topic candidates scored for this pick. */
  topicRanking: Array<{
    topicId: string
    attempts: number
    level: LadderLevel | 'done'
    wrongsAtLevel: 0 | 1
  }>
  /** Which phase produced the pick — informs the debug panel. */
  phase: 'coverage' | 'climb'
  chosen: Question
}

/**
 * Select the next question for the running session.
 *
 * Two-phase strategy:
 *
 *   1. Coverage phase — any topic with `attempts === 0` is preferred so
 *      every topic gets a first look before anything gets a second.
 *   2. Climb phase — once every active topic has been visited at least
 *      once, pick by smallest attempt count so under-tested topics rise
 *      back to the top for ladder progression.
 *
 * Within the chosen topic, candidates are filtered by (current ladder
 * level, not-yet-shown). If there's no match at the target level we fall
 * back to any unseen question for that topic. Ties broken by a seeded
 * shuffle so two sessions with the same profile see different orders.
 */
export function selectNextQuestionWithDebug(
  pool: Question[],
  state: SessionState,
): { chosen: Question; debug: SelectionDebug } | null {
  const rng = makeSessionRng(state)
  const shownSet = new Set(state.shownIds)

  const poolById = new Map(pool.map((q) => [q.id, q]))
  const attemptsByTopic = new Map<string, number>()
  for (const r of state.responses) {
    const q = poolById.get(r.questionId)
    if (!q) continue
    attemptsByTopic.set(q.topicId, (attemptsByTopic.get(q.topicId) ?? 0) + 1)
  }

  // Active topics (not yet 'done').
  const active: Array<{
    topicId: string
    state: TopicState
    attempts: number
  }> = []
  for (const [topicId, ts] of Object.entries(state.topicStates)) {
    if (ts.level === 'done') continue
    active.push({
      topicId,
      state: ts,
      attempts: attemptsByTopic.get(topicId) ?? 0,
    })
  }
  if (active.length === 0) return null

  // Shuffle for random tiebreak, then stable-sort by attempts ascending.
  const ranked = shuffleInPlace(active.slice(), rng)
  ranked.sort((a, b) => a.attempts - b.attempts)

  // What phase are we in? If any active topic has 0 attempts we're in
  // coverage mode; otherwise climb.
  const phase: 'coverage' | 'climb' = ranked[0].attempts === 0 ? 'coverage' : 'climb'

  // Walk the ranking until we find a topic with a pickable candidate.
  for (const entry of ranked) {
    const topicId = entry.topicId
    const ts = entry.state

    let candidates = pool.filter(
      (q) =>
        q.topicId === topicId &&
        ladderEquals(q, ts.level) &&
        !shownSet.has(q.id),
    )
    if (candidates.length === 0) {
      // Fallback: any unseen question for this topic (the ladder state
      // will advance on the next response anyway).
      candidates = pool.filter(
        (q) => q.topicId === topicId && !shownSet.has(q.id),
      )
    }
    if (candidates.length === 0) continue

    const chosen = candidates[Math.floor(rng() * candidates.length)]
    return {
      chosen,
      debug: {
        topicRanking: ranked.slice(0, 6).map((t) => ({
          topicId: t.topicId,
          attempts: t.attempts,
          level: t.state.level,
          wrongsAtLevel: t.state.wrongsAtLevel,
        })),
        phase,
        chosen,
      },
    }
  }

  return null
}

export function selectNextQuestion(
  pool: Question[],
  state: SessionState,
): Question | null {
  return selectNextQuestionWithDebug(pool, state)?.chosen ?? null
}

// ---------------------------------------------------------------------------
// Stop rules
// ---------------------------------------------------------------------------

/**
 * Stop the session when:
 *   - session time elapsed, OR
 *   - hit max items cap, OR
 *   - every topic has been fully evaluated (ladder-complete), OR
 *   - no candidates remain.
 *
 * Unlike Phase 2 there's no SE-based precision stop — the whole point of
 * the ladder is to exhaustively cover every topic, and stopping early on
 * SE would defeat that goal.
 */
export function shouldStop(state: SessionState): StopReason | null {
  const count = state.responses.length
  const elapsedMs = Date.now() - state.sessionStartedAt

  if (elapsedMs >= CAT_CONFIG.sessionTimeLimitMs) return 'time-expired'
  if (count >= CAT_CONFIG.maxItems) return 'max-items'

  const entries = Object.values(state.topicStates)
  if (entries.length > 0 && entries.every((ts) => ts.level === 'done')) {
    return 'coverage-complete'
  }

  return null
}

// ---------------------------------------------------------------------------
// Per-question metadata (unchanged from Phase 2)
// ---------------------------------------------------------------------------

export function timeLimitForItem(item: Question): number {
  const { minPerQuestionSeconds: min, maxPerQuestionSeconds: max } = CAT_CONFIG
  const clamped = Math.max(-1.5, Math.min(1.5, item.irt.b))
  const t = (clamped + 1.5) / 3.0
  return Math.round(min + t * (max - min))
}

export function gradeAnswer(question: Question, answer: unknown): number {
  if (question.type === 'mcq') {
    if (typeof answer !== 'string') return 0
    const opt = question.options.find((o) => o.label === answer)
    return opt?.isCorrect ? 1 : 0
  }
  if (question.type === 'tf') {
    if (!Array.isArray(answer)) return 0
    if (answer.length !== question.statements.length) return 0
    let correct = 0
    for (let i = 0; i < question.statements.length; i++) {
      if (answer[i] === question.statements[i].isTrue) correct++
    }
    return correct / question.statements.length
  }
  if (question.type === 'shortans') {
    if (typeof answer !== 'string') return 0
    return normalizeShortAns(answer) === normalizeShortAns(question.correctAnswer)
      ? 1
      : 0
  }
  return 0
}

function normalizeShortAns(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/^0+(\d)/, '$1')
}

// ---------------------------------------------------------------------------
// RNG — deterministic per (session, step) but varied across sessions
// ---------------------------------------------------------------------------

/** FNV-1a 32-bit hash. */
function hashStringToU32(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 PRNG — fast, period 2^32, passes basic statistical tests. */
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

function makeSessionRng(state: SessionState): () => number {
  // Seed = FNV(sessionId) XOR step counter. Each selection gets a fresh
  // stream so successive picks are uncorrelated, but re-running the same
  // session's selector at the same step is deterministic.
  const stepSeed = Math.imul(state.responses.length + 1, 2654435761) >>> 0
  return mulberry32((hashStringToU32(state.sessionId) ^ stepSeed) >>> 0)
}

/** Fisher-Yates shuffle using the given RNG. Mutates and returns. */
function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
