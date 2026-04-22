import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
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
  const isGradeStep = state.step === 1
  const isWeakTopicsStep = state.step === 6
  const isSummaryStep = state.step === 7
  const isLastStep = state.step === TOTAL_STEPS - 1
  const percent = Math.round(((state.step + 1) / TOTAL_STEPS) * 100)

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
    <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col pt-20 sm:pt-24">
      <header className="fixed left-1/2 top-3 z-50 flex w-[calc(100vw-1rem)] max-w-5xl -translate-x-1/2 items-center justify-between gap-6 rounded-full border border-white/50 bg-white/92 px-5 py-3 shadow-[0_12px_40px_rgba(0,53,39,0.08)] ring-1 ring-white/60 sm:top-4 sm:w-[calc(100vw-2rem)] sm:px-6">
        <div className="text-lg font-extrabold tracking-tight text-[#003527] sm:text-2xl">
          Adaptive Math
        </div>
        <div className="flex min-w-[180px] flex-1 max-w-[420px] flex-col items-end gap-2">
          <div className="flex w-full items-end justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-[#294e3f]">
            <span>Bước {state.step + 1} / {TOTAL_STEPS}</span>
            <span className="text-[#003527]">{percent}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#cdeedd]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#95d3ba_0%,#b2f746_100%)] shadow-[0_0_18px_rgba(178,247,70,0.4)] transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-5xl">
          <Card
            className={
              state.step === 0
                ? 'mt-4 min-h-[min(560px,calc(100dvh-14rem))] !border-white/50 !bg-white/95 !p-6 shadow-[0_30px_90px_rgba(0,53,39,0.12)] sm:!p-10'
                : isGradeStep
                  ? 'mt-5 min-h-[min(560px,calc(100dvh-14rem))] !border-white/60 !bg-white/95 !p-5 shadow-[0_26px_80px_rgba(0,53,39,0.10)] sm:!p-8'
                  : isWeakTopicsStep
                    ? 'mt-4 h-[min(650px,calc(100dvh-12rem))] overflow-hidden border-slate-200 bg-white p-5 shadow-sm sm:p-7'
                    : isSummaryStep
                      ? 'mt-4 h-[min(620px,calc(100dvh-12rem))] overflow-hidden !border-white/70 !bg-white/95 p-5 shadow-[0_26px_80px_rgba(0,53,39,0.10)] sm:p-7'
                  : 'mt-4 min-h-[min(420px,calc(100dvh-13rem))] border-slate-200 bg-white p-5 shadow-sm sm:p-8'
            }
          >
            <div
              className={
                state.step === 0
                  ? 'flex min-h-[min(470px,calc(100dvh-18rem))] flex-col items-center justify-between'
                  : isGradeStep
                    ? 'flex min-h-[min(460px,calc(100dvh-18rem))] flex-col items-center justify-center'
                    : isWeakTopicsStep || isSummaryStep
                      ? 'h-full min-h-0'
                    : ''
              }
            >
              <div
                className={
                  state.step === 0
                  ? 'w-full max-w-xl'
                  : isGradeStep
                    ? 'w-full max-w-5xl'
                    : isWeakTopicsStep || isSummaryStep
                      ? 'h-full min-h-0'
                    : ''
                }
              >
                <StepBody step={state.step} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto flex justify-center pb-2 pt-2 sm:pb-4">
        <div className="w-full max-w-4xl">
          {isFirstStep ? (
            <div className="flex justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                disabled={!canProceed}
                className="h-14 w-full rounded-full !bg-[#b2f746] px-8 text-sm font-extrabold uppercase tracking-[0.2em] !text-[#002117] shadow-[0_18px_40px_rgba(178,247,70,0.35)] hover:!bg-[#a3e635] disabled:!bg-slate-300 disabled:!text-slate-500 sm:w-auto sm:min-w-[220px]"
              >
                Tiếp theo
                <span className="text-base">→</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-6">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleBack}
                disabled={isFirstStep}
                className="h-14 rounded-full border-2 border-[#a7b7ad] !bg-white/90 px-8 !text-[#003527] shadow-[0_10px_28px_rgba(0,53,39,0.06)] hover:!bg-white"
              >
                Quay lại
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                disabled={!canProceed}
                className="h-14 rounded-full !bg-[#b2f746] px-10 font-extrabold uppercase tracking-[0.18em] !text-[#002117] shadow-[0_0_30px_rgba(178,247,70,0.4)] hover:!bg-[#a3e635] hover:shadow-[0_0_40px_rgba(178,247,70,0.6)] disabled:!bg-slate-300 disabled:!text-slate-500"
              >
                {isLastStep ? 'Xác nhận & Bắt đầu học' : 'Tiếp theo →'}
              </Button>
            </div>
          )}
        </div>
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
