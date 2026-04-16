import { RadioCardGroup } from '../ui/RadioCardGroup'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { SELF_LEVEL_OPTIONS, type SelfLevel } from '../../types/user'

const ICONS: Record<SelfLevel, string> = {
  yeu: '🌱',
  tb: '📖',
  kha: '⭐',
  gioi: '🚀',
}

export function SelfAssessmentStep() {
  const { state, dispatch } = useOnboarding()

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        Bạn đang ở mức độ nào?
      </h2>
      <p className="mb-6 text-slate-600">
        Không sao nếu bạn chưa chắc — đây chỉ là điểm bắt đầu. Bài diagnostic
        thật ở bước tiếp theo sẽ cho kết quả chính xác hơn.
      </p>
      <RadioCardGroup<SelfLevel>
        name="self-level"
        columns={2}
        value={state.selfLevel}
        onChange={(value) =>
          dispatch({ type: 'set', payload: { selfLevel: value } })
        }
        options={SELF_LEVEL_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
          description: opt.description,
          icon: ICONS[opt.value],
        }))}
      />
    </div>
  )
}
