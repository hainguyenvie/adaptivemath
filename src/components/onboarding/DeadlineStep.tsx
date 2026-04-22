import { useMemo, useRef } from 'react'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { cn } from '../../lib/cn'

function formatDateDDMMYYYY(value: string | null | undefined): string {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export function DeadlineStep() {
  const { state, dispatch } = useOnboarding()
  const dateInputRef = useRef<HTMLInputElement | null>(null)

  const minDate = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().slice(0, 10)
  }, [])

  const hasDeadline = state.deadline !== null && state.deadline !== undefined
  const selectedDate = state.deadline ?? minDate

  const daysUntil = useMemo(() => {
    if (!state.deadline) return null
    const [year, month, day] = state.deadline.split('-').map(Number)
    if (!year || !month || !day) return null

    const target = new Date(year, month - 1, day)
    const today = new Date()
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )
    const diff = target.getTime() - startOfToday.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [state.deadline])

  const handleOpenDatePicker = () => {
    dispatch({
      type: 'set',
      payload: { deadline: state.deadline ?? minDate },
    })

    queueMicrotask(() => {
      dateInputRef.current?.focus()
      dateInputRef.current?.showPicker?.()
    })
  }

  const handleNoDeadline = () => {
    dispatch({ type: 'set', payload: { deadline: null } })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 text-center">
        <h2 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight text-[#003527] sm:text-5xl">
          Bạn có deadline cụ thể không?
        </h2>
        <p className="mx-auto max-w-3xl text-base leading-relaxed text-[#646f6a] sm:text-lg">
          Nếu có (ví dụ: thi học kỳ hay thi thử), chúng tôi sẽ dồn lộ trình
          tương ứng. Bạn có thể bỏ qua bước này.
        </p>
      </div>

      <div className="mt-10 grid flex-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <button
          type="button"
          onClick={handleOpenDatePicker}
          className={cn(
            'flex min-h-[320px] flex-col rounded-[3rem] border-2 border-[#edf1ef] bg-white px-8 py-8 text-left shadow-[0_8px_30px_rgba(0,53,39,0.04)] transition-all duration-300',
            hasDeadline
              ? 'border-[#9bc9ea] ring-2 ring-[#9bc9ea] shadow-[0_16px_42px_rgba(155,201,234,0.18)]'
              : 'hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,53,39,0.08)]',
          )}
        >
          <div className="text-2xl font-extrabold tracking-tight text-[#294e3f]">
            Ngày mục tiêu
          </div>

          <div className="mt-4 rounded-[2rem] border border-[#eef4ef] bg-white px-5 py-5 shadow-[0_10px_24px_rgba(0,53,39,0.04)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dff8ea] text-[1.35rem]">
                📅
              </div>
              <div className="text-[1.7rem] font-extrabold leading-none tracking-tight text-[#294e3f] sm:text-[1.9rem]">
                {formatDateDDMMYYYY(selectedDate)}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-[#dfeeb6] bg-[#effae0] px-6 py-4 text-[#446900] shadow-[inset_0_0_0_1px_rgba(178,247,70,0.08)]">
            <span className="inline-flex items-center gap-2 text-base font-medium">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#446900] text-[10px] leading-none text-white">
                i
              </span>
              {daysUntil === null ? (
                'Còn 1 ngày nữa đến deadline.'
              ) : (
                <>
                  Còn <strong>{daysUntil}</strong> ngày nữa đến deadline.
                </>
              )}
            </span>
          </div>

          <input
            ref={dateInputRef}
            id="deadline-date"
            type="date"
            min={minDate}
            value={selectedDate}
            onChange={(event) =>
              dispatch({
                type: 'set',
                payload: { deadline: event.target.value || null },
              })
            }
            className="sr-only"
          />
        </button>

        <button
          type="button"
          onClick={handleNoDeadline}
          className={cn(
            'flex min-h-[320px] flex-col justify-center rounded-[3rem] border-2 border-[#edf1ef] bg-white px-8 py-8 text-left shadow-[0_8px_30px_rgba(0,53,39,0.04)] transition-all duration-300',
            !hasDeadline
              ? 'border-[#9bc9ea] ring-2 ring-[#9bc9ea] shadow-[0_16px_42px_rgba(155,201,234,0.18)]'
              : 'hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,53,39,0.08)]',
          )}
        >
          <div className="mb-12 flex h-16 w-16 items-center justify-center rounded-full bg-[#b9f0df] text-[1.5rem]">
            🗓️
          </div>
          <div className="max-w-md whitespace-nowrap text-[1.8rem] font-extrabold leading-tight tracking-tight text-[#294e3f]">
            Tôi chưa có deadline cụ thể
          </div>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-[#66756f] sm:text-lg">
            Lộ trình của bạn sẽ được thiết kế theo nhịp độ trung bình.
          </p>
        </button>
      </div>
    </div>
  )
}
