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
    <div className="rounded-[32px] bg-gradient-to-br from-[#064e3b] to-[#003527] p-6 shadow-[0_18px_55px_rgba(0,53,39,0.14)]">
      <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[#b2f746]">
        ⚡ Tín hiệu lỗi phát hiện
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SignalTile
          icon="💨"
          title="Bất cẩn"
          tone={signals.careless.count > 3 ? 'warn' : 'neutral'}
          bigText={String(signals.careless.count)}
          smallText={
            signals.careless.count === 0
              ? 'Không có dấu hiệu bất cẩn'
              : `câu sai trong < 30% thời gian`
          }
        />
        <SignalTile
          icon="🧠"
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
          icon="⚙️"
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
          tone="speed"
          bigText={speedLabel[signals.speedProfile.kind]}
          smallText={speedDetail}
        />
      </div>
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
  tone: 'neutral' | 'warn' | 'bad' | 'speed'
}

function SignalTile({ icon, title, bigText, smallText, tone }: SignalTileProps) {
  const toneClass = cn(
    'rounded-2xl p-4 text-center',
    tone === 'warn' && 'bg-[#b2f746]/[0.12]',
    tone === 'bad' && 'bg-rose-500/20',
    tone === 'speed' && 'bg-[#b2f746]/[0.08]',
    tone === 'neutral' && 'bg-white/[0.07]',
  )

  return (
    <div className={toneClass}>
      <div className="text-xl">{icon}</div>
      <div className="mt-2 text-2xl font-black leading-tight text-white">{bigText}</div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/50">
        {title}
      </div>
      <div className="mt-1.5 text-[10px] leading-relaxed text-white/35">{smallText}</div>
    </div>
  )
}
