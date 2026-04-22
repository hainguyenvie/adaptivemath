import { useOnboarding } from '../../contexts/OnboardingContext'
import {
  DAILY_MINUTES_OPTIONS,
  GOAL_OPTIONS,
  GRADE_LABELS,
  SELF_LEVEL_OPTIONS,
} from '../../types/user'
import { getTopicById } from '../../data/topics'

interface SummaryCard {
  label: string
  value: string
  icon: string
  tone: string
}

export function SummaryStep() {
  const { state } = useOnboarding()

  const goal = state.goal
    ? (GOAL_OPTIONS.find((g) => g.value === state.goal)?.label ?? state.goal)
    : 'Chưa chọn'
  const dailyMinutes = state.dailyMinutes
    ? (DAILY_MINUTES_OPTIONS.find((o) => o.value === state.dailyMinutes)
        ?.label ?? `${state.dailyMinutes} phút`)
    : 'Chưa chọn'
  const selfLevel = state.selfLevel
    ? (SELF_LEVEL_OPTIONS.find((s) => s.value === state.selfLevel)?.label ??
      state.selfLevel)
    : 'Chưa chọn'

  const cards: SummaryCard[] = [
    {
      label: 'Lớp hiện tại',
      value: state.grade ? GRADE_LABELS[state.grade] : 'Chưa chọn',
      icon: '🎓',
      tone: 'bg-[#effae0] text-[#446900]',
    },
    {
      label: 'Mục tiêu',
      value: goal,
      icon: '🏆',
      tone: 'bg-[#fff4cf] text-[#725c10]',
    },
    {
      label: 'Thời gian mỗi ngày',
      value: dailyMinutes,
      icon: '⏱️',
      tone: 'bg-[#e8f4ff] text-[#245573]',
    },
    {
      label: 'Deadline',
      value: state.deadline ? formatDate(state.deadline) : 'Không có',
      icon: '📅',
      tone: 'bg-[#ecfff6] text-[#0b513d]',
    },
    {
      label: 'Tự đánh giá',
      value: selfLevel,
      icon: '⭐',
      tone: 'bg-[#fff0f6] text-[#7a2d4c]',
    },
  ]

  const weakTopics = (state.weakTopicIds ?? [])
    .map((id) => getTopicById(id))
    .filter((topic): topic is NonNullable<typeof topic> => topic !== undefined)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 text-center">
        <div className="mx-auto inline-flex rounded-full bg-[#b2f746]/25 px-4 py-2 text-sm font-extrabold text-[#446900]">
          Hồ sơ học tập đã sẵn sàng
        </div>
        <h2 className="mx-auto max-w-4xl text-3xl font-extrabold leading-[1.05] tracking-tight text-[#003527] sm:text-4xl">
          Xác nhận thông tin
        </h2>
        <p className="mx-auto max-w-3xl text-sm leading-relaxed text-[#646f6a] sm:text-base">
          Kiểm tra lại thông tin dưới đây, sau đó bấm xác nhận để bắt đầu.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[1.75rem] border-2 border-[#d9e8de] bg-white p-4 text-left shadow-[0_12px_30px_rgba(0,53,39,0.07)]"
          >
            <div
              className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full text-2xl ${card.tone}`}
            >
              {card.icon}
            </div>
            <div className="whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#66756f]">
              {card.label}
            </div>
            <div className="mt-2 text-xl font-extrabold leading-tight text-[#294e3f]">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-hidden rounded-[2rem] border-2 border-[#d9e8de] bg-white p-5 shadow-[0_14px_40px_rgba(0,53,39,0.08)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-[#294e3f]">
              Chủ đề cần ưu tiên
            </h3>
            <p className="mt-1 text-sm text-[#66756f]">
              {weakTopics.length} chủ đề sẽ được dùng để cá nhân hóa lộ trình.
            </p>
          </div>
          <div className="inline-flex h-12 min-w-12 items-center justify-center rounded-full bg-[#b2f746] px-4 text-lg font-extrabold text-[#002117] shadow-[0_10px_24px_rgba(178,247,70,0.25)]">
            {weakTopics.length}
          </div>
        </div>

        <div className="max-h-[170px] overflow-y-auto pr-1">
          {weakTopics.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {weakTopics.map((topic, index) => (
                <span
                  key={topic.id}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-[#b2f746] bg-[#effae0] px-4 py-2 text-base font-extrabold text-[#003527] shadow-[0_10px_22px_rgba(178,247,70,0.12)]"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#446900] text-sm text-white">
                    {index + 1}
                  </span>
                  {topic.title}
                </span>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.4rem] border-2 border-[#dfe8e2] bg-white px-4 py-4 text-sm font-semibold text-[#718078]">
              Chưa chọn chủ đề nào
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}
