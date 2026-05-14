import type { Narrative, NarrativeBullet, Entity } from '../../types/graphRag'
import { EntityChip } from './EntityChip'
import { cn } from '../../lib/cn'

interface NarrativeCardProps {
  narrative: Narrative
  onEntityClick?: (entity: Entity) => void
  /** Compact = no closing line + tighter padding. */
  compact?: boolean
}

const TONE_CLASS: Record<NonNullable<NarrativeBullet['tone']>, string> = {
  priority: 'border-amber-200 bg-amber-50/70',
  risk: 'border-rose-200 bg-rose-50/70',
  success: 'border-emerald-200 bg-emerald-50/70',
  info: 'border-sky-200 bg-sky-50/70',
}

/**
 * Renders a GraphRAG narrative — title + lead + bullets with evidence chips
 * + closing. Bullets support a tiny markdown subset (`**bold**`, `*italic*`).
 */
export function NarrativeCard({
  narrative,
  onEntityClick,
  compact,
}: NarrativeCardProps) {
  return (
    <div
      className={cn(
        'rounded-[2rem] border border-emerald-100 bg-white shadow-[0_18px_45px_rgba(0,53,39,0.08)]',
        compact ? 'p-4' : 'p-6',
      )}
    >
      <header className="space-y-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
            psychology
          </span>
          GraphRAG · Giải thích
        </span>
        <h3
          className={cn(
            'font-extrabold text-[#003527]',
            compact ? 'text-lg' : 'text-2xl',
          )}
        >
          {narrative.title}
        </h3>
        <p
          className={cn(
            'leading-relaxed text-[#404944]',
            compact ? 'text-sm' : 'text-base',
          )}
          dangerouslySetInnerHTML={{ __html: renderMd(narrative.lead) }}
        />
      </header>

      {narrative.bullets.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {narrative.bullets.map((b, i) => (
            <li
              key={i}
              className={cn(
                'flex items-start gap-3 rounded-2xl border px-3.5 py-2.5',
                TONE_CLASS[b.tone ?? 'info'],
              )}
            >
              <span aria-hidden className="text-lg leading-none">
                {b.icon}
              </span>
              <p
                className="flex-1 text-sm font-medium leading-relaxed text-[#003527]"
                dangerouslySetInnerHTML={{ __html: renderMd(b.text) }}
              />
            </li>
          ))}
        </ul>
      )}

      {narrative.citedEntities.length > 0 && (
        <div className="mt-4 border-t border-emerald-100 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b6954]">
            Dẫn chứng truy xuất
          </p>
          <div className="flex flex-wrap gap-1.5">
            {narrative.citedEntities.slice(0, 12).map((e) => (
              <EntityChip
                key={e.id}
                entity={e}
                onClick={onEntityClick ? () => onEntityClick(e) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {!compact && narrative.closing && (
        <p className="mt-4 rounded-2xl bg-[#003527] px-4 py-3 text-sm font-medium text-white/85">
          ✨ {narrative.closing}
        </p>
      )}
    </div>
  )
}

// Very small inline-markdown to HTML for `**bold**` and `*italic*`. Safe-ish
// because we control the templates.
function renderMd(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
