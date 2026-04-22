import { useState } from 'react'
import type { ShortAnsQuestion as ShortAnsQuestionType } from '../../types/question'
import { LatexRenderer } from './LatexRenderer'
import { Button } from '../ui/Button'
import { DiagnosticIcon } from './DiagnosticIcon'

interface ShortAnsQuestionProps {
  question: ShortAnsQuestionType
  onSubmit: (answer: string) => void
}

/**
 * Part III style: fill-in-the-number.
 * Accepts a free-form numeric string. The CAT engine normalizes it
 * (dot vs comma decimal) before comparing to the correct answer.
 */
export function ShortAnsQuestion({
  question,
  onSubmit,
}: ShortAnsQuestionProps) {
  const [value, setValue] = useState('')

  const canSubmit = value.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(value.trim())
  }

  return (
    <div className="space-y-7">
      <div className="rounded-[2rem] bg-[#f4fff9] p-5 ring-1 ring-[#cdeedd] sm:p-6">
        <LatexRenderer
          content={question.prompt}
          className="text-lg font-semibold leading-8 text-[#003527]"
        />
      </div>

      <div className="rounded-[2rem] border-2 border-[#c6d5cd] bg-white p-5 shadow-sm sm:p-6">
        <label
          htmlFor="shortans-input"
          className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#446900]"
        >
          <DiagnosticIcon name="edit" className="h-4 w-4" />
          Đáp án của bạn
        </label>
        <input
          id="shortans-input"
          type="text"
          inputMode="decimal"
          placeholder="Nhập số (vd: 0,33 hoặc 2)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) handleSubmit()
          }}
          className="w-full rounded-[1.5rem] border-2 border-[#95d3ba] bg-[#f4fff9] px-5 py-4 text-lg font-bold text-[#003527] outline-none transition placeholder:text-[#2b6954]/45 focus:border-[#b2f746] focus:bg-white focus:ring-4 focus:ring-[#b2f746]/25"
        />
        <p className="mt-3 text-sm font-medium text-[#404944]">
          Bạn có thể dùng dấu phẩy hoặc dấu chấm làm phân cách thập phân.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          className="h-14 rounded-full !bg-[#b2f746] px-8 text-sm font-black uppercase tracking-[0.16em] !text-[#002117] shadow-[0_18px_40px_rgba(178,247,70,0.3)] hover:!bg-[#a3e635] disabled:!bg-slate-300 disabled:!text-slate-500 sm:min-w-48"
          onClick={handleSubmit}
        >
          Xác nhận
          <DiagnosticIcon name="arrow" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
