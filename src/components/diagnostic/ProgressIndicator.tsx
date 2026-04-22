import { useEffect, useState } from 'react'
import { CAT_CONFIG } from '../../types/question'
import { cn } from '../../lib/cn'
import { DiagnosticIcon, type DiagnosticIconName } from './DiagnosticIcon'

interface ProgressIndicatorProps {
  itemsAnswered: number
  completedTopics: number
  totalTopics: number
  sessionStartedAt: number
}

interface Metric {
  label: string
  value: string
  progress: number
  icon: DiagnosticIconName
}

export function ProgressIndicator({
  itemsAnswered,
  completedTopics,
  totalTopics,
  sessionStartedAt,
}: ProgressIndicatorProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(id)
  }, [])

  const elapsedMs = Math.max(0, now - sessionStartedAt)
  const minutesLeft = Math.max(
    0,
    Math.ceil((CAT_CONFIG.sessionTimeLimitMs - elapsedMs) / 60_000),
  )

  const itemProgress = Math.min(1, itemsAnswered / CAT_CONFIG.maxItems)
  const topicProgress =
    totalTopics > 0 ? Math.min(1, completedTopics / totalTopics) : 0
  const timeProgress = Math.min(1, elapsedMs / CAT_CONFIG.sessionTimeLimitMs)

  const metrics: Metric[] = [
    {
      label: 'Câu hỏi',
      value: `${itemsAnswered}/${CAT_CONFIG.maxItems}`,
      progress: itemProgress,
      icon: 'edit',
    },
    {
      label: 'Chủ đề',
      value: `${completedTopics}/${totalTopics}`,
      progress: topicProgress,
      icon: 'hub',
    },
    {
      label: 'Còn lại',
      value: `${minutesLeft}p`,
      progress: timeProgress,
      icon: 'clock',
    },
  ]

  return (
    <div className="space-y-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#294e3f]">
            <span className="flex min-w-0 items-center gap-2">
              <DiagnosticIcon name={metric.icon} className="h-4 w-4 text-[#446900]" />
              <span className="truncate">{metric.label}</span>
            </span>
            <span className="shrink-0 text-[#003527]">{metric.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#cdeedd]">
            <div
              className={cn(
                'h-full rounded-full bg-[linear-gradient(90deg,#95d3ba_0%,#b2f746_100%)] transition-all duration-500',
              )}
              style={{ width: `${Math.round(metric.progress * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
