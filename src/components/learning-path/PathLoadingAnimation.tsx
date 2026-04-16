import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'

interface PathLoadingAnimationProps {
  /** Number of gap topics being processed — drives the messaging. */
  gapCount: number
}

const STEPS = [
  { label: 'Phân tích lỗ hổng kiến thức…', durationMs: 800 },
  { label: 'Tính điểm ưu tiên theo gap × urgency × mức độ yếu…', durationMs: 1000 },
  { label: 'Sắp xếp theo thứ tự chương trình…', durationMs: 600 },
  { label: 'Ước tính thời gian mỗi chủ đề…', durationMs: 700 },
  { label: 'Ghép lý thuyết + ví dụ + bài tập vào từng ngày…', durationMs: 900 },
  { label: 'Xen kẽ ngày ôn tập…', durationMs: 500 },
  { label: 'Hoàn tất lộ trình!', durationMs: 400 },
]

/**
 * Progressive loading animation that gives the student a sense of
 * "the system is doing real work to build my personal plan".
 *
 * Each step auto-advances after a fixed delay. The actual computation
 * finishes in <50ms, but the animation runs ~5s for dramatic effect
 * (backed by research: users trust AI outputs more when they see
 * processing steps rather than instant results).
 */
export function PathLoadingAnimation({ gapCount }: PathLoadingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (currentStep >= STEPS.length) return
    const timer = setTimeout(() => {
      setCurrentStep((s) => s + 1)
    }, STEPS[currentStep].durationMs)
    return () => clearTimeout(timer)
  }, [currentStep])

  const progress = Math.min(100, ((currentStep + 1) / STEPS.length) * 100)

  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="mb-6 text-5xl">⚙️</div>
      <h2 className="mb-2 text-xl font-bold text-slate-900">
        Đang tạo lộ trình cho {gapCount} chủ đề
      </h2>

      <div className="mx-auto mt-6 max-w-xs">
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs tabular-nums text-slate-500">
          {Math.round(progress)}%
        </p>
      </div>

      <div className="mt-6 space-y-2">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 text-sm transition-opacity duration-300',
              i <= currentStep ? 'opacity-100' : 'opacity-0',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs',
                i < currentStep
                  ? 'bg-emerald-100 text-emerald-700'
                  : i === currentStep
                    ? 'bg-brand-100 text-brand-700 animate-pulse'
                    : 'bg-slate-100 text-slate-400',
              )}
            >
              {i < currentStep ? '✓' : i + 1}
            </span>
            <span
              className={cn(
                i < currentStep ? 'text-slate-500' : 'text-slate-800',
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Total animation duration in ms — the parent waits this long before showing the result. */
export const LOADING_TOTAL_MS = STEPS.reduce((s, step) => s + step.durationMs, 0)
