import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { LatexRenderer } from '../components/diagnostic/LatexRenderer'
import { TOPICS, getTopicById } from '../data/topics'
import type {
  DebugBank,
  DebugQuestion,
  QuestionStatus,
  QuestionType,
} from '../types/question'
import { cn } from '../lib/cn'

/**
 * Developer view: browse every ex block in the corpus, filter by status /
 * type / grade / topic, search prompts, and expand each item to inspect the
 * rendered prompt + options + raw LaTeX body.
 *
 * The debug bank JSON is loaded dynamically (≈2 MB) so it doesn't inflate
 * the runtime bundle. While it's loading we show a skeleton.
 */
export function DebugQuestionsPage() {
  const navigate = useNavigate()
  const [bank, setBank] = useState<DebugBank | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | 'all'>(
    'all',
  )
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all')
  const [gradeFilter, setGradeFilter] = useState<10 | 11 | 12 | 'all'>('all')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    import('../data/questions-debug.json')
      .then((mod) => {
        // Parse the JSON as DebugBank. We trust the build script here.
        setBank(mod.default as DebugBank)
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : String(err))
      })
  }, [])

  const filtered = useMemo(() => {
    if (!bank) return []
    const needle = search.trim().toLowerCase()
    return bank.questions.filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false
      if (typeFilter !== 'all' && q.type !== typeFilter) return false
      if (gradeFilter !== 'all' && q.grade !== gradeFilter) return false
      if (topicFilter !== 'all' && q.topicId !== topicFilter) return false
      if (needle) {
        const hay = (q.prompt + ' ' + (q.source ?? '') + ' ' + q.id).toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [bank, statusFilter, typeFilter, gradeFilter, topicFilter, search])

  const visible = filtered.slice(0, limit)

  const topicsForGrade = useMemo(() => {
    if (gradeFilter === 'all') return TOPICS
    return TOPICS.filter((t) => t.grade === gradeFilter)
  }, [gradeFilter])

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center text-rose-600">
        Không tải được questions-debug.json: {loadError}
      </div>
    )
  }

  if (!bank) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Đang tải ngân hàng debug…
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              🔧 Debug — Question Bank
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Toàn bộ {bank.totalCount} câu trong corpus. Runtime pool hiện có{' '}
              <strong>{bank.statusCounts.ok ?? 0}</strong> câu khả dụng.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            ← Về trang chính
          </Button>
        </header>

        {/* Summary chips */}
        <Card className="!p-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <StatusChip
              label="ok"
              count={bank.statusCounts.ok ?? 0}
              tone="green"
            />
            <StatusChip
              label="essay"
              count={bank.statusCounts.essay ?? 0}
              tone="slate"
            />
            <StatusChip
              label="mcq-parse-error"
              count={bank.statusCounts['mcq-parse-error'] ?? 0}
              tone="red"
            />
            <StatusChip
              label="tf-parse-error"
              count={bank.statusCounts['tf-parse-error'] ?? 0}
              tone="red"
            />
            <StatusChip
              label="shortans-error"
              count={bank.statusCounts['shortans-error'] ?? 0}
              tone="red"
            />
            <StatusChip
              label="empty"
              count={bank.statusCounts.empty ?? 0}
              tone="red"
            />
            <span className="mx-1 h-5 border-l border-slate-300" />
            <StatusChip
              label="mcq"
              count={bank.typeCounts.mcq ?? 0}
              tone="blue"
            />
            <StatusChip label="tf" count={bank.typeCounts.tf ?? 0} tone="blue" />
            <StatusChip
              label="shortans"
              count={bank.typeCounts.shortans ?? 0}
              tone="blue"
            />
            <StatusChip
              label="essay"
              count={bank.typeCounts.essay ?? 0}
              tone="blue"
            />
          </div>
        </Card>

        {/* Filters */}
        <Card className="!p-4">
          <div className="grid gap-3 md:grid-cols-5">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as QuestionStatus | 'all')}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'ok', label: 'OK' },
                { value: 'essay', label: 'Essay' },
                { value: 'mcq-parse-error', label: 'MCQ lỗi' },
                { value: 'tf-parse-error', label: 'TF lỗi' },
                { value: 'shortans-error', label: 'Shortans lỗi' },
                { value: 'empty', label: 'Empty' },
              ]}
            />
            <FilterSelect
              label="Type"
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as QuestionType | 'all')}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'mcq', label: 'MCQ' },
                { value: 'tf', label: 'TF' },
                { value: 'shortans', label: 'Short ans' },
                { value: 'essay', label: 'Essay' },
              ]}
            />
            <FilterSelect
              label="Lớp"
              value={String(gradeFilter)}
              onChange={(v) => {
                const val = v === 'all' ? 'all' : (Number(v) as 10 | 11 | 12)
                setGradeFilter(val)
                setTopicFilter('all')
              }}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: '10', label: 'Lớp 10' },
                { value: '11', label: 'Lớp 11' },
                { value: '12', label: 'Lớp 12' },
              ]}
            />
            <FilterSelect
              label="Topic"
              value={topicFilter}
              onChange={setTopicFilter}
              options={[
                { value: 'all', label: 'Tất cả' },
                ...topicsForGrade.map((t) => ({
                  value: t.id,
                  label: `L${t.grade} — ${t.title}`,
                })),
              ]}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Tìm kiếm
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="từ khóa prompt, id, nguồn…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>
          <div className="mt-3 text-sm text-slate-600">
            Khớp <strong className="text-slate-800">{filtered.length}</strong> /{' '}
            {bank.totalCount} câu — hiển thị{' '}
            <strong className="text-slate-800">
              {Math.min(limit, filtered.length)}
            </strong>
          </div>
        </Card>

        {/* Question list */}
        <div className="space-y-4">
          {visible.map((q) => (
            <DebugItem key={q.id} question={q} />
          ))}
        </div>

        {filtered.length > limit && (
          <div className="flex justify-center">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setLimit((n) => n + 50)}
            >
              Tải thêm 50 câu
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DebugItem — expandable card for one question
// ---------------------------------------------------------------------------

function DebugItem({ question: q }: { question: DebugQuestion }) {
  const [showRaw, setShowRaw] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [showTikz, setShowTikz] = useState(false)

  const statusTone: Record<QuestionStatus, string> = {
    ok: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    essay: 'bg-slate-100 text-slate-700 border-slate-200',
    'mcq-parse-error': 'bg-rose-100 text-rose-700 border-rose-200',
    'tf-parse-error': 'bg-rose-100 text-rose-700 border-rose-200',
    'shortans-error': 'bg-rose-100 text-rose-700 border-rose-200',
    empty: 'bg-rose-100 text-rose-700 border-rose-200',
  }

  const topicTitle = getTopicById(q.topicId)?.title ?? q.topicId

  return (
    <Card className="!p-5">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-xs font-medium',
                statusTone[q.status],
              )}
            >
              {q.status}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
              {q.type}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
              Lớp {q.grade}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Level {q.level}
            </span>
            {q.tikzSources.length > 0 && (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                📐 TikZ ×{q.tikzSources.length}
              </span>
            )}
            {q.hasTable && (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                🗂 Table
              </span>
            )}
            {q.hasImmini && (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                immini
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
              {q.id}
            </code>
            <span className="mx-2">•</span>
            <span>{topicTitle}</span>
            {q.source && (
              <>
                <span className="mx-2">•</span>
                <span className="italic">{q.source}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Prompt */}
      <div className="mb-3">
        <LatexRenderer content={q.prompt} />
      </div>

      {/* Parse error */}
      {q.parseError && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <strong>Parse error:</strong> {q.parseError}
        </div>
      )}

      {/* Options (MCQ) */}
      {q.type === 'mcq' && q.options && (
        <div className="mb-3 space-y-2">
          {q.options.map((opt) => (
            <div
              key={opt.label}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-2 text-sm',
                opt.isCorrect
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-semibold',
                  opt.isCorrect
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-300 bg-white text-slate-500',
                )}
              >
                {opt.label}
              </span>
              <div className="flex-1">
                <LatexRenderer content={opt.content} />
              </div>
              {opt.isCorrect && (
                <span className="text-xs font-semibold text-emerald-700">
                  ✓ đúng
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Statements (TF) */}
      {q.type === 'tf' && q.statements && (
        <div className="mb-3 space-y-2">
          {q.statements.map((s) => (
            <div
              key={s.label}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-2 text-sm',
                s.isTrue
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-rose-200 bg-rose-50/50',
              )}
            >
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono">
                {s.label})
              </span>
              <div className="flex-1">
                <LatexRenderer content={s.content} />
              </div>
              <span
                className={cn(
                  'text-xs font-semibold',
                  s.isTrue ? 'text-emerald-700' : 'text-rose-700',
                )}
              >
                {s.isTrue ? 'Đúng' : 'Sai'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Short-ans correct answer */}
      {q.type === 'shortans' && q.correctAnswer && (
        <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-sm">
          <span className="font-semibold text-emerald-800">Đáp án đúng:</span>{' '}
          <code className="font-mono">{q.correctAnswer}</code>
        </div>
      )}

      {/* Toggleable details */}
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {q.solution && (
          <TogglePill
            open={showSolution}
            onClick={() => setShowSolution((v) => !v)}
            label={`Lời giải (${q.solution.length} ký tự)`}
          />
        )}
        {q.tikzSources.length > 0 && (
          <TogglePill
            open={showTikz}
            onClick={() => setShowTikz((v) => !v)}
            label={`TikZ source (${q.tikzSources.length})`}
          />
        )}
        <TogglePill
          open={showRaw}
          onClick={() => setShowRaw((v) => !v)}
          label="Raw LaTeX body"
        />
      </div>

      {showSolution && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <LatexRenderer content={q.solution} className="text-sm text-slate-700" />
        </div>
      )}
      {showTikz &&
        q.tikzSources.map((src, i) => (
          <pre
            key={i}
            className="mt-2 max-h-64 overflow-auto rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
          >
            {src}
          </pre>
        ))}
      {showRaw && (
        <pre className="mt-2 max-h-96 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-700">
          {q.rawBody}
        </pre>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

interface StatusChipProps {
  label: string
  count: number
  tone: 'green' | 'red' | 'blue' | 'slate'
}

function StatusChip({ label, count, tone }: StatusChipProps) {
  const toneClass =
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : tone === 'red'
        ? 'bg-rose-50 text-rose-800 border-rose-200'
        : tone === 'blue'
          ? 'bg-sky-50 text-sky-800 border-sky-200'
          : 'bg-slate-50 text-slate-700 border-slate-200'
  return (
    <span
      className={cn('rounded-full border px-2 py-0.5 font-medium', toneClass)}
    >
      {label}: {count}
    </span>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function TogglePill({
  open,
  onClick,
  label,
}: {
  open: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition',
        open
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
      )}
    >
      {open ? '▾' : '▸'} {label}
    </button>
  )
}
