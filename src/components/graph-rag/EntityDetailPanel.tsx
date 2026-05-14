import {
  ENTITY_META,
  RELATION_META,
  type Edge,
  type Entity,
  type KnowledgeGraph,
} from '../../types/graphRag'
import { cn } from '../../lib/cn'

interface EntityDetailPanelProps {
  entity: Entity
  graph: KnowledgeGraph
  onSelectEntity: (entity: Entity) => void
  className?: string
}

/**
 * Right-rail detail card — shows a focused entity's metadata plus the
 * direct neighbors it connects to, broken down by relation type.
 */
export function EntityDetailPanel({
  entity,
  graph,
  onSelectEntity,
  className,
}: EntityDetailPanelProps) {
  const meta = ENTITY_META[entity.type]
  const outs = graph.outgoing.get(entity.id) ?? []
  const ins = graph.incoming.get(entity.id) ?? []

  // Group edges by relation type for readable layout.
  const groups = new Map<string, Edge[]>()
  for (const e of [...outs, ...ins]) {
    const key = `${e.type}:${e.from === entity.id ? 'out' : 'in'}`
    const list = groups.get(key) ?? []
    list.push(e)
    groups.set(key, list)
  }

  return (
    <aside
      className={cn(
        'flex h-full w-full flex-col gap-4 overflow-y-auto rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-[0_18px_45px_rgba(0,53,39,0.06)]',
        className,
      )}
    >
      <header className="space-y-2 border-b border-emerald-100 pb-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
          style={{ background: meta.color }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 12 }}
          >
            {meta.icon}
          </span>
          {meta.label}
        </span>
        <h3 className="text-xl font-extrabold text-[#003527]">{entity.label}</h3>
        {entity.subtitle && (
          <p className="text-sm text-[#404944]">{entity.subtitle}</p>
        )}
        <EntityExtras entity={entity} />
      </header>

      {/* Relations */}
      {groups.size === 0 ? (
        <p className="text-sm italic text-slate-500">
          Nút này chưa có quan hệ trong đồ thị.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b6954]">
            Quan hệ ({outs.length + ins.length})
          </p>
          {[...groups.entries()].map(([key, list]) => {
            const [relType, dir] = key.split(':')
            const rmeta = RELATION_META[relType as keyof typeof RELATION_META]
            return (
              <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                <p className="mb-2 text-xs font-bold text-[#003527]">
                  <span className="material-symbols-outlined align-bottom" style={{ fontSize: 14 }}>
                    {rmeta.icon}
                  </span>{' '}
                  {rmeta.label} {dir === 'in' ? '(ngược)' : ''}{' '}
                  <span className="font-normal text-slate-500">· {list.length}</span>
                </p>
                <ul className="space-y-1">
                  {list.slice(0, 8).map((e) => {
                    const otherId = e.from === entity.id ? e.to : e.from
                    const other = graph.nodes.get(otherId)
                    if (!other) return null
                    const ometa = ENTITY_META[other.type]
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => onSelectEntity(other)}
                          className="flex w-full items-center gap-2 rounded-xl border border-transparent bg-white px-2.5 py-1.5 text-left text-xs transition hover:border-emerald-200 hover:bg-emerald-50"
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                            style={{ background: ometa.color }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 12 }}
                            >
                              {ometa.icon}
                            </span>
                          </span>
                          <span className="flex-1 truncate font-semibold text-[#003527]">
                            {other.label}
                          </span>
                          <span className="text-[10px] tabular-nums text-slate-400">
                            w={e.weight.toFixed(2)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  {list.length > 8 && (
                    <li className="px-2 text-[11px] italic text-slate-400">
                      … và {list.length - 8} quan hệ khác
                    </li>
                  )}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Type-specific extra info
// ---------------------------------------------------------------------------

function EntityExtras({ entity }: { entity: Entity }) {
  switch (entity.type) {
    case 'student':
    case 'peer':
      return (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <Stat label="Mastery TB" value={`${((entity as { avgMastery: number }).avgMastery * 100).toFixed(0)}%`} />
          <Stat label="XP" value={String((entity as { totalXp: number }).totalXp)} />
          <Stat label="Streak" value={`${(entity as { currentStreak: number }).currentStreak} ngày`} />
        </div>
      )
    case 'topic':
      return (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <Stat label="Lớp" value={String((entity as { grade: number }).grade)} />
          <Stat label="Chương" value={String((entity as { chapter: number }).chapter)} />
          <Stat label="Bài" value={String((entity as { lesson: number }).lesson)} />
        </div>
      )
    case 'session':
      return (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <Stat label="Accuracy" value={`${(((entity as { accuracy: number }).accuracy) * 100).toFixed(0)}%`} />
          <Stat
            label="Δ Mastery"
            value={`${((((entity as { masteryAfter: number; masteryBefore: number }).masteryAfter) -
              ((entity as { masteryBefore: number }).masteryBefore)) * 100).toFixed(1)}%`}
          />
        </div>
      )
    case 'error': {
      const e = entity as { errorTag: string; resolved: boolean }
      return (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <Stat label="Lỗi" value={e.errorTag} />
          <Stat label="Trạng thái" value={e.resolved ? 'Đã giải' : 'Chưa giải'} />
        </div>
      )
    }
    case 'feedback':
      return (
        <p className="rounded-xl bg-emerald-50/60 px-3 py-2 text-sm italic text-emerald-900/85">
          "{(entity as { body: string }).body}"
        </p>
      )
    case 'activity': {
      const a = entity as {
        recipe: string
        estimatedMinutes: number
        levels: string[]
      }
      return (
        <div className="space-y-1">
          <p className="rounded-xl bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
            <span className="font-bold">Công thức: </span>
            {a.recipe}
          </p>
          <div className="flex gap-1.5 text-[11px]">
            <Stat label="Phút" value={String(a.estimatedMinutes)} />
            <Stat label="Mức" value={a.levels.join('-') || '—'} />
          </div>
        </div>
      )
    }
    default:
      return null
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50/60 px-2 py-0.5">
      <span className="font-bold text-[#003527]">{value}</span>
      <span className="text-emerald-700/70">{label}</span>
    </span>
  )
}
