import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { masteryLabel } from '../../lib/bkt'
import { cn } from '../../lib/cn'
import { BADGE_DEFINITIONS } from '../../types/learner'

interface PracticeResultProps {
  topicTitle: string
  questionsAttempted: number
  correctCount: number
  masteryBefore: number
  masteryAfter: number
  xpEarned: number
  newBadges: string[]
  durationMs: number
  onBackToHome: () => void
  onPracticeAgain: () => void
}

export function PracticeResult({
  topicTitle,
  questionsAttempted,
  correctCount,
  masteryBefore,
  masteryAfter,
  xpEarned,
  newBadges,
  durationMs,
  onBackToHome,
  onPracticeAgain,
}: PracticeResultProps) {
  const accuracy =
    questionsAttempted > 0 ? correctCount / questionsAttempted : 0
  const masteryDelta = masteryAfter - masteryBefore
  const durationMin = Math.round(durationMs / 60000)
  const mastered = masteryAfter >= 0.85

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Hero */}
      <div className="text-center">
        <div className="text-5xl">
          {mastered ? '🎉' : accuracy >= 0.6 ? '👍' : '💪'}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          {mastered
            ? 'Thành thạo!'
            : accuracy >= 0.6
              ? 'Tốt lắm!'
              : 'Tiếp tục cố gắng!'}
        </h1>
        <p className="mt-1 text-slate-600">{topicTitle}</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard
          label="Câu đúng"
          value={`${correctCount}/${questionsAttempted}`}
          hint={`${(accuracy * 100).toFixed(0)}%`}
        />
        <StatCard
          label="XP kiếm được"
          value={`+${xpEarned}`}
          hint="⭐"
        />
        <StatCard
          label="Mastery"
          value={`${(masteryAfter * 100).toFixed(0)}%`}
          hint={masteryLabel(masteryAfter)}
        />
        <StatCard
          label="Thời gian"
          value={`${durationMin} phút`}
          hint=""
        />
      </div>

      {/* Mastery delta */}
      <Card>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">
          Tiến bộ mastery
        </h3>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm tabular-nums text-slate-500">
            {(masteryBefore * 100).toFixed(0)}%
          </div>
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="absolute h-full rounded-full bg-slate-300"
              style={{ width: `${masteryBefore * 100}%` }}
            />
            <div
              className={cn(
                'absolute h-full rounded-full transition-all duration-500',
                masteryDelta >= 0 ? 'bg-brand-500' : 'bg-rose-400',
              )}
              style={{ width: `${masteryAfter * 100}%` }}
            />
          </div>
          <div className="text-sm font-semibold tabular-nums text-brand-700">
            {(masteryAfter * 100).toFixed(0)}%
          </div>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              masteryDelta >= 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800',
            )}
          >
            {masteryDelta >= 0 ? '+' : ''}
            {(masteryDelta * 100).toFixed(1)}%
          </span>
        </div>
      </Card>

      {/* New badges */}
      {newBadges.length > 0 && (
        <Card className="!border-amber-200 !bg-amber-50 text-center">
          <div className="text-3xl">🏆</div>
          <h3 className="mt-2 text-lg font-bold text-amber-900">
            Huy hiệu mới!
          </h3>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {newBadges.map((badgeId) => {
              const def = BADGE_DEFINITIONS.find((b) => b.id === badgeId)
              if (!def) return null
              return (
                <div
                  key={badgeId}
                  className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-center"
                >
                  <div className="text-2xl">{def.icon}</div>
                  <div className="mt-1 text-xs font-medium text-amber-800">
                    {def.label}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" size="md" onClick={onBackToHome}>
          ← Trang chính
        </Button>
        <Button variant="primary" size="md" onClick={onPracticeAgain}>
          Luyện thêm →
        </Button>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card className="text-center !p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-brand-700">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}
