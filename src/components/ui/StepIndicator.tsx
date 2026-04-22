import { cn } from '../../lib/cn'

interface StepIndicatorProps {
  current: number
  total: number
}

export function StepIndicator({ current, total }: StepIndicatorProps) {
  const percent = Math.round(((current + 1) / total) * 100)
  return (
    <div className="w-full">
      <div className="mb-4 flex items-end justify-between text-sm font-bold uppercase tracking-[0.2em] text-[#294e3f]">
        <span>
          Bước {current + 1} / {total}
        </span>
        <span className="text-[#003527]">{percent}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-[#cdeedd]">
        <div
          className={cn(
            'h-full rounded-full bg-[linear-gradient(90deg,#95d3ba_0%,#b2f746_100%)] shadow-[0_0_18px_rgba(178,247,70,0.4)] transition-[width] duration-500 ease-out',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
