import { useMemo } from 'react'
import {
  ENTITY_META,
  RELATION_META,
  type Edge,
  type Entity,
  type SubGraph,
} from '../../types/graphRag'
import { cn } from '../../lib/cn'

interface GraphCanvasProps {
  subgraph: SubGraph
  /** Currently selected node id (highlighted). */
  selectedId?: string | null
  onSelectEntity: (entity: Entity) => void
  className?: string
}

interface PositionedNode {
  entity: Entity
  x: number
  y: number
  r: number
  hops: number
}

/**
 * Radial layout SVG of a retrieved subgraph.
 *
 *   - Focus entity in the center.
 *   - Hits arranged in concentric rings keyed by hop count.
 *   - Edges drawn as cubic-bezier curves between node centers.
 *   - Click a node → onSelectEntity bubbles up.
 *
 * No external graph library; pure SVG so it composes with the existing
 * design system.
 */
export function GraphCanvas({
  subgraph,
  selectedId,
  onSelectEntity,
  className,
}: GraphCanvasProps) {
  const layout = useMemo(() => computeLayout(subgraph), [subgraph])

  if (layout.nodes.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        Chọn một nút để xem ngữ cảnh truy xuất.
      </div>
    )
  }

  return (
    <div className={cn('relative w-full overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-white to-cyan-50/40 p-2', className)}>
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Đồ thị truy xuất GraphRAG"
      >
        <defs>
          <marker
            id="gc-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(15,118,110,0.55)" />
          </marker>
        </defs>

        {/* Edges first (so nodes overlay) */}
        {layout.edges.map((e) => (
          <EdgeLine key={e.edge.id} positioned={e} />
        ))}

        {/* Nodes */}
        {layout.nodes.map((n) => (
          <NodeMark
            key={n.entity.id}
            node={n}
            selected={selectedId === n.entity.id || n.hops === 0}
            onClick={() => onSelectEntity(n.entity)}
          />
        ))}
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Layout — focus at center, hits in rings by hop count
// ---------------------------------------------------------------------------

interface PositionedEdge {
  edge: Edge
  fromX: number
  fromY: number
  toX: number
  toY: number
  curveX: number
  curveY: number
}

interface LayoutResult {
  width: number
  height: number
  nodes: PositionedNode[]
  edges: PositionedEdge[]
}

function computeLayout(subgraph: SubGraph): LayoutResult {
  const width = 760
  const height = 560
  const cx = width / 2
  const cy = height / 2

  const focus = subgraph.focus
  const hitsByHop = new Map<number, Entity[]>()
  for (const h of subgraph.hits) {
    const bucket = hitsByHop.get(h.hops) ?? []
    bucket.push(h.entity)
    hitsByHop.set(h.hops, bucket)
  }

  const positioned: PositionedNode[] = [
    { entity: focus, x: cx, y: cy, r: 28, hops: 0 },
  ]
  const seenIds = new Set<string>([focus.id])

  const hopKeys = [...hitsByHop.keys()].sort((a, b) => a - b)
  for (const hop of hopKeys) {
    const ring = hitsByHop.get(hop) ?? []
    const radius = 80 + hop * 130
    const n = ring.length
    // Stagger so each hop ring rotates a bit; keeps siblings from stacking
    // straight along the same axis.
    const rotationOffset = (hop * Math.PI) / 7
    ring.forEach((entity, i) => {
      const theta = (i / n) * Math.PI * 2 + rotationOffset - Math.PI / 2
      const x = cx + Math.cos(theta) * radius
      const y = cy + Math.sin(theta) * radius * 0.78 // slight squash for landscape canvas
      positioned.push({ entity, x, y, r: hop === 1 ? 20 : 16, hops: hop })
      seenIds.add(entity.id)
    })
  }

  const nodeMap = new Map(positioned.map((p) => [p.entity.id, p]))
  const edges: PositionedEdge[] = []
  for (const edge of subgraph.edges) {
    const a = nodeMap.get(edge.from)
    const b = nodeMap.get(edge.to)
    if (!a || !b) continue
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    // Gentle perpendicular offset so parallel edges don't fully overlap.
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const perpX = -dy / len
    const perpY = dx / len
    const offset = 12
    edges.push({
      edge,
      fromX: a.x,
      fromY: a.y,
      toX: b.x,
      toY: b.y,
      curveX: mx + perpX * offset,
      curveY: my + perpY * offset,
    })
  }

  return { width, height, nodes: positioned, edges }
}

// ---------------------------------------------------------------------------
// Node + Edge renderers
// ---------------------------------------------------------------------------

function NodeMark({
  node,
  selected,
  onClick,
}: {
  node: PositionedNode
  selected: boolean
  onClick: () => void
}) {
  const meta = ENTITY_META[node.entity.type]
  const label = truncate(node.entity.label, 22)
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <title>
        {`${meta.label}: ${node.entity.label}${node.entity.subtitle ? '\n' + node.entity.subtitle : ''}`}
      </title>
      {selected && (
        <circle
          cx={node.x}
          cy={node.y}
          r={node.r + 5}
          fill="none"
          stroke="#003527"
          strokeWidth={2}
          opacity={0.65}
        />
      )}
      <circle
        cx={node.x}
        cy={node.y}
        r={node.r}
        fill={meta.color}
        opacity={node.hops === 0 ? 1 : 0.92}
        stroke="white"
        strokeWidth={2.5}
      />
      {/* Use HTML-foreignobject-style symbol via text */}
      <text
        x={node.x}
        y={node.y + 4}
        textAnchor="middle"
        className="fill-white font-bold"
        style={{ fontSize: node.r * 0.7 }}
      >
        {iconForType(node.entity.type)}
      </text>
      <rect
        x={node.x - 60}
        y={node.y + node.r + 4}
        width={120}
        height={18}
        rx={9}
        fill="white"
        stroke="rgba(0,53,39,0.12)"
        strokeWidth={1}
      />
      <text
        x={node.x}
        y={node.y + node.r + 16}
        textAnchor="middle"
        className="fill-[#003527]"
        style={{ fontSize: 10, fontWeight: 700 }}
      >
        {label}
      </text>
    </g>
  )
}

function EdgeLine({ positioned }: { positioned: PositionedEdge }) {
  const meta = RELATION_META[positioned.edge.type]
  const d = `M ${positioned.fromX} ${positioned.fromY} Q ${positioned.curveX} ${positioned.curveY} ${positioned.toX} ${positioned.toY}`
  return (
    <g>
      <title>{`${meta.label} (w=${positioned.edge.weight.toFixed(2)})`}</title>
      <path
        d={d}
        fill="none"
        stroke="rgba(15,118,110,0.45)"
        strokeWidth={Math.max(1, positioned.edge.weight * 2.2)}
        strokeLinecap="round"
        markerEnd="url(#gc-arrow)"
      />
    </g>
  )
}

function iconForType(t: Entity['type']): string {
  switch (t) {
    case 'student':
      return '🧑'
    case 'peer':
      return '👥'
    case 'topic':
      return '📘'
    case 'chapter':
      return '📚'
    case 'question':
      return '❔'
    case 'session':
      return '🕒'
    case 'error':
      return '❗'
    case 'feedback':
      return '💬'
    case 'teacher':
      return '🎓'
    case 'parent':
      return '👪'
    case 'activity':
      return '⚡'
    case 'skill':
      return '🧠'
    default:
      return '•'
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}
