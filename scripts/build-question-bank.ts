/**
 * Offline parser: LaTeX corpus → two JSON bundles.
 *
 *   npm run build:questions
 *
 * Produces:
 *
 *   src/data/questions.json        ← runtime, only status === 'ok'
 *   src/data/questions-debug.json  ← debug viewer, every ex block we found
 *
 * Design invariants:
 *
 *  - Every `\begin{ex}...\end{ex}` block in the corpus turns into exactly one
 *    DebugQuestion record — we never silently drop anything. Blocks that
 *    don't fit a CAT type (no answer macro) get `type: 'essay'` +
 *    `status: 'essay'` so the debug viewer still shows them.
 *
 *  - TikZ blocks are extracted into `tikzSources[]` and replaced in the
 *    prompt with a lightweight placeholder `[TIKZ:n]`. The renderer decides
 *    what to display (Phase 2A: a "📐 Hình vẽ" block; Phase 2C: actual SVG).
 *
 *  - `\immini{text}{diagram}` is unwrapped: `text` is folded back into the
 *    prompt, `diagram` pushed into `tikzSources`. This is how ~198 questions
 *    in the corpus embed their figures.
 *
 *  - `\begin{tabular}` is LEFT inside the prompt. A separate runtime
 *    converter in `lib/latex.ts` translates it to an HTML table — essential
 *    for stats questions that depend on the data table.
 *
 * The parser is intentionally tolerant: unbalanced braces log a warning but
 * still produce a debug record (with `status` set to the appropriate error).
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

import type {
  DebugBank,
  DebugQuestion,
  IrtParams,
  LevelLetter,
  McqOption,
  Question,
  QuestionBank,
  QuestionStatus,
  QuestionType,
  TfStatement,
  TheoryBlock,
  TopicTheory,
} from '../src/types/question.ts'
import { preprocessLatex } from '../src/lib/latex.ts'
import { TOPICS } from '../src/data/topics.ts'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const WEB_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(WEB_ROOT, '..')
const DATA_DIR = join(REPO_ROOT, 'data')
const OUT_RUNTIME = join(WEB_ROOT, 'src', 'data', 'questions.json')
const OUT_DEBUG = join(WEB_ROOT, 'src', 'data', 'questions-debug.json')

// ---------------------------------------------------------------------------
// IRT proxy table
// ---------------------------------------------------------------------------

function buildIrtParams(level: LevelLetter, type: QuestionType): IrtParams {
  const bByLevel: Record<LevelLetter, number> = {
    N: -1.5,
    H: -0.5,
    V: 0.5,
    T: 1.5,
    unknown: 0,
  }
  const cByType: Record<QuestionType, number> = {
    mcq: 0.25,
    tf: 0.0625,
    shortans: 0,
    essay: 0,
  }
  // Discrimination `a` is bumped to 1.2 based on Monte Carlo tuning
  // (see scripts/simulate-cat.ts). This gives the item-information function
  // a ~1.44× boost (a²), letting SE reach the 0.35 stop threshold in ~25–30
  // items for typical learners instead of plateauing at 40 items. Higher
  // values (a=1.5) caused over-estimate bias at extreme θ because our pool
  // lacks items with b > 0.5, so the estimator tipped into "all-correct"
  // clamp territory too often.
  return {
    a: 1.2,
    b: bByLevel[level],
    c: cByType[type],
  }
}

// ---------------------------------------------------------------------------
// Balanced-brace extractor
// ---------------------------------------------------------------------------

/**
 * True if `src[i]` is the start of an unescaped LaTeX comment (`%` preceded
 * by an even number of backslashes, including zero).
 */
function isUnescapedCommentStart(src: string, i: number): boolean {
  if (src[i] !== '%') return false
  let backslashes = 0
  let k = i - 1
  while (k >= 0 && src[k] === '\\') {
    backslashes++
    k--
  }
  return backslashes % 2 === 0
}

/**
 * Advance past whitespace AND LaTeX comments (`%` to end of line).
 * This is critical for parsing blocks like:
 *
 *   \choice%36
 *   {$m=25$}{$m=11$}...
 *
 * where the `%36` is a real comment, not part of the macro name.
 */
function skipWhitespaceAndComments(src: string, i: number): number {
  while (i < src.length) {
    const ch = src[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }
    if (isUnescapedCommentStart(src, i)) {
      const eol = src.indexOf('\n', i)
      i = eol === -1 ? src.length : eol + 1
      continue
    }
    break
  }
  return i
}

function findMatchingBrace(src: string, openIdx: number): number {
  if (src[openIdx] !== '{') return -1
  let depth = 1
  let i = openIdx + 1
  while (i < src.length) {
    const ch = src[i]
    // Skip escaped char (\{, \}, \\, etc.)
    if (ch === '\\' && i + 1 < src.length) {
      i += 2
      continue
    }
    // Skip LaTeX comments inside the group — they can contain `{` or `}`
    // that would otherwise corrupt our brace depth counter.
    if (isUnescapedCommentStart(src, i)) {
      const eol = src.indexOf('\n', i)
      i = eol === -1 ? src.length : eol + 1
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}

function readGroups(
  src: string,
  startIdx: number,
  count: number,
): { groups: string[]; endIdx: number } | null {
  let i = skipWhitespaceAndComments(src, startIdx)

  // Optional bracket arg: [...]
  if (src[i] === '[') {
    const close = src.indexOf(']', i + 1)
    if (close === -1) return null
    i = close + 1
  }

  const groups: string[] = []
  for (let k = 0; k < count; k++) {
    i = skipWhitespaceAndComments(src, i)
    if (src[i] !== '{') return null
    const end = findMatchingBrace(src, i)
    if (end === -1) return null
    groups.push(src.slice(i + 1, end))
    i = end + 1
  }
  return { groups, endIdx: i }
}

// ---------------------------------------------------------------------------
// Pre-processing: extract \loigiai, TikZ, \immini
// ---------------------------------------------------------------------------

/** Remove and return the content of the first `\loigiai{...}` block. */
function extractLoigiai(body: string): { bodyWithout: string; solution: string } {
  const idx = body.indexOf('\\loigiai')
  if (idx === -1) return { bodyWithout: body, solution: '' }
  // Skip optional [arg]
  let cursor = idx + '\\loigiai'.length
  while (cursor < body.length && /\s/.test(body[cursor])) cursor++
  if (body[cursor] === '[') {
    const close = body.indexOf(']', cursor + 1)
    if (close !== -1) cursor = close + 1
  }
  while (cursor < body.length && /\s/.test(body[cursor])) cursor++
  if (body[cursor] !== '{') {
    return { bodyWithout: body, solution: '' }
  }
  const end = findMatchingBrace(body, cursor)
  if (end === -1) return { bodyWithout: body, solution: '' }
  const solution = body.slice(cursor + 1, end)
  const bodyWithout = body.slice(0, idx) + body.slice(end + 1)
  return { bodyWithout, solution }
}

/**
 * Walk the body and pull every top-level `\begin{tikzpicture}...\end{tikzpicture}`
 * into a list. Uses a balanced depth counter (not a regex) so **nested**
 * tikzpicture environments work — common in the corpus when authors define
 * a macro like `\def\caulong{\begin{tikzpicture}...\end{tikzpicture}}` inside
 * the outer figure.
 *
 * Each extracted block is replaced in the body with `[TIKZ:<hash>]` where
 * `<hash>` is the first 12 hex chars of SHA256. The runtime renderer looks
 * this hash up in `tikz-manifest.json` to decide whether to emit an <img>.
 */
function extractTikz(body: string): { bodyWithout: string; sources: string[] } {
  const sources: string[] = []
  const BEGIN = '\\begin{tikzpicture}'
  const END = '\\end{tikzpicture}'

  let out = ''
  let i = 0
  while (i < body.length) {
    // Fast-skip until we hit the start of an outer tikzpicture.
    const start = body.indexOf(BEGIN, i)
    if (start === -1) {
      out += body.slice(i)
      break
    }
    out += body.slice(i, start)

    // Walk forward tracking nesting depth so `\begin{tikzpicture}` appearing
    // inside a `\def` inside the outer figure doesn't terminate us early.
    let depth = 1
    let cursor = start + BEGIN.length
    while (cursor < body.length && depth > 0) {
      const nextBegin = body.indexOf(BEGIN, cursor)
      const nextEnd = body.indexOf(END, cursor)
      if (nextEnd === -1) {
        // Unbalanced — bail out and treat the remainder as text.
        cursor = body.length
        depth = 0
        break
      }
      if (nextBegin !== -1 && nextBegin < nextEnd) {
        depth++
        cursor = nextBegin + BEGIN.length
      } else {
        depth--
        cursor = nextEnd + END.length
      }
    }

    const block = body.slice(start, cursor)
    const hash = createHash('sha256').update(block).digest('hex').slice(0, 12)
    sources.push(block)
    out += `[TIKZ:${hash}]`
    i = cursor
  }

  return { bodyWithout: out, sources }
}

/**
 * Unwrap `\immini[opts]{text}{diagram}` macros. `text` contains the actual
 * question + answer macro; `diagram` is typically another tikzpicture.
 *
 * We replace the whole macro with just the text content (inline), and push
 * the diagram into the sources list so the renderer can show it separately.
 */
function unwrapImmini(
  body: string,
  sources: string[],
): { bodyWithout: string; hadImmini: boolean } {
  let result = ''
  let i = 0
  let hadImmini = false
  while (i < body.length) {
    if (body.startsWith('\\immini', i)) {
      hadImmini = true
      let cursor = i + '\\immini'.length
      // Optional [arg]
      while (cursor < body.length && /\s/.test(body[cursor])) cursor++
      if (body[cursor] === '[') {
        const close = body.indexOf(']', cursor + 1)
        if (close !== -1) cursor = close + 1
      }
      const grp = readGroups(body, cursor, 2)
      if (!grp) {
        // Malformed — emit literal and move on
        result += body[i]
        i++
        continue
      }
      const [text, diagram] = grp.groups
      result += text
      // If the diagram is itself a tikzpicture, keep it as-is so extractTikz
      // picks it up later. Otherwise record it directly with a hash token.
      if (/\\begin\{tikzpicture\}/.test(diagram)) {
        result += '\n' + diagram + '\n'
      } else {
        const trimmed = diagram.trim()
        const hash = createHash('sha256')
          .update(trimmed)
          .digest('hex')
          .slice(0, 12)
        sources.push(trimmed)
        result += ` [TIKZ:${hash}]`
      }
      i = grp.endIdx
    } else {
      result += body[i]
      i++
    }
  }
  return { bodyWithout: result, hadImmini }
}

// ---------------------------------------------------------------------------
// Tag code parser
// ---------------------------------------------------------------------------

interface ParsedTag {
  level: LevelLetter
  source: string | null
}

function parseTags(body: string): ParsedTag {
  let level: LevelLetter = 'unknown'
  let source: string | null = null

  const tagRe = /%\[([^\]]+)\]/g
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(body)) !== null) {
    const inside = m[1].trim()
    // Pedagogy code like 0D1H1-4 or 2H5V3-4
    const pedagogy = /^[012][DH]\d+([NHVT])\d+(?:-\d+)?$/.exec(inside)
    if (pedagogy) {
      level = pedagogy[1] as LevelLetter
    } else if (!source && inside.length > 5) {
      source = inside
    }
  }
  return { level, source }
}

function stripTagsAndComments(raw: string): string {
  return raw
    .split('\n')
    .filter((line) => !/^\s*%/.test(line))
    .join('\n')
    .trim()
}

// ---------------------------------------------------------------------------
// Per-kind parsers
// ---------------------------------------------------------------------------

interface ParsedMcq {
  kind: 'mcq'
  options: McqOption[]
  promptBeforeMacro: string
}
interface ParsedTf {
  kind: 'tf'
  statements: TfStatement[]
  promptBeforeMacro: string
}
interface ParsedShort {
  kind: 'shortans'
  correctAnswer: string
  promptBeforeMacro: string
}
interface ParsedEssay {
  kind: 'essay'
  promptBeforeMacro: string
}
interface ParseError {
  kind: 'error'
  status: Extract<
    QuestionStatus,
    'mcq-parse-error' | 'tf-parse-error' | 'shortans-error'
  >
  message: string
  promptBeforeMacro: string
}

type ParseResult = ParsedMcq | ParsedTf | ParsedShort | ParsedEssay | ParseError

function classifyAndParse(body: string): ParseResult {
  // Locate the earliest answer macro, accepting any variant:
  //   \choice, \choiceTF, \choiceTFt, \choiceTFn, \choiceTFfix, \shortans ...
  //
  // We match `\choice(TF<letters>?)` with a regex so variants like
  // `\choiceTFt` don't get misread as `\choiceTF` + leftover `t`, which was
  // the root cause of the 4 tf-parse-errors in the previous build.
  let mcqIdx = -1
  let tfIdx = -1
  let tfMacroEnd = -1 // byte offset immediately after the full `\choiceTF*` name
  const shortIdx = body.indexOf('\\shortans')

  const re = /\\choice(TF[A-Za-z]*)?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    if (m[1]) {
      // `\choiceTF` or a variant like `\choiceTFt`, `\choiceTFn`, etc.
      if (tfIdx === -1) {
        tfIdx = m.index
        tfMacroEnd = m.index + m[0].length
      }
    } else {
      // Plain `\choice` (guaranteed no `TF` suffix thanks to the group above).
      if (mcqIdx === -1) mcqIdx = m.index
    }
    if (mcqIdx !== -1 && tfIdx !== -1) break
  }

  const candidates: Array<{ kind: 'mcq' | 'tf' | 'shortans'; idx: number }> = []
  if (mcqIdx !== -1) candidates.push({ kind: 'mcq', idx: mcqIdx })
  if (tfIdx !== -1) candidates.push({ kind: 'tf', idx: tfIdx })
  if (shortIdx !== -1) candidates.push({ kind: 'shortans', idx: shortIdx })

  if (candidates.length === 0) {
    return {
      kind: 'essay',
      promptBeforeMacro: body,
    }
  }

  candidates.sort((a, b) => a.idx - b.idx)
  const first = candidates[0]
  const promptBeforeMacro = body.slice(0, first.idx)

  if (first.kind === 'mcq') {
    const afterMacro = first.idx + '\\choice'.length
    const r = readGroups(body, afterMacro, 4)
    if (!r) {
      return {
        kind: 'error',
        status: 'mcq-parse-error',
        message: 'Could not read 4 balanced groups after \\choice',
        promptBeforeMacro,
      }
    }
    const options: McqOption[] = r.groups.map((content, i) => ({
      label: String.fromCharCode(65 + i),
      content: preprocessLatex(content.trim()),
      isCorrect: /\\True\b/.test(content),
    }))
    return { kind: 'mcq', options, promptBeforeMacro }
  }

  if (first.kind === 'tf') {
    // For TF variants (`\choiceTF`, `\choiceTFt`, `\choiceTFn`, ...) we use
    // the precise end-of-macro offset captured above instead of hard-coding
    // `\choiceTF`.length.
    const afterMacro = tfMacroEnd
    const r = readGroups(body, afterMacro, 4)
    if (!r) {
      return {
        kind: 'error',
        status: 'tf-parse-error',
        message: 'Could not read 4 balanced groups after \\choiceTF',
        promptBeforeMacro,
      }
    }
    const statements: TfStatement[] = r.groups.map((content, i) => ({
      label: String.fromCharCode(97 + i),
      content: preprocessLatex(content.trim()),
      isTrue: /\\True\b/.test(content),
    }))
    return { kind: 'tf', statements, promptBeforeMacro }
  }

  // shortans
  const afterMacro = first.idx + '\\shortans'.length
  const r = readGroups(body, afterMacro, 1)
  if (!r || !r.groups[0].trim()) {
    return {
      kind: 'error',
      status: 'shortans-error',
      message: 'Could not read answer group after \\shortans',
      promptBeforeMacro,
    }
  }
  return {
    kind: 'shortans',
    correctAnswer: r.groups[0].trim(),
    promptBeforeMacro,
  }
}

// ---------------------------------------------------------------------------
// ex block extraction
// ---------------------------------------------------------------------------

interface RawEx {
  body: string
  index: number
}

function extractExBlocks(src: string): RawEx[] {
  const blocks: RawEx[] = []
  const openRe = /\\begin\{ex\}/g
  const closeMarker = '\\end{ex}'
  let m: RegExpExecArray | null
  let index = 0
  while ((m = openRe.exec(src)) !== null) {
    const bodyStart = m.index + m[0].length
    const bodyEnd = src.indexOf(closeMarker, bodyStart)
    if (bodyEnd === -1) break
    blocks.push({ body: src.slice(bodyStart, bodyEnd), index: index++ })
    openRe.lastIndex = bodyEnd + closeMarker.length
  }
  return blocks
}

// ---------------------------------------------------------------------------
// Main driver
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Theory extraction
// ---------------------------------------------------------------------------

/**
 * Extract theory content (definitions, worked examples, problem-type guides)
 * from the non-exercise sections of each .tex file. Returns one TopicTheory
 * per topic.
 */
function extractTheory(
  fileSrc: string,
  topicId: string,
): TopicTheory {
  const knowledgeBlocks: TheoryBlock[] = []
  const methodBlocks: TheoryBlock[] = []

  // Find section boundaries.
  const ktIdx = fileSrc.indexOf('\\subsection{KIẾN THỨC TRỌNG TÂM}')
  const ppIdx = fileSrc.indexOf(
    '\\subsection{PHÂN LOẠI VÀ PHƯƠNG PHÁP GIẢI TOÁN}',
  )
  const btIdx = fileSrc.indexOf('\\subsection{BÀI TẬP RÈN LUYỆN}')

  // Section 1: KIẾN THỨC TRỌNG TÂM → extract dn, chuy, nx, subsubsection
  if (ktIdx !== -1) {
    const endIdx = ppIdx !== -1 ? ppIdx : btIdx !== -1 ? btIdx : fileSrc.length
    const section = fileSrc.slice(ktIdx, endIdx)
    extractEnvBlocks(section, knowledgeBlocks, topicId)
  }

  // Section 2: PHÂN LOẠI VÀ PHƯƠNG PHÁP → extract dang, vd
  if (ppIdx !== -1) {
    const endIdx = btIdx !== -1 ? btIdx : fileSrc.length
    const section = fileSrc.slice(ppIdx, endIdx)
    extractEnvBlocks(section, methodBlocks, topicId)
  }

  return { topicId, knowledgeBlocks, methodBlocks }
}

/**
 * Walk a LaTeX section and extract structured theory blocks.
 */
function extractEnvBlocks(
  section: string,
  blocks: TheoryBlock[],
  _topicId: string,
): void {
  // Extract subsubsection headers as 'section' blocks.
  const headerRe = /\\subsubsection\{([^}]+)\}/g
  let hm: RegExpExecArray | null
  while ((hm = headerRe.exec(section)) !== null) {
    blocks.push({
      type: 'section',
      content: preprocessLatex(hm[1]),
      title: null,
      solution: null,
      tikzSources: [],
      tikzHashes: [],
    })
  }

  // Extract environment blocks: dn, chuy, nx, dang, vd.
  const envTypes = ['dn', 'chuy', 'nx', 'dang', 'vd'] as const
  for (const envType of envTypes) {
    const openTag = `\\begin{${envType}}`
    const closeTag = `\\end{${envType}}`
    let searchFrom = 0
    while (true) {
      const start = section.indexOf(openTag, searchFrom)
      if (start === -1) break
      const bodyStart = start + openTag.length

      // For \begin{dang}[title], read the bracket arg.
      let title: string | null = null
      let cursor = bodyStart
      while (cursor < section.length && /\s/.test(section[cursor])) cursor++
      if (section[cursor] === '[') {
        const closeB = section.indexOf(']', cursor + 1)
        if (closeB !== -1) {
          title = preprocessLatex(section.slice(cursor + 1, closeB))
          cursor = closeB + 1
        }
      }

      const end = section.indexOf(closeTag, cursor)
      if (end === -1) break

      let body = section.slice(cursor, end)

      // Extract \loigiai if present (for vd blocks).
      let solution: string | null = null
      if (envType === 'vd') {
        const { bodyWithout, solution: sol } = extractLoigiaiFromBlock(body)
        body = bodyWithout
        solution = sol ? preprocessLatex(sol) : null
      }

      // Extract TikZ.
      const tikzSources: string[] = []
      const { bodyWithout: noTikz, sources: moreSources } = extractTikz(body)
      tikzSources.push(...moreSources)
      const tikzHashes = tikzSources.map((s) =>
        createHash('sha256').update(s).digest('hex').slice(0, 12),
      )
      body = noTikz

      blocks.push({
        type: envType,
        content: preprocessLatex(body.trim()),
        title,
        solution,
        tikzSources,
        tikzHashes,
      })

      searchFrom = end + closeTag.length
    }
  }
}

/** Simplified \loigiai extractor for theory blocks. */
function extractLoigiaiFromBlock(body: string): {
  bodyWithout: string
  solution: string | null
} {
  const idx = body.indexOf('\\loigiai')
  if (idx === -1) return { bodyWithout: body, solution: null }
  let cursor = idx + '\\loigiai'.length
  while (cursor < body.length && /\s/.test(body[cursor])) cursor++
  if (body[cursor] === '[') {
    const close = body.indexOf(']', cursor + 1)
    if (close !== -1) cursor = close + 1
  }
  while (cursor < body.length && /\s/.test(body[cursor])) cursor++
  if (body[cursor] !== '{') return { bodyWithout: body, solution: null }
  const end = findMatchingBrace(body, cursor)
  if (end === -1) return { bodyWithout: body, solution: null }
  return {
    bodyWithout: body.slice(0, idx) + body.slice(end + 1),
    solution: body.slice(cursor + 1, end),
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const topicByFile = new Map<string, (typeof TOPICS)[number]>()
  for (const topic of TOPICS) {
    topicByFile.set(`${topic.id}.tex`, topic)
  }

  const dataFiles = readdirSync(DATA_DIR).filter((f) => f.endsWith('.tex'))

  const debugQuestions: DebugQuestion[] = []
  const allTheory: TopicTheory[] = []

  for (const file of dataFiles) {
    const topic = topicByFile.get(file)
    if (!topic) continue

    const src = readFileSync(join(DATA_DIR, file), 'utf8')

    // Extract theory content (definitions, examples, problem types).
    allTheory.push(extractTheory(src, topic.id))

    const blocks = extractExBlocks(src)

    for (const block of blocks) {
      const { level, source } = parseTags(block.body)
      const rawBody = block.body

      // 1. Pull the solution out so it doesn't interfere with answer parsing.
      const { bodyWithout: noSolution, solution } = extractLoigiai(rawBody)

      // 2. Unwrap \immini (text+diagram). The diagram is added to the TikZ
      //    source list. The text content is folded back into the body.
      const tikzSources: string[] = []
      const { bodyWithout: afterImmini, hadImmini } = unwrapImmini(
        noSolution,
        tikzSources,
      )

      // 3. Extract all tikzpicture environments into sources + placeholders.
      const { bodyWithout: cleanedBody, sources: moreSources } =
        extractTikz(afterImmini)
      tikzSources.push(...moreSources)

      // Compute deterministic short hashes for each TikZ source. The render
      // script uses these as SVG filenames, and the runtime renderer looks
      // them up in the tikz-manifest to decide whether to emit an <img>.
      const tikzHashes = tikzSources.map((src) =>
        createHash('sha256').update(src).digest('hex').slice(0, 12),
      )

      const hasTable = /\\begin\{tabular\}/.test(cleanedBody)

      // 4. Classify and parse.
      const parsed = classifyAndParse(cleanedBody)

      const id = `${topic.id}::ex-${block.index}`
      const promptRaw = stripTagsAndComments(parsed.promptBeforeMacro)
      const prompt = preprocessLatex(promptRaw)

      let status: QuestionStatus = 'ok'
      let type: QuestionType = 'essay'
      let options: McqOption[] | undefined
      let statements: TfStatement[] | undefined
      let correctAnswer: string | undefined
      let parseError: string | undefined

      if (parsed.kind === 'mcq') {
        type = 'mcq'
        options = parsed.options
        // A missing \True isn't a hard error — mark as parse error so the
        // debug viewer flags it, but keep the options visible.
        if (!options.some((o) => o.isCorrect)) {
          status = 'mcq-parse-error'
          parseError = 'No \\True marker found in any option'
        }
      } else if (parsed.kind === 'tf') {
        type = 'tf'
        statements = parsed.statements
      } else if (parsed.kind === 'shortans') {
        type = 'shortans'
        correctAnswer = parsed.correctAnswer
      } else if (parsed.kind === 'essay') {
        type = 'essay'
        status = 'essay'
      } else {
        // error
        type =
          parsed.status === 'mcq-parse-error'
            ? 'mcq'
            : parsed.status === 'tf-parse-error'
              ? 'tf'
              : 'shortans'
        status = parsed.status
        parseError = parsed.message
      }

      // Empty prompt = can't show even in debug
      if (!prompt || prompt.length < 5) {
        status = status === 'ok' ? 'empty' : status
      }

      const debugQ: DebugQuestion = {
        id,
        topicId: topic.id,
        grade: topic.grade,
        level,
        status,
        type,
        prompt,
        source,
        irt: buildIrtParams(level, type),
        tikzSources,
        tikzHashes,
        hasTable,
        hasImmini: hadImmini,
        solution: preprocessLatex(solution),
        rawBody,
        ...(options && { options }),
        ...(statements && { statements }),
        ...(correctAnswer && { correctAnswer }),
        ...(parseError && { parseError }),
      }

      debugQuestions.push(debugQ)
    }
  }

  // ---- Build runtime bank (status === 'ok', no rawBody, no parseError) ----
  const runtimeQuestions: Question[] = debugQuestions
    .filter((q) => q.status === 'ok')
    .map((q) => {
      // Strip debug-only fields before emitting.
      const base = {
        id: q.id,
        topicId: q.topicId,
        grade: q.grade,
        level: q.level,
        status: q.status,
        prompt: q.prompt,
        source: q.source,
        irt: q.irt,
        tikzSources: q.tikzSources,
        tikzHashes: q.tikzHashes,
        hasTable: q.hasTable,
        hasImmini: q.hasImmini,
        solution: q.solution,
      }
      if (q.type === 'mcq' && q.options) {
        return { ...base, type: 'mcq', options: q.options }
      }
      if (q.type === 'tf' && q.statements) {
        return { ...base, type: 'tf', statements: q.statements }
      }
      if (q.type === 'shortans' && q.correctAnswer) {
        return { ...base, type: 'shortans', correctAnswer: q.correctAnswer }
      }
      // essays don't reach here (status === 'ok' excludes them)
      return { ...base, type: 'essay' }
    }) as Question[]

  const bank: QuestionBank = {
    builtAt: new Date().toISOString(),
    totalCount: runtimeQuestions.length,
    questions: runtimeQuestions,
    theory: allTheory,
  }

  // ---- Build debug bank ----
  const statusCounts = debugQuestions.reduce<Record<string, number>>(
    (acc, q) => {
      acc[q.status] = (acc[q.status] ?? 0) + 1
      return acc
    },
    {},
  ) as Record<QuestionStatus, number>

  const typeCounts = debugQuestions.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] ?? 0) + 1
    return acc
  }, {}) as Record<QuestionType, number>

  const debugBank: DebugBank = {
    builtAt: new Date().toISOString(),
    totalCount: debugQuestions.length,
    statusCounts,
    typeCounts,
    questions: debugQuestions,
  }

  mkdirSync(dirname(OUT_RUNTIME), { recursive: true })
  writeFileSync(OUT_RUNTIME, JSON.stringify(bank, null, 2), 'utf8')
  writeFileSync(OUT_DEBUG, JSON.stringify(debugBank, null, 2), 'utf8')

  // ---- Report ----
  const mediaCounts = {
    tikz: debugQuestions.filter((q) => q.tikzSources.length > 0).length,
    table: debugQuestions.filter((q) => q.hasTable).length,
    immini: debugQuestions.filter((q) => q.hasImmini).length,
  }

  /* eslint-disable no-console */
  console.log('\n=== Question Bank Build Summary ===')
  console.log(`Files scanned    : ${dataFiles.length}`)
  console.log(`Total ex blocks  : ${debugQuestions.length}`)
  console.log(`Runtime pool     : ${runtimeQuestions.length} (status === 'ok')`)
  console.log()
  console.log('By status:')
  for (const [k, v] of Object.entries(statusCounts)) {
    console.log(`  ${k.padEnd(20)} ${v}`)
  }
  console.log()
  console.log('By type:')
  for (const [k, v] of Object.entries(typeCounts)) {
    console.log(`  ${k.padEnd(20)} ${v}`)
  }
  console.log()
  console.log('Media (multi-tag):')
  for (const [k, v] of Object.entries(mediaCounts)) {
    console.log(`  ${k.padEnd(20)} ${v}`)
  }
  console.log()
  console.log('Theory:')
  const theoryTotals = allTheory.reduce(
    (acc, t) => {
      for (const b of [...t.knowledgeBlocks, ...t.methodBlocks]) {
        acc[b.type] = (acc[b.type] ?? 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )
  for (const [k, v] of Object.entries(theoryTotals)) {
    console.log(`  ${k.padEnd(20)} ${v}`)
  }
  console.log(`  topics with theory : ${allTheory.filter((t) => t.knowledgeBlocks.length + t.methodBlocks.length > 0).length}/${allTheory.length}`)
  console.log()
  console.log(`Output runtime   : ${OUT_RUNTIME}`)
  console.log(`Output debug     : ${OUT_DEBUG}`)
  /* eslint-enable no-console */
}

main()
