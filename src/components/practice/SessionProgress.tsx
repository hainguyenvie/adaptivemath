import { cn } from '../../lib/cn'

export type PracticePhase = 'warmup' | 'practice' | 'assessment' | 'result'

interface SessionProgressProps {
  currentPhase: PracticePhase
  /** Number of questions answered in the current phase. */
  questionsAnswered: number
  /** Total questions in the current phase. */
  questionsTotal: number
}

const PHASES: Array<{ id: PracticePhase; label: string; icon: string }> = [
  { id: 'warmup', label: 'Khởi động', icon: '🔥' },
  { id: 'practice', label: 'Luyện tập', icon: '📝' },
  { id: 'assessment', label: 'Đánh giá', icon: '🎯' },
  { id: 'result', label: 'Kết quả', icon: '📊' },
]

export function SessionProgress({
  currentPhase,
  questionsAnswered,
  questionsTotal,
}: SessionProgressProps) {
  const currentIdx = PHASES.findIndex((p) => p.id === currentPhase)

  return (
    <div className="w-full">
      {/* Phase pills */}
      <div className="mb-3 flex items-center justify-between">
        {PHASES.map((phase, i) => {
          const isDone = i < currentIdx
          const isCurrent = i === currentIdx
          return (
            <div
              key={phase.id}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm',
                  isDone && 'bg-emerald-100 text-emerald-700',
                  isCurrent && 'bg-brand-100 text-brand-700 ring-2 ring-brand-400',
                  !isDone && !isCurrent && 'bg-slate-100 text-slate-400',
                )}
              >
                {isDone ? '✓' : phase.icon}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isCurrent ? 'text-brand-700' : 'text-slate-500',
                )}
              >
                {phase.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Question progress within phase */}
      {currentPhase !== 'result' && questionsTotal > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            Câu {questionsAnswered + 1}/{questionsTotal}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{
                width: `${(questionsAnswered / Math.max(1, questionsTotal)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
