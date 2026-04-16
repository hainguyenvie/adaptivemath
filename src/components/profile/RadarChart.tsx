import { useMemo } from 'react'

interface RadarAxis {
  label: string
  value: number // 0..1
}

interface RadarChartProps {
  axes: RadarAxis[]
  /** Target ring value, 0..1. Rendered as a dashed amber polygon. */
  target: number
  /** Viewport side length in px. Default 360. */
  size?: number
  /**
   * When true, the data polygon is drawn with a dashed stroke to signal
   * the estimate isn't trustworthy yet (high SE / few responses).
   */
  isPreliminary?: boolean
}

/**
 * Minimal SVG radar chart — one axis per chapter, a concentric guide grid,
 * the student's mastery polygon, and a dashed target ring overlay. No
 * external chart library.
 *
 * Layout:
 *   - axes start at the top (−π/2) and go clockwise
 *   - 4 guide polygons at fractions 0.25 / 0.5 / 0.75 / 1.0
 *   - labels placed at fraction 1.18 so they sit just outside the outer ring
 *   - `useMemo` caches the point arithmetic so re-renders don't recompute
 *     trig for every vertex
 */
export function RadarChart({
  axes,
  target,
  size = 360,
  isPreliminary = false,
}: RadarChartProps) {
  const N = axes.length
  const cx = size / 2
  const cy = size / 2
  // Inner chart radius is kept small so the `label` ring (at f=1.18) plus
  // text glyph width still fits inside the expanded viewBox below.
  const radius = size * 0.3
  // Extra margin around the chart so labels like "Quan hệ song song"
  // have room to render without getting clipped by the SVG boundary.
  const margin = 110

  const geometry = useMemo(() => {
    if (N < 3) return null

    const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N
    const pointAt = (i: number, f: number) => {
      const a = angleFor(i)
      return {
        x: cx + f * radius * Math.cos(a),
        y: cy + f * radius * Math.sin(a),
      }
    }

    const guideLevels = [0.25, 0.5, 0.75, 1.0]
    const guides = guideLevels.map((level) =>
      Array.from({ length: N }, (_, i) => {
        const p = pointAt(i, level)
        return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
      }).join(' '),
    )

    const spokes = Array.from({ length: N }, (_, i) => {
      const p = pointAt(i, 1)
      return { x1: cx, y1: cy, x2: p.x, y2: p.y }
    })

    const targetPoints = Array.from({ length: N }, (_, i) => {
      const p = pointAt(i, target)
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
    }).join(' ')

    const dataVertices = axes.map((axis, i) => {
      const clamped = Math.max(0, Math.min(1, axis.value))
      return { ...pointAt(i, clamped), value: clamped }
    })
    const dataPoints = dataVertices
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ')

    const labels = axes.map((axis, i) => {
      const p = pointAt(i, 1.22)
      const angle = angleFor(i)
      const textAnchor: 'start' | 'end' | 'middle' =
        Math.cos(angle) > 0.2
          ? 'start'
          : Math.cos(angle) < -0.2
            ? 'end'
            : 'middle'
      return {
        x: p.x,
        y: p.y,
        label: axis.label,
        value: axis.value,
        anchor: textAnchor,
      }
    })

    return { guides, spokes, targetPoints, dataPoints, dataVertices, labels }
  }, [axes, N, cx, cy, radius, target])

  if (geometry === null) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500"
        role="img"
        aria-label="Không đủ dữ liệu cho radar chart"
      >
        📉 Cần ≥3 chương để vẽ radar chart (hiện có {N})
      </div>
    )
  }

  const avg =
    axes.reduce((acc, a) => acc + a.value, 0) / Math.max(1, axes.length)

  return (
    <svg
      // Expanded viewBox so axis labels (placed at f=1.22 ≈ 132px from
      // center) fit comfortably without clipping. `preserveAspectRatio`
      // keeps the chart centered when the container is wider than tall.
      viewBox={`${-margin} ${-margin} ${size + margin * 2} ${size + margin * 2}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ maxWidth: size + margin * 2, maxHeight: size + margin * 2 }}
      role="img"
      aria-label={`Radar chart: trung bình ${avg.toFixed(2)}, mục tiêu ${target.toFixed(2)}`}
      className="mx-auto block"
    >
      {/* Guide polygons */}
      <g stroke="rgb(203 213 225)" fill="none" strokeWidth={1}>
        {geometry.guides.map((pts, i) => (
          <polygon key={`guide-${i}`} points={pts} />
        ))}
      </g>

      {/* Axis spokes */}
      <g stroke="rgb(226 232 240)" strokeWidth={1}>
        {geometry.spokes.map((s, i) => (
          <line key={`spoke-${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
        ))}
      </g>

      {/* Target ring (dashed amber) */}
      <polygon
        points={geometry.targetPoints}
        fill="none"
        stroke="rgb(245 158 11)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />

      {/* Data polygon */}
      <polygon
        points={geometry.dataPoints}
        fill="rgba(36 64 245 / 0.2)"
        stroke="rgb(28 50 212)"
        strokeWidth={2}
        strokeDasharray={isPreliminary ? '6 4' : undefined}
      />

      {/* Data vertices with native tooltips */}
      <g>
        {geometry.dataVertices.map((v, i) => (
          <circle
            key={`vertex-${i}`}
            cx={v.x}
            cy={v.y}
            r={3.5}
            fill="rgb(28 50 212)"
          >
            <title>{`${axes[i].label}: ${(v.value * 100).toFixed(0)}%`}</title>
          </circle>
        ))}
      </g>

      {/* Axis labels. Long chapter titles are word-wrapped into two lines so
          nothing gets truncated mid-word. Each label is followed by a
          smaller percentage line underneath. */}
      <g fontSize={12} fill="rgb(51 65 85)" fontFamily="inherit">
        {geometry.labels.map((lab, i) => {
          const lines = wrapLabel(lab.label, 14)
          return (
            <text
              key={`label-${i}`}
              x={lab.x}
              y={lab.y - (lines.length - 1) * 7}
              textAnchor={lab.anchor}
              dominantBaseline="middle"
            >
              {lines.map((ln, k) => (
                <tspan
                  key={k}
                  x={lab.x}
                  dy={k === 0 ? 0 : '1.15em'}
                  fontWeight={500}
                >
                  {ln}
                </tspan>
              ))}
              <tspan
                x={lab.x}
                dy="1.25em"
                fill="rgb(100 116 139)"
                fontSize={11}
                className="tabular-nums"
              >
                {(lab.value * 100).toFixed(0)}%
              </tspan>
            </text>
          )
        })}
      </g>
    </svg>
  )
}

/**
 * Split `s` into ≤2 lines, each no longer than `maxPerLine` chars, breaking
 * at the last whitespace that fits. This keeps chapter titles like
 * "Quan hệ song song" or "Hàm số lượng giác" on two tidy lines instead of
 * getting truncated with an ellipsis.
 */
function wrapLabel(s: string, maxPerLine: number): string[] {
  if (s.length <= maxPerLine) return [s]
  const words = s.split(' ')
  let line1 = ''
  let line2 = ''
  for (const w of words) {
    const tryLine1 = line1.length === 0 ? w : `${line1} ${w}`
    if (tryLine1.length <= maxPerLine) {
      line1 = tryLine1
    } else {
      line2 = line2.length === 0 ? w : `${line2} ${w}`
    }
  }
  // Last-resort hard truncate if even line 2 overflows.
  if (line2.length > maxPerLine + 4) {
    line2 = line2.slice(0, maxPerLine + 2) + '…'
  }
  return line2 ? [line1, line2] : [line1]
}
