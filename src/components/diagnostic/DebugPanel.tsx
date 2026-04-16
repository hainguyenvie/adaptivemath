import { useMemo, useState } from 'react'
import type {
  Question,
  SessionResponse,
  SessionState,
} from '../../types/question'
import {
  itemInformation,
  probabilityCorrect,
} from '../../lib/irt'
import { cn } from '../../lib/cn'

interface DebugPanelProps {
  session: SessionState
  currentQuestion: Question
  /** Topic display name lookup — caller provides via `getTopicById`. */
  topicTitleById: (topicId: string) => string
}

type LadderStateSummary = {
  notStarted: number
  atN: number
  atH: number
  atV: number
  atT: number
  done: number
  verifying: number
}

function summarizeLadder(
  session: SessionState,
): LadderStateSummary & { total: number } {
  const summary: LadderStateSummary = {
    notStarted: 0,
    atN: 0,
    atH: 0,
    atV: 0,
    atT: 0,
    done: 0,
    verifying: 0,
  }
  const entries = Object.values(session.topicStates)
  // Per-topic attempts so we can distinguish "at N, not yet attempted" from
  // "at N, attempted once and now retrying".
  const attemptsByTopic = new Map<string, number>()
  for (const r of session.responses) {
    // Crude but good enough for a debug panel — the responses all belong
    // to questions whose topic we can look up in state.topicStates via
    // prefix (id pattern is `<topicId>::ex-N`).
    const topicId = r.questionId.split('::', 1)[0]
    attemptsByTopic.set(topicId, (attemptsByTopic.get(topicId) ?? 0) + 1)
  }

  for (const [topicId, ts] of Object.entries(session.topicStates)) {
    const attempts = attemptsByTopic.get(topicId) ?? 0
    if (ts.level === 'done') {
      summary.done += 1
      continue
    }
    if (attempts === 0) {
      summary.notStarted += 1
      continue
    }
    if (ts.wrongsAtLevel === 1) summary.verifying += 1
    if (ts.level === 'N') summary.atN += 1
    else if (ts.level === 'H') summary.atH += 1
    else if (ts.level === 'V') summary.atV += 1
    else if (ts.level === 'T') summary.atT += 1
  }
  return { ...summary, total: entries.length }
}

/**
 * Developer-facing diagnostic panel shown alongside the live CAT session.
 *
 * Purpose: give a human operator enough visibility to sanity-check the IRT
 * + adaptive selector. Deliberately NOT student-facing — the copy is in
 * English / math notation because it's a tool for verifying the algorithm,
 * not for the learner.
 *
 * The panel is collapsible so it doesn't eat screen space once trust is
 * established, but defaults to **open** during development.
 */
export function DebugPanel({
  session,
  currentQuestion,
  topicTitleById,
}: DebugPanelProps) {
  const [open, setOpen] = useState(true)

  const lastResponse = session.responses.at(-1) ?? null

  const probability = useMemo(
    () => probabilityCorrect(session.theta, currentQuestion.irt),
    [session.theta, currentQuestion.irt],
  )
  const info = useMemo(
    () => itemInformation(session.theta, currentQuestion.irt),
    [session.theta, currentQuestion.irt],
  )

  const topicCounts = useMemo(
    () => computeTopicCounts(session.responses, currentQuestion),
    [session.responses, currentQuestion],
  )

  const ladder = useMemo(() => summarizeLadder(session), [session])
  const currentTopicState = session.topicStates[currentQuestion.topicId]

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/80 text-xs font-mono text-slate-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-amber-100"
      >
        <span className="font-semibold uppercase tracking-wide text-amber-900">
          🔧 Debug — CAT state
        </span>
        <span className="text-amber-700">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-amber-200 p-3">
          <Section title="Current question">
            <Row label="id" value={currentQuestion.id} mono />
            <Row label="type" value={currentQuestion.type} />
            <Row
              label="topic"
              value={topicTitleById(currentQuestion.topicId)}
            />
            <Row label="question level" value={currentQuestion.level} />
            <Row
              label="IRT"
              value={`a=${currentQuestion.irt.a.toFixed(2)}, b=${currentQuestion.irt.b.toFixed(2)}, c=${currentQuestion.irt.c.toFixed(2)}`}
            />
            <Row
              label="P(θ)"
              value={`${(probability * 100).toFixed(1)}%`}
              hint="prob correct at current θ"
            />
            <Row
              label="I(θ)"
              value={info.toFixed(3)}
              hint="Fisher info (debug only — selector no longer uses this)"
            />
          </Section>

          {currentTopicState && (
            <Section title="Topic ladder state">
              <Row
                label="current level"
                value={currentTopicState.level}
                hint={
                  currentTopicState.wrongsAtLevel === 1
                    ? 'verification retry (1 wrong already)'
                    : 'first try'
                }
                tone={
                  currentTopicState.wrongsAtLevel === 1 ? 'warn' : undefined
                }
              />
              <Row
                label="wrongsAtLevel"
                value={String(currentTopicState.wrongsAtLevel)}
              />
              <Row
                label="ceiling level"
                value={currentTopicState.ceilingLevel}
                hint="highest level passed so far"
              />
            </Section>
          )}

          <Section title="Ladder coverage">
            <Row
              label="total topics"
              value={String(ladder.total)}
              hint="from topicStates"
            />
            <Row
              label="not started"
              value={String(ladder.notStarted)}
              tone={ladder.notStarted > 0 ? 'warn' : 'good'}
            />
            <Row
              label="at N"
              value={String(ladder.atN)}
              hint={ladder.atN > 0 ? 'nhận biết' : ''}
            />
            <Row label="at H" value={String(ladder.atH)} hint={ladder.atH > 0 ? 'thông hiểu' : ''} />
            <Row label="at V" value={String(ladder.atV)} hint={ladder.atV > 0 ? 'vận dụng' : ''} />
            <Row label="at T" value={String(ladder.atT)} hint={ladder.atT > 0 ? 'vận dụng cao' : ''} />
            <Row
              label="done"
              value={String(ladder.done)}
              tone="good"
              hint="fully evaluated"
            />
            <Row
              label="in verify mode"
              value={String(ladder.verifying)}
              tone={ladder.verifying > 0 ? 'warn' : undefined}
            />
          </Section>

          <Section title="Running estimate">
            <Row
              label="θ"
              value={session.theta.toFixed(3)}
              hint={abilityLabel(session.theta)}
            />
            <Row
              label="SE"
              value={
                Number.isFinite(session.standardError)
                  ? session.standardError.toFixed(3)
                  : '∞'
              }
              hint="debug only — ladder stop does not use SE"
            />
            <Row label="items answered" value={String(session.responses.length)} />
          </Section>

          {lastResponse && (
            <Section title="Last response">
              <Row label="questionId" value={lastResponse.questionId} mono />
              <Row
                label="score"
                value={`${lastResponse.score.toFixed(2)} (${lastResponse.score === 1 ? 'ĐÚNG' : lastResponse.score === 0 ? 'SAI' : 'PART'})`}
                tone={
                  lastResponse.score >= 0.75
                    ? 'good'
                    : lastResponse.score > 0
                      ? 'warn'
                      : 'bad'
                }
              />
              <Row
                label="answered"
                value={lastResponse.answered ? 'yes' : 'skipped/timeout'}
              />
              <Row
                label="duration"
                value={
                  lastResponse.endedAt
                    ? `${((lastResponse.endedAt - lastResponse.startedAt) / 1000).toFixed(1)}s`
                    : '—'
                }
              />
            </Section>
          )}

          <Section title="Topic distribution">
            {topicCounts.length === 0 ? (
              <div className="text-slate-500">(no responses yet)</div>
            ) : (
              topicCounts.map((t) => (
                <Row
                  key={t.topicId}
                  label={topicTitleById(t.topicId)}
                  value={`${t.count}  (${(t.share * 100).toFixed(0)}%)`}
                  tone={t.share > 0.4 ? 'warn' : undefined}
                />
              ))
            )}
          </Section>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
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
  hint?: string
  mono?: boolean
  tone?: 'good' | 'warn' | 'bad'
}

function Row({ label, value, hint, mono, tone }: RowProps) {
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
      <span className={cn('text-right', mono && 'break-all', toneClass)}>
        {value}
        {hint && (
          <span className="ml-2 text-[10px] text-slate-400 normal-case">
            {hint}
          </span>
        )}
      </span>
    </div>
  )
}

function abilityLabel(theta: number): string {
  if (theta < -1) return 'weak'
  if (theta < 0) return 'below avg'
  if (theta < 1) return 'above avg'
  return 'strong'
}

interface TopicCount {
  topicId: string
  count: number
  share: number
}

function computeTopicCounts(
  responses: SessionResponse[],
  currentQuestion: Question,
): TopicCount[] {
  // We don't have direct access to all questions here (we'd need the pool),
  // so instead derive topic ids from the session's responses via prompt-time
  // lookup. Since each response stores only the id, we inject the current
  // question's topic as a sanity anchor — the topic for historical items is
  // looked up by the parent which already has the pool, but here we can only
  // safely bucket by topicId if we pass it in. To keep the panel dependency-
  // free, we just count responses by the prefix of `questionId` which is the
  // topicId (our ids are `topicId::ex-N`).
  const counts = new Map<string, number>()
  for (const r of responses) {
    const topicId = r.questionId.split('::', 1)[0]
    counts.set(topicId, (counts.get(topicId) ?? 0) + 1)
  }
  // Make sure the current question's topic shows up even if 0 yet.
  if (!counts.has(currentQuestion.topicId)) {
    counts.set(currentQuestion.topicId, 0)
  }
  const total = responses.length
  return Array.from(counts.entries())
    .map(([topicId, count]) => ({
      topicId,
      count,
      share: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count)
}
