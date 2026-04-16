import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PathCard } from '../components/community/PathCard'
import { ShareModal } from '../components/community/ShareModal'
import { browsePaths, sharePath, type BrowseOptions } from '../lib/communityApi'
import { getDeviceId } from '../lib/supabase'
import { loadProfile } from '../lib/storage'
import { loadLearningPath } from '../lib/pathStorage'
import { loadLearnerState } from '../lib/learnerStorage'
import type { SharedPath, ShareFormData } from '../types/community'
import type { Goal } from '../types/user'
import { GOAL_OPTIONS } from '../types/user'

export function CommunityPage() {
  const navigate = useNavigate()
  const [paths, setPaths] = useState<SharedPath[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [sharing, setSharing] = useState(false)

  // Filters
  const [gradeFilter, setGradeFilter] = useState<10 | 11 | 12 | 'all'>('all')
  const [goalFilter, setGoalFilter] = useState<Goal | 'all'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'most-inspired' | 'highest-xp'>('newest')

  const deviceId = useMemo(() => getDeviceId(), [])

  const fetchPaths = useCallback(async () => {
    setLoading(true)
    setError(null)
    const options: BrowseOptions = { sortBy, limit: 20 }
    if (gradeFilter !== 'all') options.grade = gradeFilter
    if (goalFilter !== 'all') options.goal = goalFilter

    const result = await browsePaths(options)
    if (result.error) {
      setError(result.error)
    } else {
      setPaths(result.data)
    }
    setLoading(false)
  }, [gradeFilter, goalFilter, sortBy])

  useEffect(() => {
    fetchPaths()
  }, [fetchPaths])

  const handleShare = async (form: ShareFormData) => {
    const profile = loadProfile()
    const path = loadLearningPath()
    const learner = loadLearnerState()
    if (!profile || !path) return

    // Compute completion %
    const completedSet = new Set(learner.completedActivities)
    let total = 0
    let done = 0
    for (const s of path.sprints) {
      for (const d of s.days) {
        for (const a of d.activities) {
          total++
          if (completedSet.has(a.activityId)) done++
        }
      }
    }
    const pct = total > 0 ? Math.round((done / total) * 100) : 0

    setSharing(true)
    const result = await sharePath(form, profile, path, learner, pct)
    setSharing(false)

    if (result.success) {
      setShowShareModal(false)
      fetchPaths()
    } else {
      alert('Lỗi: ' + (result.error ?? 'Không thể chia sẻ'))
    }
  }

  const canShare = loadProfile() !== null && loadLearningPath() !== null

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-brand-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              🌐 Cộng đồng học tập
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Xem lộ trình của bạn học khác và chia sẻ lộ trình của bạn
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              ← Trang chính
            </Button>
            {canShare && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowShareModal(true)}
              >
                🌐 Chia sẻ của tôi
              </Button>
            )}
          </div>
        </header>

        {/* Filters */}
        <Card className="!p-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={String(gradeFilter)}
              onChange={(e) => {
                const v = e.target.value
                setGradeFilter(v === 'all' ? 'all' : (Number(v) as 10 | 11 | 12))
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="all">Tất cả lớp</option>
              <option value="10">Lớp 10</option>
              <option value="11">Lớp 11</option>
              <option value="12">Lớp 12</option>
            </select>
            <select
              value={goalFilter}
              onChange={(e) => setGoalFilter(e.target.value as Goal | 'all')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="all">Tất cả mục tiêu</option>
              {GOAL_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="newest">Mới nhất</option>
              <option value="most-inspired">Nhiều inspire nhất</option>
              <option value="highest-xp">XP cao nhất</option>
            </select>
          </div>
        </Card>

        {/* Content */}
        {loading && (
          <div className="flex h-48 items-center justify-center text-slate-500">
            Đang tải…
          </div>
        )}

        {error && (
          <Card className="!border-rose-200 !bg-rose-50 text-center text-sm text-rose-800">
            Lỗi kết nối: {error}
          </Card>
        )}

        {!loading && !error && paths.length === 0 && (
          <Card className="text-center">
            <div className="text-4xl">🌱</div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">
              Chưa có ai chia sẻ
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Hãy là người đầu tiên chia sẻ lộ trình của bạn!
            </p>
            {canShare && (
              <Button
                variant="primary"
                size="md"
                className="mt-4"
                onClick={() => setShowShareModal(true)}
              >
                Chia sẻ lộ trình →
              </Button>
            )}
          </Card>
        )}

        {!loading && paths.length > 0 && (
          <div className="space-y-4">
            {paths.map((p) => (
              <PathCard
                key={p.id}
                path={p}
                isOwn={p.device_id === deviceId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Share modal */}
      {showShareModal && (
        <ShareModal
          onSubmit={handleShare}
          onClose={() => setShowShareModal(false)}
          loading={sharing}
        />
      )}
    </div>
  )
}
