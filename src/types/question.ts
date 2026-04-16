/**
 * Question bank + CAT session types.
 *
 * These are the structures produced by `scripts/build-question-bank.ts` and
 * consumed by both the IRT engine and the React runner.
 */

import type { SelfLevel } from './user'

/**
 * Pedagogical level letter parsed from the tag code `%[0D1H1-4]`.
 *
 *   N = Nhận biết (Recognition)      → proxy IRT b ≈ -1.5
 *   H = Thông hiểu (Understanding)   → proxy IRT b ≈ -0.5
 *   V = Vận dụng (Application)       → proxy IRT b ≈  0.5
 *   T = Vận dụng cao (High thinking) → proxy IRT b ≈  1.5
 *
 * The corpus occasionally contains other letters (C, B, K, X, D) from
 * inconsistent authoring. They fall back to `unknown` and get b = 0.
 */
export type LevelLetter = 'N' | 'H' | 'V' | 'T' | 'unknown'

/**
 * Four-level ladder used by the adaptive selector (Phase 4).
 *
 * 'unknown' is NOT in the ladder — items tagged unknown are treated as 'H'
 * by the selector's `ladderEquals` helper so they still get used as medium
 * difficulty when we run out of real H items.
 */
export type LadderLevel = 'N' | 'H' | 'V' | 'T'

export const LADDER_ORDER: ReadonlyArray<LadderLevel> = ['N', 'H', 'V', 'T']

/**
 * Per-topic state machine that drives adaptive item selection.
 *
 *   - Start at the lowest ladder level present in the topic's pool.
 *   - On correct answer → advance to the next level (skipping levels absent
 *     from the pool). Bump `ceilingLevel` to the level just passed.
 *   - On wrong answer + `wrongsAtLevel === 0` → verification retry: stay at
 *     the same level, bump counter to 1.
 *   - On wrong answer + `wrongsAtLevel === 1` → confirmed weak at this
 *     level, mark `level = 'done'`. `ceilingLevel` stays wherever it was.
 *
 * A topic is fully evaluated when `level === 'done'`.
 */
export interface TopicState {
  /** Next level to test, or 'done' when the topic has been fully evaluated. */
  level: LadderLevel | 'done'
  /** Wrong-answer counter at the current level (0 or 1). */
  wrongsAtLevel: 0 | 1
  /** Highest ladder level the student has demonstrated mastery of. */
  ceilingLevel: LadderLevel | 'none'
}

export type QuestionType = 'mcq' | 'tf' | 'shortans' | 'essay'

/**
 * Parse status for every ex block in the corpus. Used by the debug viewer
 * so we can see WHY a block isn't in the runtime pool, not just the fact that
 * it's missing.
 *
 *   ok                → fully parsed, usable in CAT
 *   essay             → no answer macro — teacher-graded / self-study only
 *   mcq-parse-error   → had \choice but couldn't read 4 balanced groups
 *   tf-parse-error    → had \choiceTF but couldn't read 4 groups
 *   shortans-error    → had \shortans but answer group was missing/empty
 *   empty             → body was empty or too short after cleaning
 */
export type QuestionStatus =
  | 'ok'
  | 'essay'
  | 'mcq-parse-error'
  | 'tf-parse-error'
  | 'shortans-error'
  | 'empty'

/**
 * IRT 3PL parameters. For Phase 2A these are proxy-calibrated from the
 * level letter; real calibration requires thousands of student responses.
 */
export interface IrtParams {
  /** Discrimination. Fixed at 1.0 until real calibration. */
  a: number
  /** Difficulty. -3 to +3. Derived from level letter for now. */
  b: number
  /** Guessing floor. 0.25 for 4-option MCQ, 0.0 for shortans, 0.0625 for TF. */
  c: number
}

/** A single MCQ option with LaTeX-preprocessed content. */
export interface McqOption {
  /** Display label, e.g. "A", "B", "C", "D". */
  label: string
  /** LaTeX content (already passed through the preprocessor). */
  content: string
  isCorrect: boolean
}

/** A single true/false sub-statement for PHẦN II. */
export interface TfStatement {
  /** Label a) b) c) d). */
  label: string
  content: string
  isTrue: boolean
}

interface BaseQuestion {
  /** Stable id, derived from topicId + index, e.g. "0-KNTT-C1B1-X::ex-12". */
  id: string
  /** Parent topic (one of TOPICS[].id). */
  topicId: string
  /** Numeric grade (10/11/12). */
  grade: 10 | 11 | 12
  /** Pedagogical level from the tag code, if any. */
  level: LevelLetter
  /** Parse status — always 'ok' for questions used by CAT runtime. */
  status: QuestionStatus
  /** Main question prompt as preprocessed LaTeX (TikZ and \immini stripped). */
  prompt: string
  /** Optional source (e.g. "Trích đề thi giữa học kì 1 - THPT ..."). */
  source: string | null
  /** IRT parameters for CAT. */
  irt: IrtParams
  /**
   * Raw TikZ source blocks extracted from the original ex body. Empty for most
   * questions. Populated when the question is accompanied by a diagram.
   */
  tikzSources: string[]
  /**
   * SHA256 hash (first 12 hex chars) of each tikz source, parallel array to
   * `tikzSources`. The offline render script keys rendered SVG files by this
   * hash, and the runtime renderer looks them up in `tikz-manifest.json` to
   * decide whether to emit an `<img>` or a fallback pill.
   */
  tikzHashes: string[]
  /** Whether the prompt still contains a LaTeX tabular (to render as HTML). */
  hasTable: boolean
  /** Whether the original ex used \immini (kept for debug diagnostics). */
  hasImmini: boolean
  /** Full LaTeX solution (for review screens, not shown during test). */
  solution: string
}

export interface McqQuestion extends BaseQuestion {
  type: 'mcq'
  options: McqOption[]
}

export interface TfQuestion extends BaseQuestion {
  type: 'tf'
  statements: TfStatement[]
}

export interface ShortAnsQuestion extends BaseQuestion {
  type: 'shortans'
  /** Expected numeric answer as a string (e.g. "0,33", "2"). */
  correctAnswer: string
}

export interface EssayQuestion extends BaseQuestion {
  type: 'essay'
}

export type Question =
  | McqQuestion
  | TfQuestion
  | ShortAnsQuestion
  | EssayQuestion

/**
 * Extension of Question with the raw LaTeX body. Only used by the debug
 * viewer and therefore not bundled into `questions.json` for runtime.
 */
export interface DebugQuestion extends BaseQuestion {
  type: QuestionType
  /** Raw `\begin{ex}...\end{ex}` body, pre-cleaning. */
  rawBody: string
  /** Optional per-type fields (only one populated at a time). */
  options?: McqOption[]
  statements?: TfStatement[]
  correctAnswer?: string
  /** Parse error message if status !== 'ok'. */
  parseError?: string
}

export interface DebugBank {
  builtAt: string
  totalCount: number
  /** Counts bucketed by status. */
  statusCounts: Record<QuestionStatus, number>
  /** Counts bucketed by type. */
  typeCounts: Record<QuestionType, number>
  questions: DebugQuestion[]
}

/** A single theory block extracted from the "KIẾN THỨC TRỌNG TÂM" or
 * "PHÂN LOẠI VÀ PHƯƠNG PHÁP" sections of a topic's .tex file. */
export interface TheoryBlock {
  /** 'dn' (definition), 'vd' (worked example), 'dang' (problem type),
   *  'chuy' (note), 'nx' (remark), 'section' (subsubsection header). */
  type: 'dn' | 'vd' | 'dang' | 'chuy' | 'nx' | 'section'
  /** Preprocessed LaTeX content (same pipeline as question prompts). */
  content: string
  /** For 'dang' blocks, the bracketed title (e.g. "Xác định mệnh đề phủ định"). */
  title: string | null
  /** For 'vd' blocks, the solution inside \loigiai{...}. */
  solution: string | null
  /** TikZ sources extracted, parallel to tikzHashes. */
  tikzSources: string[]
  tikzHashes: string[]
}

/** All theory content for one topic. */
export interface TopicTheory {
  topicId: string
  /** Blocks from "KIẾN THỨC TRỌNG TÂM" — definitions, notes, remarks. */
  knowledgeBlocks: TheoryBlock[]
  /** Blocks from "PHÂN LOẠI VÀ PHƯƠNG PHÁP" — problem types + worked examples. */
  methodBlocks: TheoryBlock[]
}

/**
 * Payload of the built question bank, committed as JSON at
 * `src/data/questions.json`.
 */
export interface QuestionBank {
  /** ISO timestamp when the bank was built. */
  builtAt: string
  /** Total number of questions across all topics & grades. */
  totalCount: number
  questions: Question[]
  /** Theory content extracted from the LaTeX source per topic. */
  theory: TopicTheory[]
}

// ============================================================================
// Runtime session types (CAT state)
// ============================================================================

export interface SessionResponse {
  questionId: string
  /** Wall clock start time in ms. */
  startedAt: number
  /** Wall clock end time in ms (null if in progress). */
  endedAt: number | null
  /**
   * 0 (wrong) .. 1 (fully correct). For MCQ and shortans this is 0 or 1. For
   * TF with 4 sub-statements this is the fraction correct (0, 0.25, 0.5, 0.75, 1).
   */
  score: number
  /** Whether any answer was submitted (false = skipped/timed out). */
  answered: boolean
}

export interface SessionState {
  /** Unique id for this attempt. */
  sessionId: string
  /** Who is taking the test. */
  grade: 10 | 11 | 12
  selfLevel: SelfLevel
  /** Current θ estimate (MLE). */
  theta: number
  /** Standard error of current θ estimate. */
  standardError: number
  /** History of responses so far (chronological). */
  responses: SessionResponse[]
  /** Ids of questions already shown (prevents repetition). */
  shownIds: string[]
  /** Wall-clock start of the session. */
  sessionStartedAt: number
  /** Whether the session is finished. */
  finished: boolean
  /** Why the session stopped, once `finished` is true. */
  stopReason: StopReason | null
  /**
   * Per-topic ladder state, one entry per topic in the student's grade.
   * Drives the adaptive selector: start every topic at the lowest level,
   * advance on correct, verify on wrong. Computed from the pool at session
   * init by `initTopicStates`.
   */
  topicStates: Record<string, TopicState>
}

export type StopReason =
  | 'precision-reached' // legacy — SE-based stop from Phase 2, no longer emitted
  | 'max-items' // hit max items cap
  | 'time-expired' // session timeout
  | 'no-more-items' // pool exhausted
  | 'user-cancelled'
  | 'coverage-complete' // every topic reached 'done' on the ladder

// ============================================================================
// CAT configuration constants — used by lib/cat.ts
// ============================================================================

export const CAT_CONFIG = {
  /**
   * Informational only. The ladder selector (Phase 4) stops as soon as
   * every topic reaches 'done' or the hard caps below trigger — there's
   * no longer a minimum item count gate.
   */
  minItems: 15,
  /**
   * Increased from 35 → 50 to accommodate the ladder's coverage guarantees.
   * Worst-case ladder walk = topicCount × 6 (3 levels × 2 items each), but
   * typical students finish faster because many levels get skipped after
   * the first correct answer.
   */
  maxItems: 50,
  /** Legacy — SE-based stop was removed in Phase 4. Kept for debug display. */
  seThreshold: 0.35,
  /** Overall session time limit (ms). Extended to accommodate longer tests. */
  sessionTimeLimitMs: 60 * 60 * 1000,
  /** Legacy — content balancing replaced by ladder round-robin. */
  topicCapRatio: 0.3,
  /** Min/max per-question time (seconds). */
  minPerQuestionSeconds: 90,
  maxPerQuestionSeconds: 180,
  /** Estimator clamps. */
  thetaMin: -4,
  thetaMax: 4,
} as const
