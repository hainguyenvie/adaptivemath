import { Card } from '../ui/Card'
import { cn } from '../../lib/cn'

interface MiniCalendarProps {
  /** Set of ISO date strings (YYYY-MM-DD) when student practiced. */
  practiceDates: Set<string>
}

export function MiniCalendar({ practiceDates }: MiniCalendarProps) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const todayStr = today.toISOString().slice(0, 10)

  const monthName = today.toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  })

  // First day of month and total days.
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Build grid: pad start with empty cells for alignment.
  const cells: Array<{ day: number | null; dateStr: string; practiced: boolean; isToday: boolean }> = []
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateStr: '', practiced: false, isToday: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d,
      dateStr,
      practiced: practiceDates.has(dateStr),
      isToday: dateStr === todayStr,
    })
  }

  const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

  return (
    <Card>
      <h2 className="mb-3 text-sm font-bold capitalize text-slate-900">
        📅 {monthName}
      </h2>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-500">
        {weekdays.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs',
              cell.day === null && 'invisible',
              cell.isToday && 'ring-2 ring-brand-400',
              cell.practiced && 'bg-emerald-100 text-emerald-800 font-bold',
              !cell.practiced && cell.day !== null && 'text-slate-600',
            )}
          >
            {cell.practiced ? '✓' : cell.day}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-100" />
          Đã luyện tập
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full ring-1 ring-brand-400" />
          Hôm nay
        </span>
      </div>
    </Card>
  )
}
