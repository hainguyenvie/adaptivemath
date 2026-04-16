import { cn } from '../../lib/cn'

interface StepIndicatorProps {
  current: number
  total: number
}

export function StepIndicator({ current, total }: StepIndicatorProps) {
  const percent = Math.round(((current + 1) / total) * 100)
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
        <span>
          Bước <strong className="text-slate-800">{current + 1}</strong> / {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full rounded-full bg-brand-500 transition-all duration-500 ease-out',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
