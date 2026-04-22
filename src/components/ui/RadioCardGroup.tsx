import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface RadioCardOption<T extends string | number> {
  value: T
  label: ReactNode
  description?: ReactNode
  icon?: ReactNode
  badge?: ReactNode
}

interface RadioCardGroupProps<T extends string | number> {
  name: string
  options: ReadonlyArray<RadioCardOption<T>>
  value: T | undefined
  onChange: (value: T) => void
  columns?: 1 | 2 | 3 | 4
}

const columnClasses: Record<1 | 2 | 3 | 4, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export function RadioCardGroup<T extends string | number>({
  name,
  options,
  value,
  onChange,
  columns = 2,
}: RadioCardGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn('grid gap-4', columnClasses[columns])}
    >
      {options.map((option) => {
        const selected = option.value === value
        const id = `${name}-${String(option.value)}`
        return (
          <label
            key={String(option.value)}
            htmlFor={id}
            className={cn(
              'group relative flex cursor-pointer flex-col gap-2 rounded-[1.75rem] border-2 p-6 text-left transition-all duration-300',
              'hover:-translate-y-1 hover:border-[#b2f746] hover:shadow-[0_14px_35px_rgba(0,53,39,0.08)]',
              'focus-within:ring-2 focus-within:ring-[#b2f746] focus-within:ring-offset-2',
              selected
                ? 'border-[#b2f746] bg-white shadow-[0_18px_45px_rgba(178,247,70,0.18)]'
                : 'border-[#c6d5cd] bg-white',
            )}
          >
            <input
              id={id}
              type="radio"
              name={name}
              className="sr-only"
              checked={selected}
              onChange={() => onChange(option.value)}
            />
            <div className="flex items-start gap-3">
              {option.icon && (
                <div
                  className={cn(
                    'mt-0.5 flex h-16 w-16 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110',
                    selected ? 'bg-[#b2f746]' : 'bg-[#dff8ea]',
                  )}
                >
                  <div className="text-3xl">{option.icon}</div>
                </div>
              )}
              <div className="flex-1 pt-1">
                {option.badge && (
                  <div className="mb-2 inline-flex rounded-full bg-[#b2f746] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#003527]">
                    {option.badge}
                  </div>
                )}
                <div
                  className={cn(
                    'text-xl font-extrabold tracking-tight sm:text-2xl',
                    selected ? 'text-[#003527]' : 'text-[#003527]',
                  )}
                >
                  {option.label}
                </div>
                {option.description && (
                  <div className="mt-2 text-sm leading-relaxed text-[#404944]">
                    {option.description}
                  </div>
                )}
                <div className="mt-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[#446900]">
                    Chọn
                    <span aria-hidden className="text-base">
                      →
                    </span>
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  'mt-1 h-5 w-5 rounded-full border-2 transition-colors',
                  selected
                    ? 'border-[#446900] bg-[#446900]'
                    : 'border-[#9fb3aa] bg-white',
                )}
                aria-hidden
              >
                {selected && (
                  <div className="h-full w-full scale-50 rounded-full bg-white" />
                )}
              </div>
            </div>
          </label>
        )
      })}
    </div>
  )
}
