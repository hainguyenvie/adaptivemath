import { useOnboarding } from '../../contexts/OnboardingContext'
import {
  DAILY_MINUTES_OPTIONS,
  GOAL_OPTIONS,
  GRADE_LABELS,
  SELF_LEVEL_OPTIONS,
} from '../../types/user'
import { getTopicById } from '../../data/topics'

interface Row {
  label: string
  value: string
}

export function SummaryStep() {
  const { state } = useOnboarding()

  const rows: Row[] = []

  if (state.grade) {
    rows.push({ label: 'Lớp hiện tại', value: GRADE_LABELS[state.grade] })
  }
  if (state.goal) {
    const found = GOAL_OPTIONS.find((g) => g.value === state.goal)
    rows.push({ label: 'Mục tiêu', value: found?.label ?? state.goal })
  }
  if (state.dailyMinutes) {
    const found = DAILY_MINUTES_OPTIONS.find(
      (o) => o.value === state.dailyMinutes,
    )
    rows.push({
      label: 'Thời gian mỗi ngày',
      value: found?.label ?? `${state.dailyMinutes} phút`,
    })
  }
  rows.push({
    label: 'Deadline',
    value: state.deadline ? formatDate(state.deadline) : 'Không có',
  })
  if (state.selfLevel) {
    const found = SELF_LEVEL_OPTIONS.find((s) => s.value === state.selfLevel)
    rows.push({
      label: 'Tự đánh giá',
      value: found?.label ?? state.selfLevel,
    })
  }

  const weakTopics = (state.weakTopicIds ?? [])
    .map((id) => getTopicById(id))
    .filter((topic): topic is NonNullable<typeof topic> => topic !== undefined)

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        Xác nhận thông tin
      </h2>
      <p className="mb-6 text-slate-600">
        Kiểm tra lại thông tin dưới đây, sau đó bấm xác nhận để bắt đầu.
      </p>

      <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-5 py-3"
          >
            <dt className="text-sm text-slate-500">{row.label}</dt>
            <dd className="text-sm font-semibold text-slate-800">
              {row.value}
            </dd>
          </div>
        ))}
        <div className="px-5 py-3">
          <dt className="mb-2 text-sm text-slate-500">
            Chủ đề yếu ({weakTopics.length})
          </dt>
          <dd className="flex flex-wrap gap-2">
            {weakTopics.map((topic) => (
              <span
                key={topic.id}
                className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800"
              >
                {topic.title}
              </span>
            ))}
            {weakTopics.length === 0 && (
              <span className="text-sm text-slate-400">
                Chưa chọn chủ đề nào
              </span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}
