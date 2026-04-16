import type { GapInfo } from '../../types/profile'
import { cn } from '../../lib/cn'

interface GapListProps {
  gaps: GapInfo[]
  target: number
}

/**
 * Prioritized gap table — the "what to study next" actionable view.
 *
 * Each row shows the topic name, its current mastery, the gap to target,
 * and a progress bar visualizing the gap (the bigger the bar, the worse the
 * gap). Topics flagged weak by the student during onboarding get a gold
 * star + priority bonus so they float to the top even at equal gaps.
 */
export function GapList({ gaps, target }: GapListProps) {
  if (gaps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
        🎉 Không có lỗ hổng đáng kể — mọi chủ đề đều trên mức mục tiêu{' '}
        <strong>{target.toFixed(2)}</strong>.
      </div>
    )
  }

  // Normalize bar width to the largest gap in the list so the visual
  // dominance matches relative severity (not absolute).
  const maxGap = gaps.reduce((m, g) => Math.max(m, g.gap), 0.0001)

  return (
    <ol className="space-y-2">
      {gaps.map((g, i) => {
        const barPct = (g.gap / maxGap) * 100
        return (
          <li
            key={g.topicId}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-slate-800">
                  {g.title}
                </span>
                {g.weakBonus > 1 && (
                  <span
                    className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                    title="Bạn tự đánh dấu đây là chủ đề yếu khi onboarding"
                  >
                    ⭐ tự nhận yếu
                  </span>
                )}
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    'h-full rounded-full',
                    g.gap > 0.3
                      ? 'bg-rose-500'
                      : g.gap > 0.2
                        ? 'bg-orange-500'
                        : 'bg-amber-500',
                  )}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right text-xs tabular-nums text-slate-500">
              <div className="font-semibold text-slate-800">
                gap {g.gap.toFixed(2)}
              </div>
              <div>
                {g.mastery.toFixed(2)} → {g.target.toFixed(2)}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
