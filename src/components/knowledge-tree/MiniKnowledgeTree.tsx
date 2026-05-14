import { useMemo } from 'react'
import {
  TREE_STAGES,
  type KnowledgeTreeModel,
  type TreeStage,
} from '../../types/knowledgeTree'
import { layoutTree } from './treeLayout'
import { cn } from '../../lib/cn'

interface MiniKnowledgeTreeProps {
  model: KnowledgeTreeModel
  onClick?: () => void
  className?: string
}

const STAGE_COLOR_BY_ID = Object.fromEntries(
  TREE_STAGES.map((s) => [s.id, s.color]),
) as Record<TreeStage, string>

/**
 * Compact non-interactive tree silhouette for the home dashboard. Uses the
 * same `layoutTree` geometry but renders at a 320×260 viewBox with leaves
 * as small coloured dots and no labels.
 */
export function MiniKnowledgeTree({
  model,
  onClick,
  className,
}: MiniKnowledgeTreeProps) {
  const layout = useMemo(
    () =>
      layoutTree(model, {
        width: 320,
        height: 260,
        reach: 95,
        trunkBaseW: 16,
        trunkTopW: 10,
      }),
    [model],
  )

  const stageList: TreeStage[] = ['mam-non', 'choi-non', 'vuon-than', 'ra-hoa']

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col gap-3 rounded-[2rem] border border-white bg-white/85 p-5 text-left shadow-[0_20px_60px_rgba(0,53,39,0.08)] ring-1 ring-white transition-transform hover:-translate-y-0.5',
        className,
      )}
      aria-label="Mở cây tri thức đầy đủ"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2b6954]">
            Cây tri thức
          </p>
          <p className="text-lg font-extrabold text-[#003527]">
            Lớp {model.grade} · {stagePretty(model.overallStage)}
          </p>
        </div>
        <span className="material-symbols-outlined text-[#2b6954] transition-transform group-hover:translate-x-1">
          arrow_outward
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block h-auto w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="mini-trunk" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6b3b15" />
              <stop offset="100%" stopColor="#2c1808" />
            </linearGradient>
            <radialGradient id="mini-canopy" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="rgba(167,217,165,0.95)" />
              <stop offset="100%" stopColor="rgba(74,138,92,0)" />
            </radialGradient>
          </defs>
          {/* Ground */}
          <ellipse
            cx={layout.trunk.cx}
            cy={layout.ground.y + 2}
            rx={layout.width * 0.28}
            ry={6}
            fill="rgba(0,53,39,0.14)"
          />
          {/* Trunk — tapered path */}
          <path d={miniTrunkPath(layout.trunk)} fill="url(#mini-trunk)" />
          {/* Branches */}
          {layout.branches.map((b) => (
            <path
              key={`mb-${b.branch.chapterTitle}`}
              d={b.path}
              fill="none"
              stroke="#4d7a4d"
              strokeWidth={Math.max(1.2, b.thickness * 0.45)}
              strokeLinecap="round"
              opacity={0.9}
            />
          ))}
          {/* Canopy backdrops */}
          {layout.branches.map((b) => (
            <ellipse
              key={`mc-${b.branch.chapterTitle}`}
              cx={b.canopyX}
              cy={b.canopyY}
              rx={b.canopyR * 0.95}
              ry={b.canopyR * 0.7}
              fill="url(#mini-canopy)"
            />
          ))}
          {/* Leaves */}
          {layout.branches.flatMap((b) =>
            b.leaves.map((leaf) => (
              <circle
                key={leaf.topic.topicId}
                cx={leaf.cx}
                cy={leaf.cy}
                r={2.6}
                fill={STAGE_COLOR_BY_ID[leaf.topic.stage]}
                opacity={leaf.topic.tested ? 1 : 0.55}
              />
            )),
          )}
        </svg>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {stageList.map((id) => {
          const meta = TREE_STAGES.find((s) => s.id === id)!
          const count = model.stageCounts[id]
          return (
            <span
              key={id}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                meta.accent,
              )}
            >
              <span aria-hidden>{meta.icon}</span>
              <span className="tabular-nums">{count}</span>
            </span>
          )
        })}
      </div>
    </button>
  )
}

function miniTrunkPath(t: {
  cx: number
  topY: number
  baseY: number
  baseW: number
  topW: number
}): string {
  const baseHalf = t.baseW / 2
  const topHalf = t.topW / 2
  const midY = (t.topY + t.baseY) / 2
  return (
    `M ${t.cx - baseHalf} ${t.baseY} ` +
    `C ${t.cx - baseHalf} ${midY + 10}, ${t.cx - topHalf} ${midY - 10}, ${t.cx - topHalf} ${t.topY} ` +
    `L ${t.cx + topHalf} ${t.topY} ` +
    `C ${t.cx + topHalf} ${midY - 10}, ${t.cx + baseHalf} ${midY + 10}, ${t.cx + baseHalf} ${t.baseY} ` +
    `Z`
  )
}

function stagePretty(stage: TreeStage): string {
  return TREE_STAGES.find((s) => s.id === stage)?.label ?? ''
}
