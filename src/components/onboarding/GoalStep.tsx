import { RadioCardGroup } from '../ui/RadioCardGroup'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { GOAL_OPTIONS, type Goal } from '../../types/user'

const ICONS: Record<Goal, string> = {
  'giua-ky': '📘',
  'cuoi-ky': '📚',
  'thpt-qg': '🎯',
  'nang-cao': '🏆',
}

export function GoalStep() {
  const { state, dispatch } = useOnboarding()

  return (
    <div className="text-center">
      <h2 className="mx-auto max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-[#003527] sm:text-5xl">
        Mục tiêu học tập của bạn là gì?
      </h2>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#404944]">
        Chúng tôi sẽ ưu tiên chủ đề và độ sâu bài học phù hợp với mục tiêu.
      </p>

      <div className="mt-12">
        <RadioCardGroup<Goal>
          name="goal"
          columns={2}
          value={state.goal}
          onChange={(value) =>
            dispatch({ type: 'set', payload: { goal: value } })
          }
          options={GOAL_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
            description: opt.description,
            icon: ICONS[opt.value],
          }))}
        />
      </div>
    </div>
  )
}
