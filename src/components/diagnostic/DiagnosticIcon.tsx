import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type DiagnosticIconName =
  | 'arrow'
  | 'balance'
  | 'brain'
  | 'chart'
  | 'chevronDown'
  | 'chevronUp'
  | 'chip'
  | 'clock'
  | 'close'
  | 'edit'
  | 'flame'
  | 'hub'
  | 'leaf'
  | 'route'
  | 'skip'
  | 'spa'
  | 'topic'
  | 'trend'

interface DiagnosticIconProps {
  name: DiagnosticIconName
  className?: string
}

export function DiagnosticIcon({ name, className }: DiagnosticIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn('h-5 w-5 shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      {paths[name]}
    </svg>
  )
}

const paths: Record<DiagnosticIconName, ReactNode> = {
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  balance: (
    <>
      <path d="M12 4v16" />
      <path d="M6 7h12" />
      <path d="m6 7-3 6h6L6 7Z" />
      <path d="m18 7-3 6h6l-3-6Z" />
    </>
  ),
  brain: (
    <>
      <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5.5A3.5 3.5 0 0 0 7.5 18H10V4H9Z" />
      <path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5.5A3.5 3.5 0 0 1 16.5 18H14V4h1Z" />
      <path d="M8 9h2" />
      <path d="M14 9h2" />
      <path d="M8 14h2" />
      <path d="M14 14h2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 4-4 3 3 5-7" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronUp: <path d="m18 15-6-6-6 6" />,
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M9 1v3" />
      <path d="M15 1v3" />
      <path d="M9 20v3" />
      <path d="M15 20v3" />
      <path d="M20 9h3" />
      <path d="M20 15h3" />
      <path d="M1 9h3" />
      <path d="M1 15h3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m14 6 4 4" />
    </>
  ),
  flame: (
    <>
      <path d="M12 22c4 0 7-3 7-7 0-3-2-5-4-7 .5 3-1 4-2 5 .5-4-2-7-5-9 .5 4-3 6-3 11 0 4 3 7 7 7Z" />
      <path d="M12 18c1.5 0 2.5-1 2.5-2.5 0-1-.6-1.9-1.5-2.5 0 1.5-.9 2-1.5 2.5.2-1.6-.7-2.8-1.8-3.5.2 2-1.2 3-1.2 4.7 0 1.3 1 2.3 3.5 1.3Z" />
    </>
  ),
  hub: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="m7 7.5 3 2.5" />
      <path d="m17 7.5-3 2.5" />
      <path d="m7 16.5 3-2.5" />
      <path d="m17 16.5-3-2.5" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 20c10 0 15-8 15-16-8 0-15 5-15 16Z" />
      <path d="M5 20c3-7 7-10 13-14" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M9 6h3a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h6" />
    </>
  ),
  skip: (
    <>
      <path d="m5 5 8 7-8 7V5Z" />
      <path d="M19 5v14" />
    </>
  ),
  spa: (
    <>
      <path d="M12 20c-5-2-8-5-8-10 4 0 7 2 8 6 1-4 4-6 8-6 0 5-3 8-8 10Z" />
      <path d="M12 16V8" />
    </>
  ),
  topic: (
    <>
      <path d="M5 5h14v14H5z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </>
  ),
  trend: (
    <>
      <path d="M4 17 10 11l4 4 6-8" />
      <path d="M14 7h6v6" />
    </>
  ),
}
