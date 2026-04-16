import { useState } from 'react'
import type { TfQuestion as TfQuestionType } from '../../types/question'
import { LatexRenderer } from './LatexRenderer'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

interface TfQuestionProps {
  question: TfQuestionType
  onSubmit: (answers: boolean[]) => void
}

type TfAnswer = true | false | null

/**
 * Part II style: 4 independent sub-statements, each marked Đúng or Sai.
 * User must choose for all 4 before submitting.
 */
export function TfQuestion({ question, onSubmit }: TfQuestionProps) {
  const [answers, setAnswers] = useState<TfAnswer[]>(
    () => new Array<TfAnswer>(question.statements.length).fill(null),
  )

  const setAt = (i: number, value: boolean) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  const allAnswered = answers.every((a) => a !== null)

  return (
    <div className="space-y-5">
      <LatexRenderer content={question.prompt} />

      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Với mỗi mệnh đề bên dưới, hãy chọn Đúng hoặc Sai.
        </p>
        {question.statements.map((st, i) => (
          <div
            key={st.label}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                {st.label})
              </div>
              <div className="flex-1">
                <LatexRenderer content={st.content} />
              </div>
            </div>
            <div className="mt-3 flex gap-2 pl-10">
              <TfPill
                selected={answers[i] === true}
                label="Đúng"
                tone="ok"
                onClick={() => setAt(i, true)}
              />
              <TfPill
                selected={answers[i] === false}
                label="Sai"
                tone="bad"
                onClick={() => setAt(i, false)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          disabled={!allAnswered}
          onClick={() => {
            if (!allAnswered) return
            onSubmit(answers as boolean[])
          }}
        >
          Xác nhận →
        </Button>
      </div>
    </div>
  )
}

interface TfPillProps {
  selected: boolean
  label: string
  tone: 'ok' | 'bad'
  onClick: () => void
}

function TfPill({ selected, label, tone, onClick }: TfPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-1 text-sm font-medium transition',
        selected
          ? tone === 'ok'
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-rose-500 bg-rose-500 text-white'
          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400',
      )}
    >
      {label}
    </button>
  )
}
