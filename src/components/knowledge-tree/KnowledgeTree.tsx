import { useMemo, useState } from 'react'
import {
  TREE_STAGES,
  type KnowledgeTreeModel,
  type TopicTreeNode,
  type TreeStage,
} from '../../types/knowledgeTree'
import { layoutTree, type BranchLayout, type LeafLayout } from './treeLayout'
import { cn } from '../../lib/cn'

interface KnowledgeTreeProps {
  model: KnowledgeTreeModel
  onSelectTopic: (topicId: string) => void
  selectedTopicId?: string | null
  /** Subtle entrance animation on mount. */
  animate?: boolean
}

const STAGE_COLOR_BY_ID = Object.fromEntries(
  TREE_STAGES.map((s) => [s.id, s.color]),
) as Record<TreeStage, string>

const STAGE_DARK_BY_ID: Record<TreeStage, string> = {
  'mam-non': '#be123c',
  'choi-non': '#b45309',
  'vuon-than': '#0f766e',
  'ra-hoa': '#047857',
}

/**
 * Full canvas knowledge tree — tapered trunk, branches with canopy clusters,
 * and topic leaves laid out as a sunflower spiral inside each canopy.
 *
 * Interaction:
 *   - Hover state is held in React (not CSS) so the visual feedback is a
 *     halo ring + stroke change rather than a `transform: scale()` (which
 *     causes subpixel jitter on SVG groups in some browsers).
 *   - Click bubbles `onSelectTopic` up to the parent.
 */
export function KnowledgeTree({
  model,
  onSelectTopic,
  selectedTopicId,
  animate,
}: KnowledgeTreeProps) {
  const layout = useMemo(() => layoutTree(model), [model])
  const [hoverId, setHoverId] = useState<string | null>(null)

  if (model.branches.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/40 px-6 text-center text-sm font-medium text-emerald-900/70">
        Chưa có dữ liệu để dựng cây tri thức. Hãy hoàn thành bài chẩn đoán để
        gieo hạt giống.
      </div>
    )
  }

  const trunkPath = trunkPathFor(layout.trunk)

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className={cn(
          'block h-auto w-full select-none',
          animate && 'tree-canvas-enter',
        )}
        role="img"
        aria-label={`Cây tri thức lớp ${model.grade}`}
      >
        <defs>
          <linearGradient id="kt-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6b3b15" />
            <stop offset="45%" stopColor="#4a2a10" />
            <stop offset="100%" stopColor="#2c1808" />
          </linearGradient>
          <linearGradient id="kt-branch" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5a3414" />
            <stop offset="100%" stopColor="#2f6b48" />
          </linearGradient>
          <radialGradient id="kt-canopy" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="rgba(167,217,165,0.85)" />
            <stop offset="55%" stopColor="rgba(120,180,135,0.55)" />
            <stop offset="100%" stopColor="rgba(74,138,92,0)" />
          </radialGradient>
          <radialGradient id="kt-ground">
            <stop offset="0%" stopColor="rgba(0,53,39,0.22)" />
            <stop offset="100%" stopColor="rgba(0,53,39,0)" />
          </radialGradient>
          <radialGradient id="kt-bg" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="rgba(178,247,70,0.10)" />
            <stop offset="80%" stopColor="rgba(178,247,70,0)" />
          </radialGradient>
        </defs>

        {/* Soft canvas backdrop */}
        <rect
          x={0}
          y={0}
          width={layout.width}
          height={layout.height}
          fill="url(#kt-bg)"
        />

        {/* Ground shadow */}
        <ellipse
          cx={layout.trunk.cx}
          cy={layout.ground.y + 4}
          rx={layout.width * 0.28}
          ry={14}
          fill="url(#kt-ground)"
        />

        {/* Trunk — tapered path so it widens at the base. */}
        <path d={trunkPath} fill="url(#kt-trunk)" />
        {/* Trunk inner highlight */}
        <path
          d={trunkPathFor(layout.trunk, 0.3)}
          fill="rgba(255,255,255,0.06)"
        />

        {/* Branches — draw all paths first so canopies cover their roots */}
        {layout.branches.map((b) => (
          <path
            key={`br-${b.branch.chapterTitle}`}
            d={b.path}
            fill="none"
            stroke="url(#kt-branch)"
            strokeWidth={b.thickness}
            strokeLinecap="round"
            opacity={0.95}
          />
        ))}

        {/* Canopy backdrops — overlapping ellipse "clouds" suggest foliage */}
        {layout.branches.map((b) => (
          <CanopyBackdrop key={`cn-${b.branch.chapterTitle}`} branch={b} />
        ))}

        {/* Leaves on top of canopies */}
        {layout.branches.flatMap((b) =>
          b.leaves.map((leaf) => (
            <Leaf
              key={leaf.topic.topicId}
              leaf={leaf}
              selected={selectedTopicId === leaf.topic.topicId}
              hovered={hoverId === leaf.topic.topicId}
              onHover={(on) => setHoverId(on ? leaf.topic.topicId : null)}
              onClick={() => onSelectTopic(leaf.topic.topicId)}
            />
          )),
        )}

        {/* Chapter labels — rendered last so they sit on top */}
        {layout.branches.map((b) => (
          <ChapterLabel key={`lb-${b.branch.chapterTitle}`} branch={b} />
        ))}
      </svg>

      {/* Hover preview tooltip — fixed position outside SVG so it renders crisply */}
      {hoverId && (
        <HoverPreview model={model} topicId={hoverId} />
      )}

      <style>{`
        .tree-canvas-enter {
          animation: treeCanvasIn 600ms ease-out both;
        }
        @keyframes treeCanvasIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Trunk path — tapered, base wider than top
// ---------------------------------------------------------------------------

function trunkPathFor(
  trunk: { cx: number; topY: number; baseY: number; baseW: number; topW: number },
  shrink = 0,
): string {
  const { cx, topY, baseY } = trunk
  const baseHalf = trunk.baseW / 2 - shrink * (trunk.baseW / 2)
  const topHalf = trunk.topW / 2 - shrink * (trunk.topW / 2)
  const midY = (topY + baseY) / 2
  return (
    `M ${cx - baseHalf} ${baseY} ` +
    `C ${cx - baseHalf} ${midY + 20}, ${cx - topHalf} ${midY - 20}, ${cx - topHalf} ${topY} ` +
    `L ${cx + topHalf} ${topY} ` +
    `C ${cx + topHalf} ${midY - 20}, ${cx + baseHalf} ${midY + 20}, ${cx + baseHalf} ${baseY} ` +
    `Z`
  )
}

// ---------------------------------------------------------------------------
// Canopy backdrop — soft overlapping ellipses behind the leaf cluster
// ---------------------------------------------------------------------------

function CanopyBackdrop({ branch }: { branch: BranchLayout }) {
  const { canopyX, canopyY, canopyR } = branch
  return (
    <g aria-hidden>
      <ellipse
        cx={canopyX - canopyR * 0.25}
        cy={canopyY + canopyR * 0.1}
        rx={canopyR * 0.95}
        ry={canopyR * 0.75}
        fill="url(#kt-canopy)"
      />
      <ellipse
        cx={canopyX + canopyR * 0.2}
        cy={canopyY - canopyR * 0.05}
        rx={canopyR * 0.85}
        ry={canopyR * 0.7}
        fill="url(#kt-canopy)"
      />
      <ellipse
        cx={canopyX}
        cy={canopyY + canopyR * 0.25}
        rx={canopyR * 0.6}
        ry={canopyR * 0.45}
        fill="url(#kt-canopy)"
      />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Chapter label — pill that sits outside the canopy
// ---------------------------------------------------------------------------

function ChapterLabel({ branch }: { branch: BranchLayout }) {
  const label = shortLabel(branch.branch.chapterTitle, 22)
  const w = label.length * 5.6 + 16
  const h = 18
  const x = branch.labelX
  const y = branch.labelY
  let rectX = x - w / 2
  if (branch.labelAnchor === 'start') rectX = x
  else if (branch.labelAnchor === 'end') rectX = x - w
  const textX =
    branch.labelAnchor === 'start'
      ? x + 8
      : branch.labelAnchor === 'end'
        ? x - 8
        : x
  return (
    <g aria-hidden>
      <rect
        x={rectX}
        y={y - h / 2}
        width={w}
        height={h}
        rx={h / 2}
        fill="white"
        stroke="rgba(11,81,61,0.18)"
        strokeWidth={1}
      />
      <text
        x={textX}
        y={y + 3.4}
        textAnchor={branch.labelAnchor}
        className="fill-[#003527] font-extrabold uppercase"
        style={{ fontSize: 9, letterSpacing: '0.06em' }}
      >
        {label}
      </text>
    </g>
  )
}

// ---------------------------------------------------------------------------
// Leaf — colored disc, decoration per stage. NO CSS transform → no jitter.
// ---------------------------------------------------------------------------

function Leaf({
  leaf,
  selected,
  hovered,
  onHover,
  onClick,
}: {
  leaf: LeafLayout
  selected: boolean
  hovered: boolean
  onHover: (on: boolean) => void
  onClick: () => void
}) {
  const { topic, cx, cy } = leaf
  const fill = STAGE_COLOR_BY_ID[topic.stage]
  const stroke = STAGE_DARK_BY_ID[topic.stage]
  const opacity = topic.tested ? 1 : 0.55

  // Slightly different radius per stage so the canopy has visual rhythm —
  // but never via CSS transform, so positions stay rock-stable.
  const baseR = topic.stage === 'mam-non' ? 6.5 : topic.stage === 'choi-non' ? 7.5 : 8.5
  const r = selected || hovered ? baseR + 1.2 : baseR

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{ cursor: 'pointer' }}
    >
      <title>
        {`${topic.title} · ${stageLabel(topic.stage)} · ${(topic.mastery * 100).toFixed(0)}%`}
      </title>

      {/* Halo for hovered / selected — uses radius change, not transform */}
      {(selected || hovered) && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 4}
          fill="none"
          stroke={selected ? '#003527' : stroke}
          strokeWidth={selected ? 1.6 : 1.2}
          opacity={selected ? 0.65 : 0.45}
          strokeDasharray={selected ? undefined : '3 2'}
        />
      )}

      {/* Leaf body */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        opacity={opacity}
        stroke={stroke}
        strokeWidth={0.6}
      />

      {/* Stage decoration */}
      {topic.stage === 'mam-non' && (
        <circle cx={cx} cy={cy} r={r - 2.5} fill="none" stroke={stroke} strokeWidth={1.1} strokeDasharray="2 2" />
      )}
      {topic.stage === 'choi-non' && (
        <circle cx={cx - 1.5} cy={cy - 1.5} r={1.6} fill="rgba(255,255,255,0.65)" />
      )}
      {topic.stage === 'vuon-than' && (
        <path
          d={`M ${cx} ${cy - r + 1.5} L ${cx} ${cy + r - 1.5}`}
          stroke="rgba(0,0,0,0.22)"
          strokeWidth={0.8}
        />
      )}
      {topic.stage === 'ra-hoa' && (
        <>
          <circle cx={cx} cy={cy - 0.5} r={r - 4} fill="#fce7f3" />
          <circle cx={cx} cy={cy - 0.5} r={1.6} fill="#fbbf24" />
        </>
      )}

      {/* Untested marker — dashed ring around the leaf */}
      {!topic.tested && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 2}
          fill="none"
          stroke={stroke}
          strokeWidth={0.6}
          strokeDasharray="2 2"
          opacity={0.5}
        />
      )}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Hover preview — small floating chip with the topic title
// ---------------------------------------------------------------------------

function HoverPreview({
  model,
  topicId,
}: {
  model: KnowledgeTreeModel
  topicId: string
}) {
  let node: TopicTreeNode | null = null
  for (const b of model.branches) {
    const f = b.topics.find((t) => t.topicId === topicId)
    if (f) {
      node = f
      break
    }
  }
  if (!node) return null
  const stage = TREE_STAGES.find((s) => s.id === node.stage) ?? TREE_STAGES[0]
  return (
    <div className="pointer-events-none absolute left-4 top-4 max-w-[260px] rounded-2xl border border-white bg-white/95 px-4 py-2.5 shadow-[0_18px_45px_rgba(0,53,39,0.16)]">
      <p
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
          stage.accent,
        )}
      >
        <span aria-hidden>{stage.icon}</span>
        {stage.label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-[#003527]">{node.title}</p>
      <p className="text-[11px] font-medium text-[#446900]">
        {node.chapterTitle} · Mastery {(node.mastery * 100).toFixed(0)}%
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stageLabel(stage: TreeStage): string {
  return TREE_STAGES.find((s) => s.id === stage)?.label ?? ''
}

function shortLabel(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}
