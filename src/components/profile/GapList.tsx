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
      <div className="rounded-2xl border border-dashed border-[#95d3ba] bg-[#f4fff9] p-5 text-sm font-bold text-[#003527]">
        🎉 Không có lỗ hổng đáng kể — mọi chủ đề đều trên mức mục tiêu{' '}
        <strong>{target.toFixed(2)}</strong>.
      </div>
    )
  }

  const maxGap = gaps.reduce((m, g) => Math.max(m, g.gap), 0.0001)
  const visible = gaps
  const remaining = 0

  return (
    <ol className="space-y-2">
      {visible.map((g, i) => {
        const barPct = (g.gap / maxGap) * 100
        return (
          <li
            key={g.topicId}
            className="flex items-center gap-3 rounded-2xl border border-[#cdeedd] bg-[#f4fff9] px-4 py-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#064e3b] text-xs font-black text-white">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-[#003527]">
                  {g.title}
                </span>
                {g.weakBonus > 1 && (
                  <span
                    className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800"
                    title="Bạn tự đánh dấu đây là chủ đề yếu khi onboarding"
                  >
                    ⭐ yếu
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#cdeedd]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#fb7185] to-[#fb923c]"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right text-[10px] tabular-nums text-[#9fb3aa]">
              <div className="font-black text-[#003527]">gap {g.gap.toFixed(2)}</div>
              <div>{g.mastery.toFixed(2)} → {g.target.toFixed(2)}</div>
            </div>
          </li>
        )
      })}
      {remaining > 0 && (
        <li className="pt-1 text-center text-[10px] font-bold text-[#9fb3aa]">
          +{remaining} điểm yếu khác
        </li>
      )}
    </ol>
  )
}
