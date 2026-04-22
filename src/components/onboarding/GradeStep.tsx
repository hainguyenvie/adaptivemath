import { RadioCardGroup } from '../ui/RadioCardGroup'
import { useOnboarding } from '../../contexts/OnboardingContext'
import type { Grade } from '../../types/user'

const GRADE_OPTIONS = [
  {
    value: 10 as Grade,
    label: 'Lớp 10',
    description: 'Mệnh đề, Tập hợp, Vectơ, Hệ thức lượng…',
    icon: '🌱',
  },
  {
    value: 11 as Grade,
    label: 'Lớp 11',
    description: 'Lượng giác, Dãy số, Quan hệ song song, Đạo hàm…',
    icon: '🌿',
  },
  {
    value: 12 as Grade,
    label: 'Lớp 12',
    description: 'Ứng dụng đạo hàm, Thống kê, Toạ độ không gian…',
    icon: '🌳',
  },
]

export function GradeStep() {
  const { state, dispatch } = useOnboarding()

  return (
    <div className="text-center">
      <h2 className="mx-auto max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-[#003527] sm:text-5xl">
        Bạn đang học lớp mấy?
      </h2>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#404944]">
        Chúng tôi sẽ giới hạn chương trình theo đúng lớp của bạn.
      </p>

      <div className="mt-12">
        <RadioCardGroup<Grade>
          name="grade"
          columns={3}
          value={state.grade}
          onChange={(value) =>
            dispatch({ type: 'set', payload: { grade: value } })
          }
          options={GRADE_OPTIONS}
        />
      </div>
    </div>
  )
}
