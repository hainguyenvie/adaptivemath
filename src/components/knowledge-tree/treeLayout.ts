/**
 * SVG layout helper for the Knowledge Tree.
 *
 * Pure function — takes the tree model + canvas dimensions and emits
 * deterministic coordinates for the trunk, each chapter branch, and every
 * leaf (topic). The KnowledgeTree component just renders the output.
 *
 * Layout strategy:
 *   - A single tapered trunk centered horizontally.
 *   - All branches originate near the top of the trunk and fan outward into
 *     the upper hemisphere (no "low-hanging" branches; mimics a real canopy).
 *   - Each branch terminates at a **canopy cluster** — a soft foliage blob
 *     that contains the chapter's topic leaves laid out as a sunflower
 *     spiral so they pack tightly without overlap.
 */

import type {
  ChapterTreeBranch,
  KnowledgeTreeModel,
  TopicTreeNode,
} from '../../types/knowledgeTree'

export interface LeafLayout {
  topic: TopicTreeNode
  cx: number
  cy: number
  /** Cluster center the leaf belongs to. Useful for halo / hover effects. */
  branchEndX: number
  branchEndY: number
}

export interface BranchLayout {
  branch: ChapterTreeBranch
  side: 'left' | 'right'
  /** Where the branch springs out from the trunk. */
  attachX: number
  attachY: number
  /** Canopy cluster center. */
  canopyX: number
  canopyY: number
  /** Canopy bounding radius — leaves sit inside this. */
  canopyR: number
  /** Stroke width — scaled by branch stability. */
  thickness: number
  /** Cubic-bezier path string from trunk anchor → canopy center. */
  path: string
  /** Label anchor — chapter name shown as a pill outside the canopy. */
  labelX: number
  labelY: number
  /** Label horizontal alignment (anchored away from trunk). */
  labelAnchor: 'start' | 'middle' | 'end'
  /** Leaves laid out inside the canopy. */
  leaves: LeafLayout[]
}

export interface TrunkLayout {
  cx: number
  /** Top-of-trunk y. */
  topY: number
  /** Bottom-of-trunk y (ground level). */
  baseY: number
  /** Wide bottom. */
  baseW: number
  /** Narrow top — gives the trunk a tapered look. */
  topW: number
}

export interface TreeLayoutResult {
  width: number
  height: number
  trunk: TrunkLayout
  branches: BranchLayout[]
  ground: { y: number }
}

export interface LayoutOptions {
  width?: number
  height?: number
  /** Base canopy distance from trunk in px. */
  reach?: number
  /** Trunk base width in px. */
  trunkBaseW?: number
  trunkTopW?: number
}

const DEFAULTS = {
  width: 820,
  height: 600,
  reach: 200,
  trunkBaseW: 36,
  trunkTopW: 22,
}

/** Compute deterministic geometry for the entire tree. */
export function layoutTree(
  model: KnowledgeTreeModel,
  opts: LayoutOptions = {},
): TreeLayoutResult {
  const width = opts.width ?? DEFAULTS.width
  const height = opts.height ?? DEFAULTS.height
  const reach = opts.reach ?? DEFAULTS.reach
  const baseW = opts.trunkBaseW ?? DEFAULTS.trunkBaseW
  const topW = opts.trunkTopW ?? DEFAULTS.trunkTopW

  const cx = width / 2
  const baseY = height - 60
  const minTrunk = height * 0.42
  const maxTrunk = height * 0.6
  const trunkHeight = minTrunk + (maxTrunk - minTrunk) * model.trunkStrength
  const topY = baseY - trunkHeight

  const branches = model.branches
  const n = branches.length

  // We arrange branches in the upper hemisphere measured from the trunk top.
  //   angle = 30°   → far right, slightly above horizontal
  //   angle = 90°   → straight up
  //   angle = 150°  → far left
  // Even index → first sweep through the right half, odd → left half.
  // This interleaving keeps the silhouette balanced regardless of N.
  const angleMinDeg = 28
  const angleMaxDeg = 152
  const branchLayouts: BranchLayout[] = branches.map((branch, i) => {
    const tRaw = n > 1 ? i / (n - 1) : 0.5
    const angleDeg = angleMinDeg + tRaw * (angleMaxDeg - angleMinDeg)
    const angle = (angleDeg * Math.PI) / 180
    const sign = angleDeg < 90 ? 1 : -1
    const side: 'left' | 'right' = sign === -1 ? 'left' : 'right'

    // Canopy distance — branches closer to horizontal reach a bit further.
    const horizontality = Math.abs(angleDeg - 90) / 60 // 0..1
    const distance = reach + horizontality * 60

    const canopyR = clamp(
      26 + Math.sqrt(branch.topics.length) * 12,
      30,
      70,
    )

    const canopyX = cx + Math.cos(angle) * distance
    // Slight upward bias — multiply sin component so the canopy mass sits
    // above the trunk attach point.
    const canopyY = topY + 28 - Math.sin(angle) * distance * 0.9

    // Branches attach near the trunk crown — at most ~12% down from the
    // top, spread so adjacent branches don't share the same exit point.
    const attachOffset = horizontality * trunkHeight * 0.18
    const attachY = topY + 6 + attachOffset
    const attachX = cx + sign * (topW / 2 - 1)

    // Smooth S-curve from trunk anchor → canopy centre.
    const ctrl1X = cx + Math.cos(angle) * distance * 0.18
    const ctrl1Y = attachY - 18
    const ctrl2X = cx + Math.cos(angle) * distance * 0.72
    const ctrl2Y = canopyY + canopyR * 0.35
    const path =
      `M ${attachX} ${attachY} ` +
      `C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${canopyX} ${canopyY}`

    const thickness = 4 + 6 * branch.avgStability

    const leaves = layoutLeavesSpiral(
      branch.topics,
      canopyX,
      canopyY,
      canopyR * 0.78,
    )

    // Label sits outside the canopy along the same outward direction so
    // it never overlaps the leaves.
    const labelDX = Math.cos(angle) * (canopyR + 20)
    const labelDY = -Math.sin(angle) * (canopyR + 18) + 6
    const labelX = canopyX + labelDX
    const labelY = canopyY + labelDY
    const labelAnchor: 'start' | 'middle' | 'end' =
      labelDX > 6 ? 'start' : labelDX < -6 ? 'end' : 'middle'

    return {
      branch,
      side,
      attachX,
      attachY,
      canopyX,
      canopyY,
      canopyR,
      thickness,
      path,
      labelX,
      labelY,
      labelAnchor,
      leaves,
    }
  })

  return {
    width,
    height,
    trunk: { cx, topY, baseY, baseW, topW },
    branches: branchLayouts,
    ground: { y: baseY + 6 },
  }
}

/**
 * Sunflower spiral via golden angle — packs N points evenly inside a disk
 * with no clumping. Great for foliage-style clusters at any topic count.
 */
function layoutLeavesSpiral(
  topics: TopicTreeNode[],
  cx: number,
  cy: number,
  radius: number,
): LeafLayout[] {
  const n = topics.length
  if (n === 0) return []
  if (n === 1) {
    return [
      { topic: topics[0], cx, cy, branchEndX: cx, branchEndY: cy },
    ]
  }

  const golden = Math.PI * (3 - Math.sqrt(5))
  return topics.map((topic, i) => {
    const t = (i + 0.5) / n
    const r = radius * Math.sqrt(t)
    const theta = i * golden + Math.PI / 6 // small rotation so cluster isn't horizontal-symmetric
    return {
      topic,
      cx: cx + Math.cos(theta) * r,
      cy: cy + Math.sin(theta) * r,
      branchEndX: cx,
      branchEndY: cy,
    }
  })
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
