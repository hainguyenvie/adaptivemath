/**
 * Offline TikZ renderer: every unique tikz source in questions-debug.json
 * is compiled to a standalone PDF via pdflatex, then converted to SVG via
 * dvisvgm. Each SVG is keyed by the first 12 chars of SHA256(source), so
 * unchanged sources skip re-rendering across runs.
 *
 * Usage:
 *   npm run build:tikz              # render new + missing
 *   npm run build:tikz -- --force   # re-render everything
 *
 * Output:
 *   public/tikz/<hash>.svg          # one SVG per unique source
 *   src/data/tikz-manifest.json     # { hash: true } map used by runtime
 *
 * Failures are logged and added to a `failures` list in the manifest so the
 * runtime renderer can fall back to a placeholder pill for sources that
 * didn't compile (usually because they reference custom macros from the
 * parent document we don't have in a standalone context).
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  unlinkSync,
  statSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'

import type { DebugBank } from '../src/types/question.ts'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const WEB_ROOT = resolve(__dirname, '..')
const DEBUG_JSON = join(WEB_ROOT, 'src', 'data', 'questions-debug.json')
const SVG_DIR = join(WEB_ROOT, 'public', 'tikz')
const MANIFEST_PATH = join(WEB_ROOT, 'src', 'data', 'tikz-manifest.json')

const FORCE = process.argv.includes('--force')

// ---------------------------------------------------------------------------
// LaTeX wrapper
// ---------------------------------------------------------------------------

/**
 * Standalone wrapper. We inline a subset of the corpus' custom macros that
 * TikZ figures reference — notably `\IntervalLR` / `\IntervalGRF` / `\dotEX`
 * from ex_test.sty, and `\heva`/`\hoac` from the preamble. Loading the
 * entire ex_test.sty would drag in unrelated packages (fouriernc, etc.) and
 * slow each compile to a crawl, so we only take what we need.
 */
const CORPUS_MACROS = String.raw`
% ---- number-line interval helpers (from ex_test.sty) ----
\def\pre{0}
\def\next{2}
\def\skipInterval{12pt}
\def\colorInterval{black}
\newcommand{\IntervalLR}[2]{\def\pre{#1}\def\next{#2}}
\newcommand{\IntervalG}[4]{
  \coordinate [label={center:$#1$},label=below:$\rule{0pt}{\skipInterval}#2$] (a) at (\pre,0);
  \coordinate [label={center:$#3$},label=below:$\rule{0pt}{\skipInterval}#4$] (b) at (\next,0);
  \draw[color=\colorInterval] decorate[decoration={ticks,amplitude=3pt,segment length=1mm}] {(a)--(b)};
}
\newcommand{\IntervalGL}[4]{
  \coordinate [label={center:$#1$},label=below:$\rule{0pt}{\skipInterval}#2$] (a) at (\pre,0);
  \coordinate [label={center:$#3$},label=below:$\rule{0pt}{\skipInterval}#4$] (b) at (\next,0);
}
\newcommand{\IntervalGR}[4]{
  \coordinate [label={center:$#1$},label=below:$\rule{0pt}{\skipInterval}#2$] (a) at (\pre,0);
  \coordinate [label={center:$#3$},label=below:$\rule{0pt}{\skipInterval}#4$] (b) at (\next,0);
}
\newcommand{\IntervalGLF}[4]{
  \coordinate [label={center:$#1$},label=below:$\rule{0pt}{\skipInterval}#2$] (a) at (\pre,0);
  \coordinate [label={center:$#3$},label=below:$\rule{0pt}{\skipInterval}#4$] (b) at (\next,0);
  \fill[pattern=north west lines,pattern color=\colorInterval](\pre,-3pt)rectangle(\next,3pt);
}
\newcommand{\IntervalGRF}[4]{
  \coordinate [label={center:$#1$},label=below:$\rule{0pt}{\skipInterval}#2$] (a) at (\pre,0);
  \coordinate [label={center:$#3$},label=below:$\rule{0pt}{\skipInterval}#4$] (b) at (\next,0);
  \fill[pattern=north east lines,pattern color=\colorInterval](\pre,-3pt)rectangle(\next,3pt);
}
\def\dotEX{.}
% ---- math shortcuts used inside tikz labels ----
\newcommand{\heva}[1]{\left\{\begin{aligned}#1\end{aligned}\right.}
\newcommand{\hoac}[1]{\left[\begin{aligned}#1\end{aligned}\right.}
\let\vv\overrightarrow
`

/**
 * Template compiled by `lualatex` — it natively handles Unicode input so we
 * can render Vietnamese labels (ắ, ầ, Đ, …) inside TikZ without patching
 * the corpus. Output is a single-page PDF which `pdftocairo -svg` then
 * converts to a vector SVG.
 */
const LATEX_TEMPLATE = String.raw`\documentclass[border=2pt,tikz]{standalone}
\usepackage{tikz}
\usepackage{pgfplots}
\pgfplotsset{compat=1.18}
\usepackage{tkz-euclide}
\usepackage{tikz-3dplot}
\usetikzlibrary{
  math,through,calc,intersections,angles,quotes,
  shapes,shapes.geometric,arrows,arrows.meta,
  patterns,patterns.meta,matrix,chains,
  decorations.text,decorations.pathmorphing,decorations.markings,
  positioning,backgrounds,fit,shadows,fadings,shadings
}
\usepackage{amsmath,amssymb}
\usepackage{xcolor}
\usepackage{fontspec}
% Use a system font that covers Vietnamese diacritics so TikZ labels like
% "Phương", "Đỉnh", "Đường" render correctly.
\setmainfont{Latin Modern Roman}[Renderer=HarfBuzz]
%CORPUS_MACROS%
\begin{document}
%TIKZ_BODY%
\end{document}
`

// ---------------------------------------------------------------------------
// Collect unique sources
// ---------------------------------------------------------------------------

interface TikzJob {
  hash: string
  source: string
  /** First question id that used this source (for error reporting only). */
  firstQuestionId: string
}

function collectJobs(): TikzJob[] {
  if (!existsSync(DEBUG_JSON)) {
    throw new Error(
      `Missing ${DEBUG_JSON}. Run \`npm run build:questions\` first.`,
    )
  }
  const bank = JSON.parse(readFileSync(DEBUG_JSON, 'utf8')) as DebugBank
  const byHash = new Map<string, TikzJob>()
  for (const q of bank.questions) {
    q.tikzSources.forEach((src, i) => {
      const hash =
        q.tikzHashes?.[i] ??
        createHash('sha256').update(src).digest('hex').slice(0, 12)
      if (!byHash.has(hash)) {
        byHash.set(hash, { hash, source: src, firstQuestionId: q.id })
      }
    })
  }
  return Array.from(byHash.values())
}

// ---------------------------------------------------------------------------
// Single-job compiler
// ---------------------------------------------------------------------------

function renderOne(job: TikzJob): { ok: boolean; error?: string } {
  const outPath = join(SVG_DIR, `${job.hash}.svg`)
  if (!FORCE && existsSync(outPath)) {
    return { ok: true }
  }

  const workDir = join(tmpdir(), `kntt-tikz-${job.hash}`)
  mkdirSync(workDir, { recursive: true })
  const texPath = join(workDir, 'fig.tex')
  const pdfPath = join(workDir, 'fig.pdf')

  const latexDoc = LATEX_TEMPLATE.replace('%CORPUS_MACROS%', CORPUS_MACROS)
    .replace('%TIKZ_BODY%', job.source)
  writeFileSync(texPath, latexDoc, 'utf8')

  try {
    // 1. Compile with lualatex — native UTF-8 support, handles Vietnamese
    //    diacritics in TikZ labels without any inputenc/fontenc gymnastics.
    execSync(
      `lualatex -interaction=nonstopmode -halt-on-error -output-directory="${workDir}" "${texPath}"`,
      { stdio: 'pipe', timeout: 60_000 },
    )

    // 2. PDF → SVG via pdftocairo. The `-svg` mode outputs one SVG per page;
    //    since our standalone document is a single-page figure we get one
    //    self-contained SVG file with embedded font outlines.
    execSync(
      `pdftocairo -svg "${pdfPath}" "${outPath}"`,
      { stdio: 'pipe', timeout: 30_000 },
    )

    return { ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // Clean up any partial SVG so the next run retries
    try {
      if (existsSync(outPath)) unlinkSync(outPath)
    } catch {
      /* ignore */
    }
    return { ok: false, error: msg.slice(0, 300) }
  }
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

interface Manifest {
  builtAt: string
  totalJobs: number
  rendered: Record<string, { bytes: number }>
  failures: Record<string, string>
}

function main(): void {
  mkdirSync(SVG_DIR, { recursive: true })

  const jobs = collectJobs()
  /* eslint-disable no-console */
  console.log(`\nTikZ render — ${jobs.length} unique sources to process`)

  const rendered: Record<string, { bytes: number }> = {}
  const failures: Record<string, string> = {}

  // Preserve previously-rendered SVGs in the manifest.
  const existingSvgs = existsSync(SVG_DIR)
    ? readdirSync(SVG_DIR).filter((f) => f.endsWith('.svg'))
    : []
  for (const f of existingSvgs) {
    const hash = f.replace(/\.svg$/, '')
    const { size } = statSync(join(SVG_DIR, f))
    rendered[hash] = { bytes: size }
  }

  let ok = 0
  let fail = 0
  let skipped = 0

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]
    const out = join(SVG_DIR, `${job.hash}.svg`)
    if (!FORCE && existsSync(out)) {
      skipped++
      continue
    }
    const result = renderOne(job)
    if (result.ok) {
      ok++
      const { size } = statSync(out)
      rendered[job.hash] = { bytes: size }
      if ((ok + fail) % 20 === 0) {
        console.log(
          `  [${i + 1}/${jobs.length}] ok=${ok} fail=${fail} skipped=${skipped}`,
        )
      }
    } else {
      fail++
      failures[job.hash] = result.error ?? 'unknown error'
    }
  }

  const manifest: Manifest = {
    builtAt: new Date().toISOString(),
    totalJobs: jobs.length,
    rendered,
    failures,
  }
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8')

  console.log('\n=== TikZ Render Summary ===')
  console.log(`Total unique jobs : ${jobs.length}`)
  console.log(`Newly rendered    : ${ok}`)
  console.log(`Cached (skipped)  : ${skipped}`)
  console.log(`Failures          : ${fail}`)
  console.log(`Rendered on disk  : ${Object.keys(rendered).length}`)
  console.log(`SVG output dir    : ${SVG_DIR}`)
  console.log(`Manifest          : ${MANIFEST_PATH}`)
  if (fail > 0) {
    console.log('\nFirst 5 failures:')
    Object.entries(failures)
      .slice(0, 5)
      .forEach(([h, e]) => console.log(`  ${h}: ${e.split('\n')[0]}`))
  }
  /* eslint-enable no-console */
}

main()
