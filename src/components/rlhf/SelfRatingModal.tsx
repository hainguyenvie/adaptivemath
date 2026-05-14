import { useState } from 'react'
import { cn } from '../../lib/cn'
import { appendFeedback, makeFeedbackId } from '../../lib/rlhf/feedbackStore'
import type { FeedbackEvent } from '../../types/rlhf'

interface SelfRatingModalProps {
  topicId: string
  topicTitle: string
  /** Optional activity id for activity-scoped feedback. */
  activityId?: string
  onClose: () => void
  /** Called after the rating is saved. */
  onSubmitted?: (event: FeedbackEvent) => void
}

/**
 * Post-session self-rating form. Three 1-5 sliders:
 *   - Tự tin (confidence) → positive contribution
 *   - Quá tải (overload)  → negative contribution
 *   - Thú vị (interest)   → positive
 *
 * Final rating = clamp(((conf − 3) + (interest − 3) − (overload − 3)) / 6, -1, 1)
 * Confidence (model-side) = 0.65 (self is medium-trust by design).
 */
export function SelfRatingModal({
  topicId,
  topicTitle,
  activityId,
  onClose,
  onSubmitted,
}: SelfRatingModalProps) {
  const [confidence, setConfidence] = useState(3)
  const [overload, setOverload] = useState(2)
  const [interest, setInterest] = useState(3)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  const rating = computeRating(confidence, overload, interest)

  const handleSubmit = () => {
    const timestamp = new Date().toISOString()
    const event: FeedbackEvent = {
      id: makeFeedbackId({
        source: 'self',
        kind: 'session_self',
        topicId,
        activityId,
        timestamp,
      }),
      source: 'self',
      kind: 'session_self',
      topicId,
      activityId,
      rating,
      confidence: 0.65,
      timestamp,
      authorId: 'self',
      authorName: 'Tự đánh giá',
      note: note.trim() || undefined,
      metadata: { confidence, overload, interest },
    }
    appendFeedback(event)
    setSaved(true)
    onSubmitted?.(event)
    // Auto-close after a beat so the user sees the confirmation.
    window.setTimeout(onClose, 700)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#002117]/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-[0_30px_80px_rgba(0,53,39,0.22)]"
        style={{ animation: 'modalIn 220ms ease-out both' }}
      >
        <header className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
              self_improvement
            </span>
            Tự đánh giá phiên học
          </span>
          <h3 className="text-xl font-extrabold text-[#003527]">{topicTitle}</h3>
          <p className="text-sm text-[#404944]">
            Cảm nhận của em sẽ được dùng làm tín hiệu R<sub>HS</sub> trong RLHF
            đa nguồn (trọng số 0.15).
          </p>
        </header>

        <div className="mt-5 space-y-4">
          <Slider
            label="Tự tin với chủ đề này"
            color="emerald"
            value={confidence}
            onChange={setConfidence}
          />
          <Slider
            label="Mức quá tải / mệt mỏi"
            color="rose"
            value={overload}
            onChange={setOverload}
            invert
          />
          <Slider
            label="Hứng thú với nội dung"
            color="amber"
            value={interest}
            onChange={setInterest}
          />

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#2b6954]">
              Ghi chú (tuỳ chọn)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ví dụ: phần biến đổi đại số em vẫn còn lúng túng…"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#003527]">
                Tín hiệu R<sub>HS</sub>
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                  rating >= 0.15
                    ? 'bg-emerald-100 text-emerald-800'
                    : rating <= -0.15
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700',
                )}
              >
                {rating >= 0 ? '+' : ''}
                {rating.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#446900]">
              Tín hiệu sẽ bị giới hạn ±0.5 để chống nhiễu, sau đó được nhân
              trọng số 0.15.
            </p>
          </div>

          {saved ? (
            <div className="rounded-full bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white">
              ✓ Đã ghi nhận. Cảm ơn em!
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-[2] rounded-full bg-[#064e3b] px-4 py-3 text-sm font-black text-[#b2f746] transition hover:bg-[#003527]"
              >
                Gửi đánh giá
              </button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes modalIn {
            from { transform: translateY(8px) scale(0.98); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}

function Slider({
  label,
  value,
  onChange,
  color,
  invert,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  color: 'emerald' | 'rose' | 'amber'
  invert?: boolean
}) {
  const colorMap: Record<string, string> = {
    emerald: 'accent-emerald-600',
    rose: 'accent-rose-600',
    amber: 'accent-amber-600',
  }
  const labels = invert
    ? ['Bình thường', 'Hơi mệt', 'Mệt', 'Khá mệt', 'Quá tải']
    : ['Thấp', 'Khá thấp', 'Trung bình', 'Khá cao', 'Rất cao']
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-[#003527]">{label}</span>
        <span className="text-xs font-semibold text-[#446900]">
          {labels[value - 1]} ({value}/5)
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn('mt-1 h-2 w-full cursor-pointer rounded-full bg-slate-200', colorMap[color])}
      />
    </div>
  )
}

function computeRating(confidence: number, overload: number, interest: number): number {
  const raw = ((confidence - 3) + (interest - 3) - (overload - 3)) / 6
  return Math.max(-1, Math.min(1, raw))
}
