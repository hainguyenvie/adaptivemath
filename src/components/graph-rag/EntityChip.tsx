import { ENTITY_META, type Entity } from '../../types/graphRag'
import { cn } from '../../lib/cn'

interface EntityChipProps {
  entity: Entity
  onClick?: () => void
  size?: 'sm' | 'md'
  selected?: boolean
  className?: string
}

/**
 * Compact pill for a graph entity — icon + label + optional subtitle.
 * Used in NarrativeCard citations, GraphCanvas labels, and entity lists.
 */
export function EntityChip({
  entity,
  onClick,
  size = 'sm',
  selected,
  className,
}: EntityChipProps) {
  const meta = ENTITY_META[entity.type]
  const interactive = !!onClick
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-white shadow-sm transition',
        size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-sm',
        interactive
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
          : 'cursor-default',
        selected ? 'ring-2 ring-emerald-500' : 'ring-1 ring-slate-200/70',
        className,
      )}
      style={{ borderColor: hexToRgba(meta.color, 0.25) }}
      title={`${meta.label} · ${entity.label}`}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: meta.color }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
          {meta.icon}
        </span>
      </span>
      <span className="max-w-[12rem] truncate font-bold text-[#003527]">
        {truncate(entity.label, size === 'sm' ? 26 : 40)}
      </span>
      {entity.subtitle && size === 'md' && (
        <span className="max-w-[10rem] truncate text-xs text-slate-500">
          · {entity.subtitle}
        </span>
      )}
    </button>
  )
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}

function hexToRgba(hex: string, a: number): string {
  const v = hex.replace('#', '')
  const r = parseInt(v.slice(0, 2), 16)
  const g = parseInt(v.slice(2, 4), 16)
  const b = parseInt(v.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
