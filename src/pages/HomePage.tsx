import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TodayCard } from '../components/dashboard/TodayCard'
import { ProgressSummary } from '../components/dashboard/ProgressSummary'
import { MiniCalendar } from '../components/dashboard/MiniCalendar'
import { clearProfile, loadProfile } from '../lib/storage'
import { loadLastDiagnostic, clearLastDiagnostic } from '../lib/diagnosticStorage'
import { loadLearnerState, clearLearnerState } from '../lib/learnerStorage'
import { loadLearningPath, clearLearningPath } from '../lib/pathStorage'
import {
  computeTodayActivities,
  computeProgressStats,
  getPracticeDatesThisMonth,
} from '../lib/todayActivities'
import { xpToLevel } from '../types/learner'
import { GRADE_LABELS, GOAL_OPTIONS } from '../types/user'
import { TOPICS } from '../data/topics'

/**
 * Home Dashboard — the daily learning hub.
 *
 * This is what the student sees every time they open the app. It shows:
 *   1. "Hôm nay cần làm" — today's activities from SRS + learning path
 *   2. Progress summary — mastery %, topics covered, est. completion
 *   3. Mini calendar — which days this month they practiced
 *   4. Quick links — profile, learning path, error journal, re-test
 *
 * No profile card dump — that's in /profile now.
 */
export function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [flash, setFlash] = useState<string | null>(() => {
    const state = location.state as { flash?: string } | null
    return state?.flash ?? null
  })

  // Refresh counter — bumped every time the page gains focus so that
  // returning from /practice or /theory picks up the latest learner state.
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Re-load data whenever the user navigates back to this page.
    // `location.key` changes on every navigation including back/forward.
    setRefreshKey((k) => k + 1)
  }, [location.key])

  // Load all state sources — re-computed when refreshKey changes.
  const profile = useMemo(() => loadProfile(), [refreshKey])
  const diagnostic = useMemo(() => loadLastDiagnostic(), [refreshKey])
  const learner = useMemo(() => loadLearnerState(), [refreshKey])
  const path = useMemo(() => loadLearningPath(), [refreshKey])

  useEffect(() => {
    if (!profile) {
      navigate('/onboarding', { replace: true })
    }
  }, [profile, navigate])

  if (!profile) return null

  const goalLabel =
    GOAL_OPTIONS.find((g) => g.value === profile.goal)?.label ?? profile.goal
  const topicsInGrade = TOPICS.filter((t) => t.grade === profile.grade).length

  // Compute dashboard data.
  const todayActivities = computeTodayActivities(path, learner)
  const progressStats = computeProgressStats(path, learner, topicsInGrade)
  const practiceDates = getPracticeDatesThisMonth(learner)

  const hasDiagnostic = diagnostic !== null
  const hasPath = path !== null

  const handleReset = () => {
    clearProfile()
    clearLastDiagnostic()
    clearLearnerState()
    clearLearningPath()
    navigate('/onboarding', { replace: true })
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-brand-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              🏠 Xin chào, học sinh {GRADE_LABELS[profile.grade]}!
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {goalLabel} · {profile.dailyMinutes} phút/ngày
            </p>
          </div>
          {/* Streak + XP */}
          <div className="flex items-center gap-3">
            {learner.gamification.currentStreak > 0 && (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
                🔥 {learner.gamification.currentStreak} ngày
              </span>
            )}
            <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-bold text-brand-700">
              ⭐ {learner.gamification.xp} XP · Lv
              {xpToLevel(learner.gamification.xp)}
            </span>
          </div>
        </header>

        {/* Flash message */}
        {flash && (
          <Card className="!border-sky-200 !bg-sky-50">
            <div className="flex items-start justify-between gap-3 text-sm text-sky-800">
              <span>ℹ️ {flash}</span>
              <button
                onClick={() => setFlash(null)}
                className="text-sky-500 hover:text-sky-700"
              >
                ✕
              </button>
            </div>
          </Card>
        )}

        {/* No diagnostic yet — prompt to take one */}
        {!hasDiagnostic && (
          <Card className="text-center">
            <div className="text-4xl">📝</div>
            <h2 className="mt-3 text-xl font-bold text-slate-900">
              Bắt đầu với bài kiểm tra đầu vào
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Hệ thống cần đánh giá trình độ của bạn để tạo lộ trình học tập
              phù hợp. Bài kiểm tra gồm 15-50 câu, khoảng 30-60 phút.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="mt-5"
              onClick={() => navigate('/diagnostic')}
            >
              Bắt đầu kiểm tra →
            </Button>
          </Card>
        )}

        {/* Has diagnostic but no path — generate prompt */}
        {hasDiagnostic && !hasPath && (
          <Card className="!border-brand-200 !bg-brand-50 text-center">
            <div className="text-3xl">📚</div>
            <h2 className="mt-2 text-lg font-bold text-slate-900">
              Tạo lộ trình học tập
            </h2>
            <p className="mt-1 text-sm text-slate-700">
              Bài kiểm tra đã hoàn thành. Vào hồ sơ để tạo lộ trình học cá nhân.
            </p>
            <Button
              variant="primary"
              size="md"
              className="mt-4"
              onClick={() => navigate('/profile')}
            >
              Tạo lộ trình →
            </Button>
          </Card>
        )}

        {/* Has path — show today's activities */}
        {hasPath && (
          <TodayCard
            activities={todayActivities}
            dailyMinutes={profile.dailyMinutes}
          />
        )}

        {/* Progress summary */}
        {hasDiagnostic && (
          <ProgressSummary stats={progressStats} />
        )}

        {/* Calendar */}
        <MiniCalendar practiceDates={practiceDates} />

        {/* Quick links */}
        <div className="grid gap-3 sm:grid-cols-2">
          {hasDiagnostic && (
            <QuickLink
              icon="📊"
              label="Hồ sơ chi tiết"
              description="Radar chart, mastery, gap analysis"
              onClick={() => navigate('/profile')}
            />
          )}
          {hasPath && (
            <QuickLink
              icon="📚"
              label="Xem lộ trình"
              description="Sprint cards, roadmap, activities"
              onClick={() => navigate('/learning-path')}
            />
          )}
          {learner.errors.length > 0 && (
            <QuickLink
              icon="📕"
              label="Sổ lỗi sai"
              description={`${learner.errors.length} câu cần ôn lại`}
              onClick={() => navigate('/errors')}
            />
          )}
          <QuickLink
            icon="🌐"
            label="Cộng đồng"
            description="Xem và chia sẻ lộ trình"
            onClick={() => navigate('/community')}
          />
          <QuickLink
            icon="🔄"
            label={hasDiagnostic ? 'Kiểm tra lại' : 'Kiểm tra đầu vào'}
            description="Cập nhật hồ sơ năng lực"
            onClick={() => navigate('/diagnostic')}
          />
        </div>

        {/* Reset + debug */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <button onClick={handleReset} className="hover:text-rose-600">
            Đặt lại toàn bộ dữ liệu
          </button>
          <button
            onClick={() => navigate('/debug/questions')}
            className="hover:text-slate-600"
          >
            🔧 Debug
          </button>
        </div>
      </div>
    </div>
  )
}

function QuickLink({
  icon,
  label,
  description,
  onClick,
}: {
  icon: string
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:shadow-sm"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="font-medium text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
    </button>
  )
}
