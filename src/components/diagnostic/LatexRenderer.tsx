import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  KATEX_MACROS,
  convertTabularToHtml,
  replaceTikzPlaceholders,
  wrapVietnameseInMath,
} from '../../lib/latex'
import { cn } from '../../lib/cn'

interface LatexRendererProps {
  /**
   * Raw-ish LaTeX text (already passed through `preprocessLatex` at build
   * time). May contain mixed plain Vietnamese + inline `$...$` math +
   * display `$$...$$` math.
   */
  content: string
  className?: string
}

type Segment =
  | { type: 'text'; value: string }
  | { type: 'inline-math'; value: string }
  | { type: 'display-math'; value: string }

/**
 * Split mixed text + math into segments. Handles:
 *   $$ ... $$   → display math
 *   \[ ... \]   → display math
 *   $ ... $     → inline math
 *   \( ... \)   → inline math
 *
 * Very forgiving: if a delimiter is unbalanced, the fallback treats the rest
 * as plain text.
 */
function tokenize(src: string): Segment[] {
  const segments: Segment[] = []
  let i = 0
  let textBuf = ''

  const flushText = () => {
    if (textBuf) {
      segments.push({ type: 'text', value: textBuf })
      textBuf = ''
    }
  }

  while (i < src.length) {
    if (src.startsWith('$$', i)) {
      const end = src.indexOf('$$', i + 2)
      if (end === -1) {
        textBuf += src.slice(i)
        break
      }
      flushText()
      segments.push({ type: 'display-math', value: src.slice(i + 2, end) })
      i = end + 2
      continue
    }
    if (src.startsWith('\\[', i)) {
      const end = src.indexOf('\\]', i + 2)
      if (end === -1) {
        textBuf += src.slice(i)
        break
      }
      flushText()
      segments.push({ type: 'display-math', value: src.slice(i + 2, end) })
      i = end + 2
      continue
    }
    if (src.startsWith('\\(', i)) {
      const end = src.indexOf('\\)', i + 2)
      if (end === -1) {
        textBuf += src.slice(i)
        break
      }
      flushText()
      segments.push({ type: 'inline-math', value: src.slice(i + 2, end) })
      i = end + 2
      continue
    }
    if (src[i] === '$' && !isEscaped(src, i)) {
      // Find the matching closing $ — also parity-checked so escaped
      // `\$` inside math content doesn't terminate the segment early.
      let end = -1
      let cursor = i + 1
      while (cursor < src.length) {
        if (src[cursor] === '$' && !isEscaped(src, cursor)) {
          end = cursor
          break
        }
        cursor++
      }
      if (end === -1) {
        textBuf += src.slice(i)
        break
      }
      flushText()
      segments.push({ type: 'inline-math', value: src.slice(i + 1, end) })
      i = end + 1
      continue
    }
    textBuf += src[i]
    i++
  }
  flushText()
  return segments
}

/**
 * Compile a math expression to an HTML string. Errors fall back to a plain
 * `<code>` tag containing the original LaTeX — so one bad expression never
 * crashes the whole question.
 */
function renderMath(tex: string, displayMode: boolean): string {
  // Wrap Vietnamese-text runs in `\text{...}` so KaTeX renders them upright
  // instead of as italic chains of single-letter variables. See
  // `wrapVietnameseInMath` for the heuristic.
  const safeTex = wrapVietnameseInMath(tex)
  try {
    return katex.renderToString(safeTex, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      macros: { ...KATEX_MACROS },
      trust: false,
      // Emit both HTML (visual) and MathML (screen readers). This is the
      // KaTeX default, set explicitly so the intent is obvious.
      output: 'htmlAndMathml',
      errorColor: '#dc2626',
    })
  } catch {
    return `<code class="text-rose-600">${escapeHtml(tex)}</code>`
  }
}

function escapeHtml(src: string): string {
  return src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * LaTeX escape-parity check: a char at index `i` is considered escaped
 * only when preceded by an ODD number of backslashes.
 *
 *   `\$`   → odd (1)  → escaped
 *   `\\$`  → even (2) → NOT escaped (the `\\` is a line-break, not an escape)
 *   `\\\$` → odd (3)  → escaped
 *
 * The previous naive check `src[i-1] !== '\\'` tripped on `\\$` and
 * swallowed half the math in the corpus (e.g. `...công thức\\$ P=\cos...$`).
 */
function isEscaped(src: string, i: number): boolean {
  let backslashes = 0
  let k = i - 1
  while (k >= 0 && src[k] === '\\') {
    backslashes++
    k--
  }
  return backslashes % 2 === 1
}

/**
 * Unlike `escapeHtml`, this helper leaves whitelisted HTML tags (injected by
 * earlier passes like tabular conversion) intact while escaping any other
 * stray angle brackets that appear in real text content.
 *
 * Approach: split on our injected tag set, escape everything in between.
 */
/**
 * Walk any `<td>…</td>` and `<th>…</th>` produced by the tabular converter
 * and render any `$…$` math inside them into KaTeX-generated HTML BEFORE
 * the top-level tokenizer splits the whole document on `$` boundaries.
 *
 * Without this step, a table like `<td>$x_0$</td>` would be torn apart by
 * the outer `tokenize()` as it blindly scans for `$` delimiters.
 */
function renderMathInsideTables(src: string): string {
  return src.replace(/<(td|th)([^>]*)>([\s\S]*?)<\/\1>/g, (_m, tag, attrs, inner) => {
    const rendered = inner.replace(/\$([^$]+)\$/g, (_mm: string, tex: string) =>
      renderMath(tex, false),
    )
    return `<${tag}${attrs}>${rendered}</${tag}>`
  })
}

/**
 * Replace entire `<table>…</table>` blocks with private-use-area sentinels
 * so the outer tokenizer treats them as opaque text. We unmask them after
 * tokenization + math rendering.
 */
function maskTables(src: string): { masked: string; tables: string[] } {
  const tables: string[] = []
  const masked = src.replace(/<table[\s\S]*?<\/table>/g, (match) => {
    const token = `\uE000TABLE${tables.length}\uE001`
    tables.push(match)
    return token
  })
  return { masked, tables }
}

/**
 * Resolve a few common LaTeX macros that leaked into text mode (outside any
 * `$…$`) in the corpus. Authors sometimes wrote `$P$, $Q$, $R$, \ldots` —
 * here `\ldots` ends up in a text segment and would otherwise render as the
 * literal string "\ldots". We don't try to be comprehensive: just map the
 * handful that occur most often to safe Unicode equivalents, and drop
 * layout-only macros that have no visible HTML form.
 */
function resolveTextModeMacros(src: string): string {
  let out = src
  out = out.replace(/\\(?:ldots|dots)\b/g, '…')
  out = out.replace(/\\cdots\b/g, '⋯')
  out = out.replace(/\\to\b/g, '→')
  // Layout-only macros — render as nothing.
  out = out.replace(
    /\\(?:centerline|centering|hfill|hspace|vspace|noindent|indent|footnotesize|small|large|Large|bfseries|itshape|bf|it|em|break|linebreak|newline|allowdisplaybreaks)\b\s*/g,
    '',
  )
  // Standalone `\quad` / `\qquad` in text → a couple of spaces.
  out = out.replace(/\\quad\b/g, '  ')
  out = out.replace(/\\qquad\b/g, '    ')
  return out
}

function preserveInjectedHtml(src: string): string {
  // Whitelist of tags the earlier pipeline steps may have emitted:
  //   - tabular → HTML:      table / thead / tbody / tr / td / th
  //   - tikz placeholders:   span / img
  //   - list conversion:     ul / ol / li
  //   - inline formatting:   strong / em / u
  //   - line breaks:         br
  const injectedTag =
    /(<\/?(?:table|thead|tbody|tr|td|th|span|img|ul|ol|li|strong|em|u|br)[^>]*\/?>)/g
  return src
    .split(injectedTag)
    .map((chunk, i) => {
      if (i % 2 === 1) return chunk
      return escapeHtml(chunk)
    })
    .join('')
}

/**
 * Render mixed Vietnamese text + LaTeX math fragments.
 *
 * We assemble one HTML string for the whole content (text segments escaped,
 * math segments rendered via katex) and hand it to `dangerouslySetInnerHTML`.
 * KaTeX output is trusted — we control the input, and `trust: false` disables
 * the unsafe commands anyway.
 */
export function LatexRenderer({ content, className }: LatexRendererProps) {
  const html = useMemo(() => {
    // 1. Convert \begin{tabular}...\end{tabular} → HTML <table>. Table cells
    //    may contain `$…$` math, so we render that math INSIDE the table
    //    before the main tokenizer runs — otherwise the top-level tokenizer
    //    would split on `$` boundaries and slice the <tr>/<td> tags in two.
    const withTables = convertTabularToHtml(content)
    const withTablesRendered = renderMathInsideTables(withTables)

    // 2. Mask any <table>…</table> blocks so the outer tokenizer ignores them.
    const { masked, tables } = maskTables(withTablesRendered)

    const segments = tokenize(masked)
    const rendered = segments
      .map((seg) => {
        if (seg.type === 'text') {
          const resolved = resolveTextModeMacros(seg.value)
          return preserveInjectedHtml(resolved).replace(/\\\\/g, '<br/>')
        }
        return renderMath(seg.value, seg.type === 'display-math')
      })
      .join('')

    // 3. Unmask tables (they were already HTML-rendered above).
    const withTablesBack = rendered.replace(
      /\uE000TABLE(\d+)\uE001/g,
      (_m, i) => tables[Number(i)] ?? '',
    )

    // 4. Replace [TIKZ:<hash>] placeholders with <img> or fallback pill.
    return replaceTikzPlaceholders(withTablesBack)
  }, [content])

  return (
    <div
      className={cn(
        'max-w-none whitespace-pre-wrap text-base leading-relaxed text-slate-800',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
