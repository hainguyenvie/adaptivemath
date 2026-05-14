import { TREE_STAGES, type TreeStage } from '../../types/knowledgeTree'
import { cn } from '../../lib/cn'

interface TreeStageLegendProps {
  /** Optional per-stage counts to display alongside each chip. */
  counts?: Record<TreeStage, number>
  /** Tighten spacing for embedding in small contexts. */
  compact?: boolean
}

/**
 * Horizontal legend mapping the 4 growth stages to their icon + range.
 * Mirrors the visual language of `MasteryBandLegend` so both legends can
 * coexist on the profile page without dissonance.
 */
export function TreeStageLegend({ counts, compact }: TreeStageLegendProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-2',
        compact ? 'text-[11px]' : 'text-xs',
      )}
    >
      {TREE_STAGES.map((stage) => (
        <div
          key={stage.id}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
            stage.accent,
          )}
        >
          <span aria-hidden className="text-base leading-none">
            {stage.icon}
          </span>
          <span className="font-medium">{stage.label}</span>
          {counts ? (
            <span className="tabular-nums opacity-80">
              · {counts[stage.id]}
            </span>
          ) : (
            <span className="tabular-nums opacity-70">
              {stage.min.toFixed(2)}–
              {stage.id === 'ra-hoa' ? '1.00' : stage.max.toFixed(2)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
