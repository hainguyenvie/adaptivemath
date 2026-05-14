import { useState } from 'react'
import type { FeedbackEvent, FeedbackKind, ViewerRole } from '../../types/rlhf'
import { ROLE_META } from '../../types/rlhf'
import { appendFeedback, makeFeedbackId } from '../../lib/rlhf/feedbackStore'
import { cn } from '../../lib/cn'

interface RoleFeedbackFormProps {
  role: Exclude<ViewerRole, 'student'>
  authorId: string
  authorName: string
  /** Topic this feedback concerns (optional — parents often have no topic). */
  topicId?: string
  topicTitle?: string
  /** Default kind shown selected. */
  defaultKind?: FeedbackKind
  /** Hook for the parent component to refresh when feedback lands. */
  onSubmitted?: (event: FeedbackEvent) => void
  /** Compact = inline use, vertical = full panel. */
  variant?: 'compact' | 'panel'
}

const TEACHER_KINDS: Array<{ value: FeedbackKind; label: string; icon: string; positive: boolean }> = [
  { value: 'priority', label: 'Đánh dấu ưu tiên', icon: 'priority_high', positive: true },
  { value: 'comment', label: 'Nhận xét chuyên môn', icon: 'comment', positive: true },
  { value: 'approve', label: 'Đồng ý đề xuất', icon: 'check_circle', positive: true },
  { value: 'reject', label: 'Hoãn / loại bỏ', icon: 'block', positive: false },
  { value: 'suitability', label: 'Xác nhận phù hợp', icon: 'verified', positive: true },
]

const PARENT_KINDS: Array<{ value: FeedbackKind; label: string; icon: string; positive: boolean }> = [
  { value: 'regularity', label: 'Đều đặn / kỷ luật', icon: 'event_repeat', positive: true },
  { value: 'mood', label: 'Tâm trạng / động lực', icon: 'mood', positive: true },
  { value: 'concern', label: 'Lo lắng / cảnh báo', icon: 'warning', positive: false },
  { value: 'goal', label: 'Mục tiêu tuần', icon: 'flag', positive: true },
]

/**
 * Reusable feedback composer for teacher and parent roles. Emits a typed
 * `FeedbackEvent` into the feedback store and notifies the parent caller.
 *
 *   - Kind picker tailored to role
 *   - 5-step intensity slider — maps to rating in [-1, +1]
 *   - Optional free-text note
 */
export function RoleFeedbackForm({
  role,
  authorId,
  authorName,
  topicId,
  topicTitle,
  defaultKind,
  onSubmitted,
  variant = 'panel',
}: RoleFeedbackFormProps) {
  const kinds = role === 'teacher' ? TEACHER_KINDS : PARENT_KINDS
  const [kind, setKind] = useState<FeedbackKind>(defaultKind ?? kinds[0].value)
  const [intensity, setIntensity] = useState(4) // 1..5
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  const kindMeta = kinds.find((k) => k.value === kind) ?? kinds[0]
  const intensityToRating = (i: number) =>
    ((i - 3) / 2) * (kindMeta.positive ? 1 : -1)
  const rating = intensityToRating(intensity)

  const handleSubmit = () => {
    const timestamp = new Date().toISOString()
    const event: FeedbackEvent = {
      id: makeFeedbackId({
        source: role,
        kind,
        authorId,
        topicId,
        timestamp,
      }),
      source: role,
      kind,
      topicId,
      rating,
      confidence: role === 'teacher' ? 0.85 : 0.6,
      timestamp,
      authorId,
      authorName,
      note: note.trim() || undefined,
      metadata: { intensity },
    }
    appendFeedback(event)
    setFlash('Đã ghi nhận phản hồi.')
    setNote('')
    onSubmitted?.(event)
    window.setTimeout(() => setFlash(null), 1600)
  }

  const meta = ROLE_META[role]
  return (
    <div
      className={cn(
        'rounded-[1.6rem] border bg-white p-4 shadow-sm',
        variant === 'compact' ? 'border-slate-200' : 'border-emerald-100',
      )}
    >
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: meta.color }}>
            {meta.label} · Phản hồi
          </p>
          {topicTitle ? (
            <h4 className="text-sm font-extrabold text-[#003527]">{topicTitle}</h4>
          ) : (
            <h4 className="text-sm font-extrabold text-[#003527]">Tổng quát</h4>
          )}
        </div>
      </header>

      {/* Kind picker */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition',
              kind === k.value
                ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
              {k.icon}
            </span>
            {k.label}
          </button>
        ))}
      </div>

      {/* Intensity slider */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[11px]">
          <span className="font-bold text-[#003527]">Mức độ tin cậy / cường độ</span>
          <span className="font-bold text-[#446900]">{intensity}/5</span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          className="mt-1 h-2 w-full cursor-pointer accent-emerald-600"
        />
        <p className="text-[10px] text-[#446900]">
          rating = {rating >= 0 ? '+' : ''}
          {rating.toFixed(2)} · clamp ±{role === 'teacher' ? '1.00' : '0.75'} · weight {role === 'teacher' ? '0.25' : '0.15'}
        </p>
      </div>

      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={
          role === 'teacher'
            ? 'Nhận xét chuyên môn về phần này…'
            : 'Quan sát của phụ huynh ở nhà…'
        }
        className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:bg-white"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        {flash ? (
          <p className="text-[11px] font-bold text-emerald-700">✓ {flash}</p>
        ) : (
          <span className="text-[11px] text-slate-400">
            Phản hồi đi vào RLHF reranker.
          </span>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-full bg-[#064e3b] px-4 py-1.5 text-xs font-black text-[#b2f746] transition hover:bg-[#003527]"
        >
          Gửi
        </button>
      </div>
    </div>
  )
}
