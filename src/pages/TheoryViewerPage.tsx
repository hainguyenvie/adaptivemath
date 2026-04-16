import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { LatexRenderer } from '../components/diagnostic/LatexRenderer'
import { QUESTION_BANK } from '../lib/questionBank'
import { getTopicById } from '../data/topics'
import { loadLearnerState, saveLearnerState } from '../lib/learnerStorage'
import type { TheoryBlock, TopicTheory } from '../types/question'
import { cn } from '../lib/cn'

const TYPE_LABELS: Record<TheoryBlock['type'], { label: string; icon: string; color: string }> = {
  section: { label: 'Mục', icon: '📑', color: 'text-slate-800 font-bold text-lg' },
  dn: { label: 'Định nghĩa', icon: '📐', color: 'border-emerald-300 bg-emerald-50' },
  chuy: { label: 'Chú ý', icon: '⚠️', color: 'border-amber-300 bg-amber-50' },
  nx: { label: 'Nhận xét', icon: '💡', color: 'border-sky-300 bg-sky-50' },
  dang: { label: 'Dạng toán', icon: '🎯', color: 'border-violet-300 bg-violet-50' },
  vd: { label: 'Ví dụ mẫu', icon: '📝', color: 'border-brand-300 bg-brand-50' },
}

export function TheoryViewerPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const topicId = searchParams.get('topic')

  const topic = topicId ? getTopicById(topicId) : null
  const theory = useMemo<TopicTheory | null>(() => {
    if (!topicId) return null
    return QUESTION_BANK.theory.find((t) => t.topicId === topicId) ?? null
  }, [topicId])

  const activityId = searchParams.get('activityId')

  // Mark this specific theory activity as completed when the user visits.
  useEffect(() => {
    if (!activityId) return
    const learner = loadLearnerState()
    if (!learner.completedActivities.includes(activityId)) {
      saveLearnerState({
        ...learner,
        completedActivities: [...learner.completedActivities, activityId],
      })
    }
  }, [activityId])

  if (!topicId || !topic) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Không tìm thấy chủ đề.
      </div>
    )
  }

  if (!theory || (theory.knowledgeBlocks.length === 0 && theory.methodBlocks.length === 0)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Chưa có lý thuyết cho chủ đề này.
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-brand-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              📖 {topic.title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {topic.chapterTitle} · Lớp {topic.grade}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              ← Quay lại
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                navigate(
                  `/practice?topic=${encodeURIComponent(topicId)}&levels=N,H&type=learn`,
                )
              }
            >
              Luyện tập →
            </Button>
          </div>
        </header>

        {/* Knowledge section */}
        {theory.knowledgeBlocks.length > 0 && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              📚 Kiến thức trọng tâm
            </h2>
            <div className="space-y-4">
              {theory.knowledgeBlocks.map((block, i) => (
                <TheoryBlockView key={`k-${i}`} block={block} />
              ))}
            </div>
          </Card>
        )}

        {/* Methods section */}
        {theory.methodBlocks.length > 0 && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              🎯 Phân loại và phương pháp giải
            </h2>
            <div className="space-y-4">
              {theory.methodBlocks.map((block, i) => (
                <TheoryBlockView key={`m-${i}`} block={block} />
              ))}
            </div>
          </Card>
        )}

        <div className="flex justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() =>
              navigate(
                `/practice?topic=${encodeURIComponent(topicId)}&levels=N,H&type=learn`,
              )
            }
          >
            Bắt đầu luyện tập →
          </Button>
        </div>
      </div>
    </div>
  )
}

function TheoryBlockView({ block }: { block: TheoryBlock }) {
  const [showSolution, setShowSolution] = useState(false)
  const meta = TYPE_LABELS[block.type]

  if (block.type === 'section') {
    return (
      <h3 className={cn('mt-2', meta.color)}>
        {meta.icon} <LatexRenderer content={block.content} />
      </h3>
    )
  }

  return (
    <div className={cn('rounded-xl border p-4', meta.color)}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-base">{meta.icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {meta.label}
          {block.title && `: ${block.title}`}
        </span>
      </div>
      <div className="text-sm">
        <LatexRenderer content={block.content} />
      </div>

      {block.solution && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowSolution((v) => !v)}
            className="text-xs font-medium text-brand-700 hover:text-brand-900"
          >
            {showSolution ? '▾ Ẩn lời giải' : '▸ Xem lời giải'}
          </button>
          {showSolution && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <LatexRenderer content={block.solution} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
