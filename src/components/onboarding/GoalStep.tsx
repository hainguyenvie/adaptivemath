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
    <div>
      <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        Mục tiêu học tập của bạn là gì?
      </h2>
      <p className="mb-6 text-slate-600">
        Chúng tôi sẽ ưu tiên chủ đề và độ sâu bài học phù hợp với mục tiêu.
      </p>
      <RadioCardGroup<Goal>
        name="goal"
        columns={2}
        value={state.goal}
        onChange={(value) => dispatch({ type: 'set', payload: { goal: value } })}
        options={GOAL_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
          description: opt.description,
          icon: ICONS[opt.value],
        }))}
      />
    </div>
  )
}
