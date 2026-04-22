import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { KnowledgeProfile } from '../../types/profile'
import { MASTERY_BANDS } from '../../types/profile'
import type { Goal } from '../../types/user'
import { cn } from '../../lib/cn'

const GOAL_SHORT: Record<Goal, string> = {
  'giua-ky': 'Giữa kỳ',
  'cuoi-ky': 'Cuối kỳ',
  'thpt-qg': 'THPT QG',
  'nang-cao': 'Nâng cao',
}

const NAV_ITEMS = [
  { id: 'profile-overview', icon: 'bar_chart', label: 'Tổng quan' },
  { id: 'profile-gaps', icon: 'target', label: 'Điểm yếu' },
  { id: 'profile-chapters', icon: 'menu_book', label: 'Chi tiết chủ đề' },
  { id: 'profile-signals', icon: 'bolt', label: 'Tín hiệu lỗi' },
]

const NAV_IDS = NAV_ITEMS.map((n) => n.id)

function useActiveSection(): string {
  const [active, setActive] = useState(NAV_IDS[0])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-10% 0px -60% 0px' },
    )
    NAV_IDS.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return active
}

interface ProfileSidebarProps {
  knowledge: KnowledgeProfile
  goal: Goal
  onGeneratePath: () => void
  pathExists: boolean
}

export function ProfileSidebar({ knowledge, goal, onGeneratePath, pathExists }: ProfileSidebarProps) {
  const navigate = useNavigate()
  const avgMastery =
    knowledge.topics.reduce((sum, t) => sum + t.mastery, 0) /
    Math.max(1, knowledge.topics.length)

  const progressPct = Math.min(100, (avgMastery / knowledge.target) * 100)

  const bandMeta =
    MASTERY_BANDS.find((b) => avgMastery >= b.min && avgMastery < b.max) ??
    MASTERY_BANDS[MASTERY_BANDS.length - 1]

  const activeId = useActiveSection()

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <aside className="fixed top-0 left-0 z-40 hidden h-screen w-72 flex-col rounded-r-[3rem] bg-emerald-50/95 p-6 shadow-2xl shadow-emerald-900/10 lg:flex">
      {/* Logo — same as homepage */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mb-6 flex items-center gap-3 px-2 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#064e3b]">
          <span className="material-symbols-outlined fill-icon text-[#b2f746]">eco</span>
        </div>
        <div>
          <h1 className="text-lg font-black tracking-[0] text-emerald-950">Emerald Zenith</h1>
          <p className="text-xs font-medium text-emerald-800/60">
            Level {knowledge.grade} Explorer
          </p>
        </div>
      </button>

      {/* Theta card — compact dark card */}
      <div className="mb-4 rounded-2xl bg-[#064e3b] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
              Chỉ số năng lực θ
            </div>
            <div className="text-3xl font-black leading-tight text-[#b2f746]">
              {knowledge.theta.toFixed(2)}
            </div>
            <div className="text-[10px] text-white/55">
              SE ±{knowledge.standardError.toFixed(2)} · {bandMeta.label}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-white/50">Mục tiêu</div>
            <div className="text-lg font-black text-[#b2f746]">
              {(knowledge.target * 100).toFixed(0)}%
            </div>
            <div className="text-[9px] text-white/40">
              {GOAL_SHORT[goal]}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#b2f746] to-[#86efac] transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] font-bold">
            <span className="text-white/50">Hiện tại</span>
            <span className="text-[#b2f746]/70">{progressPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Nav — same pill style as homepage */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollTo(item.id)}
            className={cn(
              'flex w-full items-center gap-4 rounded-full px-5 py-3.5 text-left transition',
              activeId === item.id
                ? 'translate-x-1 bg-emerald-400/20 font-bold text-emerald-900'
                : 'text-emerald-800/60 hover:bg-emerald-400/10',
            )}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}

        {/* Learning path nav item */}
        <button
          type="button"
          onClick={() => navigate('/learning-path')}
          className={cn(
            'flex w-full items-center gap-4 rounded-full px-5 py-3.5 text-left transition',
            'text-emerald-800/60 hover:bg-emerald-400/10',
          )}
        >
          <span className="material-symbols-outlined text-[20px]">auto_graph</span>
          <span className="text-sm font-medium">Lộ trình học</span>
        </button>
      </nav>

      {/* CTA */}
      <div className="mt-auto pt-4">
        {pathExists ? (
          <button
            type="button"
            onClick={() => navigate('/learning-path')}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#064e3b] py-3.5 text-sm font-black text-[#b2f746] shadow-lg transition hover:scale-[1.02] active:scale-100"
          >
            <span className="material-symbols-outlined text-[18px]">auto_graph</span>
            Xem lộ trình học tập
          </button>
        ) : (
          <button
            type="button"
            onClick={onGeneratePath}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#b2f746] py-3.5 text-sm font-black text-[#003527] shadow-lg shadow-[#b2f746]/30 transition hover:scale-[1.02] active:scale-100"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            Tạo lộ trình học tập
          </button>
        )}
      </div>
    </aside>
  )
}
