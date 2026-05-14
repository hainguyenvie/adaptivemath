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
 * Strip LaTeX-flavoured markup from a fragment to produce readable plain text
 * for previews, snippets, sidebar summaries, and other places that can't host
 * full KaTeX-rendered HTML. Best-effort — meant for short snippets, not
 * fidelity-critical content.
 *
 * Transformations:
 *  - `$$...$$`, `\[...\]`, `$...$`, `\(...\)` → keep the inner content (drop
 *    the delimiters) so users see the variables/numbers without the math
 *    syntax noise.
 *  - `\command{arg}` → `arg` (unwraps `\overline{a}` → `a`, `\text{nếu}` →
 *    `nếu`, `\frac{a}{b}` → `a b`, etc.). Iterated so nested macros unwind.
 *  - Lone `\command` (no braces) → dropped (e.g. `\Delta`, `\quad`).
 *  - Whitespace + HTML tags → collapsed.
 *
 * Use {@link truncateAtBoundary} on the result if you need a fixed length.
 */
export function latexToPlainText(raw: string): string {
  let out = raw
  // Drop HTML tags first (preview text doesn't need bold/italic markers).
  out = out.replace(/<[^>]*>/g, ' ')
  // Strip math delimiters. Keep content so "$a=329{,}401$" → "a=329{,}401".
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, ' $1 ')
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, ' $1 ')
  out = out.replace(/\$([^$]*)\$/g, ' $1 ')
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, ' $1 ')
  // Unwrap `\command{arg}` iteratively so nested macros unwind.
  for (let pass = 0; pass < 8; pass++) {
    const before = out
    out = out.replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, '$1')
    if (out === before) break
  }
  // Drop remaining lone macros (no braces): `\Delta`, `\quad`, `\pm`, etc.
  // Use a negative lookahead instead of `\b` so things like `\Delta_a`
  // (followed by `_`, which `\b` treats as a word char) still get stripped.
  out = out.replace(/\\[a-zA-Z]+(?![a-zA-Z])/g, '')
  // Drop stray braces, escape sequences, and double backslashes.
  out = out.replace(/\\\\/g, ' ')
  out = out.replace(/[{}]/g, '')
  out = out.replace(/\\,|\\;|\\:|\\!/g, ' ')
  // Strip leftover subscript/superscript markers: `_a` → `a`, `x^2` → `x2`.
  // We're past math rendering at this point; these are stylistic only.
  out = out.replace(/[_^]/g, '')
  // Collapse whitespace.
  out = out.replace(/\s+/g, ' ').trim()
  return out
}

/**
 * Truncate a string at the last space before `max` so we never break a word
 * (or a half-rendered math expression after `latexToPlainText` has run).
 */
export function truncateAtBoundary(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const safe = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut
  return safe + '…'
}

/**
 * Wrap Vietnamese-text runs inside a math fragment with `\text{...}` so KaTeX
 * renders them as upright text instead of as italic chains of single-letter
 * variables.
 *
 * The corpus often contains free-form Vietnamese inside `$...$` /
 * `$$...$$` (e.g. `7\,241\,920 người \pm 40\,000 người.` or
 * `(đơn vị: nghìn đồng)`). Without wrapping, KaTeX renders each letter as a
 * separate italic identifier with weird spacing and emits warnings about
 * unicode-text-in-math-mode.
 *
 * Heuristic: walk the math string, skip macro names (`\sin`, `\heva`, …) and
 * collapse runs of letter chars (including interior spaces) into a single
 * token. Wrap that token in `\text{…}` when the run either contains ≥2
 * Vietnamese-diacritic chars OR is ≥3 letters long with ≥1 diacritic. This
 * captures real words ("nếu", "đơn vị", "người", "nghìn đồng") while
 * leaving short labels like `_{CĐ}` and `\overrightarrow{AB}` untouched so
 * variable identifiers keep their math italic styling.
 */
export function wrapVietnameseInMath(tex: string): string {
  const LETTER = /[a-zA-ZÀ-ỹ]/
  let out = ''
  let i = 0
  while (i < tex.length) {
    const ch = tex[i]
    // Preserve macro name: '\' + letters
    if (ch === '\\' && LETTER.test(tex[i + 1] ?? '')) {
      let j = i + 1
      while (j < tex.length && LETTER.test(tex[j])) j++
      out += tex.slice(i, j)
      i = j
      continue
    }
    // Collect a letter run, allowing single spaces between words but stopping
    // at any non-letter (digits, punctuation, math operators, braces).
    if (LETTER.test(ch)) {
      let j = i
      while (j < tex.length) {
        if (LETTER.test(tex[j])) {
          j++
          continue
        }
        // Allow a single internal space between letter clusters so multi-word
        // phrases like "đơn vị" stay as one run.
        if (tex[j] === ' ' && j + 1 < tex.length && LETTER.test(tex[j + 1])) {
          j++
          continue
        }
        break
      }
      const run = tex.slice(i, j)
      const diacriticCount = (run.match(/[À-ỹ]/g) ?? []).length
      const letterCount = run.replace(/\s+/g, '').length
      const shouldWrap = diacriticCount >= 2 || (diacriticCount >= 1 && letterCount >= 3)
      out += shouldWrap ? `\\text{${run}}` : run
      i = j
      continue
    }
    out += ch
    i++
  }
  return out
}

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
  // `\vspace{...}` and `\hspace{...}` (with optional `*` variant for "force").
  // Use a brace-counting unwrap so the arg can contain nested braces like
  // `\hspace*{1cm}` next to inline math.
  out = unwrapMacro(out, '\\vspace', { keep: false, hasStar: true })
  out = unwrapMacro(out, '\\hspace', { keep: false, hasStar: true })
  // `\resizebox{width}{height}{content}` → just `content`. Two ignored args.
  out = unwrapMacro(out, '\\resizebox', { keep: true, dropArgs: 2 })
  // `\scalebox{factor}{content}` → just `content`.
  out = unwrapMacro(out, '\\scalebox', { keep: true, dropArgs: 1 })

  // 6. Author layout wrappers that render as plain content in our HTML view.
  out = out.replace(
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    (_m, inner: string) => inner.trim(),
  )
  out = out.replace(
    /\\begin\{multicols\}\{\d+\}([\s\S]*?)\\end\{multicols\}/g,
    (_m, inner: string) => inner.trim(),
  )
  // `\begin{minipage}[H]{0.3\textwidth}...\end{minipage}` — drop wrapper but
  // keep inner content. The optional `[...]` placement and required
  // `{<width>}` need to be discarded too.
  out = out.replace(
    /\\begin\{minipage\}(?:\[[^\]]*\])?\s*\{[^}]*\}([\s\S]*?)\\end\{minipage\}/g,
    (_m, inner: string) => inner.trim(),
  )
  // Strip sectioning commands entirely — their content is just a heading that
  // we don't visually emphasize in question prompts. Handles starred variant.
  out = unwrapMacro(out, '\\subsubsection', { keep: false, hasStar: true })
  out = unwrapMacro(out, '\\subsection', { keep: false, hasStar: true })
  out = unwrapMacro(out, '\\section', { keep: false, hasStar: true })
  // `\centerline{...}` — keep inner content. Uses a brace-counting parser so
  // tikz placeholders + `\hspace*{1cm}` inside don't break it like the old
  // `[^{}]*` regex did.
  out = unwrapMacro(out, '\\centerline', { keep: true })

  // 6b. Display-math environments that KaTeX doesn't natively support.
  //     `eqnarray*` / `eqnarray` are wrapped in `$$\begin{aligned}…\end{aligned}$$`
  //     so KaTeX renders them. The corpus uses `LHS &op& RHS \\` (3 columns)
  //     for eqnarray; aligned tolerates extra `&` so we leave them in place.
  out = out.replace(
    /\\begin\{eqnarray\*?\}([\s\S]*?)\\end\{eqnarray\*?\}/g,
    (_m, inner: string) => `$$\\begin{aligned}${inner}\\end{aligned}$$`,
  )
  // Stand-alone `align*` / `align` likewise → wrapped in `$$…$$` so KaTeX picks
  // it up. KaTeX supports `aligned` inside math; the unstarred `align` env
  // exists at the top level only in pure LaTeX.
  out = out.replace(
    /\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g,
    (_m, inner: string) => `$$\\begin{aligned}${inner}\\end{aligned}$$`,
  )

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

    // Corpus env: `\begin{enumEX}[<style>]{N}` — numbered N-column list with
    // optional bullet/style argument (e.g. `[+]`, `[\itemCl]`). The optional
    // `[...]` group is discarded; only the count is used (and we ignore the
    // count too since HTML doesn't need columns at this fidelity).
    out = out.replace(
      /\\begin\{enumEX\}(?:\[[^\]]*\])?\s*\{\d+\}([\s\S]*?)\\end\{enumEX\}/g,
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
 * Brace-counting macro unwrapper. Handles macros where the argument may
 * contain nested braces (e.g. `\centerline{... \hspace*{1cm} ...}`) which
 * the naive `\\macro\{[^}]*\}` regex used to drop on the floor.
 *
 * Options:
 *  - `keep`     — `true` replaces the macro with its argument, `false` strips
 *                 the whole `\macro{...}` invocation.
 *  - `hasStar`  — if true, optionally consumes a `*` between the macro name
 *                 and the `{` (covers `\hspace*{1cm}`, `\subsubsection*{...}`).
 *  - `dropArgs` — if `keep` is true, this many leading argument groups are
 *                 discarded; the LAST argument is the one kept. Defaults to 0
 *                 (single-arg unwrap).
 */
function unwrapMacro(
  src: string,
  macro: string,
  opts: { keep: boolean; hasStar?: boolean; dropArgs?: number },
): string {
  const dropArgs = opts.dropArgs ?? 0
  let result = ''
  let i = 0
  while (i < src.length) {
    const idx = src.indexOf(macro, i)
    if (idx === -1) {
      result += src.slice(i)
      break
    }
    // Make sure this isn't a longer macro like `\centerline` matching `\center`.
    const after = src[idx + macro.length]
    if (after && /[a-zA-Z]/.test(after)) {
      result += src.slice(i, idx + macro.length)
      i = idx + macro.length
      continue
    }
    let cursor = idx + macro.length
    if (opts.hasStar && src[cursor] === '*') cursor++
    while (cursor < src.length && /\s/.test(src[cursor])) cursor++
    // Read (dropArgs + 1) brace groups, keeping the last one if `keep`.
    let last: { content: string; end: number } | null = null
    let consumed = 0
    let total = dropArgs + 1
    let ok = true
    while (consumed < total) {
      const arg = extractBracedArg(src, cursor)
      if (!arg) {
        ok = false
        break
      }
      last = arg
      cursor = arg.end
      consumed++
    }
    if (!ok || !last) {
      // Macro had no arg — strip the macro name and stop scanning past it.
      result += src.slice(i, idx)
      i = idx + macro.length
      continue
    }
    result += src.slice(i, idx)
    if (opts.keep) result += last.content
    i = cursor
  }
  return result
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

    // Skip any whitespace (including newlines/tabs) between macro name and `{`.
    let j = idx + MACRO.length
    while (j < src.length && /\s/.test(src[j])) j++

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
