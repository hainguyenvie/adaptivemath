import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { UserProfile } from '../types/user'

/**
 * Onboarding wizard state. `step` is the index of the current slide (0-based).
 * All profile fields are Partial until the final SummaryStep commits them.
 */
export interface OnboardingState extends Partial<UserProfile> {
  step: number
}

export const TOTAL_STEPS = 8 as const

export type OnboardingAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; payload: number }
  | { type: 'set'; payload: Partial<UserProfile> }
  | { type: 'reset' }

const initialState: OnboardingState = {
  step: 0,
  weakTopicIds: [],
  deadline: null,
}

function reducer(
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState {
  switch (action.type) {
    case 'next':
      return { ...state, step: Math.min(state.step + 1, TOTAL_STEPS - 1) }
    case 'back':
      return { ...state, step: Math.max(state.step - 1, 0) }
    case 'goto':
      return {
        ...state,
        step: Math.max(0, Math.min(action.payload, TOTAL_STEPS - 1)),
      }
    case 'set': {
      const next: OnboardingState = { ...state, ...action.payload }
      // Invariant: weakTopicIds belong to the currently-selected grade. If the
      // user changes grade (e.g. picks lớp 10, selects topics, then goes back
      // and switches to lớp 12), the previous selections become meaningless
      // and must be cleared so the selection count stays truthful.
      if (
        action.payload.grade !== undefined &&
        action.payload.grade !== state.grade
      ) {
        next.weakTopicIds = []
      }
      return next
    }
    case 'reset':
      return initialState
    default:
      return state
  }
}

/**
 * Per-step completion predicate — determines whether the wizard can advance.
 * Keeping this here (instead of inside each step) centralizes validation.
 */
export function canProceedFrom(state: OnboardingState): boolean {
  switch (state.step) {
    case 0: // Welcome
      return true
    case 1: // Grade
      return state.grade !== undefined
    case 2: // Goal
      return state.goal !== undefined
    case 3: // DailyTime
      return state.dailyMinutes !== undefined
    case 4: // Deadline — optional field, always proceedable
      return true
    case 5: // SelfAssessment
      return state.selfLevel !== undefined
    case 6: // WeakTopics — at least one topic selected
      return (state.weakTopicIds?.length ?? 0) > 0
    case 7: // Summary — handled by submit
      return true
    default:
      return false
  }
}

interface OnboardingContextValue {
  state: OnboardingState
  dispatch: React.Dispatch<OnboardingAction>
  canProceed: boolean
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

interface OnboardingProviderProps {
  children: ReactNode
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      dispatch,
      canProceed: canProceedFrom(state),
    }),
    [state],
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext)
  if (!ctx) {
    throw new Error(
      'useOnboarding must be used inside an <OnboardingProvider>.',
    )
  }
  return ctx
}
