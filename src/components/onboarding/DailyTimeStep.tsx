import { RadioCardGroup } from '../ui/RadioCardGroup'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { DAILY_MINUTES_OPTIONS, type DailyMinutes } from '../../types/user'

export function DailyTimeStep() {
  const { state, dispatch } = useOnboarding()

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        Bạn dành bao nhiêu phút mỗi ngày cho việc học Toán?
      </h2>
      <p className="mb-6 text-slate-600">
        Thời gian này quyết định tốc độ của lộ trình cá nhân hoá.
      </p>
      <RadioCardGroup<DailyMinutes>
        name="daily-minutes"
        columns={4}
        value={state.dailyMinutes}
        onChange={(value) =>
          dispatch({ type: 'set', payload: { dailyMinutes: value } })
        }
        options={DAILY_MINUTES_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
          description: opt.description,
          icon: '⏱️',
        }))}
      />
    </div>
  )
}
