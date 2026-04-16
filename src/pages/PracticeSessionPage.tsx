import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PracticeRunner } from '../components/practice/PracticeRunner'
import { loadLearnerState } from '../lib/learnerStorage'
import { loadProfile } from '../lib/storage'
import { QUESTION_BANK } from '../lib/questionBank'
import { selectPracticeQuestions } from '../lib/practiceSelector'
import { isMastered } from '../lib/bkt'
import { getTopicById } from '../data/topics'
import type { LearnerState } from '../types/learner'
import type { LevelLetter } from '../types/question'

/**
 * Practice session page — launched from an Activity chip in the learning
 * path (KnowledgeProfilePage) or from an SRS review card on the dashboard.
 *
 * Query params:
 *   ?topic=<topicId>&levels=N,H&type=learn
 *
 * Loads the question pool, selects practice questions, and hands off to
 * `PracticeRunner` which orchestrates the 3-phase session.
 */
export function PracticeSessionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [learner, setLearner] = useState<LearnerState | null>(null)

  const topicId = searchParams.get('topic')
  const levelsStr = searchParams.get('levels') ?? 'N,H'
  const levels = levelsStr.split(',').filter(Boolean) as LevelLetter[]
  const activityId = searchParams.get('activityId')

  useEffect(() => {
    const profile = loadProfile()
    if (!profile) {
      navigate('/', { replace: true })
      return
    }
    setLearner(loadLearnerState())
  }, [navigate])

  const selection = useMemo(() => {
    if (!learner || !topicId) return null
    const profile = loadProfile()
    if (!profile) return null

    const pool = QUESTION_BANK.questions.filter(
      (q) => q.grade === profile.grade,
    )

    // Find mastered topics for warm-up questions.
    const masteredTopicIds = Object.entries(learner.bkt)
      .filter(([_, bkt]) => isMastered(bkt))
      .map(([id]) => id)

    const sessionSeed = Date.now() ^ topicId.length

    return selectPracticeQuestions(
      pool,
      topicId,
      levels,
      learner,
      masteredTopicIds,
      sessionSeed,
    )
  }, [learner, topicId, levelsStr])

  if (!topicId) {
    navigate('/profile', { replace: true })
    return null
  }

  const topic = getTopicById(topicId)

  if (!learner || !selection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Đang chuẩn bị bài luyện tập…
      </div>
    )
  }

  if (
    selection.practice.length === 0 &&
    selection.assessment.length === 0
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <div className="text-4xl">📭</div>
          <h2 className="mt-3 text-xl font-bold text-slate-900">
            Hết câu hỏi
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Đã hết câu hỏi cho chủ đề{' '}
            <strong>{topic?.title ?? topicId}</strong> ở mức{' '}
            {levels.join(', ')}. Bạn có thể thử mức độ khó khác.
          </p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            ← Quay về hồ sơ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-brand-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <PracticeRunner
          topicId={topicId}
          activityId={activityId}
          selection={selection}
          learner={learner}
        />
      </div>
    </div>
  )
}
