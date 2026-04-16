import { useEffect, useState } from 'react'
import { CAT_CONFIG } from '../../types/question'
import { cn } from '../../lib/cn'

interface ProgressIndicatorProps {
  itemsAnswered: number
  standardError: number
  sessionStartedAt: number
}

/**
 * Assumed baseline SE at the start of a session. Real SE becomes meaningful
 * only after a few responses — before that it's Infinity from
 * `estimateThetaFromSession`. We anchor the "SE progress" calculation at
 * this value so the bar fills from 0 to 1 as SE drops toward the stop
 * threshold (0.3).
 */
const SE_BASELINE = 1.2

interface Snapshot {
  /** 0..1 for each stop condition — how close we are to triggering it. */
  itemProgress: number
  seProgress: number
  timeProgress: number
  /** The overall progress number shown to the user (max of the three). */
  overall: number
  /** Which metric is driving the bar — used for the hint line below. */
  leading: 'items' | 'precision' | 'time' | 'starting'
}

function computeProgress(
  itemsAnswered: number,
  standardError: number,
  elapsedMs: number,
): Snapshot {
  // 1. Item-count progress. Goes 0 → 1 as we approach `maxItems`, not
  //    `minItems` — hitting minItems is only one prerequisite for stopping,
  //    it doesn't automatically finish the test.
  const itemProgress = Math.min(1, itemsAnswered / CAT_CONFIG.maxItems)

  // 2. SE progress. The CAT may stop on precision ONLY after `minItems`,
  //    so before that threshold we pin SE progress at 0 even if SE is low.
  let seProgress = 0
  if (itemsAnswered >= CAT_CONFIG.minItems && Number.isFinite(standardError)) {
    const denom = SE_BASELINE - CAT_CONFIG.seThreshold
    if (denom > 0) {
      seProgress = (SE_BASELINE - standardError) / denom
    }
    seProgress = Math.max(0, Math.min(1, seProgress))
  }

  // 3. Time progress — linear fraction of the 45-minute cap.
  const timeProgress = Math.max(
    0,
    Math.min(1, elapsedMs / CAT_CONFIG.sessionTimeLimitMs),
  )

  // Pick the metric that's closest to its stop condition.
  let overall = itemProgress
  let leading: Snapshot['leading'] = 'items'
  if (seProgress > overall) {
    overall = seProgress
    leading = 'precision'
  }
  if (timeProgress > overall) {
    overall = timeProgress
    leading = 'time'
  }

  // Before we have any responses, call it "starting" so the hint line
  // explains the bar is at 0 for a good reason.
  if (itemsAnswered === 0) leading = 'starting'

  return { itemProgress, seProgress, timeProgress, overall, leading }
}

/**
 * Progress bar that reflects CAT's *real* stopping logic.
 *
 * The bar shows the maximum of three independent progress metrics:
 *   1. item-count progress toward the 40-item cap,
 *   2. SE-narrowing progress toward SE < 0.3 (engaged only after minItems),
 *   3. elapsed-time progress toward the 45-minute session cap.
 *
 * This means the bar can only hit 100 % when the session is about to stop,
 * not immediately after the minimum item count is met.
 */
export function ProgressIndicator({
  itemsAnswered,
  standardError,
  sessionStartedAt,
}: ProgressIndicatorProps) {
  // Re-render every 10 s so the time-based portion of the bar keeps ticking
  // even when the student hasn't answered anything recently.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(id)
  }, [])

  const elapsedMs = Math.max(0, now - sessionStartedAt)
  const snap = computeProgress(itemsAnswered, standardError, elapsedMs)
  const pct = Math.round(snap.overall * 100)

  const hint = buildHint(snap, itemsAnswered, standardError, elapsedMs)

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>
          Đã hoàn thành{' '}
          <strong className="text-slate-800">{itemsAnswered}</strong> câu
        </span>
        <span>Tiến độ hồ sơ ~{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full rounded-full bg-brand-500 transition-all duration-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-slate-400">{hint}</div>
    </div>
  )
}

function buildHint(
  snap: Snapshot,
  items: number,
  se: number,
  elapsedMs: number,
): string {
  const minItems = CAT_CONFIG.minItems
  const maxItems = CAT_CONFIG.maxItems
  const seTh = CAT_CONFIG.seThreshold
  const minutesLeft = Math.max(
    0,
    Math.ceil((CAT_CONFIG.sessionTimeLimitMs - elapsedMs) / 60_000),
  )

  // Always useful context.
  const seStr = Number.isFinite(se) ? se.toFixed(2) : '—'
  const timeStr = `${minutesLeft} phút`

  if (snap.leading === 'starting') {
    return `Đề sẽ chọn tối thiểu ${minItems} câu, tối đa ${maxItems} câu hoặc đến khi SE < ${seTh}.`
  }
  if (items < minItems) {
    return `Cần làm thêm ${minItems - items} câu để hoàn thành mức tối thiểu · SE ${seStr} · còn ~${timeStr}`
  }
  if (snap.leading === 'precision') {
    return `Đang hội tụ: SE ${seStr} → mục tiêu ${seTh} · đã làm ${items}/${maxItems} câu · còn ~${timeStr}`
  }
  if (snap.leading === 'time') {
    return `Gần hết thời gian (~${timeStr}) · đã làm ${items}/${maxItems} câu · SE ${seStr}`
  }
  // items
  return `Đã qua mức tối thiểu · đã làm ${items}/${maxItems} câu · SE ${seStr} → ${seTh} · còn ~${timeStr}`
}
