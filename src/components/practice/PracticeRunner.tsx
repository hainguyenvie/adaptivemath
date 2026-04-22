import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { cn } from '../../lib/cn'
import { McqQuestion } from '../diagnostic/McqQuestion'
import { TfQuestion } from '../diagnostic/TfQuestion'
import { ShortAnsQuestion } from '../diagnostic/ShortAnsQuestion'
import { SessionProgress, type PracticePhase } from './SessionProgress'
import { SolutionReveal } from './SolutionReveal'
import { PracticeResult } from './PracticeResult'
import { Timer } from '../diagnostic/Timer'
import { TheorySidebar } from './TheorySidebar'
import {
  computeAdaptiveDecision,
  emptySessionMetrics,
  updateMetrics,
  type SessionMetrics,
  type AdaptiveDecision,
} from '../../lib/adaptiveEngine'
import { AdaptiveDisplay, type AdaptiveEvent } from './AdaptiveDisplay'
import type { Question } from '../../types/question'
import type { LearnerState } from '../../types/learner'
import { XP, xpToLevel } from '../../types/learner'
import { gradeAnswer, timeLimitForItem } from '../../lib/cat'
import { updateBkt, isMastered, initBktState } from '../../lib/bkt'
import { initSrsState, accuracyToQuality, scheduleReview } from '../../lib/srs'
import { saveLearnerState } from '../../lib/learnerStorage'
import { serializeAnswer, serializeCorrectAnswer } from '../../lib/practiceSelector'
import type { PracticeSelection } from '../../lib/practiceSelector'
import { getTopicById } from '../../data/topics'

interface PracticeRunnerProps {
  topicId: string
  /** The specific activity ID from the learning path (for completion tracking). */
  activityId: string | null
  selection: PracticeSelection
  learner: LearnerState
}

interface ResponseRecord {
  question: Question
  answer: unknown
  score: number
  correct: boolean
  durationMs: number
}

/**
 * 3-phase practice session orchestrator:
 *   Warm-up (2-3 easy review) → Practice (5-8 with solution reveal) → Assessment (5 timed, no hints)
 *   → Result (mastery delta, XP, badges, errors logged)
 */
export function PracticeRunner({
  topicId,
  activityId,
  selection,
  learner,
}: PracticeRunnerProps) {
  const navigate = useNavigate()
  const topic = getTopicById(topicId)
  const topicTitle = topic?.title ?? topicId

  // Phase state.
  const [phase, setPhase] = useState<PracticePhase>('warmup')
  const [questionIdx, setQuestionIdx] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now())
  const sessionStartedAt = useMemo(() => Date.now(), [])

  // Collected responses per phase. Warm-up responses are tracked for metrics
  // but don't affect BKT scoring (only practice + assessment do).
  const [, setWarmupResponses] = useState<ResponseRecord[]>([])
  const [practiceResponses, setPracticeResponses] = useState<ResponseRecord[]>([])
  const [assessResponses, setAssessResponses] = useState<ResponseRecord[]>([])

  // Adaptive engine state.
  const [metrics, setMetrics] = useState<SessionMetrics>(() => emptySessionMetrics())
  const [adaptiveDecision, setAdaptiveDecision] = useState<AdaptiveDecision | null>(null)
  const [adaptiveSuggestion, setAdaptiveSuggestion] = useState<string | null>(null)
  const [adaptiveEvents, setAdaptiveEvents] = useState<AdaptiveEvent[]>([])

  // Result state (computed once when entering result phase).
  const [resultData, setResultData] = useState<{
    masteryBefore: number
    masteryAfter: number
    xpEarned: number
    newBadges: string[]
  } | null>(null)

  // Current question list based on phase.
  const currentQuestions: Question[] =
    phase === 'warmup'
      ? selection.warmup
      : phase === 'practice'
        ? selection.practice
        : selection.assessment

  const currentQuestion = currentQuestions[questionIdx] ?? null

  // Handle answer submission.
  const handleAnswer = useCallback(
    (rawAnswer: unknown) => {
      if (!currentQuestion) return
      const score = gradeAnswer(currentQuestion, rawAnswer)
      const correct = score >= 0.75
      const durationMs = Date.now() - questionStartedAt

      const record: ResponseRecord = {
        question: currentQuestion,
        answer: rawAnswer,
        score,
        correct,
        durationMs,
      }

      // Add to phase responses.
      if (phase === 'warmup') setWarmupResponses((r) => [...r, record])
      else if (phase === 'practice') setPracticeResponses((r) => [...r, record])
      else setAssessResponses((r) => [...r, record])

      // Update adaptive metrics (all phases contribute).
      const updatedMetrics = updateMetrics(
        metrics,
        currentQuestion,
        score,
        durationMs,
        false,
      )
      setMetrics(updatedMetrics)

      // Compute adaptive decision for the next question selection.
      const theta = learner.bkt[topicId]?.pL ?? 0.3
      const decision = computeAdaptiveDecision(updatedMetrics, theta)
      setAdaptiveDecision(decision)
      if (decision.suggestion) setAdaptiveSuggestion(decision.suggestion)

      // Log adaptive event for history timeline.
      const accuracy = updatedMetrics.totalResponses > 0
        ? updatedMetrics.correctCount / updatedMetrics.totalResponses
        : 0
      setAdaptiveEvents((prev) => [
        ...prev,
        {
          questionNumber: updatedMetrics.totalResponses,
          score,
          state: decision.state,
          offset: decision.offset,
          targetB: decision.targetDifficulty,
          streak: updatedMetrics.streak,
          wrongStreak: updatedMetrics.wrongStreak,
          accuracy,
          suggestion: decision.suggestion,
          timestamp: Date.now(),
        },
      ])

      if (phase === 'practice') {
        // Show solution reveal (correct or not).
        setLastScore(score)
        setShowSolution(true)
      } else {
        // Warm-up + assessment: just advance.
        advanceQuestion(phase, questionIdx, currentQuestions.length, record)
      }
    },
    [currentQuestion, phase, questionIdx, currentQuestions.length, questionStartedAt],
  )

  const handleSolutionContinue = useCallback(() => {
    setShowSolution(false)
    setLastScore(null)
    advanceQuestion(phase, questionIdx, currentQuestions.length, null)
  }, [phase, questionIdx, currentQuestions.length])

  const advanceQuestion = useCallback(
    (
      currentPhase: PracticePhase,
      currentIdx: number,
      totalInPhase: number,
      _record: ResponseRecord | null,
    ) => {
      if (currentIdx + 1 < totalInPhase) {
        setQuestionIdx(currentIdx + 1)
        setQuestionStartedAt(Date.now())
      } else {
        // Phase complete → move to next phase.
        if (currentPhase === 'warmup') {
          setPhase('practice')
          setQuestionIdx(0)
          setQuestionStartedAt(Date.now())
        } else if (currentPhase === 'practice') {
          setPhase('assessment')
          setQuestionIdx(0)
          setQuestionStartedAt(Date.now())
        } else {
          // Assessment complete → compute results.
          finalizeSession()
        }
      }
    },
    [],
  )

  const handleTimerExpire = useCallback(() => {
    // Skip on timeout.
    advanceQuestion(phase, questionIdx, currentQuestions.length, null)
  }, [phase, questionIdx, currentQuestions.length, advanceQuestion])

  // Finalize: BKT update, SRS schedule, error journal, gamification, persist.
  const finalizeSession = useCallback(() => {
    const allResponses = [...practiceResponses, ...assessResponses]
    const correctCount = allResponses.filter((r) => r.correct).length
    const accuracy = allResponses.length > 0 ? correctCount / allResponses.length : 0

    // BKT update.
    const existingBkt = learner.bkt[topicId] ?? initBktState(null)
    const masteryBefore = existingBkt.pL
    let bktState = existingBkt
    for (const r of allResponses) {
      bktState = updateBkt(bktState, r.correct)
    }

    // SRS: if newly mastered, init SRS schedule.
    let srsState = learner.srs[topicId]
    const wasMastered = isMastered(existingBkt)
    const nowMastered = isMastered(bktState)
    if (nowMastered && !wasMastered) {
      srsState = initSrsState()
    } else if (srsState) {
      // Existing SRS → update schedule based on this session's quality.
      const quality = accuracyToQuality(accuracy)
      srsState = scheduleReview(srsState, quality)
    }

    // Error journal.
    const newErrors = allResponses
      .filter((r) => !r.correct)
      .map((r) => ({
        questionId: r.question.id,
        topicId,
        studentAnswer: serializeAnswer(r.answer),
        correctAnswer: serializeCorrectAnswer(r.question),
        score: r.score,
        timestamp: new Date().toISOString(),
        resolved: false,
      }))

    // XP + gamification.
    const xpEarned =
      allResponses.length * XP.perAttempted +
      correctCount * XP.perCorrect +
      (nowMastered && !wasMastered ? XP.perTopicMastered : 0)

    const today = new Date().toISOString().slice(0, 10)
    const streakBroke = learner.gamification.lastPracticeDate !== null &&
      learner.gamification.lastPracticeDate !== today &&
      daysBetween(learner.gamification.lastPracticeDate, today) > 1
    const newStreak = streakBroke ? 1 : learner.gamification.currentStreak + (
      learner.gamification.lastPracticeDate === today ? 0 : 1
    )

    const totalXP = learner.gamification.xp + xpEarned
    const totalQuestions = learner.gamification.totalQuestionsAttempted + allResponses.length

    // Badge check.
    const existingBadges = new Set(learner.gamification.badges)
    const newBadges: string[] = []
    function tryBadge(id: string) {
      if (!existingBadges.has(id)) {
        newBadges.push(id)
        existingBadges.add(id)
      }
    }
    tryBadge('first-practice')
    if (newStreak >= 5) tryBadge('streak-5')
    if (newStreak >= 10) tryBadge('streak-10')
    if (totalQuestions >= 100) tryBadge('q-100')
    if (totalQuestions >= 500) tryBadge('q-500')
    if (nowMastered && !wasMastered) tryBadge('first-mastery')
    if (assessResponses.length > 0 && assessResponses.every((r) => r.correct)) {
      tryBadge('perfect-assessment')
    }

    // Persist all state.
    const updatedLearner: LearnerState = {
      ...learner,
      bkt: { ...learner.bkt, [topicId]: bktState },
      srs: srsState
        ? { ...learner.srs, [topicId]: srsState }
        : learner.srs,
      errors: [...learner.errors, ...newErrors],
      gamification: {
        xp: totalXP,
        level: xpToLevel(totalXP),
        currentStreak: newStreak,
        longestStreak: Math.max(learner.gamification.longestStreak, newStreak),
        lastPracticeDate: today,
        badges: Array.from(existingBadges),
        totalQuestionsAttempted: totalQuestions,
        totalReviewsCompleted: learner.gamification.totalReviewsCompleted,
      },
      sessions: [
        ...learner.sessions,
        {
          sessionId: `practice-${Date.now()}`,
          topicId,
          date: today,
          questionsAttempted: allResponses.length,
          correctCount,
          masteryBefore,
          masteryAfter: bktState.pL,
          xpEarned,
          durationMs: Date.now() - sessionStartedAt,
          adaptiveTransitions: adaptiveEvents
            .filter((e, i) => i === 0 || e.state !== adaptiveEvents[i - 1].state)
            .map((e) => ({
              questionNumber: e.questionNumber,
              state: e.state,
              offset: e.offset,
              accuracy: e.accuracy,
              suggestion: e.suggestion,
            })),
        },
      ],
      usedQuestionIds: [
        ...learner.usedQuestionIds,
        ...allResponses.map((r) => r.question.id),
      ],
      completedActivities: [
        ...new Set([
          ...learner.completedActivities,
          // Mark the specific activity instance as done (not the whole topic).
          ...(activityId ? [activityId] : []),
        ]),
      ],
    }
    saveLearnerState(updatedLearner)

    setResultData({
      masteryBefore,
      masteryAfter: bktState.pL,
      xpEarned,
      newBadges,
    })
    setPhase('result')
  }, [practiceResponses, assessResponses, learner, topicId, sessionStartedAt])

  // Skip empty phases via effects — never setState inside render.
  useEffect(() => {
    if (phase === 'warmup' && selection.warmup.length === 0) {
      setPhase('practice')
      setQuestionIdx(0)
      setQuestionStartedAt(Date.now())
    }
  }, [phase, selection.warmup.length])

  useEffect(() => {
    if (phase === 'assessment' && selection.assessment.length === 0 && !resultData) {
      finalizeSession()
    }
  }, [phase, selection.assessment.length, resultData, finalizeSession])

  // --- Render ---

  // Result phase.
  if (phase === 'result' && resultData) {
    const allResponses = [...practiceResponses, ...assessResponses]
    return (
      <PracticeResult
        topicTitle={topicTitle}
        questionsAttempted={allResponses.length}
        correctCount={allResponses.filter((r) => r.correct).length}
        masteryBefore={resultData.masteryBefore}
        masteryAfter={resultData.masteryAfter}
        xpEarned={resultData.xpEarned}
        newBadges={resultData.newBadges}
        durationMs={Date.now() - sessionStartedAt}
        onBackToHome={() => navigate('/')}
        onPracticeAgain={() => window.location.reload()}
      />
    )
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-slate-500">
        Không còn câu hỏi cho phần này.
      </div>
    )
  }

  // Use questionIdx (not response count) for progress display so it stays
  // in sync during solution reveal — otherwise showing solution for the last
  // question would display "Câu 9/8" because the response is already recorded
  // but the index hasn't advanced yet.
  const answeredCount = questionIdx

  return (
    <div className="space-y-5">
      {/* Progress */}
      <SessionProgress
        currentPhase={phase}
        questionsAnswered={answeredCount}
        questionsTotal={currentQuestions.length}
      />

      {/* Phase label */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">
          {phase === 'warmup' && '🔥 Khởi động'}
          {phase === 'practice' && '📝 Luyện tập'}
          {phase === 'assessment' && '🎯 Đánh giá'}
        </h2>
        {phase === 'assessment' && (
          <Timer
            totalSeconds={timeLimitForItem(currentQuestion)}
            startedAt={questionStartedAt}
            onExpire={handleTimerExpire}
          />
        )}
      </div>

      {/* Adaptive engine display (practice phase) */}
      {phase === 'practice' && (
        <AdaptiveDisplay
          decision={adaptiveDecision}
          metrics={metrics}
          events={adaptiveEvents}
        />
      )}

      {/* Adaptive suggestion banner */}
      {adaptiveSuggestion && (
        <div className="flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800">
          <span>💡 {adaptiveSuggestion}</span>
          <button
            type="button"
            onClick={() => setAdaptiveSuggestion(null)}
            className="ml-3 text-sky-500 hover:text-sky-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main content: question + optional theory sidebar */}
      <div className={cn(
        'gap-5',
        // Side-by-side layout only during practice phase (theory sidebar visible).
        phase === 'practice' ? 'flex flex-col lg:flex-row' : '',
      )}>
        {/* Question area */}
        <div className="min-w-0 flex-1">
          {showSolution && lastScore !== null ? (
            <SolutionReveal
              correct={lastScore >= 0.75}
              solution={currentQuestion.solution}
              onContinue={handleSolutionContinue}
            />
          ) : (
            <Card className="min-h-[280px]">
              {currentQuestion.type === 'mcq' && (
                <McqQuestion
                  key={currentQuestion.id}
                  question={currentQuestion}
                  onSubmit={handleAnswer}
                />
              )}
              {currentQuestion.type === 'tf' && (
                <TfQuestion
                  key={currentQuestion.id}
                  question={currentQuestion}
                  onSubmit={handleAnswer}
                />
              )}
              {currentQuestion.type === 'shortans' && (
                <ShortAnsQuestion
                  key={currentQuestion.id}
                  question={currentQuestion}
                  onSubmit={handleAnswer}
                />
              )}
            </Card>
          )}
        </div>

        {/* Theory sidebar — only visible during practice phase */}
        {phase === 'practice' && (
          <div className="w-full shrink-0 lg:w-80">
            <TheorySidebar topicId={topicId} />
          </div>
        )}
      </div>
    </div>
  )
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  return Math.abs(Math.round((db - da) / 86_400_000))
}
