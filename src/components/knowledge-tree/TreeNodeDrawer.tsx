import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TREE_STAGES, type TopicTreeNode } from '../../types/knowledgeTree'
import type { Narrative } from '../../types/graphRag'
import { NarrativeCard } from '../graph-rag/NarrativeCard'
import { cn } from '../../lib/cn'

interface TreeNodeDrawerProps {
  node: TopicTreeNode
  onClose: () => void
  /** Optional GraphRAG narrative for this topic. */
  narrative?: Narrative | null
  /** Navigate to graph explorer focused on this topic. */
  onExploreGraph?: () => void
}

/**
 * Slide-in side panel triggered by clicking a leaf. Surfaces the topic's
 * stage, mastery, weakest level, and a primary CTA "Học lý thuyết" that
 * routes to /theory?topic={id}. Other actions (practice, SRS, remedial)
 * are deferred to a later phase per the plan.
 */
export function TreeNodeDrawer({
  node,
  onClose,
  narrative,
  onExploreGraph,
}: TreeNodeDrawerProps) {
  const navigate = useNavigate()
  const stageMeta =
    TREE_STAGES.find((s) => s.id === node.stage) ?? TREE_STAGES[0]

  // Close on Escape — UX consistency with other modals.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const masteryPct = Math.round(node.mastery * 100)
  const stabilityPct = Math.round(node.stability * 100)
  const fragilityPct = Math.round(node.fragility * 100)

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      {/* Backdrop — click to close */}
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="flex-1 bg-[#002117]/35 backdrop-blur-sm"
      />

      {/* Panel */}
      <aside
        className="flex h-full w-full max-w-md flex-col gap-6 overflow-y-auto border-l border-emerald-100 bg-white px-7 py-8 shadow-[0_30px_80px_rgba(0,53,39,0.18)]"
        style={{ animation: 'drawerSlideIn 280ms ease-out both' }}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                stageMeta.accent,
              )}
            >
              <span aria-hidden>{stageMeta.icon}</span>
              {stageMeta.label}
            </span>
            <h3 className="text-2xl font-extrabold text-[#003527]">
              {node.title}
            </h3>
            <p className="text-sm font-medium text-[#404944]">
              {node.chapterTitle} · Lớp {node.grade}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#2b6954] transition hover:bg-emerald-50"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <p className="text-sm leading-relaxed text-[#404944]">
          {stageMeta.description}
        </p>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Mastery"
            value={`${masteryPct}%`}
            hint={node.tested ? `${node.attempts} câu đã làm` : 'Ước lượng từ θ'}
          />
          <StatTile
            label="Độ ổn định"
            value={`${stabilityPct}%`}
            hint={`Mong manh ${fragilityPct}%`}
          />
          <StatTile
            label="Chuỗi đúng (SRS)"
            value={`${node.consecutiveCorrect}`}
            hint={node.consecutiveCorrect >= 5 ? 'Đủ mức ổn định' : 'Cần ôn tiếp'}
          />
          <StatTile
            label="Lỗi chưa giải"
            value={`${node.unresolvedErrors}`}
            hint={
              node.recentErrorDays === null
                ? 'Chưa có lỗi nào'
                : `Gần nhất ${formatDays(node.recentErrorDays)}`
            }
          />
        </div>

        {node.weakestLevel && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="font-bold text-amber-900">
              Mức cần ưu tiên: {levelLabel(node.weakestLevel)}
            </p>
            <p className="mt-1 text-amber-800">
              Hệ thống gợi ý đọc lại lý thuyết, đặc biệt phần
              <span className="font-semibold"> {levelLabel(node.weakestLevel)}</span>,
              trước khi luyện tập.
            </p>
          </div>
        )}

        {/* GraphRAG narrative */}
        {narrative && (
          <NarrativeCard narrative={narrative} compact />
        )}

        {onExploreGraph && (
          <button
            type="button"
            onClick={onExploreGraph}
            className="flex items-center justify-center gap-2 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              hub
            </span>
            Mở GraphRAG Explorer cho chủ đề này
          </button>
        )}

        {/* Primary CTA */}
        <div className="mt-auto space-y-3 pt-4">
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate(`/theory?topic=${encodeURIComponent(node.topicId)}`)
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#b2f746] px-6 py-3 font-black text-[#496f00] shadow-[0_18px_45px_rgba(178,247,70,0.35)] transition hover:shadow-[0_0_25px_rgba(178,247,70,0.55)]"
          >
            <span className="material-symbols-outlined text-base">menu_book</span>
            Học lý thuyết
          </button>
          <p className="text-center text-[11px] font-medium text-[#80bea6]">
            Luyện tập, ôn tập và tỉa cành sẽ mở ở phiên bản kế tiếp.
          </p>
        </div>
      </aside>

      <style>{`
        @keyframes drawerSlideIn {
          from { transform: translateX(24px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2b6954]">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold tabular-nums text-[#003527]">
        {value}
      </p>
      <p className="text-[11px] font-medium text-[#446900]">{hint}</p>
    </div>
  )
}

function levelLabel(lv: 'N' | 'H' | 'V' | 'T'): string {
  switch (lv) {
    case 'N':
      return 'Nhận biết'
    case 'H':
      return 'Thông hiểu'
    case 'V':
      return 'Vận dụng'
    case 'T':
      return 'Vận dụng cao'
  }
}

function formatDays(days: number): string {
  if (days < 1) return 'hôm nay'
  if (days < 2) return 'hôm qua'
  if (days < 30) return `${Math.round(days)} ngày trước`
  return `${Math.round(days / 30)} tháng trước`
}
