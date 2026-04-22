import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar } from '../components/layout/AppSidebar'
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
import { cn } from '../lib/cn'

export function CommunityPage() {
  const navigate = useNavigate()
  const [paths, setPaths] = useState<SharedPath[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [sharing, setSharing] = useState(false)

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
    <div className="bg-bioluminescent min-h-screen overflow-x-hidden text-[#002117]">
      <AppSidebar />

      <main className="lg:ml-72">
        {/* Top nav */}
        <header className="fixed top-3 left-1/2 z-50 flex w-[calc(100vw-1rem)] max-w-5xl -translate-x-1/2 items-center justify-between gap-4 rounded-full border border-white/50 bg-white/92 px-5 py-3 shadow-[0_12px_40px_rgba(0,53,39,0.08)] ring-1 ring-white/60 sm:top-4 sm:w-[calc(100vw-2rem)] sm:px-6 lg:left-[calc(18rem+(100vw-18rem)/2)] lg:w-[calc(100vw-20rem)]">
          <h2 className="text-lg font-extrabold tracking-tight text-[#003527] sm:text-2xl">
            Community
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full p-2 text-[#2b6954]/70 transition hover:bg-white/45"
              aria-label="Trang chính"
            >
              <span className="material-symbols-outlined">home</span>
            </button>
            {canShare && (
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 rounded-full bg-[#064e3b] px-5 py-2 text-sm font-bold text-[#b2f746] transition hover:bg-[#003527]"
              >
                <span className="material-symbols-outlined text-base">share</span>
                Chia sẻ của tôi
              </button>
            )}
          </div>
        </header>

        <div className="mx-auto max-w-4xl space-y-8 p-6 pt-28 sm:p-8 sm:pt-32">
          {/* Hero */}
          <section className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-[0] text-[#003527]">
              Cộng đồng học tập
            </h1>
            <p className="max-w-2xl text-lg font-medium leading-relaxed text-[#404944]">
              Xem lộ trình của bạn học khác và chia sẻ hành trình của bạn với mọi người.
            </p>
          </section>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 rounded-[2rem] bg-white/80 px-5 py-4 shadow-md shadow-[#002117]/5 ring-1 ring-white">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#2b6954]">school</span>
              <select
                value={String(gradeFilter)}
                onChange={(e) => {
                  const v = e.target.value
                  setGradeFilter(v === 'all' ? 'all' : (Number(v) as 10 | 11 | 12))
                }}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-[#003527] focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="all">Tất cả lớp</option>
                <option value="10">Lớp 10</option>
                <option value="11">Lớp 11</option>
                <option value="12">Lớp 12</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#2b6954]">flag</span>
              <select
                value={goalFilter}
                onChange={(e) => setGoalFilter(e.target.value as Goal | 'all')}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-[#003527] focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="all">Tất cả mục tiêu</option>
                {GOAL_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#2b6954]">sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-[#003527] focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="newest">Mới nhất</option>
                <option value="most-inspired">Nhiều inspire nhất</option>
                <option value="highest-xp">XP cao nhất</option>
              </select>
            </div>
          </div>

          {/* Content */}
          {loading && (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-[#404944]">
              <span className="material-symbols-outlined animate-spin text-4xl text-emerald-600">
                autorenew
              </span>
              <p className="text-sm font-medium">Đang tải cộng đồng…</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-4 rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5">
              <span className="material-symbols-outlined text-rose-500">error</span>
              <div>
                <p className="font-bold text-rose-800">Lỗi kết nối</p>
                <p className="text-sm text-rose-600">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && paths.length === 0 && (
            <div className="flex flex-col items-center gap-5 rounded-[3rem] bg-white p-12 text-center shadow-2xl shadow-[#002117]/5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <span className="material-symbols-outlined text-4xl text-emerald-600">groups</span>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-[#003527]">Chưa có ai chia sẻ</h3>
                <p className="mt-1 font-medium text-[#404944]">
                  Hãy là người đầu tiên chia sẻ lộ trình của bạn!
                </p>
              </div>
              {canShare && (
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 rounded-full bg-[#b2f746] px-8 py-3 font-black text-[#496f00] transition hover:shadow-[0_0_20px_rgba(178,247,70,0.4)]"
                >
                  Chia sẻ lộ trình
                  <span className="material-symbols-outlined text-base">trending_flat</span>
                </button>
              )}
            </div>
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

          <footer className="flex justify-center pt-8 pb-8 opacity-45">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#80bea6]">energy_program_saving</span>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#003527]">
                Nurturing Human Potential
              </span>
            </div>
          </footer>
        </div>
      </main>

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
