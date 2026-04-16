import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'

interface TimerProps {
  /** Seconds allotted for the current question. */
  totalSeconds: number
  /**
   * Epoch ms when the countdown started. When this value changes the timer
   * resets automatically — so passing a fresh timestamp per question is
   * enough to kick it back to full.
   */
  startedAt: number
  /** Called once when time runs out (0 seconds remaining). */
  onExpire: () => void
}

/**
 * Countdown timer for a single question.
 *
 * Uses a 250ms interval so the display stays smooth but we don't burn CPU.
 * Critical: only calls `onExpire` exactly once when the remaining time hits 0.
 */
export function Timer({ totalSeconds, startedAt, onExpire }: TimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds)

  useEffect(() => {
    setRemaining(totalSeconds)

    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000
      const rem = Math.max(0, totalSeconds - elapsed)
      setRemaining(rem)
      if (rem <= 0) {
        clearInterval(id)
        onExpire()
      }
    }

    // Run once immediately, then every 250ms.
    tick()
    const id = window.setInterval(tick, 250)
    return () => clearInterval(id)
  }, [startedAt, totalSeconds, onExpire])

  const pct = Math.max(0, Math.min(1, remaining / totalSeconds))
  const danger = pct < 0.2

  const mm = Math.floor(remaining / 60)
  const ss = Math.floor(remaining % 60)
  const display = `${mm}:${ss.toString().padStart(2, '0')}`

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'text-sm font-semibold tabular-nums',
          danger ? 'text-red-600' : 'text-slate-600',
        )}
      >
        ⏱️ {display}
      </div>
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-200 ease-linear',
            danger ? 'bg-red-500' : 'bg-brand-500',
          )}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}
