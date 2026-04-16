import clsx, { type ClassValue } from 'clsx'

/**
 * Thin wrapper around `clsx` so every component imports from one place.
 * If we add `tailwind-merge` later for conflict resolution, only this file changes.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
