import type { ErrorSignals } from '../../types/profile'
import { getTopicById } from '../../data/topics'
import { cn } from '../../lib/cn'

interface ErrorSignalsCardProps {
  signals: ErrorSignals
}

/**
 * Four-column grid of error / behavior signals. Each card shows the count
 * or label plus a short explanation of what the pattern means so the user
 * can interpret the proxy without reading docs.
 *
 * None of these are deep semantic analyses — they're heuristics we can
 * actually compute from timing + level data. Phase 4 can add more patterns
 * once we have real solution-step data.
 */
export function ErrorSignalsCard({ signals }: ErrorSignalsCardProps) {
  const speedLabel: Record<ErrorSignals['speedProfile']['kind'], string> = {
    fast: '⚡ Nhanh',
    medium: '🎯 Trung bình',
    slow: '🐢 Chậm / cẩn thận',
  }
  const speedDetail = `Trung bình dùng ${(signals.speedProfile.avgRatio * 100).toFixed(0)}% thời gian cho phép mỗi câu`

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SignalTile
        icon="⚡"
        title="Vội vàng"
        tone={signals.careless.count > 3 ? 'warn' : 'neutral'}
        bigText={String(signals.careless.count)}
        smallText={
          signals.careless.count === 0
            ? 'Không có dấu hiệu vội vàng'
            : `câu trả lời sai trong < 30% thời gian`
        }
      />

      <SignalTile
        icon="📚"
        title="Lỗ hổng nền"
        tone={signals.conceptGap.count > 3 ? 'bad' : 'neutral'}
        bigText={String(signals.conceptGap.count)}
        smallText={
          signals.conceptGap.count === 0
            ? 'Vững ở mức Nhận biết'
            : `câu mức Nhận biết sai`
        }
      />

      <SignalTile
        icon="💪"
        title="Ứng dụng yếu"
        tone={signals.applicationWeak.topicIds.length > 0 ? 'warn' : 'neutral'}
        bigText={String(signals.applicationWeak.topicIds.length)}
        smallText={
          signals.applicationWeak.topicIds.length === 0
            ? 'Áp dụng tốt kiến thức đã hiểu'
            : describeWeakTopics(signals.applicationWeak.topicIds)
        }
      />

      <SignalTile
        icon={speedIcon(signals.speedProfile.kind)}
        title="Tốc độ"
        tone="neutral"
        bigText={speedLabel[signals.speedProfile.kind]}
        smallText={speedDetail}
      />
    </div>
  )
}

function describeWeakTopics(topicIds: string[]): string {
  const names = topicIds
    .map((id) => getTopicById(id)?.title)
    .filter((x): x is string => !!x)
    .slice(0, 3)
  const suffix = topicIds.length > 3 ? ` + ${topicIds.length - 3} khác` : ''
  return `Hiểu lý thuyết nhưng yếu vận dụng: ${names.join(', ')}${suffix}`
}

function speedIcon(kind: ErrorSignals['speedProfile']['kind']): string {
  return kind === 'fast' ? '⚡' : kind === 'slow' ? '🐢' : '🎯'
}

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

interface SignalTileProps {
  icon: string
  title: string
  bigText: string
  smallText: string
  tone: 'neutral' | 'warn' | 'bad'
}

function SignalTile({ icon, title, bigText, smallText, tone }: SignalTileProps) {
  const toneClass = {
    neutral: 'border-slate-200 bg-white',
    warn: 'border-amber-200 bg-amber-50',
    bad: 'border-rose-200 bg-rose-50',
  }[tone]

  return (
    <div className={cn('rounded-xl border p-4', toneClass)}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon} {title}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{bigText}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-600">
        {smallText}
      </div>
    </div>
  )
}
