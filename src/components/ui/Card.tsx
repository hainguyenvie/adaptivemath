import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8',
        className,
      )}
    >
      {children}
    </div>
  )
}
