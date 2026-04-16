import { useState } from 'react'
import type { AdaptiveDecision, SessionMetrics, StudentState } from '../../lib/adaptiveEngine'
import { cn } from '../../lib/cn'

/** One entry in the adaptive event timeline. */
export interface AdaptiveEvent {
  questionNumber: number
  score: number
  state: StudentState
  offset: number
  targetB: number
  streak: number
  wrongStreak: number
  accuracy: number
  suggestion: string | null
  timestamp: number
}

interface AdaptiveDisplayProps {
  /** Current decision from the engine. */
  decision: AdaptiveDecision | null
  /** Running metrics. */
  metrics: SessionMetrics
  /** Accumulated event history for this session. */
  events: AdaptiveEvent[]
}

const STATE_CONFIG: Record<
  StudentState,
  { label: string; icon: string; color: string; bg: string; description: string }
> = {
  normal: {
    label: 'Bình thường',
    icon: '⚪',
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    description: 'Độ khó hơi cao hơn năng lực hiện tại (+0.3)',
  },
  frustration: {
    label: 'Đang gặp khó',
    icon: '🔴',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    description: 'Giảm độ khó để lấy lại confidence (-0.5)',
  },
  boredom: {
    label: 'Quá dễ',
    icon: '🟡',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    description: 'Tăng thử thách đáng kể (+0.8)',
  },
  flow: {
    label: 'Flow zone',
    icon: '🟢',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    description: 'Vùng tối ưu — duy trì nhịp hiện tại (+0.4)',
  },
}

/**
 * Real-time adaptive process visualization.
 *
 * Shows:
 *   1. Current state badge with description
 *   2. Live metrics dashboard (accuracy, streak, speed, offset)
 *   3. Event timeline (scrollable log of state transitions)
 *
 * Designed to be "khéo" — informative but not overwhelming. Default
 * collapsed, expands to show the full timeline.
 */
export function AdaptiveDisplay({
  decision,
  metrics,
  events,
}: AdaptiveDisplayProps) {
  const [expanded, setExpanded] = useState(false)

  if (!decision) return null

  const cfg = STATE_CONFIG[decision.state]
  const accuracy =
    metrics.totalResponses > 0
      ? metrics.correctCount / metrics.totalResponses
      : 0

  // Find state transitions (when state changed from previous event).
  const transitions = events.filter(
    (e, i) => i === 0 || e.state !== events[i - 1].state,
  )

  return (
    <div className={cn('rounded-xl border p-4 transition-colors', cfg.bg, 'border-slate-200')}>
      {/* Current state header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cfg.icon}</span>
          <div>
            <span className={cn('text-sm font-semibold', cfg.color)}>
              {cfg.label}
            </span>
            <span className="ml-2 text-xs text-slate-500">
              {cfg.description}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          {expanded ? '▾ Thu gọn' : '▸ Chi tiết'}
        </button>
      </div>

      {/* Live metrics bar */}
      <div className="mt-3 flex flex-wrap gap-3">
        <MetricPill
          label="Accuracy"
          value={`${(accuracy * 100).toFixed(0)}%`}
          tone={accuracy >= 0.7 ? 'good' : accuracy >= 0.4 ? 'warn' : 'bad'}
        />
        <MetricPill
          label="Streak"
          value={metrics.streak > 0 ? `🔥${metrics.streak}` : `—`}
          tone={metrics.streak >= 5 ? 'good' : 'neutral'}
        />
        <MetricPill
          label="Offset"
          value={`${decision.offset >= 0 ? '+' : ''}${decision.offset.toFixed(2)}`}
          tone={
            decision.offset > 0.5
              ? 'good'
              : decision.offset < 0
                ? 'bad'
                : 'neutral'
          }
        />
        <MetricPill
          label="Target b"
          value={decision.targetDifficulty.toFixed(2)}
          tone="neutral"
        />
      </div>

      {/* Expanded: event timeline */}
      {expanded && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lịch sử điều chỉnh ({transitions.length} lần thay đổi)
          </h4>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {events.map((evt, i) => {
              const isTransition =
                i === 0 || evt.state !== events[i - 1].state
              const evtCfg = STATE_CONFIG[evt.state]
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 py-1 text-xs',
                    isTransition
                      ? 'bg-white border border-slate-200 shadow-sm'
                      : 'text-slate-500',
                  )}
                >
                  <span className="w-6 shrink-0 text-center tabular-nums text-slate-400">
                    q{evt.questionNumber}
                  </span>
                  <span className={cn('w-4', evt.score >= 0.75 ? 'text-emerald-600' : 'text-rose-500')}>
                    {evt.score >= 0.75 ? '✓' : '✗'}
                  </span>
                  {isTransition && (
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', evtCfg.bg, evtCfg.color)}>
                      {evtCfg.icon} {evtCfg.label}
                    </span>
                  )}
                  <span className="ml-auto tabular-nums text-slate-400">
                    offset {evt.offset >= 0 ? '+' : ''}{evt.offset.toFixed(2)}
                  </span>
                  {evt.suggestion && (
                    <span className="text-sky-600" title={evt.suggestion}>
                      💬
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : tone === 'warn'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : tone === 'bad'
          ? 'text-rose-700 bg-rose-50 border-rose-200'
          : 'text-slate-700 bg-white border-slate-200'
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        toneClass,
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
