import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DiagnosticProvider,
  useDiagnostic,
} from '../contexts/DiagnosticContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ProgressIndicator } from '../components/diagnostic/ProgressIndicator'
import { Timer } from '../components/diagnostic/Timer'
import { McqQuestion } from '../components/diagnostic/McqQuestion'
import { TfQuestion } from '../components/diagnostic/TfQuestion'
import { ShortAnsQuestion } from '../components/diagnostic/ShortAnsQuestion'
import { DebugPanel } from '../components/diagnostic/DebugPanel'
import { loadProfile } from '../lib/storage'
import { saveLastDiagnostic } from '../lib/diagnosticStorage'
import { getPoolForGrade } from '../lib/questionBank'
import { gradeAnswer, timeLimitForItem } from '../lib/cat'
import { TOPICS, getTopicById } from '../data/topics'
import type { Question, SessionState } from '../types/question'
import type { UserProfile } from '../types/user'

export function DiagnosticPage() {
  return (
    <DiagnosticProvider>
      <DiagnosticPageInner />
    </DiagnosticProvider>
  )
}

function DiagnosticPageInner() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const { state, dispatch } = useDiagnostic()

  // Load the user profile + pool on mount, then init the session.
  useEffect(() => {
    const loaded = loadProfile()
    if (!loaded) {
      navigate('/', { replace: true })
      return
    }
    setProfile(loaded)
    const pool = getPoolForGrade(loaded.grade)
    if (pool.length === 0) {
      // No items for this grade — shouldn't happen given our data, but
      // fail gracefully by kicking back to home.
      navigate('/', { replace: true })
      return
    }
    dispatch({
      type: 'init',
      payload: {
        grade: loaded.grade,
        selfLevel: loaded.selfLevel,
        pool,
        topics: TOPICS,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pool = useMemo(
    () => (profile ? getPoolForGrade(profile.grade) : []),
    [profile],
  )

  // Navigate to the knowledge profile page once the session finishes.
  // The session is persisted via `saveLastDiagnostic` (localStorage + legacy
  // mirror) so the profile page can reach it after reload / re-entry.
  useEffect(() => {
    if (state?.session.finished) {
      saveLastDiagnostic(state.session)
      navigate('/', { replace: true })
    }
  }, [state?.session.finished, state?.session, navigate])

  if (!profile || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Đang chuẩn bị bài kiểm tra…
      </div>
    )
  }

  const currentQ = state.currentQuestion
  if (!currentQ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Đang chấm kết quả…
      </div>
    )
  }

  return (
    <QuestionScreen
      question={currentQ}
      session={state.session}
      onAnswer={(score, startedAt) => {
        dispatch({
          type: 'submit-answer',
          payload: {
            questionId: currentQ.id,
            score,
            startedAt,
            pool,
          },
        })
      }}
      onSkip={(_startedAt) => {
        dispatch({
          type: 'skip',
          payload: { questionId: currentQ.id, pool },
        })
      }}
      onCancel={() => dispatch({ type: 'cancel' })}
    />
  )
}

interface QuestionScreenProps {
  question: Question
  session: SessionState
  onAnswer: (score: number, startedAt: number) => void
  onSkip: (startedAt: number) => void
  onCancel: () => void
}

function QuestionScreen({
  question,
  session,
  onAnswer,
  onSkip,
  onCancel,
}: QuestionScreenProps) {
  const itemsAnswered = session.responses.length
  const standardError = session.standardError
  const sessionStartedAt = session.sessionStartedAt
  const topicTitleById = (id: string) => getTopicById(id)?.title ?? id
  // Remount start time each time we see a new question id.
  const [startedAt, setStartedAt] = useState<number>(() => Date.now())
  useEffect(() => {
    setStartedAt(Date.now())
  }, [question.id])

  const timeLimit = timeLimitForItem(question)

  const handleSubmit = useCallback(
    (rawAnswer: unknown) => {
      const score = gradeAnswer(question, rawAnswer)
      onAnswer(score, startedAt)
    },
    [question, startedAt, onAnswer],
  )

  const handleExpire = useCallback(() => {
    onSkip(startedAt)
  }, [startedAt, onSkip])

  // Short human-readable difficulty chip shown next to the timer so the user
  // can see at a glance the estimated difficulty of the current question.
  const levelChip = formatLevelChip(question.level, question.irt.b)

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-brand-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-semibold text-slate-800 sm:text-xl">
              Bài kiểm tra đầu vào
            </h1>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${levelChip.tone}`}
                title={`IRT b = ${question.irt.b.toFixed(2)}`}
              >
                {levelChip.label}
              </span>
              <Timer
                totalSeconds={timeLimit}
                startedAt={startedAt}
                onExpire={handleExpire}
              />
            </div>
          </div>
          <ProgressIndicator
            itemsAnswered={itemsAnswered}
            standardError={standardError}
            sessionStartedAt={sessionStartedAt}
          />
        </header>

        <Card className="min-h-[320px]">
          {/*
            `key={question.id}` forces React to unmount the previous renderer
            and mount a fresh one on every new question. Without it, the
            internal `useState` inside McqQuestion/TfQuestion/ShortAnsQuestion
            gets preserved across questions and leaks the previous selection
            into the next one.
          */}
          {question.type === 'mcq' && (
            <McqQuestion
              key={question.id}
              question={question}
              onSubmit={handleSubmit}
            />
          )}
          {question.type === 'tf' && (
            <TfQuestion
              key={question.id}
              question={question}
              onSubmit={handleSubmit}
            />
          )}
          {question.type === 'shortans' && (
            <ShortAnsQuestion
              key={question.id}
              question={question}
              onSubmit={handleSubmit}
            />
          )}
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Thoát bài kiểm tra
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onSkip(startedAt)}>
            Bỏ qua câu này
          </Button>
        </div>

        <DebugPanel
          session={session}
          currentQuestion={question}
          topicTitleById={topicTitleById}
        />
      </div>
    </div>
  )
}

/**
 * Map level letter + raw `b` to a small colored chip. If the corpus tag is
 * unknown we fall back to the numeric `b` bucket so the user still sees
 * something intelligible.
 */
function formatLevelChip(
  level: string,
  b: number,
): { label: string; tone: string } {
  if (level === 'N') return { label: '🟢 Nhận biết', tone: 'border-emerald-300 bg-emerald-50 text-emerald-700' }
  if (level === 'H') return { label: '🟦 Thông hiểu', tone: 'border-sky-300 bg-sky-50 text-sky-700' }
  if (level === 'V') return { label: '🟠 Vận dụng', tone: 'border-amber-300 bg-amber-50 text-amber-700' }
  if (level === 'T') return { label: '🔴 Vận dụng cao', tone: 'border-rose-300 bg-rose-50 text-rose-700' }
  // fallback by IRT b
  if (b <= -1) return { label: 'Dễ', tone: 'border-slate-200 bg-slate-50 text-slate-600' }
  if (b >= 1) return { label: 'Khó', tone: 'border-slate-200 bg-slate-50 text-slate-600' }
  return { label: 'Trung bình', tone: 'border-slate-200 bg-slate-50 text-slate-600' }
}
