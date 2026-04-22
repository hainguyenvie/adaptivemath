import { useOnboarding } from '../../contexts/OnboardingContext'
import { cn } from '../../lib/cn'
import type { DailyMinutes } from '../../types/user'

const OPTIONS: Array<{
  value: DailyMinutes
  title: string
  subtitle: string
  description: string
  icon: string
  iconBg: string
  activeIconBg: string
  badge?: string
}> = [
  {
    value: 30,
    title: '30 phút',
    subtitle: 'Nhẹ nhàng',
    description: 'Duy trì nhịp học ổn định mỗi ngày mà không gây áp lực.',
    icon: '⏱️',
    iconBg: 'bg-[#dff8ea]',
    activeIconBg: 'bg-[#b2f746]/85',
  },
  {
    value: 45,
    title: '45 phút',
    subtitle: 'Phù hợp đa số học sinh',
    description: 'Sự cân bằng hoàn hảo giữa chiều sâu kiến thức và nghỉ ngơi.',
    icon: '🕒',
    iconBg: 'bg-[#dff8ea]',
    activeIconBg: 'bg-[#b2f746]/85',
    badge: 'Phổ biến nhất',
  },
  {
    value: 60,
    title: '60 phút',
    subtitle: 'Tiến độ nhanh',
    description: 'Nhìn thấy rõ rệt kết quả và sự tiến bộ sau từng tuần học.',
    icon: '⚡',
    iconBg: 'bg-[#dff8ea]',
    activeIconBg: 'bg-[#b2f746]/85',
  },
  {
    value: 90,
    title: '90 phút',
    subtitle: 'Cường độ cao',
    description: 'Tập trung tối đa cho việc ôn thi và chinh phục các bài toán khó.',
    icon: '🔋',
    iconBg: 'bg-[#dff8ea]',
    activeIconBg: 'bg-[#b2f746]/85',
  },
]

export function DailyTimeStep() {
  const { state, dispatch } = useOnboarding()

  return (
    <div className="flex h-full flex-col text-center">
      <div className="mb-10 space-y-4 sm:mb-12">
        <h2 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight text-[#003527] sm:text-5xl">
          Bạn dành bao nhiêu phút mỗi ngày cho việc học Toán?
        </h2>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#404944] sm:text-lg">
          Hãy chọn nhịp độ phù hợp nhất với mục tiêu của bạn. Chúng tôi sẽ điều
          chỉnh lộ trình kiến thức tương ứng.
        </p>
      </div>

      <div className="grid w-full flex-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {OPTIONS.map((opt) => {
          const selected = state.dailyMinutes === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                dispatch({ type: 'set', payload: { dailyMinutes: opt.value } })
              }
              className={cn(
                'group relative flex min-h-[280px] flex-col items-center rounded-[2rem] border-2 px-6 py-8 text-center transition-all duration-300',
                'hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,53,39,0.08)]',
                selected
                  ? 'border-[#b2f746] bg-[#effae0]/75 shadow-[0_20px_55px_rgba(178,247,70,0.16)]'
                  : 'border-[#bccdc5] bg-[rgba(231,255,243,0.6)]',
              )}
            >
              {opt.badge && (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#b2f746] px-4 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#003527] shadow-sm">
                  {opt.badge}
                </div>
              )}

              <div className="mb-6 flex items-center justify-center">
                <div
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-full text-3xl transition-transform duration-300 group-hover:scale-110',
                    selected ? opt.activeIconBg : opt.iconBg,
                  )}
                >
                  {opt.icon}
                </div>
              </div>

              <div className="text-3xl font-extrabold leading-none tracking-tight text-[#003527]">
                {opt.title}
              </div>
              <div
                className={cn(
                  'mt-3 text-sm font-semibold',
                  selected ? 'text-[#446900]' : 'text-[#63726c]',
                )}
              >
                {opt.subtitle}
              </div>
              <p className="mt-4 max-w-[15rem] text-sm leading-relaxed text-[#404944]">
                {opt.description}
              </p>
            </button>
          )
        })}
      </div>

    </div>
  )
}
