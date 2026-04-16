import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { ACTIVITY_COLORS, ACTIVITY_LABELS } from '../../types/learningPath'
import type { TodayActivity } from '../../lib/todayActivities'
import { cn } from '../../lib/cn'

interface TodayCardProps {
  activities: TodayActivity[]
  dailyMinutes: number
}

export function TodayCard({ activities, dailyMinutes }: TodayCardProps) {
  const navigate = useNavigate()
  const totalMinutes = activities.reduce(
    (s, a) => s + a.activity.estimatedMinutes,
    0,
  )

  if (activities.length === 0) {
    return (
      <Card className="text-center">
        <div className="text-3xl">🎉</div>
        <h3 className="mt-2 text-lg font-bold text-slate-900">
          Không có bài tập hôm nay!
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Nghỉ ngơi hoặc ôn lại chủ đề yêu thích.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">
          📋 Hôm nay cần làm
        </h2>
        <span className="text-sm text-slate-500">
          {activities.length} hoạt động · ~{totalMinutes}/{dailyMinutes} phút
        </span>
      </div>

      <div className="space-y-2">
        {activities.map((item) => {
          const a = item.activity
          const colors = ACTIVITY_COLORS[a.type]

          const handleClick = () => {
            if (a.type === 'theory') {
              navigate(`/theory?topic=${encodeURIComponent(a.topicId)}&activityId=${encodeURIComponent(a.activityId)}`)
            } else {
              const levels =
                a.levels.length > 0 ? a.levels.join(',') : 'N,H'
              navigate(
                `/practice?topic=${encodeURIComponent(a.topicId)}&levels=${levels}&type=${a.type}&activityId=${encodeURIComponent(a.activityId)}`,
              )
            }
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={handleClick}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                'hover:shadow-md hover:ring-1 hover:ring-brand-300',
                colors.bg,
                colors.border,
              )}
            >
              <span className="text-xl">{colors.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                      colors.border,
                      colors.text,
                    )}
                  >
                    {ACTIVITY_LABELS[a.type]}
                  </span>
                  <span className="truncate font-medium text-slate-900">
                    {a.topicTitle}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  <span>{item.reason}</span>
                  <span>·</span>
                  <span>~{a.estimatedMinutes} phút</span>
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
                {a.type === 'theory' ? 'Đọc' : 'Bắt đầu'}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
