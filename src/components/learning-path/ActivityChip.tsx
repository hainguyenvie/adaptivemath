import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Activity } from '../../types/learningPath'
import { ACTIVITY_COLORS, ACTIVITY_LABELS } from '../../types/learningPath'
import { loadLearnerState } from '../../lib/learnerStorage'
import { cn } from '../../lib/cn'

interface ActivityChipProps {
  activity: Activity
}

const LEVEL_LABELS: Record<string, string> = {
  N: 'Nhận biết',
  H: 'Thông hiểu',
  V: 'Vận dụng',
  T: 'Vận dụng cao',
  unknown: '—',
}

export function ActivityChip({ activity: a }: ActivityChipProps) {
  const navigate = useNavigate()
  const colors = ACTIVITY_COLORS[a.type]
  const levelStr = a.levels.map((l) => LEVEL_LABELS[l] ?? l).join(', ')

  // Check if this specific activity instance has been completed.
  const isCompleted = useMemo(() => {
    const learner = loadLearnerState()
    return learner.completedActivities.includes(a.activityId)
  }, [a.activityId])

  const handleClick = () => {
    if (a.type === 'theory') {
      navigate(`/theory?topic=${encodeURIComponent(a.topicId)}&activityId=${encodeURIComponent(a.activityId)}`)
    } else {
      const levels = a.levels.length > 0 ? a.levels.join(',') : 'N,H'
      navigate(
        `/practice?topic=${encodeURIComponent(a.topicId)}&levels=${levels}&type=${a.type}&activityId=${encodeURIComponent(a.activityId)}`,
      )
    }
  }

  let detail = ''
  if (a.type === 'theory') {
    const parts: string[] = []
    if (a.theoryBlockCount > 0) parts.push(`${a.theoryBlockCount} khái niệm`)
    if (a.workedExampleCount > 0)
      parts.push(`${a.workedExampleCount} ví dụ mẫu`)
    detail = parts.join(' · ') + ` · ~${a.estimatedMinutes} phút`
  } else {
    detail = `${levelStr} · ${a.questionCount} câu · ~${a.estimatedMinutes} phút`
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick()
      }}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition',
        'cursor-pointer hover:shadow-md hover:ring-1 hover:ring-brand-300',
        isCompleted
          ? 'border-emerald-200 bg-emerald-50/50 opacity-80'
          : cn(colors.bg, colors.border),
      )}
      title={a.reason}
    >
      {/* Done checkmark or activity icon */}
      <span className="mt-0.5 text-base">
        {isCompleted ? '✅' : colors.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium',
              isCompleted
                ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                : cn(colors.border, colors.text),
            )}
          >
            {isCompleted ? 'Đã hoàn thành' : ACTIVITY_LABELS[a.type]}
          </span>
          <span
            className={cn(
              'font-medium',
              isCompleted ? 'text-slate-500 line-through' : 'text-slate-900',
            )}
          >
            {a.topicTitle}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{detail}</div>
      </div>
      <span className="mt-1 text-xs text-slate-400">
        {isCompleted ? '↻' : '→'}
      </span>
    </div>
  )
}
