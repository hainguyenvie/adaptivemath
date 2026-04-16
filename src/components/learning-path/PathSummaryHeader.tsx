import { useMemo } from 'react'
import type { LearningPath } from '../../types/learningPath'
import { loadLearnerState } from '../../lib/learnerStorage'
import { Card } from '../ui/Card'

interface PathSummaryHeaderProps {
  path: LearningPath
}

export function PathSummaryHeader({ path }: PathSummaryHeaderProps) {
  // Compute real progress from learner state.
  const progress = useMemo(() => {
    const learner = loadLearnerState()
    const completedSet = new Set(learner.completedActivities)

    let totalActivities = 0
    let completedCount = 0
    for (const sprint of path.sprints) {
      for (const day of sprint.days) {
        for (const act of day.activities) {
          totalActivities++
          if (completedSet.has(act.activityId)) completedCount++
        }
      }
    }

    const pct =
      totalActivities > 0
        ? Math.round((completedCount / totalActivities) * 100)
        : 0

    return { completedCount, totalActivities, pct }
  }, [path])

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Chủ đề cần ôn"
        value={String(path.totalTopics)}
        hint={`${path.sprints.length} tuần`}
      />
      <StatCard
        label="Tổng số ngày"
        value={`~${path.totalDays}`}
        hint={`${path.dailyMinutes} phút/ngày`}
      />
      <StatCard
        label="Hoàn thành"
        value={`${progress.pct}%`}
        hint={`${progress.completedCount}/${progress.totalActivities} hoạt động`}
      />
      <StatCard
        label="Dự kiến xong"
        value={formatDate(path.estimatedCompletionDate)}
        hint={
          path.deadline
            ? `Deadline: ${formatDate(path.deadline)}`
            : 'Không có deadline'
        }
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-brand-700">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
