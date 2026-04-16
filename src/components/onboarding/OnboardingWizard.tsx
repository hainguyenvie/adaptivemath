import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { StepIndicator } from '../ui/StepIndicator'
import {
  TOTAL_STEPS,
  useOnboarding,
} from '../../contexts/OnboardingContext'
import { saveProfile } from '../../lib/storage'
import type { UserProfile } from '../../types/user'

import { WelcomeStep } from './WelcomeStep'
import { GradeStep } from './GradeStep'
import { GoalStep } from './GoalStep'
import { DailyTimeStep } from './DailyTimeStep'
import { DeadlineStep } from './DeadlineStep'
import { SelfAssessmentStep } from './SelfAssessmentStep'
import { WeakTopicsStep } from './WeakTopicsStep'
import { SummaryStep } from './SummaryStep'

export function OnboardingWizard() {
  const { state, dispatch, canProceed } = useOnboarding()
  const navigate = useNavigate()

  const isFirstStep = state.step === 0
  const isLastStep = state.step === TOTAL_STEPS - 1

  const handleSubmit = () => {
    // Final guard — every field required by UserProfile must be present.
    if (
      state.grade === undefined ||
      state.goal === undefined ||
      state.dailyMinutes === undefined ||
      state.selfLevel === undefined ||
      !state.weakTopicIds ||
      state.weakTopicIds.length === 0
    ) {
      return
    }

    const now = new Date().toISOString()
    const profile: UserProfile = {
      grade: state.grade,
      goal: state.goal,
      dailyMinutes: state.dailyMinutes,
      deadline: state.deadline ?? null,
      selfLevel: state.selfLevel,
      weakTopicIds: state.weakTopicIds,
      createdAt: now,
      updatedAt: now,
    }

    saveProfile(profile)
    navigate('/', { replace: true })
  }

  const handleNext = () => {
    if (!canProceed) return
    if (isLastStep) {
      handleSubmit()
      return
    }
    dispatch({ type: 'next' })
  }

  const handleBack = () => {
    dispatch({ type: 'back' })
  }

  return (
    <div className="w-full max-w-3xl">
      <StepIndicator current={state.step} total={TOTAL_STEPS} />

      <Card className="mt-6 min-h-[420px]">
        <StepBody step={state.step} />
      </Card>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={handleBack}
          disabled={isFirstStep}
        >
          Quay lại
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={handleNext}
          disabled={!canProceed}
        >
          {isLastStep ? 'Xác nhận & Bắt đầu học' : 'Tiếp theo →'}
        </Button>
      </div>
    </div>
  )
}

function StepBody({ step }: { step: number }) {
  switch (step) {
    case 0:
      return <WelcomeStep />
    case 1:
      return <GradeStep />
    case 2:
      return <GoalStep />
    case 3:
      return <DailyTimeStep />
    case 4:
      return <DeadlineStep />
    case 5:
      return <SelfAssessmentStep />
    case 6:
      return <WeakTopicsStep />
    case 7:
      return <SummaryStep />
    default:
      return null
  }
}
