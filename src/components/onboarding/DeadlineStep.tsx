import { useMemo } from 'react'
import { useOnboarding } from '../../contexts/OnboardingContext'

export function DeadlineStep() {
  const { state, dispatch } = useOnboarding()

  // Minimum date should be tomorrow so students cannot pick the past or today.
  const minDate = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().slice(0, 10)
  }, [])

  const hasDeadline = state.deadline !== null && state.deadline !== undefined

  const handleToggle = (checked: boolean) => {
    dispatch({
      type: 'set',
      payload: { deadline: checked ? null : (state.deadline ?? minDate) },
    })
  }

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    dispatch({ type: 'set', payload: { deadline: value || null } })
  }

  const daysUntil = useMemo(() => {
    if (!state.deadline) return null
    const diff = new Date(state.deadline).getTime() - Date.now()
    if (Number.isNaN(diff)) return null
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [state.deadline])

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        Bạn có deadline cụ thể không?
      </h2>
      <p className="mb-6 text-slate-600">
        Nếu có (ví dụ: thi học kỳ hay thi thử), chúng tôi sẽ dồn lộ trình
        tương ứng. Bạn có thể bỏ qua bước này.
      </p>

      <div className="space-y-4">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-400">
          <input
            type="checkbox"
            className="h-5 w-5 cursor-pointer accent-brand-600"
            checked={!hasDeadline}
            onChange={(event) => handleToggle(event.target.checked)}
          />
          <span className="text-slate-700">Tôi chưa có deadline cụ thể</span>
        </label>

        <div
          className={`rounded-xl border p-5 transition ${
            hasDeadline
              ? 'border-brand-300 bg-brand-50'
              : 'border-slate-200 bg-slate-50 opacity-60'
          }`}
        >
          <label
            htmlFor="deadline-date"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Ngày mục tiêu
          </label>
          <input
            id="deadline-date"
            type="date"
            min={minDate}
            disabled={!hasDeadline}
            value={state.deadline ?? ''}
            onChange={handleDateChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          {hasDeadline && daysUntil !== null && (
            <p className="mt-2 text-sm text-brand-700">
              Còn <strong>{daysUntil}</strong> ngày nữa đến deadline.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
