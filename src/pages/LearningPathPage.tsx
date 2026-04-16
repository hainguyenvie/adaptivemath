import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { PathSummaryHeader } from '../components/learning-path/PathSummaryHeader'
import { PathRoadmap } from '../components/learning-path/PathRoadmap'
import { SprintCard } from '../components/learning-path/SprintCard'
import { PathDebugPanel } from '../components/learning-path/PathDebugPanel'
import { loadLearningPath } from '../lib/pathStorage'
import { GOAL_OPTIONS, GRADE_LABELS } from '../types/user'

/**
 * Standalone Learning Path page — reads from `kntt.learningPath.v1`.
 * Shows the full sprint schedule, roadmap overview, and clickable activities.
 */
export function LearningPathPage() {
  const navigate = useNavigate()
  const path = useMemo(() => loadLearningPath(), [])
  const [visibleSprints, setVisibleSprints] = useState(3)

  if (!path) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <div className="text-4xl">📚</div>
          <h2 className="mt-3 text-xl font-bold text-slate-900">
            Chưa có lộ trình
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Hoàn thành bài kiểm tra đầu vào và tạo lộ trình từ hồ sơ kiến thức.
          </p>
          <Button
            variant="primary"
            size="md"
            className="mt-4"
            onClick={() => navigate('/profile')}
          >
            Tạo lộ trình →
          </Button>
        </div>
      </div>
    )
  }

  const goalLabel =
    GOAL_OPTIONS.find((g) => g.value === path.goal)?.label ?? path.goal

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-brand-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              📚 Lộ trình học tập
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {GRADE_LABELS[path.grade]} · {goalLabel} ·{' '}
              {path.dailyMinutes} phút/ngày
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            ← Trang chính
          </Button>
        </header>

        <PathSummaryHeader path={path} />
        <PathRoadmap path={path} />

        <div className="space-y-4">
          {path.sprints.slice(0, visibleSprints).map((sprint, i) => (
            <SprintCard
              key={sprint.weekNumber}
              sprint={sprint}
              defaultOpen={i === 0}
            />
          ))}
        </div>

        {visibleSprints < path.sprints.length && (
          <div className="flex justify-center">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setVisibleSprints((v) => v + 3)}
            >
              Xem thêm ({path.sprints.length - visibleSprints} tuần còn lại)
            </Button>
          </div>
        )}

        <PathDebugPanel path={path} />
      </div>
    </div>
  )
}
