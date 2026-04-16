import { useState } from 'react'
import type { ShortAnsQuestion as ShortAnsQuestionType } from '../../types/question'
import { LatexRenderer } from './LatexRenderer'
import { Button } from '../ui/Button'

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
    <div className="space-y-5">
      <LatexRenderer content={question.prompt} />

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label
          htmlFor="shortans-input"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
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
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <p className="mt-2 text-xs text-slate-500">
          Bạn có thể dùng dấu phẩy hoặc dấu chấm làm phân cách thập phân.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Xác nhận →
        </Button>
      </div>
    </div>
  )
}
