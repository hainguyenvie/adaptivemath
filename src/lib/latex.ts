/**
 * LaTeX preprocessing for KaTeX rendering.
 *
 * The source corpus uses many custom Vietnamese pedagogy macros that KaTeX
 * does not understand natively (`\heva`, `\hoac`, `\vv`, `\parallel`, …).
 * We handle them two ways:
 *
 *   1. **Inline substitution** (preprocess step) — strip structural wrappers
 *      like `\lq\lq`, `\rq\rq`, `\True`, and convert macros with side-effects.
 *   2. **KaTeX macros dictionary** (KATEX_MACROS) — passed to `react-katex`
 *      so it can expand purely math-mode commands without us touching the
 *      string.
 *
 * The goal is best-effort rendering: if a question still contains unknown
 * macros after preprocessing, the renderer falls back to showing the raw
 * LaTeX inline rather than crashing.
 */

/**
 * Math-mode macros fed to KaTeX via the `macros` option. Each key is a new
 * command, each value is the expansion. Only math-mode content belongs here.
 */
export const KATEX_MACROS: Readonly<Record<string, string>> = {
  // Vectors
  '\\vv': '\\overrightarrow',
  // "Hệ phương trình và" — system with all branches true
  '\\heva': '\\left\\{\\begin{aligned}#1\\end{aligned}\\right.',
  // "Hệ phương trình hoặc" — system with one branch true
  '\\hoac': '\\left[\\begin{aligned}#1\\end{aligned}\\right.',
  // Parallel symbol (custom in the corpus)
  '\\varparallel': '\\parallel',
  // Common shortcuts in the corpus
  '\\R': '\\mathbb{R}',
  '\\Q': '\\mathbb{Q}',
  '\\Z': '\\mathbb{Z}',
  '\\N': '\\mathbb{N}',
  '\\C': '\\mathbb{C}',
} as const

/**
 * Strip structural markers that should never appear in rendered output.
 * Runs BEFORE KaTeX gets the string.
 *
 * Intentionally conservative: we only touch well-known macros, leaving
 * unknown ones for KaTeX to attempt (or fail gracefully).
 */
export function preprocessLatex(raw: string): string {
  let out = raw

  // 0. Strip unescaped LaTeX comments (`%` to end of line). Must run first so
  //    later regexes don't accidentally match inside comments.
  out = stripLatexComments(out)

  // 0b. Unwrap \immini{text}{figure} — a Vietnamese corpus layout macro that
  //     places text alongside a TikZ figure. We extract the text (arg1) and
  //     the [TIKZ:hash] placeholder from the figure (arg2), discarding the
  //     wrapper syntax so `}{` and stray `{}`s never leak into the output.
  out = stripImmini(out)

  // 1. Strip `\def\name{value}` declarations — these are author-side
  //    shortcuts (e.g. `\def\dotEX{}`) that leak into prompts when authors
  //    forget to confine them. They're not visible content.
  out = out.replace(/\\def\\[A-Za-z@]+\s*\{[^{}]*\}/g, '')

  // 2. Drop `\True` — marker for the correct answer, no visible form.
  out = out.replace(/\\True\b\s*/g, '')

  // 3. Vietnamese quotation marks from the source: `\lq\lq ... \rq\rq`
  out = out.replace(/\\lq\\lq\s*/g, '\u201C')
  out = out.replace(/\\rq\\rq\s*/g, '\u201D')
  out = out.replace(/\\lq\s*/g, '\u2018')
  out = out.replace(/\\rq\s*/g, '\u2019')

  // 4. Paragraph break.
  out = out.replace(/\\par\b\s*/g, '\n\n')

  // 5. Strip typography instructions with no visible effect in HTML.
  out = out.replace(/\\(indent|noindent|allowdisplaybreaks)\b\s*/g, '')
  out = out.replace(/\\vspace\{[^}]*\}\s*/g, '')
  out = out.replace(/\\hspace\{[^}]*\}\s*/g, '')
  // \resizebox{width}{height}{content} → just the content.
  // Iterative because content may contain nested braces.
  for (let pass = 0; pass < 4; pass++) {
    const before = out
    out = out.replace(/\\resizebox\{[^}]*\}\{[^}]*\}\{([^{}]*)\}/g, '$1')
    if (out === before) break
  }
  // \scalebox{factor}{content} → just the content.
  for (let pass = 0; pass < 4; pass++) {
    const before = out
    out = out.replace(/\\scalebox\{[^}]*\}\{([^{}]*)\}/g, '$1')
    if (out === before) break
  }

  // 6. Author layout wrappers that render as plain content in our HTML view.
  out = out.replace(
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    (_m, inner: string) => inner.trim(),
  )
  out = out.replace(
    /\\begin\{multicols\}\{\d+\}([\s\S]*?)\\end\{multicols\}/g,
    (_m, inner: string) => inner.trim(),
  )
  // Handle nested \centerline iteratively (some contain tikz or tables).
  for (let pass = 0; pass < 4; pass++) {
    const before = out
    out = out.replace(/\\centerline\s*\{([^{}]*)\}/g, '$1')
    if (out === before) break
  }

  // 7. Legacy LaTeX2.09 font commands: `{\bf text}`, `{\it text}`, `{\em text}`.
  //    These are rare but appear in the corpus.
  out = out.replace(/\{\\bf\s+([^{}]*)\}/g, '<strong>$1</strong>')
  out = out.replace(/\{\\it\s+([^{}]*)\}/g, '<em>$1</em>')
  out = out.replace(/\{\\em\s+([^{}]*)\}/g, '<em>$1</em>')
  // Standalone `\bf` without braces (less common, apply to next word).
  out = out.replace(/\\bf\s+/g, '')

  // 8. Text-mode formatting: `\textbf`, `\textit`, `\emph`, `\underline`.
  //    These can be nested; we replace iteratively until stable so inner
  //    instances get picked up too.
  out = replaceInlineFormatting(out)

  // 8. Lists: `\begin{itemize}...\end{itemize}` → `<ul>`,
  //           `\begin{enumerate}[opts]...\end{enumerate}` → `<ol>`,
  //           `\begin{enumEX}{N}...\end{enumEX}` → `<ol>` (custom corpus env).
  //    Runs after text formatting so `<li>` content already has `<strong>` etc.
  out = convertListsToHtml(out)

  // 7. Normalize trailing whitespace and collapse >2 blank lines.
  out = out.replace(/[ \t]+$/gm, '')
  out = out.replace(/\n{3,}/g, '\n\n')

  return out.trim()
}

/**
 * Convert text-mode formatting macros to HTML inline tags. Runs before
 * list conversion so nested instances (e.g. `\textbf{\textit{x}}`) get
 * handled in one pass per outer-to-inner iteration.
 *
 * The regex uses a non-greedy `{[^{}]*}` to match a single-brace group
 * without nesting. For nested content we loop until no more matches — this
 * unwinds arbitrary depth without writing a full parser.
 */
function replaceInlineFormatting(src: string): string {
  let prev = ''
  let out = src
  // Loop until stable (max 6 iterations to prevent pathological cases).
  for (let i = 0; i < 6 && out !== prev; i++) {
    prev = out
    out = out
      .replace(/\\textbf\s*\{([^{}]*)\}/g, '<strong>$1</strong>')
      .replace(/\\textit\s*\{([^{}]*)\}/g, '<em>$1</em>')
      .replace(/\\emph\s*\{([^{}]*)\}/g, '<em>$1</em>')
      .replace(/\\underline\s*\{([^{}]*)\}/g, '<u>$1</u>')
      .replace(/\\text\s*\{([^{}]*)\}/g, '$1')
  }
  return out
}

/**
 * Convert LaTeX list environments to HTML lists.
 *
 * Standard envs:
 *   - `\begin{itemize}` / `\end{itemize}` → `<ul>`
 *   - `\begin{enumerate}[label]` / `\end{enumerate}` → `<ol type="…">`
 *
 * Corpus-specific envs (defined in ex_test.sty):
 *   - `\begin{enumEX}{N}…\end{enumEX}` — numbered, N cols
 *   - `\begin{listEX}[N]…\end{listEX}` — unnumbered, N cols (uses `\item`)
 *   - `\begin{itemchoice}\itemch … \end{itemchoice}` — per-option solution
 *     steps labelled a, b, c, d (uses `\itemch` instead of `\item`)
 *
 * The loop iterates so innermost lists get converted first, then their
 * parents can include the already-emitted `<ul>/<ol>` without confusion.
 */
function convertListsToHtml(src: string): string {
  let out = src
  for (let i = 0; i < 8; i++) {
    const before = out

    // itemize
    out = out.replace(
      /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
      (_m, inner: string) =>
        `<ul class="kntt-list">${itemsToHtml(inner, '\\item')}</ul>`,
    )

    // enumerate with optional `[label style]`
    out = out.replace(
      /\\begin\{enumerate\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{enumerate\}/g,
      (_m, optArg: string | undefined, inner: string) => {
        const type = guessOlType(optArg)
        const attr = type ? ` type="${type}"` : ''
        return `<ol class="kntt-list"${attr}>${itemsToHtml(inner, '\\item')}</ol>`
      },
    )

    // Corpus env: \begin{enumEX}{N} — numbered N-column list.
    out = out.replace(
      /\\begin\{enumEX\}\{\d+\}([\s\S]*?)\\end\{enumEX\}/g,
      (_m, inner: string) =>
        `<ol class="kntt-list">${itemsToHtml(inner, '\\item')}</ol>`,
    )

    // Corpus env: \begin{listEX}[N] — bulleted N-column list, uses \item.
    out = out.replace(
      /\\begin\{listEX\}(?:\[\d+\])?([\s\S]*?)\\end\{listEX\}/g,
      (_m, inner: string) =>
        `<ul class="kntt-list">${itemsToHtml(inner, '\\item')}</ul>`,
    )

    // Corpus env: \begin{itemchoice} — per-option solution steps with
    // `\itemch` items. Rendered as an alphabetic ordered list so each
    // solution step visually lines up with option a / b / c / d.
    out = out.replace(
      /\\begin\{itemchoice\}([\s\S]*?)\\end\{itemchoice\}/g,
      (_m, inner: string) =>
        `<ol class="kntt-list" type="a">${itemsToHtml(inner, '\\itemch')}</ol>`,
    )

    if (out === before) break
  }
  return out
}

/**
 * Split a list body on the given item macro (`\item` or `\itemch`) and wrap
 * each chunk in `<li>`. The first chunk before any item marker is discarded
 * (usually whitespace).
 */
function itemsToHtml(body: string, itemMacro: string): string {
  // Escape backslash for regex construction, then append a word-boundary
  // + whitespace matcher so the split eats the macro name cleanly.
  const escaped = itemMacro.replace(/\\/g, '\\\\')
  const splitter = new RegExp(`${escaped}\\b\\s*`)
  const parts = body.split(splitter)
  return parts
    .slice(1)
    .map((p) => `<li>${p.trim()}</li>`)
    .join('')
}

function guessOlType(opt: string | undefined): string | null {
  if (!opt) return null
  const trimmed = opt.trim()
  if (/^[aA][\)\.]?$/.test(trimmed)) return trimmed[0]
  if (/^[iI][\)\.]?$/.test(trimmed)) return trimmed[0]
  if (/^1[\)\.]?$/.test(trimmed)) return '1'
  return null
}

/**
 * Extract the content of a single brace-delimited argument starting at
 * `start` (which must point at the opening `{`). Returns the inner content
 * and the index one past the closing `}`, or `null` if braces are unbalanced.
 *
 * A preceding `\` causes the next char to be skipped so `\{` and `\}` inside
 * arguments are not counted as brace delimiters.
 */
function extractBracedArg(src: string, start: number): { content: string; end: number } | null {
  if (start >= src.length || src[start] !== '{') return null
  let depth = 0
  let i = start
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        return { content: src.slice(start + 1, i), end: i + 1 }
      }
    }
    i++
  }
  return null
}

/**
 * Replace `\immini{text}{figure}` with `text\n[TIKZ:hash]` (or just `text`
 * when arg2 has no TIKZ placeholder). `\immini` is a custom Vietnamese
 * textbook macro that lays text beside a TikZ figure; the build pipeline
 * already replaced raw TikZ blocks with `[TIKZ:<hash>]` tokens, so we only
 * need to unwrap the structural wrapper here.
 */
function stripImmini(src: string): string {
  const MACRO = '\\immini'
  let result = ''
  let i = 0
  while (i < src.length) {
    const idx = src.indexOf(MACRO, i)
    if (idx === -1) {
      result += src.slice(i)
      break
    }
    result += src.slice(i, idx)

    // Skip any whitespace between macro name and first {
    let j = idx + MACRO.length
    while (j < src.length && src[j] === ' ') j++

    const arg1 = extractBracedArg(src, j)
    if (!arg1) {
      // Unrecognised usage — pass through and advance past the macro name only.
      result += MACRO
      i = idx + MACRO.length
      continue
    }

    // Skip whitespace between the two arguments.
    j = arg1.end
    while (j < src.length && /\s/.test(src[j])) j++

    const arg2 = extractBracedArg(src, j)

    const textPart = arg1.content.trim()

    if (arg2) {
      // Pull only the [TIKZ:hash] placeholder out of arg2; discard the raw
      // braces and any other structural noise from the figure environment.
      const tikzMatch = arg2.content.match(/\[TIKZ:[a-f0-9]{12}\]/)
      if (tikzMatch) {
        result += textPart + '\n' + tikzMatch[0]
      } else {
        result += textPart
      }
      i = arg2.end
    } else {
      result += textPart
      i = arg1.end
    }
  }
  return result
}

/**
 * Strip unescaped LaTeX comments (`%` to end of line, including the newline).
 * Preserves `\%` because the backslash escapes it.
 */
function stripLatexComments(src: string): string {
  let out = ''
  let i = 0
  while (i < src.length) {
    if (src[i] === '%') {
      // Check preceding backslash parity
      let backslashes = 0
      let k = i - 1
      while (k >= 0 && src[k] === '\\') {
        backslashes++
        k--
      }
      if (backslashes % 2 === 0) {
        // Real comment — skip to end of line.
        const eol = src.indexOf('\n', i)
        if (eol === -1) break
        i = eol + 1
        continue
      }
    }
    out += src[i]
    i++
  }
  return out
}

/**
 * Convert a LaTeX `\begin{tabular}{...}...\end{tabular}` block into a raw
 * HTML `<table>`. This is a best-effort converter for data tables used
 * inside question prompts (stats problems with frequency tables etc.).
 *
 * It handles:
 *   - cell separator `&`
 *   - row separator `\\`
 *   - `\hline` (dropped — every row is bordered)
 *   - math inside cells (passed through so KaTeX picks it up downstream)
 *
 * It does NOT handle:
 *   - \multicolumn / \multirow / \cline — cells stay as-is (falls back to
 *     raw text, not pretty but readable)
 *   - column alignment specifiers (always left-aligned)
 *
 * Returns the input unchanged if no tabular environment is found.
 */
export function convertTabularToHtml(raw: string): string {
  // Match both `tabular` and `longtable`. Both take a column-spec arg
  // in braces right after `\begin{<env>}`, then rows separated by `\\`.
  const tabularRe =
    /\\begin\{(tabular|longtable)\}\{[^}]*\}([\s\S]*?)\\end\{\1\}/g
  return raw.replace(tabularRe, (_full, _env: string, content: string) => {
    const rows = content
      .replace(/\\hline/g, '')
      .replace(/\\cline\{[^}]*\}/g, '')
      .split(/\\\\/)
      .map((r) => r.trim())
      .filter((r) => r.length > 0)

    const rowsHtml = rows
      .map((row) => {
        const cells = row.split('&').map((c) => c.trim())
        const cellsHtml = cells
          .map((cellRaw) => {
            // Handle \multicolumn{N}{align}{content} → <td colspan="N">
            const multiMatch =
              /^\\multicolumn\{(\d+)\}\{[^}]*\}\{([\s\S]*)\}$/.exec(cellRaw)
            if (multiMatch) {
              const colspan = multiMatch[1]
              const content = multiMatch[2].trim()
              return `<td class="kntt-td" colspan="${colspan}">${content}</td>`
            }
            // Handle \multirow{N}{*}{content} → <td rowspan="N">
            const rowMatch =
              /^\\multirow\{(\d+)\}\{[^}]*\}\{([\s\S]*)\}$/.exec(cellRaw)
            if (rowMatch) {
              const rowspan = rowMatch[1]
              const content = rowMatch[2].trim()
              return `<td class="kntt-td" rowspan="${rowspan}">${content}</td>`
            }
            return `<td class="kntt-td">${cellRaw}</td>`
          })
          .join('')
        return `<tr>${cellsHtml}</tr>`
      })
      .join('')

    return `<table class="kntt-table">${rowsHtml}</table>`
  })
}

import tikzManifestJson from '../data/tikz-manifest.json'

interface TikzManifest {
  builtAt: string
  totalJobs: number
  rendered: Record<string, { bytes: number }>
  failures: Record<string, string>
}

const TIKZ_MANIFEST = tikzManifestJson as TikzManifest

/**
 * True if we have a pre-rendered SVG for this hash on disk (served from
 * `/public/tikz/<hash>.svg` at runtime).
 */
function isTikzRendered(hash: string): boolean {
  return hash in TIKZ_MANIFEST.rendered
}

/**
 * Replace `[TIKZ:<hash>]` placeholders with either:
 *  - an `<img>` pointing at the pre-rendered SVG, if the hash is in the
 *    manifest (built via `npm run build:tikz`), or
 *  - a yellow pill fallback otherwise ("Hình vẽ chưa render được").
 *
 * The parser embeds a SHA256-12 hash in the placeholder so the renderer can
 * look it up without a separate prop from the parent component.
 */
export function replaceTikzPlaceholders(raw: string): string {
  return raw.replace(/\[TIKZ:([a-f0-9]{12})\]/g, (_m, hash) => {
    if (isTikzRendered(hash)) {
      return `<img src="/tikz/${hash}.svg" alt="Hình vẽ" class="kntt-tikz-img" loading="lazy" />`
    }
    return `<span class="kntt-tikz-pill" data-tikz-hash="${hash}">📐 Hình vẽ (chưa render được)</span>`
  })
}
