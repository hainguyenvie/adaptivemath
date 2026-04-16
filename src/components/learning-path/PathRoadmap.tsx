import type { LearningPath, Sprint } from '../../types/learningPath'
import { cn } from '../../lib/cn'

interface PathRoadmapProps {
  path: LearningPath
}

/**
 * A compact visual "roadmap" overview showing the entire learning path
 * as a horizontal timeline of sprint blocks. Each sprint is a colored
 * segment with topic dots inside. Gives the student a bird's-eye view
 * of how much work is ahead without drowning in details.
 */
export function PathRoadmap({ path }: PathRoadmapProps) {
  if (path.sprints.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-800">
        📍 Tổng quan lộ trình
      </h3>

      {/* Horizontal timeline */}
      <div className="relative">
        {/* Track line */}
        <div className="absolute left-6 right-6 top-5 h-1 rounded-full bg-slate-200" />

        <div className="relative flex items-start justify-between gap-1">
          {/* Start marker */}
          <div className="flex flex-col items-center">
            <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow-md">
              🏁
            </div>
            <span className="mt-1 text-[10px] text-slate-500">Hôm nay</span>
          </div>

          {/* Sprint blocks */}
          {path.sprints.map((sprint) => (
            <SprintBlock key={sprint.weekNumber} sprint={sprint} />
          ))}

          {/* End marker */}
          <div className="flex flex-col items-center">
            <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-md">
              🎯
            </div>
            <span className="mt-1 text-[10px] text-slate-500">
              {formatShort(path.estimatedCompletionDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
          Lý thuyết
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Luyện tập
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Ôn tập
        </span>
        <span className="ml-auto text-slate-400">
          {path.totalDays} ngày · {path.sprints.length} tuần · {path.totalTopics} chủ đề
        </span>
      </div>
    </div>
  )
}

function SprintBlock({ sprint }: { sprint: Sprint }) {
  // Count activity types for the dot visualization.
  let theoryCount = 0
  let practiceCount = 0
  let reviewCount = 0
  for (const day of sprint.days) {
    for (const a of day.activities) {
      if (a.type === 'theory') theoryCount++
      else if (a.type === 'review') reviewCount++
      else practiceCount++
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center">
      {/* Sprint node */}
      <div
        className={cn(
          'relative z-10 flex h-10 w-full max-w-[120px] items-center justify-center',
          'rounded-lg border bg-white px-2 shadow-sm',
          'border-brand-200',
        )}
      >
        {/* Activity dots */}
        <div className="flex flex-wrap justify-center gap-0.5">
          {Array.from({ length: Math.min(theoryCount, 4) }).map((_, i) => (
            <span
              key={`t${i}`}
              className="h-2 w-2 rounded-full bg-violet-400"
            />
          ))}
          {Array.from({ length: Math.min(practiceCount, 6) }).map((_, i) => (
            <span
              key={`p${i}`}
              className="h-2 w-2 rounded-full bg-emerald-400"
            />
          ))}
          {Array.from({ length: Math.min(reviewCount, 3) }).map((_, i) => (
            <span
              key={`r${i}`}
              className="h-2 w-2 rounded-full bg-amber-400"
            />
          ))}
        </div>
      </div>
      {/* Label */}
      <span className="mt-1 text-[10px] font-medium text-slate-600">
        {sprint.label}
      </span>
      <span className="text-[9px] text-slate-400">
        {sprint.days.length} ngày
      </span>
    </div>
  )
}

function formatShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return iso
  }
}
