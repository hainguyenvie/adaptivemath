import { useMemo, useState } from 'react'
import type { KnowledgeProfile } from '../../types/profile'
import { cn } from '../../lib/cn'

interface ProfileDebugPanelProps {
  profile: KnowledgeProfile
}

/**
 * Developer-facing numeric verification panel — mirrors the style of the
 * CAT diagnostic debug panel (amber, mono). Expanded by default during
 * development so the user can verify that the published mastery numbers
 * trace back to raw counts.
 *
 * Sections:
 *   1. Global stats
 *   2. Per-topic grid with attempts/observed/expected/mastery/levels/duration
 *   3. Gap priority math
 */
export function ProfileDebugPanel({ profile }: ProfileDebugPanelProps) {
  const [open, setOpen] = useState(true)

  const rows = useMemo(
    () =>
      profile.topics
        .slice()
        // Sort: tested first (by mastery asc), then untested.
        .sort((a, b) => {
          if (a.tested !== b.tested) return a.tested ? -1 : 1
          return a.mastery - b.mastery
        }),
    [profile.topics],
  )

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/80 text-xs font-mono text-slate-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-amber-100"
      >
        <span className="font-semibold uppercase tracking-wide text-amber-900">
          🔧 Debug — profile raw numbers
        </span>
        <span className="text-amber-700">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-amber-200 p-3">
          {/* Global */}
          <Section title="Global">
            <Row label="builtAt" value={profile.builtAt} />
            <Row label="grade" value={String(profile.grade)} />
            <Row label="θ" value={profile.theta.toFixed(3)} />
            <Row
              label="SE"
              value={
                Number.isFinite(profile.standardError)
                  ? profile.standardError.toFixed(3)
                  : '∞'
              }
            />
            <Row
              label="target (from goal)"
              value={profile.target.toFixed(2)}
            />
            <Row
              label="isPreliminary"
              value={profile.isPreliminary ? 'yes' : 'no'}
              tone={profile.isPreliminary ? 'warn' : 'good'}
            />
            <Row
              label="totalAnswered"
              value={String(profile.stats.totalAnswered)}
            />
            <Row
              label="totalCorrect (score≥0.75)"
              value={String(profile.stats.totalCorrect)}
            />
            <Row
              label="avgDurationMs"
              value={`${(profile.stats.avgDurationMs / 1000).toFixed(1)}s`}
            />
            <Row
              label="orphanResponses"
              value={String(profile.stats.orphanResponses)}
              tone={profile.stats.orphanResponses > 0 ? 'warn' : 'good'}
            />
          </Section>

          {/* Per-topic grid */}
          <Section title={`Per-topic (${rows.length} topics)`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="text-[10px] uppercase text-amber-900">
                  <tr className="border-b border-amber-200">
                    <th className="py-1 text-left">title</th>
                    <th className="py-1 text-right">att</th>
                    <th className="py-1 text-right">Σscore</th>
                    <th className="py-1 text-right">observed</th>
                    <th className="py-1 text-right">expected</th>
                    <th className="py-1 text-right">conf</th>
                    <th className="py-1 text-right">mastery</th>
                    <th className="py-1 text-right">N/H/V/T</th>
                    <th className="py-1 text-right">avg_dur</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr
                      key={t.topicId}
                      className={cn(
                        'border-b border-amber-100',
                        !t.tested && 'opacity-60',
                      )}
                    >
                      <td className="py-0.5 pr-2 text-left">
                        <span className="truncate">{t.title}</span>
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">
                        {t.attempts}
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">
                        {t.correctWeighted.toFixed(2)}
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">
                        {t.observed === null ? '—' : t.observed.toFixed(2)}
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">
                        {t.expected.toFixed(2)}
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">
                        {t.confidence.toFixed(2)}
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums font-semibold text-amber-900">
                        {t.mastery.toFixed(2)}
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">
                        {formatLevels(t.levelBreakdown)}
                      </td>
                      <td className="py-0.5 text-right tabular-nums">
                        {t.avgDurationMs === null
                          ? '—'
                          : `${(t.avgDurationMs / 1000).toFixed(1)}s`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Gap math */}
          <Section
            title={`Gaps (cutoff 0.15, ${profile.gaps.length} rows)`}
          >
            {profile.gaps.length === 0 ? (
              <div className="text-slate-500">
                (no gap {'>'} 0.15 at target {profile.target.toFixed(2)})
              </div>
            ) : (
              profile.gaps.map((g) => (
                <Row
                  key={g.topicId}
                  label={g.title}
                  value={`gap=${g.gap.toFixed(2)}  bonus=${g.weakBonus.toFixed(2)}  prio=${g.priority.toFixed(3)}`}
                />
              ))
            )}
          </Section>

          {/* Signals */}
          <Section title="Error signals">
            <Row
              label="careless count"
              value={String(profile.signals.careless.count)}
            />
            <Row
              label="conceptGap count"
              value={String(profile.signals.conceptGap.count)}
            />
            <Row
              label="applicationWeak topics"
              value={
                profile.signals.applicationWeak.topicIds.length === 0
                  ? '—'
                  : profile.signals.applicationWeak.topicIds.join(', ')
              }
            />
            <Row
              label="speed kind"
              value={profile.signals.speedProfile.kind}
            />
            <Row
              label="speed avgRatio"
              value={profile.signals.speedProfile.avgRatio.toFixed(2)}
            />
            <Row
              label="answeredRate"
              value={`${(profile.signals.engagement.answeredRate * 100).toFixed(0)}%`}
            />
            <Row
              label="skippedCount"
              value={String(profile.signals.engagement.skippedCount)}
            />
          </Section>
        </div>
      )}
    </div>
  )
}

function formatLevels(lb: KnowledgeProfile['topics'][number]['levelBreakdown']): string {
  const n = lb.N.attempts
  const h = lb.H.attempts
  const v = lb.V.attempts
  const t = lb.T.attempts
  return `${n}/${h}/${v}/${t}`
}

// ---------------------------------------------------------------------------
// Tiny presentational helpers (cloned from the CAT DebugPanel style)
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

interface RowProps {
  label: string
  value: string
  tone?: 'good' | 'warn' | 'bad'
}

function Row({ label, value, tone }: RowProps) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-700'
      : tone === 'warn'
        ? 'text-amber-700'
        : tone === 'bad'
          ? 'text-rose-700'
          : 'text-slate-800'
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={cn('text-right', toneClass)}>{value}</span>
    </div>
  )
}
