import { useState } from 'react'
import type { McqQuestion as McqQuestionType } from '../../types/question'
import { LatexRenderer } from './LatexRenderer'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'
import { DiagnosticIcon } from './DiagnosticIcon'

interface McqQuestionProps {
  question: McqQuestionType
  onSubmit: (answer: string) => void
}

export function McqQuestion({ question, onSubmit }: McqQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="space-y-7">
      <div className="rounded-[2rem] bg-[#f4fff9] p-5 ring-1 ring-[#cdeedd] sm:p-6">
        <LatexRenderer
          content={question.prompt}
          className="text-lg font-semibold leading-8 text-[#003527]"
        />
      </div>

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
                'group flex cursor-pointer items-start gap-4 rounded-[1.75rem] border-2 p-4 text-left transition-all duration-300 sm:p-5',
                'hover:-translate-y-0.5 hover:border-[#b2f746] hover:shadow-[0_16px_38px_rgba(0,53,39,0.08)]',
                'focus-within:ring-2 focus-within:ring-[#b2f746] focus-within:ring-offset-2',
                isSelected
                  ? 'border-[#b2f746] bg-white shadow-[0_18px_45px_rgba(178,247,70,0.18)]'
                  : 'border-[#c6d5cd] bg-white',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black transition-colors',
                  isSelected
                    ? 'border-[#446900] bg-[#446900] text-white'
                    : 'border-[#9fb3aa] bg-[#dff8ea] text-[#003527]',
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
              <div className="min-w-0 flex-1 pt-1">
                <LatexRenderer
                  content={opt.content}
                  className="font-medium text-[#003527]"
                />
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
          className="h-14 rounded-full !bg-[#b2f746] px-8 text-sm font-black uppercase tracking-[0.16em] !text-[#002117] shadow-[0_18px_40px_rgba(178,247,70,0.3)] hover:!bg-[#a3e635] disabled:!bg-slate-300 disabled:!text-slate-500 sm:min-w-48"
          onClick={() => selected && onSubmit(selected)}
        >
          Xác nhận
          <DiagnosticIcon name="arrow" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
