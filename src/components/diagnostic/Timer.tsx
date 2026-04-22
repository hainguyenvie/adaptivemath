import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'
import { DiagnosticIcon } from './DiagnosticIcon'

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
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let expired = false

    const tick = () => {
      const nextNow = Date.now()
      setNow(nextNow)
      const elapsed = (nextNow - startedAt) / 1000
      if (!expired && elapsed >= totalSeconds) {
        expired = true
        clearInterval(id)
        onExpire()
      }
    }

    const id = window.setInterval(tick, 250)
    return () => clearInterval(id)
  }, [startedAt, totalSeconds, onExpire])

  const elapsed = (now - startedAt) / 1000
  const remaining = Math.max(0, totalSeconds - elapsed)
  const pct = Math.max(0, Math.min(1, remaining / totalSeconds))
  const danger = pct < 0.2

  const mm = Math.floor(remaining / 60)
  const ss = Math.floor(remaining % 60)
  const display = `${mm}:${ss.toString().padStart(2, '0')}`

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/70 bg-[#e4fbef]/90 px-3 py-2 shadow-sm">
      <div
        className={cn(
          'flex items-center gap-1.5 text-sm font-black tabular-nums',
          danger ? 'text-[#ba1a1a]' : 'text-[#003527]',
        )}
      >
        <DiagnosticIcon name="clock" className="h-4 w-4" />
        {display}
      </div>
      <div className="h-2 w-20 overflow-hidden rounded-full bg-[#cdeedd] sm:w-28">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-200 ease-linear',
            danger ? 'bg-[#ba1a1a]' : 'bg-[#b2f746]',
          )}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}
