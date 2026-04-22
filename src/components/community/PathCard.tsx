import { useState, useEffect } from 'react'
import { GOAL_OPTIONS, GRADE_LABELS } from '../../types/user'
import { BADGE_DEFINITIONS } from '../../types/learner'
import { inspirePath, hasInspired } from '../../lib/communityApi'
import { CommentSection } from './CommentSection'
import type { SharedPath } from '../../types/community'
import { cn } from '../../lib/cn'

interface PathCardProps {
  path: SharedPath
  isOwn?: boolean
}

export function PathCard({ path, isOwn }: PathCardProps) {
  const [inspireCount, setInspireCount] = useState(path.inspire_count)
  const [inspired, setInspired] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showComments, setShowComments] = useState(false)

  const goalLabel = GOAL_OPTIONS.find((g) => g.value === path.goal)?.label ?? path.goal

  useEffect(() => {
    hasInspired(path.id).then(setInspired)
  }, [path.id])

  const handleInspire = async () => {
    if (inspired) return
    const result = await inspirePath(path.id)
    setInspireCount(result.count)
    if (!result.alreadyInspired) setInspired(true)
  }

  const timeAgo = formatTimeAgo(path.shared_at)
  const badges = path.badges
    .map((id) => BADGE_DEFINITIONS.find((b) => b.id === id))
    .filter(Boolean)

  return (
    <div className="rounded-[2.5rem] bg-white p-7 shadow-xl shadow-[#002117]/5 ring-1 ring-emerald-100 transition hover:shadow-2xl hover:shadow-[#002117]/8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-3xl">
          {path.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-extrabold text-[#003527]">{path.display_name}</span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              {GRADE_LABELS[path.grade]}
            </span>
            {isOwn && (
              <span className="rounded-full bg-[#b2f746]/40 px-2.5 py-0.5 text-xs font-bold text-[#496f00]">
                Của tôi
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-medium text-[#404944]">
            {goalLabel} · {path.daily_minutes} phút/ngày · {timeAgo}
          </p>
        </div>
      </div>

      {/* Motivation */}
      {path.motivation && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
          <span className="material-symbols-outlined shrink-0 text-base text-emerald-600">format_quote</span>
          <p className="text-sm font-medium italic text-[#003527]">{path.motivation}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="mt-4 flex flex-wrap gap-2">
        <StatPill icon="auto_stories" label={`${path.total_topics} chủ đề`} />
        <StatPill icon="calendar_month" label={`${path.total_days} ngày`} />
        <ProgressPill pct={path.completion_pct} />
        {path.current_streak > 0 && (
          <StatPill icon="local_fire_department" label={`${path.current_streak} ngày`} tone="orange" />
        )}
        <StatPill icon="star" label={`Lv${path.level}`} tone="brand" />
        <StatPill icon="quiz" label={`${path.total_questions} câu`} />
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {badges.slice(0, 5).map((b) => (
            <span
              key={b!.id}
              className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200"
              title={b!.description}
            >
              {b!.icon} {b!.label}
            </span>
          ))}
        </div>
      )}

      {/* Study tools */}
      {path.study_tools.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {path.study_tools.map((tool) => (
            <span
              key={tool}
              className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700 ring-1 ring-sky-200"
            >
              {tool}
            </span>
          ))}
        </div>
      )}

      {/* Sprint summary (expandable) */}
      {path.sprint_summary.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-bold text-[#064e3b] transition hover:text-[#003527]"
          >
            <span className="material-symbols-outlined text-base">
              {expanded ? 'expand_less' : 'expand_more'}
            </span>
            {expanded ? 'Ẩn lộ trình' : `Xem lộ trình (${path.sprint_count} tuần)`}
          </button>
          {expanded && (
            <div className="mt-3 space-y-1.5 rounded-2xl bg-emerald-50/80 p-4 text-sm">
              {path.sprint_summary.map((sp) => (
                <div key={sp.weekNumber} className="flex items-start gap-3">
                  <span className="shrink-0 rounded-full bg-[#064e3b] px-2 py-0.5 text-xs font-black text-[#b2f746]">
                    T{sp.weekNumber}
                  </span>
                  <span className="text-[#003527]">
                    {sp.topicNames.join(', ')}
                    <span className="ml-1 text-[#404944]/60">({sp.activityCount} hoạt động)</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-emerald-100 pt-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInspire}
            disabled={inspired}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition',
              inspired
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-emerald-50 text-[#003527] hover:bg-[#b2f746] hover:text-[#496f00]',
            )}
          >
            <span className="material-symbols-outlined text-base">
              {inspired ? 'thumb_up' : 'thumb_up'}
            </span>
            {inspireCount} inspire
          </button>
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-[#003527] transition hover:bg-emerald-100"
          >
            <span className="material-symbols-outlined text-base">chat_bubble</span>
            Bình luận
          </button>
        </div>
        {path.completion_velocity > 0 && (
          <span className="text-xs font-medium text-[#404944]/60">
            {path.completion_velocity.toFixed(1)} HĐ/tuần
          </span>
        )}
      </div>

      {showComments && <CommentSection pathId={path.id} />}
    </div>
  )
}

function StatPill({ icon, label, tone }: { icon: string; label: string; tone?: 'orange' | 'brand' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold',
        tone === 'orange' && 'border-orange-200 bg-orange-50 text-orange-700',
        tone === 'brand' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        !tone && 'border-slate-200 bg-white text-[#404944]',
      )}
    >
      <span className="material-symbols-outlined text-[11px]">{icon}</span>
      {label}
    </span>
  )
}

function ProgressPill({ pct }: { pct: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold text-[#404944]">
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-200">
        <span
          className="block h-full rounded-full bg-[#064e3b]"
          style={{ width: `${pct}%` }}
        />
      </span>
      {pct}%
    </span>
  )
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}
