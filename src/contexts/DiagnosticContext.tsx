import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type {
  Question,
  SessionResponse,
  SessionState,
  StopReason,
} from '../types/question'
import type { SelfLevel } from '../types/user'
import type { Topic } from '../data/topics'
import {
  estimateThetaFromSession,
  startingThetaFromSelfLevel,
} from '../lib/irt'
import {
  initTopicStates,
  selectNextQuestion,
  shouldStop,
  transitionTopicState,
} from '../lib/cat'

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

interface DiagnosticState {
  session: SessionState
  /** The question currently being shown to the student. */
  currentQuestion: Question | null
}

export type DiagnosticAction =
  | {
      type: 'init'
      payload: {
        grade: 10 | 11 | 12
        selfLevel: SelfLevel
        pool: Question[]
        topics: ReadonlyArray<Topic>
      }
    }
  | {
      type: 'submit-answer'
      payload: {
        questionId: string
        score: number
        startedAt: number
        pool: Question[]
      }
    }
  | { type: 'skip'; payload: { questionId: string; pool: Question[] } }
  | { type: 'cancel' }

function makeInitialState(
  grade: 10 | 11 | 12,
  selfLevel: SelfLevel,
  pool: Question[],
  topics: ReadonlyArray<Topic>,
): DiagnosticState {
  const theta = startingThetaFromSelfLevel(selfLevel)
  const session: SessionState = {
    sessionId: `diag-${Date.now()}`,
    grade,
    selfLevel,
    theta,
    standardError: Infinity,
    responses: [],
    shownIds: [],
    sessionStartedAt: Date.now(),
    finished: false,
    stopReason: null,
    topicStates: initTopicStates(pool, topics, grade),
  }
  const nextQ = selectNextQuestion(pool, session)
  if (nextQ) session.shownIds.push(nextQ.id)
  return {
    session,
    currentQuestion: nextQ,
  }
}

function advanceAfterResponse(
  state: DiagnosticState,
  response: SessionResponse,
  pool: Question[],
): DiagnosticState {
  const updatedResponses = [...state.session.responses, response]

  // Re-estimate θ from the full response history — consumed by the profile
  // pipeline only, not by the ladder selector.
  const irtLookup = buildIrtLookup(pool)
  const { theta, standardError } = estimateThetaFromSession(
    updatedResponses,
    irtLookup,
    { startingTheta: state.session.theta },
  )

  // Advance the ladder for the topic the student just answered.
  // Anything scoring >= 0.75 counts as "passed this item" (same threshold
  // the profile analysis uses) — handles TF partial credit cleanly.
  const question = pool.find((q) => q.id === response.questionId)
  let updatedTopicStates = state.session.topicStates
  if (question) {
    const existing = state.session.topicStates[question.topicId]
    if (existing) {
      const correct = response.score >= 0.75
      const shownSet = new Set(state.session.shownIds)
      const nextState = transitionTopicState(
        existing,
        question,
        correct,
        pool,
        shownSet,
      )
      updatedTopicStates = {
        ...state.session.topicStates,
        [question.topicId]: nextState,
      }
    }
  }

  const midSession: SessionState = {
    ...state.session,
    responses: updatedResponses,
    theta,
    standardError,
    topicStates: updatedTopicStates,
  }

  const stop = shouldStop(midSession)
  if (stop !== null) {
    return {
      session: {
        ...midSession,
        finished: true,
        stopReason: stop,
      },
      currentQuestion: null,
    }
  }

  const nextQ = selectNextQuestion(pool, midSession)
  if (!nextQ) {
    return {
      session: {
        ...midSession,
        finished: true,
        stopReason: 'no-more-items' satisfies StopReason,
      },
      currentQuestion: null,
    }
  }

  return {
    session: {
      ...midSession,
      shownIds: [...midSession.shownIds, nextQ.id],
    },
    currentQuestion: nextQ,
  }
}

function buildIrtLookup(pool: Question[]) {
  // Closure over pool; returns null for unknown ids.
  const index = new Map<string, Question>()
  for (const q of pool) index.set(q.id, q)
  return (questionId: string) => index.get(questionId)?.irt ?? null
}

function reducer(
  state: DiagnosticState | null,
  action: DiagnosticAction,
): DiagnosticState | null {
  switch (action.type) {
    case 'init':
      return makeInitialState(
        action.payload.grade,
        action.payload.selfLevel,
        action.payload.pool,
        action.payload.topics,
      )

    case 'submit-answer': {
      if (!state) return state
      const response: SessionResponse = {
        questionId: action.payload.questionId,
        startedAt: action.payload.startedAt,
        endedAt: Date.now(),
        score: action.payload.score,
        answered: true,
      }
      return advanceAfterResponse(state, response, action.payload.pool)
    }

    case 'skip': {
      if (!state) return state
      // Skip = treat as unanswered (0 score) so the adaptive loop still moves
      // on, but don't reward or penalize the student's θ via a random guess.
      const response: SessionResponse = {
        questionId: action.payload.questionId,
        startedAt: Date.now(),
        endedAt: Date.now(),
        score: 0,
        answered: false,
      }
      return advanceAfterResponse(state, response, action.payload.pool)
    }

    case 'cancel': {
      if (!state) return state
      return {
        session: {
          ...state.session,
          finished: true,
          stopReason: 'user-cancelled',
        },
        currentQuestion: null,
      }
    }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface DiagnosticContextValue {
  state: DiagnosticState | null
  dispatch: React.Dispatch<DiagnosticAction>
}

const DiagnosticContext = createContext<DiagnosticContextValue | null>(null)

interface DiagnosticProviderProps {
  children: ReactNode
}

export function DiagnosticProvider({ children }: DiagnosticProviderProps) {
  const [state, dispatch] = useReducer(reducer, null)

  const value = useMemo(() => ({ state, dispatch }), [state])

  return (
    <DiagnosticContext.Provider value={value}>
      {children}
    </DiagnosticContext.Provider>
  )
}

export function useDiagnostic(): DiagnosticContextValue {
  const ctx = useContext(DiagnosticContext)
  if (!ctx) {
    throw new Error('useDiagnostic must be used inside <DiagnosticProvider>.')
  }
  return ctx
}
