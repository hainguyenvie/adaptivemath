import { useState } from 'react'
import type { McqQuestion as McqQuestionType } from '../../types/question'
import { LatexRenderer } from './LatexRenderer'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

interface McqQuestionProps {
  question: McqQuestionType
  onSubmit: (answer: string) => void
}

export function McqQuestion({ question, onSubmit }: McqQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <LatexRenderer content={question.prompt} />

      <div
        role="radiogroup"
        aria-label="Chọn đáp án đúng"
        className="grid gap-3"
      >
        {question.options.map((opt) => {
          const isSelected = selected === opt.label
          return (
            <label
              key={opt.label}
              className={cn(
                'group flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
                isSelected
                  ? 'border-brand-500 bg-brand-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-brand-300',
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-semibold',
                  isSelected
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 bg-white text-slate-500',
                )}
              >
                {opt.label}
              </div>
              <input
                type="radio"
                name={`mcq-${question.id}`}
                value={opt.label}
                checked={isSelected}
                onChange={() => setSelected(opt.label)}
                className="sr-only"
              />
              <div className="flex-1 pt-1">
                <LatexRenderer content={opt.content} />
              </div>
            </label>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          disabled={!selected}
          onClick={() => selected && onSubmit(selected)}
        >
          Xác nhận →
        </Button>
      </div>
    </div>
  )
}
