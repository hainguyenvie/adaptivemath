/**
 * Persistence layer for RLHF feedback events.
 *
 * Events are kept in localStorage as a flat JSON array under
 * `kntt.rlhf.v1`. We cap the store at 500 events and drop oldest. The
 * reward model reads events on demand — no in-memory cache, since the
 * store stays small.
 */

import type { FeedbackEvent } from '../../types/rlhf'

const KEY = 'kntt.rlhf.v1'
const MAX_EVENTS = 500

export function loadAllFeedback(): FeedbackEvent[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Light shape validation — drop malformed entries.
    return (parsed as Array<Partial<FeedbackEvent>>)
      .filter(isWellFormed)
      .map((e) => e as FeedbackEvent)
  } catch {
    return []
  }
}

function isWellFormed(e: Partial<FeedbackEvent>): boolean {
  return (
    typeof e?.id === 'string' &&
    typeof e?.source === 'string' &&
    typeof e?.kind === 'string' &&
    typeof e?.rating === 'number' &&
    typeof e?.confidence === 'number' &&
    typeof e?.timestamp === 'string'
  )
}

export function saveFeedback(events: FeedbackEvent[]): void {
  if (typeof window === 'undefined') return
  // Sort by timestamp desc, then keep newest MAX_EVENTS.
  const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const trimmed = sorted.slice(0, MAX_EVENTS)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(trimmed))
  } catch {
    // Quota exceeded — drop half.
    try {
      window.localStorage.setItem(KEY, JSON.stringify(trimmed.slice(0, Math.floor(MAX_EVENTS / 2))))
    } catch {
      /* give up */
    }
  }
}

export function appendFeedback(event: FeedbackEvent): void {
  const existing = loadAllFeedback()
  existing.push(event)
  saveFeedback(existing)
}

/** Insert several events at once (used by seed bootstrap + bulk forms). */
export function appendFeedbackMany(events: FeedbackEvent[]): void {
  if (events.length === 0) return
  const existing = loadAllFeedback()
  saveFeedback([...existing, ...events])
}

export function deleteFeedback(eventId: string): void {
  const remaining = loadAllFeedback().filter((e) => e.id !== eventId)
  saveFeedback(remaining)
}

export function clearAllFeedback(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(KEY)
}

/**
 * Produce a deterministic id for a feedback event. We include the source
 * + kind + topic so duplicates from the same actor about the same thing
 * collapse instead of accumulating.
 */
export function makeFeedbackId(parts: {
  source: string
  kind: string
  authorId?: string
  topicId?: string
  activityId?: string
  timestamp: string
}): string {
  const base = [
    parts.source,
    parts.kind,
    parts.authorId ?? 'anon',
    parts.topicId ?? '_',
    parts.activityId ?? '_',
    parts.timestamp,
  ].join('|')
  // simple djb2 hash to a base36 short string — keeps localStorage small.
  let h = 5381
  for (let i = 0; i < base.length; i++) h = ((h << 5) + h + base.charCodeAt(i)) | 0
  return `fb_${Math.abs(h).toString(36)}`
}

/**
 * Returns only the events that pass the filter — convenience for UI
 * surfaces like the teacher dashboard.
 */
export function filterFeedback(filter: {
  source?: FeedbackEvent['source']
  topicId?: string
  authorId?: string
  sinceIso?: string
}): FeedbackEvent[] {
  return loadAllFeedback().filter((e) => {
    if (filter.source && e.source !== filter.source) return false
    if (filter.topicId && e.topicId !== filter.topicId) return false
    if (filter.authorId && e.authorId !== filter.authorId) return false
    if (filter.sinceIso && e.timestamp < filter.sinceIso) return false
    return true
  })
}

/**
 * Upsert idempotent feedback — overwrites prior events with the same
 * (source, kind, authorId, topicId, activityId) tuple. Useful for "mark
 * priority" toggles where the teacher's latest opinion should replace
 * the earlier one.
 */
export function upsertIdempotent(event: FeedbackEvent): void {
  const existing = loadAllFeedback()
  const filtered = existing.filter(
    (e) =>
      !(
        e.source === event.source &&
        e.kind === event.kind &&
        (e.authorId ?? '') === (event.authorId ?? '') &&
        (e.topicId ?? '') === (event.topicId ?? '') &&
        (e.activityId ?? '') === (event.activityId ?? '')
      ),
  )
  filtered.push(event)
  saveFeedback(filtered)
}
