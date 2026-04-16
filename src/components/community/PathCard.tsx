import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
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
    <Card className="!p-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
          {path.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{path.display_name}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {GRADE_LABELS[path.grade]}
            </span>
            {isOwn && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                Của tôi
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {goalLabel} · {path.daily_minutes} phút/ngày · {timeAgo}
          </div>
        </div>
      </div>

      {/* Motivation */}
      {path.motivation && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-700">
          "{path.motivation}"
        </p>
      )}

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill label={`${path.total_topics} chủ đề`} />
        <Pill label={`${path.total_days} ngày`} />
        <ProgressPill pct={path.completion_pct} />
        {path.current_streak > 0 && (
          <Pill label={`🔥 ${path.current_streak} ngày`} tone="orange" />
        )}
        <Pill label={`⭐ Lv${path.level}`} tone="brand" />
        <Pill label={`${path.total_questions} câu`} />
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {badges.slice(0, 5).map((b) => (
            <span
              key={b!.id}
              className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800"
              title={b!.description}
            >
              {b!.icon} {b!.label}
            </span>
          ))}
        </div>
      )}

      {/* Study tools */}
      {path.study_tools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {path.study_tools.map((tool) => (
            <span
              key={tool}
              className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700"
            >
              {tool}
            </span>
          ))}
        </div>
      )}

      {/* Sprint summary (expandable) */}
      {path.sprint_summary.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            {expanded ? '▾ Ẩn lộ trình' : `▸ Xem lộ trình (${path.sprint_count} tuần)`}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
              {path.sprint_summary.map((sp) => (
                <div key={sp.weekNumber} className="flex items-start gap-2">
                  <span className="shrink-0 font-semibold text-slate-600">
                    Tuần {sp.weekNumber}:
                  </span>
                  <span className="text-slate-700">
                    {sp.topicNames.join(', ')}
                    <span className="ml-1 text-slate-400">
                      ({sp.activityCount} hoạt động)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer: inspire + comments toggle */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInspire}
            disabled={inspired}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
              inspired
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700',
            )}
          >
            {inspired ? '✅' : '💪'} {inspireCount} inspire
          </button>
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-sky-50 hover:text-sky-700"
          >
            💬 Bình luận
          </button>
        </div>
        {path.completion_velocity > 0 && (
          <span className="text-xs text-slate-500">
            {path.completion_velocity.toFixed(1)} HĐ/tuần
          </span>
        )}
      </div>

      {/* Comments */}
      {showComments && <CommentSection pathId={path.id} />}
    </Card>
  )
}

function Pill({ label, tone }: { label: string; tone?: 'orange' | 'brand' }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
        tone === 'orange' && 'border-orange-200 bg-orange-50 text-orange-700',
        tone === 'brand' && 'border-brand-200 bg-brand-50 text-brand-700',
        !tone && 'border-slate-200 bg-white text-slate-600',
      )}
    >
      {label}
    </span>
  )
}

function ProgressPill({ pct }: { pct: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
      <span className="h-1.5 w-8 overflow-hidden rounded-full bg-slate-200">
        <span
          className="block h-full rounded-full bg-brand-500"
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
