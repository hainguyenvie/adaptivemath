import { LatexRenderer } from '../diagnostic/LatexRenderer'
import { cn } from '../../lib/cn'

interface SolutionRevealProps {
  /** Whether the student got it right. */
  correct: boolean
  /** Rendered solution text (LaTeX). */
  solution: string
  /** Callback to proceed to the next question. */
  onContinue: () => void
}

/**
 * Shown immediately after a wrong answer in the practice phase.
 * Displays the full solution from the question bank and a "Tiếp tục" button.
 * On correct, shows a brief "Đúng rồi!" before auto-advancing.
 */
export function SolutionReveal({
  correct,
  solution,
  onContinue,
}: SolutionRevealProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-5',
        correct
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-rose-300 bg-rose-50',
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">{correct ? '✅' : '❌'}</span>
        <span
          className={cn(
            'text-lg font-bold',
            correct ? 'text-emerald-800' : 'text-rose-800',
          )}
        >
          {correct ? 'Đúng rồi!' : 'Chưa đúng'}
        </span>
      </div>

      {!correct && solution && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lời giải
          </p>
          <LatexRenderer
            content={solution}
            className="text-sm text-slate-700"
          />
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        className={cn(
          'w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition',
          correct
            ? 'bg-emerald-600 hover:bg-emerald-700'
            : 'bg-rose-600 hover:bg-rose-700',
        )}
      >
        {correct ? 'Câu tiếp theo →' : 'Đã hiểu, tiếp tục →'}
      </button>
    </div>
  )
}
