import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DiagnosticProvider,
  useDiagnostic,
} from '../contexts/DiagnosticContext'
import { Button } from '../components/ui/Button'
import { ProgressIndicator } from '../components/diagnostic/ProgressIndicator'
import { Timer } from '../components/diagnostic/Timer'
import { McqQuestion } from '../components/diagnostic/McqQuestion'
import { TfQuestion } from '../components/diagnostic/TfQuestion'
import { ShortAnsQuestion } from '../components/diagnostic/ShortAnsQuestion'
import { DebugPanel } from '../components/diagnostic/DebugPanel'
import {
  DiagnosticIcon,
  type DiagnosticIconName,
} from '../components/diagnostic/DiagnosticIcon'
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
  }, [state?.session.finished, navigate])

  if (!profile || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e7fff3] px-4 text-[#003527]">
        <div className="glass-panel flex items-center gap-3 rounded-full border border-white/60 bg-white/70 px-6 py-4 text-sm font-bold shadow-[0_18px_45px_rgba(0,53,39,0.08)]">
          <DiagnosticIcon name="brain" className="animate-pulse text-[#446900]" />
          Đang chuẩn bị bài kiểm tra...
        </div>
      </div>
    )
  }

  const currentQ = state.currentQuestion
  if (!currentQ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e7fff3] px-4 text-[#003527]">
        <div className="glass-panel flex items-center gap-3 rounded-full border border-white/60 bg-white/70 px-6 py-4 text-sm font-bold shadow-[0_18px_45px_rgba(0,53,39,0.08)]">
          <DiagnosticIcon name="chart" className="animate-pulse text-[#446900]" />
          Đang chấm kết quả...
        </div>
      </div>
    )
  }

  return (
    <QuestionScreen
      key={currentQ.id}
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
      onSkip={() => {
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
  const sessionStartedAt = session.sessionStartedAt
  const topicTitleById = (id: string) => getTopicById(id)?.title ?? id
  const topicTitle = topicTitleById(question.topicId)
  const [startedAt] = useState<number>(() => Date.now())

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

  const levelChip = formatLevelChip(question.level, question.irt.b)
  const topicStates = Object.values(session.topicStates)
  const totalTopics = topicStates.length
  const completedTopics = topicStates.filter(
    (topic) => topic.level === 'done',
  ).length

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#e7fff3] px-4 py-4 text-[#002117] sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(178,247,70,0.42),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(168,231,205,0.48),transparent_28%),radial-gradient(circle_at_50%_84%,rgba(168,231,205,0.34),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.58),rgba(255,255,255,0.2)_45%,rgba(231,255,243,0)_72%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-[radial-gradient(circle_at_50%_100%,rgba(168,231,205,0.36),transparent_55%)]" />
      </div>

      <header className="fixed left-1/2 top-3 z-50 flex w-[calc(100vw-1rem)] max-w-6xl -translate-x-1/2 items-center justify-between gap-4 rounded-full border border-white/50 bg-white/92 px-4 py-3 shadow-[0_12px_40px_rgba(0,53,39,0.08)] ring-1 ring-white/60 sm:top-4 sm:w-[calc(100vw-2rem)] sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#064e3b] text-[#b2f746] shadow-lg shadow-[#003527]/15">
            <DiagnosticIcon name="brain" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-extrabold tracking-tight text-[#003527] sm:text-xl">
              Bài kiểm tra đầu vào
            </div>
            <div className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[#446900] sm:block">
              Adaptive Math
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] sm:inline-flex ${levelChip.tone}`}
            title={`IRT b = ${question.irt.b.toFixed(2)}`}
          >
            <DiagnosticIcon name={levelChip.icon} className="h-4 w-4" />
            {levelChip.label}
          </span>
          <Timer
            totalSeconds={timeLimit}
            startedAt={startedAt}
            onExpire={handleExpire}
          />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col pt-24 sm:pt-28">
        <div className="grid flex-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[2rem] border border-white/60 bg-white/95 p-5 shadow-[0_22px_70px_rgba(0,53,39,0.08)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dff8ea] text-[#003527]">
                  <DiagnosticIcon name="route" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#446900]">
                    Câu hiện tại
                  </div>
                  <div className="text-2xl font-black tracking-tight text-[#003527]">
                    {itemsAnswered + 1}
                  </div>
                </div>
              </div>
              <ProgressIndicator
                itemsAnswered={itemsAnswered}
                completedTopics={completedTopics}
                totalTopics={totalTopics}
                sessionStartedAt={sessionStartedAt}
              />
            </section>

            <section className="rounded-[2rem] bg-[#064e3b] p-5 text-white shadow-[0_22px_70px_rgba(0,53,39,0.14)]">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#b2f746] text-[#003527]">
                <DiagnosticIcon name="topic" />
              </div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#b2f746]">
                Chủ đề
              </div>
              <h2 className="mt-2 text-xl font-black leading-tight tracking-tight">
                {topicTitle}
              </h2>
              <div
                className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] sm:hidden ${levelChip.tone}`}
                title={`IRT b = ${question.irt.b.toFixed(2)}`}
              >
                <DiagnosticIcon name={levelChip.icon} className="h-4 w-4" />
                {levelChip.label}
              </div>
            </section>
          </aside>

          <div className="min-w-0 space-y-4">
            <section className="min-h-[520px] rounded-[3rem] border border-white/65 bg-white/90 p-5 shadow-[0_30px_90px_rgba(0,53,39,0.12)] sm:p-8">
              {question.type === 'mcq' && (
                <McqQuestion question={question} onSubmit={handleSubmit} />
              )}
              {question.type === 'tf' && (
                <TfQuestion question={question} onSubmit={handleSubmit} />
              )}
              {question.type === 'shortans' && (
                <ShortAnsQuestion question={question} onSubmit={handleSubmit} />
              )}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 pb-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="rounded-full px-4 font-bold text-[#2b6954] hover:bg-white/55 hover:text-[#003527]"
              >
                <DiagnosticIcon name="close" className="h-4 w-4" />
                Thoát
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSkip(startedAt)}
                className="rounded-full border-[#95d3ba] bg-white/70 px-5 font-bold text-[#003527] shadow-sm hover:bg-[#e4fbef]"
              >
                Bỏ qua
                <DiagnosticIcon name="skip" className="h-4 w-4" />
              </Button>
            </div>

            <DebugPanel
              session={session}
              currentQuestion={question}
              topicTitleById={topicTitleById}
            />
          </div>
        </div>
      </main>
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
): { label: string; tone: string; icon: DiagnosticIconName } {
  if (level === 'N') {
    return {
      label: 'Nhận biết',
      icon: 'leaf',
      tone: 'border-[#95d3ba] bg-[#e4fbef] text-[#003527]',
    }
  }
  if (level === 'H') {
    return {
      label: 'Thông hiểu',
      icon: 'brain',
      tone: 'border-[#95d3ba] bg-[#e4fbef] text-[#003527]',
    }
  }
  if (level === 'V') {
    return {
      label: 'Vận dụng',
      icon: 'chart',
      tone: 'border-[#b2f746] bg-[#f1ffd8] text-[#446900]',
    }
  }
  if (level === 'T') {
    return {
      label: 'Vận dụng cao',
      icon: 'flame',
      tone: 'border-[#b2f746] bg-[#f1ffd8] text-[#446900]',
    }
  }
  // fallback by IRT b
  if (b <= -1) {
    return {
      label: 'Dễ',
      icon: 'spa',
      tone: 'border-[#95d3ba] bg-[#e4fbef] text-[#003527]',
    }
  }
  if (b >= 1) {
    return {
      label: 'Khó',
      icon: 'trend',
      tone: 'border-[#b2f746] bg-[#f1ffd8] text-[#446900]',
    }
  }
  return {
    label: 'Trung bình',
    icon: 'balance',
    tone: 'border-[#95d3ba] bg-white/75 text-[#003527]',
  }
}
