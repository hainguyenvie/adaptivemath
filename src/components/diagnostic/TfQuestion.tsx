import { useState } from 'react'
import type { TfQuestion as TfQuestionType } from '../../types/question'
import { LatexRenderer } from './LatexRenderer'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'
import { DiagnosticIcon } from './DiagnosticIcon'

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
    <div className="space-y-7">
      <div className="rounded-[2rem] bg-[#f4fff9] p-5 ring-1 ring-[#cdeedd] sm:p-6">
        <LatexRenderer
          content={question.prompt}
          className="text-lg font-semibold leading-8 text-[#003527]"
        />
      </div>

      <div className="space-y-3">
        {question.statements.map((st, i) => (
          <div
            key={st.label}
            className="rounded-[1.75rem] border-2 border-[#c6d5cd] bg-white p-4 shadow-sm transition hover:border-[#b2f746] sm:p-5"
          >
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dff8ea] text-sm font-black text-[#003527]">
                {st.label})
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <LatexRenderer
                  content={st.content}
                  className="font-medium text-[#003527]"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 pl-12">
              <TfPill
                selected={answers[i] === true}
                label="Đúng"
                onClick={() => setAt(i, true)}
              />
              <TfPill
                selected={answers[i] === false}
                label="Sai"
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
          className="h-14 rounded-full !bg-[#b2f746] px-8 text-sm font-black uppercase tracking-[0.16em] !text-[#002117] shadow-[0_18px_40px_rgba(178,247,70,0.3)] hover:!bg-[#a3e635] disabled:!bg-slate-300 disabled:!text-slate-500 sm:min-w-48"
          onClick={() => {
            if (!allAnswered) return
            onSubmit(answers as boolean[])
          }}
        >
          Xác nhận
          <DiagnosticIcon name="arrow" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface TfPillProps {
  selected: boolean
  label: string
  onClick: () => void
}

function TfPill({ selected, label, onClick }: TfPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border-2 px-5 py-2 text-sm font-black transition',
        selected
          ? 'border-[#446900] bg-[#446900] text-white shadow-[0_12px_28px_rgba(68,105,0,0.18)]'
          : 'border-[#95d3ba] bg-white text-[#003527] hover:border-[#b2f746] hover:bg-[#f1ffd8]',
      )}
    >
      {label}
    </button>
  )
}
