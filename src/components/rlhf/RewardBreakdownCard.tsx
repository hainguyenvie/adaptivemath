import type { RewardBreakdown } from '../../types/rlhf'
import { SOURCE_META } from '../../types/rlhf'
import { cn } from '../../lib/cn'

interface RewardBreakdownCardProps {
  breakdown: RewardBreakdown
  /** Topic display label. */
  title: string
  /** Optional click handler on the whole card. */
  onClick?: () => void
  compact?: boolean
}

/**
 * Visualizes the multi-source reward as horizontal stacked contributions.
 * Shows:
 *   - Total R (chip)
 *   - Per-source row: source label · raw → clamped · weight · contribution bar
 *   - Contradiction warning when R_human ≠ R_system
 *   - Exam-proximity tweak indicator
 */
export function RewardBreakdownCard({
  breakdown,
  title,
  onClick,
  compact,
}: RewardBreakdownCardProps) {
  const totalSign = breakdown.totalReward >= 0 ? '+' : ''
  const totalColor =
    breakdown.totalReward >= 0.1
      ? 'bg-emerald-100 text-emerald-800'
      : breakdown.totalReward <= -0.1
        ? 'bg-rose-100 text-rose-800'
        : 'bg-slate-100 text-slate-700'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full rounded-[1.6rem] border border-emerald-100 bg-white text-left shadow-[0_12px_28px_rgba(0,53,39,0.06)] transition',
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <header className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b6954]">
            RLHF · Reward
          </p>
          <h4 className={cn('truncate font-extrabold text-[#003527]', compact ? 'text-sm' : 'text-base')}>
            {title}
          </h4>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold tabular-nums', totalColor)}>
          R = {totalSign}{breakdown.totalReward.toFixed(2)}
        </span>
      </header>

      {/* Contradiction + exam banner */}
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
        {breakdown.contradiction && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-bold text-amber-900">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>warning</span>
            Mâu thuẫn — α giảm xuống 0.2
          </span>
        )}
        {breakdown.daysToExam !== null && breakdown.daysToExam < 30 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 font-bold text-blue-900">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
            Còn {breakdown.daysToExam.toFixed(0)} ngày — tăng trọng số GV
          </span>
        )}
      </div>

      {/* Per-source rows */}
      <ul className="mt-3 space-y-1.5">
        {breakdown.perSource.map((p) => {
          const meta = SOURCE_META[p.source]
          const contributionPct = Math.max(-100, Math.min(100, p.contribution * 100))
          const positive = contributionPct >= 0
          const barWidth = Math.abs(contributionPct)
          return (
            <li key={p.source} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold', meta.tint)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{meta.icon}</span>
                  {meta.label}
                  {p.eventCount > 0 && (
                    <span className="opacity-70">· {p.eventCount}</span>
                  )}
                </span>
                <span className="font-mono tabular-nums text-[10px] text-[#446900]">
                  raw {fmt(p.raw)} → clamp {fmt(p.clamped)} × w {p.weight.toFixed(2)}
                </span>
                <span
                  className={cn(
                    'min-w-[44px] rounded-full px-1.5 py-0.5 text-right text-[10px] font-bold tabular-nums',
                    positive ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800',
                  )}
                >
                  {positive ? '+' : ''}
                  {p.contribution.toFixed(3)}
                </span>
              </div>
              {/* Bar */}
              <div className="relative h-1.5 rounded-full bg-slate-100">
                <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300" />
                <div
                  className={cn(
                    'absolute inset-y-0 rounded-full',
                    positive ? 'bg-emerald-400' : 'bg-rose-400',
                  )}
                  style={{
                    left: positive ? '50%' : `${50 - barWidth / 2}%`,
                    width: `${barWidth / 2}%`,
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </button>
  )
}

function fmt(x: number): string {
  return (x >= 0 ? '+' : '') + x.toFixed(2)
}
