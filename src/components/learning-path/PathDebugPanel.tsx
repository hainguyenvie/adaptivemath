import { useState } from 'react'
import type { LearningPath } from '../../types/learningPath'

interface PathDebugPanelProps {
  path: LearningPath
}

export function PathDebugPanel({ path }: PathDebugPanelProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/80 text-xs font-mono text-slate-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-amber-100"
      >
        <span className="font-semibold uppercase tracking-wide text-amber-900">
          🔧 Debug — path generation
        </span>
        <span className="text-amber-700">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-amber-200 p-3">
          <Section title="Global">
            <Row label="builtAt" value={path.builtAt} />
            <Row label="grade" value={String(path.grade)} />
            <Row label="goal" value={path.goal} />
            <Row label="dailyMinutes" value={String(path.dailyMinutes)} />
            <Row label="deadline" value={path.deadline ?? '(none)'} />
            <Row label="estCompletion" value={path.estimatedCompletionDate} />
            <Row label="totalDays" value={String(path.totalDays)} />
            <Row label="totalTopics" value={String(path.totalTopics)} />
            <Row label="sprints" value={String(path.sprints.length)} />
          </Section>

          <Section title={`Priority list (${path.priorityList.length} topics)`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] border-collapse">
                <thead className="text-[10px] uppercase text-amber-900">
                  <tr className="border-b border-amber-200">
                    <th className="py-1 text-left">#</th>
                    <th className="py-1 text-left">title</th>
                    <th className="py-1 text-right">gap</th>
                    <th className="py-1 text-right">urgency</th>
                    <th className="py-1 text-right">weak</th>
                    <th className="py-1 text-right">exam</th>
                    <th className="py-1 text-right">score</th>
                    <th className="py-1 text-right">est_min</th>
                    <th className="py-1 text-left">levels</th>
                  </tr>
                </thead>
                <tbody>
                  {path.priorityList.map((p, i) => (
                    <tr
                      key={p.topicId}
                      className="border-b border-amber-100"
                    >
                      <td className="py-0.5 pr-2 tabular-nums">{i + 1}</td>
                      <td className="py-0.5 pr-2 text-left">{p.title}</td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">
                        {p.gap.toFixed(2)}
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">
                        {p.urgency.toFixed(2)}
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">
                        {p.weakBonus.toFixed(1)}
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">
                        {p.examDensity.toFixed(2)}
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums font-semibold text-amber-900">
                        {p.score.toFixed(3)}
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">
                        {p.estimatedMinutes.toFixed(0)}
                      </td>
                      <td className="py-0.5 text-left">
                        {p.gapLevels.join(',')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            title={`Schedule (${path.sprints.reduce((s, sp) => s + sp.days.length, 0)} days in ${path.sprints.length} sprints)`}
          >
            {path.sprints.map((sp) => (
              <div key={sp.weekNumber} className="mb-2">
                <div className="font-semibold text-amber-900">
                  {sp.label} ({sp.startDate} → {sp.endDate})
                </div>
                {sp.days.map((d) => (
                  <div key={d.dayNumber} className="ml-2">
                    <span className="text-slate-500">
                      d{d.dayNumber} {d.date}{' '}
                      {d.isReviewDay ? '[REVIEW]' : ''} {d.estimatedMinutes}min
                    </span>
                    {d.activities.map((a, i) => (
                      <span key={i} className="ml-2 text-slate-700">
                        [{a.type}:{a.topicTitle.slice(0, 15)}…{a.levels.join(',')}×{a.questionCount}]
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-800">{value}</span>
    </div>
  )
}
