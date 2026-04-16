import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { LatexRenderer } from '../components/diagnostic/LatexRenderer'
import { loadLearnerState } from '../lib/learnerStorage'
import { QUESTION_BANK } from '../lib/questionBank'
import { getTopicById } from '../data/topics'
import type { ErrorEntry } from '../types/learner'
import { cn } from '../lib/cn'

export function ErrorJournalPage() {
  const navigate = useNavigate()
  const learner = useMemo(() => loadLearnerState(), [])
  const [topicFilter, setTopicFilter] = useState<string>('all')

  const errors = learner.errors
  const topicIds = [...new Set(errors.map((e) => e.topicId))]

  const filtered =
    topicFilter === 'all'
      ? errors
      : errors.filter((e) => e.topicId === topicFilter)

  // Most recent first.
  const sorted = [...filtered].reverse()

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-brand-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              📕 Sổ lỗi sai
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {errors.length} câu sai · {topicIds.length} chủ đề
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            ← Trang chính
          </Button>
        </header>

        {errors.length === 0 ? (
          <Card className="text-center">
            <div className="text-3xl">🎉</div>
            <h3 className="mt-2 text-lg font-bold text-slate-900">
              Chưa có lỗi sai nào!
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Bắt đầu luyện tập để sổ lỗi ghi nhận câu cần ôn.
            </p>
          </Card>
        ) : (
          <>
            {/* Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600">Lọc theo chủ đề:</label>
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              >
                <option value="all">Tất cả ({errors.length})</option>
                {topicIds.map((id) => {
                  const count = errors.filter((e) => e.topicId === id).length
                  const title = getTopicById(id)?.title ?? id
                  return (
                    <option key={id} value={id}>
                      {title} ({count})
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Error list */}
            <div className="space-y-3">
              {sorted.slice(0, 30).map((err, i) => (
                <ErrorCard
                  key={`${err.questionId}-${err.timestamp}-${i}`}
                  error={err}
                  onRedo={() => {
                    const q = QUESTION_BANK.questions.find(
                      (x) => x.id === err.questionId,
                    )
                    if (q) {
                      navigate(
                        `/practice?topic=${encodeURIComponent(q.topicId)}&levels=${q.level}&type=practice`,
                      )
                    }
                  }}
                />
              ))}
            </div>

            {sorted.length > 30 && (
              <p className="text-center text-xs text-slate-500">
                Hiển thị 30/{sorted.length} mới nhất
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ErrorCard({
  error,
  onRedo,
}: {
  error: ErrorEntry
  onRedo: () => void
}) {
  const topic = getTopicById(error.topicId)
  const question = QUESTION_BANK.questions.find(
    (q) => q.id === error.questionId,
  )
  const dateStr = new Date(error.timestamp).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Card
      className={cn(
        '!p-4',
        error.resolved && 'opacity-60',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <span className="text-xs text-slate-500">{dateStr}</span>
          <span className="mx-2 text-slate-300">·</span>
          <span className="text-xs font-medium text-slate-700">
            {topic?.title ?? error.topicId}
          </span>
          {error.resolved && (
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
              ✓ Đã sửa
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onRedo}>
          Làm lại
        </Button>
      </div>

      {question && (
        <div className="mb-2 text-sm">
          <LatexRenderer
            content={question.prompt.slice(0, 200) + (question.prompt.length > 200 ? '…' : '')}
          />
        </div>
      )}

      <div className="flex gap-4 text-xs">
        <div>
          <span className="text-rose-600">Bạn chọn:</span>{' '}
          <span className="font-medium">{error.studentAnswer}</span>
        </div>
        <div>
          <span className="text-emerald-600">Đáp án:</span>{' '}
          <span className="font-medium">{error.correctAnswer}</span>
        </div>
      </div>
    </Card>
  )
}
