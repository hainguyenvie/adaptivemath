import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PathRoadmap } from '../components/learning-path/PathRoadmap'
import { loadLearnerState } from '../lib/learnerStorage'
import { SprintCard } from '../components/learning-path/SprintCard'
import { PathDebugPanel } from '../components/learning-path/PathDebugPanel'
import { clearLearningPath, loadLearningPath } from '../lib/pathStorage'
import { GOAL_OPTIONS, GRADE_LABELS } from '../types/user'
import { cn } from '../lib/cn'

export function LearningPathPage() {
  const navigate = useNavigate()
  const path = useMemo(() => loadLearningPath(), [])
  const [visibleSprints, setVisibleSprints] = useState(3)

  if (!path) {
    return (
      <div className="bg-bioluminescent flex min-h-screen items-center justify-center px-4">
        <AppSidebar activeItem="growth-path" onNavigate={navigate} />
        <div className="lg:ml-72 flex flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#064e3b]">
            <span className="material-symbols-outlined text-4xl text-[#b2f746]">auto_graph</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#003527]">Chưa có lộ trình</h2>
            <p className="mt-2 max-w-sm text-sm font-medium text-[#446900]">
              Hoàn thành bài kiểm tra đầu vào và tạo lộ trình từ hồ sơ kiến thức.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="rounded-full bg-[#b2f746] px-8 py-4 font-black text-[#003527] shadow-[0_8px_28px_rgba(178,247,70,0.35)] transition hover:-translate-y-0.5 hover:bg-[#a3e635]"
          >
            Tạo lộ trình →
          </button>
        </div>
      </div>
    )
  }

  const goalLabel = GOAL_OPTIONS.find((g) => g.value === path.goal)?.label ?? path.goal

  return (
    <div className="bg-bioluminescent min-h-screen overflow-x-hidden text-[#002117]">
      <AppSidebar activeItem="growth-path" onNavigate={navigate} />

      <main className="lg:ml-72">
        {/* Floating header */}
        <header className="fixed top-3 left-1/2 z-50 flex w-[calc(100vw-1rem)] max-w-5xl -translate-x-1/2 items-center justify-between gap-4 rounded-full border border-white/50 bg-white/92 px-5 py-3 shadow-[0_12px_40px_rgba(0,53,39,0.08)] ring-1 ring-white/60 sm:top-4 sm:w-[calc(100vw-2rem)] sm:px-6 lg:left-[calc(18rem+(100vw-18rem)/2)] lg:w-[calc(100vw-20rem)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#064e3b] shadow-lg shadow-[#003527]/15">
              <span className="material-symbols-outlined text-[#b2f746]">auto_graph</span>
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-[#003527] sm:text-lg">
                Lộ Trình Học Tập
              </h2>
              <p className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[#446900] sm:block">
                {GRADE_LABELS[path.grade]} · {goalLabel} · {path.dailyMinutes} phút/ngày
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="text-xs font-bold text-[#9fb3aa] transition-colors hover:text-[#003527]"
          >
            ← Hồ sơ
          </button>
        </header>

        <div className="mx-auto max-w-4xl space-y-6 p-6 pt-24 sm:p-8 sm:pt-28">

          {/* Page title */}
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#003527] sm:text-4xl">
              Lộ Trình <span className="text-[#064e3b]">Học Tập</span>
            </h1>
            <p className="mt-1.5 text-base font-medium text-[#404944]">
              {GRADE_LABELS[path.grade]} · {goalLabel} · {path.totalTopics} chủ đề · {path.sprints.length} tuần
            </p>
          </div>

          {/* Summary stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryStatCard
              icon="topic"
              label="Chủ đề cần ôn"
              value={String(path.totalTopics)}
              sub={`${path.sprints.length} tuần`}
            />
            <SummaryStatCard
              icon="calendar_month"
              label="Tổng số ngày"
              value={`~${path.totalDays}`}
              sub={`${path.dailyMinutes} phút/ngày`}
            />
            <SummaryStatCard
              icon="schedule"
              label="Dự kiến xong"
              value={formatDateShort(path.estimatedCompletionDate)}
              sub={path.deadline ? `Deadline: ${formatDateShort(path.deadline)}` : 'Không có deadline'}
            />
            <PathProgressCard path={path} />
          </div>

          {/* Roadmap overview */}
          <div className="rounded-[3rem] bg-white p-6 shadow-2xl shadow-[#002117]/5">
            <div className="mb-5 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#064e3b]">route</span>
              <h3 className="text-lg font-extrabold text-[#003527]">Tổng quan lộ trình</h3>
            </div>
            <PathRoadmap path={path} />
          </div>

          {/* Sprint cards */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-[#003527]">Kế hoạch chi tiết</h3>
              <span className="rounded-full bg-[#b2f746]/30 px-3 py-1 text-xs font-black text-[#446900]">
                {path.sprints.length} tuần
              </span>
            </div>

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
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleSprints((v) => v + 3)}
                  className="rounded-full border border-[#95d3ba] bg-white px-8 py-3 text-sm font-bold text-[#003527] shadow-sm transition hover:bg-[#e4fbef]"
                >
                  Xem thêm ({path.sprints.length - visibleSprints} tuần còn lại)
                </button>
              </div>
            )}
          </div>

          {/* How path was built */}
          <div className="rounded-[3rem] bg-white p-8 shadow-2xl shadow-[#002117]/5">
            <div className="mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#064e3b]">info</span>
              <h3 className="text-lg font-extrabold text-[#003527]">Cách lộ trình được tạo</h3>
            </div>
            <ul className="space-y-3">
              {[
                'Mỗi chủ đề bắt đầu bằng đọc lý thuyết + xem ví dụ mẫu có lời giải.',
                'Sau đó luyện tập với câu hỏi ở các mức N → H → V theo thứ tự từ dễ đến khó.',
                'Cứ 3 ngày học → 1 ngày ôn (3 câu/chủ đề), mỗi ngày tối đa 2 chủ đề mới.',
                'Ưu tiên = gap × 0.40 + urgency × 0.25 + tự nhận yếu × 0.20 + mật độ đề thi × 0.15.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#b2f746]/30">
                    <span className="material-symbols-outlined text-[14px] text-[#446900]">check</span>
                  </span>
                  <span className="text-sm font-medium text-[#404944]">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="rounded-full bg-[#064e3b] px-7 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5"
            >
              ← Xem hồ sơ năng lực
            </button>
            <button
              type="button"
              onClick={() => {
                clearLearningPath()
                navigate('/profile')
              }}
              className="rounded-full border border-[#95d3ba] bg-white/95 px-5 py-3 text-sm font-bold text-[#003527] shadow-sm transition hover:bg-[#e4fbef]"
            >
              🔄 Tạo lại lộ trình
            </button>
          </div>

          <PathDebugPanel path={path} />

          <footer className="flex justify-center pt-4 pb-8 opacity-45">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#80bea6]">energy_program_saving</span>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#003527]">
                Nurturing Human Potential
              </span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

// ─── Sidebar (same as HomePage) ───────────────────────────────────────────────

const SIDEBAR_ITEMS = [
  { key: 'forest', icon: 'forest', label: 'My Forest', path: '/' },
  { key: 'growth-path', icon: 'auto_graph', label: 'Growth Path', path: '/learning-path' },
  { key: 'calendar', icon: 'calendar_month', label: 'Study Calendar', path: '/' },
  { key: 'community', icon: 'group', label: 'Community', path: '/community' },
  { key: 'profile', icon: 'psychology', label: 'Competency Profile', path: '/profile' },
]

function AppSidebar({
  activeItem,
  onNavigate,
}: {
  activeItem: string
  onNavigate: (path: string) => void
}) {
  return (
    <aside className="fixed top-0 left-0 z-40 hidden h-screen w-72 flex-col rounded-r-[3rem] bg-emerald-50/95 p-6 shadow-2xl shadow-emerald-900/10 lg:flex">
      <button
        type="button"
        onClick={() => onNavigate('/')}
        className="mb-10 flex items-center gap-3 px-2 text-left"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#064e3b]">
          <span className="material-symbols-outlined fill-icon text-[#b2f746]">eco</span>
        </div>
        <div>
          <h1 className="text-lg font-black tracking-[0] text-emerald-950">Emerald Zenith</h1>
          <p className="text-xs font-medium text-emerald-800/60">Explorer</p>
        </div>
      </button>

      <nav className="flex-1 space-y-2">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.path)}
            className={cn(
              'flex w-full items-center gap-4 rounded-full px-5 py-3.5 text-left transition',
              item.key === activeItem
                ? 'translate-x-1 bg-emerald-400/20 font-bold text-emerald-900'
                : 'text-emerald-800/60 hover:bg-emerald-400/10',
            )}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6" />
    </aside>
  )
}

// ─── Summary stat card ────────────────────────────────────────────────────────

function SummaryStatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex flex-col rounded-[2.5rem] bg-white p-5 shadow-2xl shadow-[#002117]/5">
      <span className="material-symbols-outlined mb-2 text-[#064e3b]">{icon}</span>
      <p className="text-xs font-bold uppercase tracking-wide text-[#404944]/60">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-[#003527]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#404944]">{sub}</p>}
    </div>
  )
}

// ─── Progress card (live from learner state) ──────────────────────────────────

function PathProgressCard({ path }: { path: import('../types/learningPath').LearningPath }) {
  const learner = loadLearnerState()
  const completedSet = new Set<string>(learner.completedActivities ?? [])

  let total = 0
  let done = 0
  for (const sprint of path.sprints) {
    for (const day of sprint.days) {
      for (const act of day.activities) {
        total++
        if (completedSet.has(act.activityId)) done++
      }
    }
  }
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="flex flex-col rounded-[2.5rem] bg-[#064e3b] p-5 shadow-2xl shadow-[#002117]/5">
      <span className="material-symbols-outlined mb-2 text-[#b2f746]">trending_up</span>
      <p className="text-xs font-bold uppercase tracking-wide text-white/50">Hoàn thành</p>
      <p className="mt-1 text-2xl font-extrabold text-[#b2f746]">{pct}%</p>
      <p className="mt-0.5 text-xs text-white/50">{done}/{total} hoạt động</p>
    </div>
  )
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
