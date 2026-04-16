import { useMemo, useState } from 'react'
import { LatexRenderer } from '../diagnostic/LatexRenderer'
import { QUESTION_BANK } from '../../lib/questionBank'
import type { TheoryBlock, TopicTheory } from '../../types/question'
import { cn } from '../../lib/cn'

interface TheorySidebarProps {
  topicId: string
}

const BLOCK_STYLES: Record<
  TheoryBlock['type'],
  { icon: string; label: string; color: string }
> = {
  section: { icon: '📑', label: 'Mục', color: 'border-slate-200 bg-slate-50' },
  dn: { icon: '📐', label: 'Định nghĩa', color: 'border-emerald-200 bg-emerald-50' },
  chuy: { icon: '⚠️', label: 'Chú ý', color: 'border-amber-200 bg-amber-50' },
  nx: { icon: '💡', label: 'Nhận xét', color: 'border-sky-200 bg-sky-50' },
  dang: { icon: '🎯', label: 'Dạng toán', color: 'border-violet-200 bg-violet-50' },
  vd: { icon: '📝', label: 'Ví dụ mẫu', color: 'border-brand-200 bg-brand-50' },
}

/**
 * Compact theory reference shown alongside practice questions.
 *
 * Redesigned from a scrollable sidebar to **clickable card list + modal**.
 * Each theory block is a small card with icon + title. Clicking opens a
 * full-screen modal overlay where the content renders at full width —
 * no more overflow/crowding issues.
 */
export function TheorySidebar({ topicId }: TheorySidebarProps) {
  const [open, setOpen] = useState(true)
  const [activeBlock, setActiveBlock] = useState<TheoryBlock | null>(null)

  const theory = useMemo<TopicTheory | null>(() => {
    return QUESTION_BANK.theory.find((t) => t.topicId === topicId) ?? null
  }, [topicId])

  if (!theory) return null

  const allBlocks = [...theory.knowledgeBlocks, ...theory.methodBlocks]
  const relevantBlocks = allBlocks.filter(
    (b) =>
      b.type === 'dn' ||
      b.type === 'chuy' ||
      b.type === 'nx' ||
      b.type === 'dang' ||
      b.type === 'vd',
  )

  if (relevantBlocks.length === 0) return null

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
        >
          <span className="text-sm font-semibold text-slate-800">
            📖 Lý thuyết tham khảo
          </span>
          <span className="text-xs text-slate-400">{open ? '▾' : '▸'}</span>
        </button>

        {open && (
          <div className="space-y-1.5 border-t border-slate-100 px-3 py-3">
            {relevantBlocks.map((block, i) => {
              const style = BLOCK_STYLES[block.type]
              const preview =
                block.title ??
                block.content.replace(/<[^>]*>/g, '').slice(0, 50) + '…'

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveBlock(block)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-xs transition',
                    'hover:shadow-sm hover:ring-1 hover:ring-brand-300',
                    style.color,
                  )}
                >
                  <span className="mt-0.5 shrink-0">{style.icon}</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-800">
                      {style.label}
                    </span>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {preview}
                    </p>
                  </div>
                  <span className="mt-1 text-slate-400">→</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal popup for selected theory block */}
      {activeBlock && (
        <TheoryModal
          block={activeBlock}
          onClose={() => setActiveBlock(null)}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function TheoryModal({
  block,
  onClose,
}: {
  block: TheoryBlock
  onClose: () => void
}) {
  const [showSolution, setShowSolution] = useState(false)
  const style = BLOCK_STYLES[block.type]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div
          className={cn(
            'sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4',
            style.color,
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{style.icon}</span>
            <div>
              <span className="font-semibold text-slate-900">
                {style.label}
              </span>
              {block.title && (
                <span className="ml-2 text-sm text-slate-600">
                  {block.title}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <LatexRenderer content={block.content} />

          {block.solution && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setShowSolution((v) => !v)}
                className="text-sm font-medium text-brand-700 hover:text-brand-900"
              >
                {showSolution ? '▾ Ẩn lời giải' : '▸ Xem lời giải mẫu'}
              </button>
              {showSolution && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <LatexRenderer content={block.solution} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-white px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Đã hiểu, quay lại bài tập
          </button>
        </div>
      </div>
    </div>
  )
}
