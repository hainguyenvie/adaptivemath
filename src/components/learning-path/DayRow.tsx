import type { DaySession } from '../../types/learningPath'
import { ActivityChip } from './ActivityChip'
import { cn } from '../../lib/cn'

interface DayRowProps {
  day: DaySession
  /** Whether this row is expanded (shows activities). */
  open: boolean
  onToggle: () => void
}

export function DayRow({ day, open, onToggle }: DayRowProps) {
  const dateLabel = formatShortDate(day.date)

  return (
    <div className="border-l-2 border-slate-200 pl-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 rounded-lg py-2 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          {/* Timeline dot */}
          <div
            className={cn(
              '-ml-[21px] h-3 w-3 shrink-0 rounded-full border-2',
              day.isReviewDay
                ? 'border-amber-400 bg-amber-100'
                : 'border-brand-400 bg-brand-100',
            )}
          />
          <div>
            <span className="font-medium text-slate-800">
              Ngày {day.dayNumber}
            </span>
            <span className="mx-2 text-slate-400">·</span>
            <span className="text-sm text-slate-500">{dateLabel}</span>
            {day.isReviewDay && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                ⟲ Ôn tập
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>~{day.estimatedMinutes} phút</span>
          <span className="text-slate-400">{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-2 pb-3 pt-1">
          {day.activities.map((a, i) => (
            <ActivityChip key={`${a.topicId}-${i}`} activity={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return iso
  }
}
