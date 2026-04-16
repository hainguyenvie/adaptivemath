/**
 * Persistent storage for the most recent finished diagnostic session.
 *
 * Phase 2 originally stashed the session in `sessionStorage`, which meant it
 * vanished on tab close and made Phase 3 (Knowledge Profile) unreachable on
 * a fresh visit. We now write to `localStorage` under a versioned envelope
 * and keep a one-release legacy migration path from the old sessionStorage
 * key so existing users don't lose their data.
 */

import { z } from 'zod'
import type { SessionState } from '../types/question'

export const LAST_DIAGNOSTIC_KEY = 'kntt.diagnostic.v1'
const LEGACY_KEY = 'kntt.lastDiagnostic'

/**
 * Runtime schema for a finished diagnostic session. This lived inside
 * `DiagnosticResultPage.tsx` until Phase 3 — the result page and the new
 * profile page now both import it from here.
 *
 * `topicStates` is optional for backward compatibility with pre-Phase-4
 * sessions that predated the ladder selector.
 */
const topicStateSchema = z.object({
  level: z.enum(['N', 'H', 'V', 'T', 'done']),
  wrongsAtLevel: z.union([z.literal(0), z.literal(1)]),
  ceilingLevel: z.enum(['N', 'H', 'V', 'T', 'none']),
})

export const sessionSchema = z.object({
  sessionId: z.string(),
  grade: z.union([z.literal(10), z.literal(11), z.literal(12)]),
  selfLevel: z.enum(['yeu', 'tb', 'kha', 'gioi']),
  theta: z.number(),
  standardError: z.number(),
  responses: z.array(
    z.object({
      questionId: z.string(),
      startedAt: z.number(),
      endedAt: z.number().nullable(),
      score: z.number(),
      answered: z.boolean(),
    }),
  ),
  shownIds: z.array(z.string()),
  sessionStartedAt: z.number(),
  finished: z.boolean(),
  stopReason: z
    .enum([
      'precision-reached',
      'max-items',
      'time-expired',
      'no-more-items',
      'user-cancelled',
      'coverage-complete',
    ])
    .nullable(),
  topicStates: z.record(z.string(), topicStateSchema).default({}),
})

const envelopeSchema = z.object({
  version: z.literal(1),
  savedAt: z.string(),
  session: sessionSchema,
})

/**
 * Persist a finished session. Also mirrors to the legacy sessionStorage key
 * so existing Phase 2 code paths that still read directly from it keep
 * working during the migration window.
 */
export function saveLastDiagnostic(session: SessionState): void {
  try {
    const envelope = {
      version: 1 as const,
      savedAt: new Date().toISOString(),
      session,
    }
    const serialized = JSON.stringify(envelope)
    window.localStorage.setItem(LAST_DIAGNOSTIC_KEY, serialized)
    // Legacy mirror — remove in a future release once all callers use load*.
    window.sessionStorage.setItem(LEGACY_KEY, JSON.stringify(session))
  } catch {
    // Quota errors are the only realistic failure mode here — swallow and
    // let the UI degrade gracefully rather than crash the result page.
  }
}

/**
 * Load the most recent diagnostic session, transparently migrating any
 * legacy sessionStorage blob into localStorage on first read.
 *
 * Returns `null` when no session exists or the stored data fails validation.
 */
export function loadLastDiagnostic(): SessionState | null {
  // 1. Primary store.
  const fromLocal = readEnvelope(
    window.localStorage.getItem(LAST_DIAGNOSTIC_KEY),
  )
  if (fromLocal) return fromLocal

  // 2. Legacy fallback — raw SessionState (not wrapped).
  const legacyRaw = window.sessionStorage.getItem(LEGACY_KEY)
  if (legacyRaw) {
    try {
      const parsed = sessionSchema.safeParse(JSON.parse(legacyRaw))
      if (parsed.success) {
        // Migrate forward so next read hits the primary store.
        saveLastDiagnostic(parsed.data)
        return parsed.data
      }
    } catch {
      /* fall through */
    }
    window.sessionStorage.removeItem(LEGACY_KEY)
  }

  return null
}

export function clearLastDiagnostic(): void {
  window.localStorage.removeItem(LAST_DIAGNOSTIC_KEY)
  window.sessionStorage.removeItem(LEGACY_KEY)
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function readEnvelope(raw: string | null): SessionState | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const validated = envelopeSchema.safeParse(parsed)
    if (validated.success) return validated.data.session
    // Corrupt / out-of-date shape — discard so the next save rebuilds it.
    window.localStorage.removeItem(LAST_DIAGNOSTIC_KEY)
    return null
  } catch {
    window.localStorage.removeItem(LAST_DIAGNOSTIC_KEY)
    return null
  }
}
