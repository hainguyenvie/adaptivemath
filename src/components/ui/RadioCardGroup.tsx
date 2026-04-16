import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface RadioCardOption<T extends string | number> {
  value: T
  label: ReactNode
  description?: ReactNode
  icon?: ReactNode
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
              'group relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-5 text-left transition-all',
              'hover:border-brand-400 hover:shadow-md',
              'focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2',
              selected
                ? 'border-brand-500 bg-brand-50 shadow-md'
                : 'border-slate-200 bg-white',
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
                <div className="mt-0.5 text-2xl">{option.icon}</div>
              )}
              <div className="flex-1">
                <div
                  className={cn(
                    'text-base font-semibold sm:text-lg',
                    selected ? 'text-brand-800' : 'text-slate-800',
                  )}
                >
                  {option.label}
                </div>
                {option.description && (
                  <div className="mt-1 text-sm text-slate-500">
                    {option.description}
                  </div>
                )}
              </div>
              <div
                className={cn(
                  'h-5 w-5 rounded-full border-2 transition-colors',
                  selected
                    ? 'border-brand-600 bg-brand-600'
                    : 'border-slate-300 bg-white',
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
