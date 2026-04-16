import { useState } from 'react'
import type { Sprint } from '../../types/learningPath'
import { DayRow } from './DayRow'
import { cn } from '../../lib/cn'

interface SprintCardProps {
  sprint: Sprint
  /** Whether to expand all days by default (typically true for sprint 1). */
  defaultOpen?: boolean
}

export function SprintCard({
  sprint,
  defaultOpen = false,
}: SprintCardProps) {
  const [sectionOpen, setSectionOpen] = useState(defaultOpen)
  const [openDays, setOpenDays] = useState<Set<number>>(
    () => new Set(defaultOpen ? sprint.days.map((d) => d.dayNumber) : []),
  )

  const toggleDay = (dayNumber: number) => {
    setOpenDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayNumber)) next.delete(dayNumber)
      else next.add(dayNumber)
      return next
    })
  }

  const dateRange = `${formatDate(sprint.startDate)} – ${formatDate(sprint.endDate)}`
  const topicPreview = sprint.topicSummary.slice(0, 4).join(', ')
  const more = sprint.topicSummary.length > 4 ? ` +${sprint.topicSummary.length - 4}` : ''

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setSectionOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
              'bg-brand-100 text-brand-800',
            )}>
              {sprint.weekNumber}
            </span>
            <div>
              <div className="font-semibold text-slate-900">
                {sprint.label}
              </div>
              <div className="text-xs text-slate-500">{dateRange}</div>
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {topicPreview}{more}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{sprint.days.length} ngày</span>
          <span>{sectionOpen ? '▾' : '▸'}</span>
        </div>
      </button>

      {sectionOpen && (
        <div className="space-y-1 border-t border-slate-100 px-5 py-4">
          {sprint.days.map((day) => (
            <DayRow
              key={day.dayNumber}
              day={day}
              open={openDays.has(day.dayNumber)}
              onToggle={() => toggleDay(day.dayNumber)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return iso
  }
}
