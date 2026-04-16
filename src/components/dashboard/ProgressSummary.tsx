import { Card } from '../ui/Card'
import type { ProgressStats } from '../../lib/todayActivities'

interface ProgressSummaryProps {
  stats: ProgressStats
}

export function ProgressSummary({ stats }: ProgressSummaryProps) {
  // Use activity completion as the primary progress metric (more tangible
  // than BKT mastery % which can be abstract to students).
  const pct =
    stats.pathDaysTotal > 0
      ? Math.round((stats.pathDaysCompleted / stats.pathDaysTotal) * 100)
      : 0

  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold text-slate-900">📊 Tiến độ</h2>

      {/* Main progress bar */}
      <div className="mb-2 flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-lg font-bold text-brand-700">{pct}%</span>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
        <span>
          <strong className="text-slate-800">{stats.pathDaysCompleted}</strong>/
          {stats.pathDaysTotal} hoạt động
        </span>
        <span>
          Mastery TB{' '}
          <strong className="text-slate-800">
            {(stats.avgMastery * 100).toFixed(0)}%
          </strong>
        </span>
        <span>
          <strong className="text-slate-800">{stats.totalQuestions}</strong> câu
          đã làm
        </span>
        {stats.estimatedCompletion && (
          <span>
            Xong{' '}
            <strong className="text-slate-800">
              {formatDate(stats.estimatedCompletion)}
            </strong>
          </span>
        )}
      </div>
    </Card>
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
