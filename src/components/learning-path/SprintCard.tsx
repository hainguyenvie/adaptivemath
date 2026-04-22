import { useState } from 'react'
import type { Sprint } from '../../types/learningPath'
import { DayRow } from './DayRow'
import { cn } from '../../lib/cn'

interface SprintCardProps {
  sprint: Sprint
  defaultOpen?: boolean
}

export function SprintCard({ sprint, defaultOpen = false }: SprintCardProps) {
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
  const topicPreview = sprint.topicSummary.slice(0, 3).join(', ')
  const more = sprint.topicSummary.length > 3 ? ` +${sprint.topicSummary.length - 3} chủ đề` : ''

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-[#002117]/5">
      <button
        type="button"
        onClick={() => setSectionOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-emerald-50/50"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black',
            'bg-[#064e3b] text-[#b2f746]',
          )}>
            {sprint.weekNumber}
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-[#003527] truncate">{sprint.label}</div>
            <div className="text-xs font-medium text-[#404944]/60 mt-0.5">{dateRange}</div>
            <div className="text-xs text-[#446900] truncate mt-0.5">
              {topicPreview}{more}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden sm:inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#446900]">
            {sprint.days.length} ngày
          </span>
          <span className="material-symbols-outlined text-[#9fb3aa] transition-transform" style={{
            transform: sectionOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            expand_more
          </span>
        </div>
      </button>

      {sectionOpen && (
        <div className="border-t border-emerald-50 px-6 py-4 space-y-2">
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
