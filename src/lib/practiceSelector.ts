/**
 * Practice question selector — picks questions for each phase of a practice
 * session (warm-up, practice, assessment) given the student's history and
 * the target topic/levels.
 *
 * Key design: questions already used in previous sessions are deprioritized
 * (not hard-blocked, since some topics have small pools). Within the
 * eligible pool, questions are shuffled with a seeded RNG so two sessions
 * on the same topic get different orders.
 */

import type { Question, LevelLetter } from '../types/question'
import type { LearnerState } from '../types/learner'

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

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PracticeSelection {
  /** 2-3 easy questions from mastered topics (warm-up). */
  warmup: Question[]
  /** 5-8 questions at the target levels (main practice). */
  practice: Question[]
  /** 5 questions, mixed levels (mini assessment). */
  assessment: Question[]
}

/**
 * Select questions for a full 3-phase practice session.
 *
 * @param pool         Full question bank for the student's grade.
 * @param topicId      The target topic for this session.
 * @param levels       Which levels to practice (from the Activity).
 * @param learner      Current learner state (for used-question tracking).
 * @param masteredTopicIds  Topics the student has BKT-mastered (for warm-up).
 * @param sessionSeed  Unique seed for this session's RNG.
 */
export function selectPracticeQuestions(
  pool: Question[],
  topicId: string,
  levels: LevelLetter[],
  learner: LearnerState,
  masteredTopicIds: string[],
  sessionSeed: number,
): PracticeSelection {
  const rng = mulberry32(sessionSeed)
  const usedSet = new Set(learner.usedQuestionIds)

  // --- Warm-up: 2-3 N-level questions from mastered topics ---
  const warmupPool = pool.filter(
    (q) =>
      masteredTopicIds.includes(q.topicId) &&
      q.topicId !== topicId &&
      (q.level === 'N' || q.level === 'unknown'),
  )
  const warmup = pickN(warmupPool, 3, usedSet, rng)

  // --- Practice: 5-8 questions at the target levels ---
  const targetLevelSet = new Set<LevelLetter | 'unknown'>(levels)
  // Also accept 'unknown' as matching 'H'.
  if (targetLevelSet.has('H')) targetLevelSet.add('unknown')

  const practicePool = pool.filter(
    (q) =>
      q.topicId === topicId &&
      targetLevelSet.has(q.level as LevelLetter | 'unknown'),
  )
  const practice = pickN(practicePool, 8, usedSet, rng)

  // --- Assessment: 5 questions, mixed levels (2N + 2H + 1V) ---
  const assessPool = pool.filter(
    (q) => q.topicId === topicId && !practice.some((p) => p.id === q.id),
  )
  const assessN = pickN(
    assessPool.filter((q) => q.level === 'N' || q.level === 'unknown'),
    2,
    usedSet,
    rng,
  )
  const assessH = pickN(
    assessPool.filter((q) => q.level === 'H'),
    2,
    usedSet,
    rng,
  )
  const assessV = pickN(
    assessPool.filter((q) => q.level === 'V'),
    1,
    usedSet,
    rng,
  )
  const assessment = [...assessN, ...assessH, ...assessV]

  return { warmup, practice, assessment }
}

/**
 * Pick up to `n` questions from `pool`, preferring unused questions but
 * falling back to used ones if the pool is too small. Shuffled by RNG.
 */
function pickN(
  pool: Question[],
  n: number,
  usedSet: Set<string>,
  rng: () => number,
): Question[] {
  // Separate into fresh and used buckets.
  const fresh = pool.filter((q) => !usedSet.has(q.id))
  const used = pool.filter((q) => usedSet.has(q.id))

  // Prefer fresh, pad with used if needed.
  const shuffledFresh = shuffle(fresh, rng)
  const shuffledUsed = shuffle(used, rng)
  const combined = [...shuffledFresh, ...shuffledUsed]

  return combined.slice(0, n)
}

/**
 * Serialize a student's answer for the error journal. Handles all question
 * types (MCQ → "B", TF → "true,false,true,false", shortans → "0.33").
 */
export function serializeAnswer(answer: unknown): string {
  if (typeof answer === 'string') return answer
  if (Array.isArray(answer)) return answer.map(String).join(',')
  return String(answer ?? '')
}

/**
 * Serialize the correct answer for a question (for the error journal).
 */
export function serializeCorrectAnswer(question: Question): string {
  if (question.type === 'mcq') {
    const correct = question.options.find((o) => o.isCorrect)
    return correct?.label ?? '?'
  }
  if (question.type === 'tf') {
    return question.statements.map((s) => (s.isTrue ? 'Đ' : 'S')).join(',')
  }
  if (question.type === 'shortans') {
    return question.correctAnswer
  }
  return '?'
}
