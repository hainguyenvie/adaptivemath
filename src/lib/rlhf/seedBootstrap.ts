/**
 * Bootstrap seed for RLHF feedback corpus.
 *
 * On first visit, we inject ~25 mock teacher/parent/peer feedback events
 * so the reranker has signal to demo. The events are deterministic per
 * grade so reloading produces stable results. After bootstrap, real
 * student/teacher/parent interactions add new events on top.
 *
 * The boot uses an idempotent guard — once `kntt.rlhf.seeded` is true,
 * the seeder no-ops (otherwise reloading the page would duplicate every
 * mock event).
 */

import type { FeedbackEvent } from '../../types/rlhf'
import { TOPICS } from '../../data/topics'
import { TEACHERS } from '../../data/teacherDirectory'
import { PARENTS } from '../../data/parentNotes'
import { PEER_OUTCOMES } from '../../data/peerOutcomes'
import { appendFeedbackMany, loadAllFeedback, makeFeedbackId } from './feedbackStore'

const SEED_FLAG = 'kntt.rlhf.seeded.v1'

/** Idempotent — call at app boot. Safe to call multiple times. */
export function ensureRlhfSeed(currentGrade: 10 | 11 | 12): void {
  if (typeof window === 'undefined') return
  if (window.localStorage.getItem(SEED_FLAG)) return
  const events = generateSeedEvents(currentGrade)
  appendFeedbackMany(events)
  window.localStorage.setItem(SEED_FLAG, '1')
}

/** Wipe the seed flag — used by "reset all data" affordance. */
export function clearSeedFlag(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SEED_FLAG)
}

/**
 * Diagnostic helper — re-seed without wiping existing events. Useful in
 * dev when you want richer signal for screenshots.
 */
export function reseedRlhf(currentGrade: 10 | 11 | 12): number {
  const events = generateSeedEvents(currentGrade)
  const before = loadAllFeedback().length
  appendFeedbackMany(events)
  return loadAllFeedback().length - before
}

// ---------------------------------------------------------------------------
// Seed generation
// ---------------------------------------------------------------------------

function generateSeedEvents(currentGrade: 10 | 11 | 12): FeedbackEvent[] {
  const out: FeedbackEvent[] = []
  const gradeTopics = TOPICS.filter((t) => t.grade === currentGrade)
  const now = Date.now()

  // ---- Teacher feedback ----
  for (const teacher of TEACHERS) {
    // Each teacher comments on up to 2 of their topics in this grade.
    const ownInGrade = teacher.topicIds.filter((tid) => {
      const meta = TOPICS.find((t) => t.id === tid)
      return meta?.grade === currentGrade
    })
    for (let i = 0; i < Math.min(2, ownInGrade.length); i++) {
      const tid = ownInGrade[i]
      const timestamp = isoDaysAgo(now, 12 - i * 3)
      // Priority mark — positive but moderate confidence.
      out.push({
        id: makeFeedbackId({
          source: 'teacher',
          kind: 'priority',
          authorId: teacher.id,
          topicId: tid,
          timestamp,
        }),
        source: 'teacher',
        kind: 'priority',
        topicId: tid,
        rating: 0.7,
        confidence: 0.9,
        timestamp,
        authorId: teacher.id,
        authorName: teacher.displayName,
        note: teacher.topicNotes?.[tid] ?? teacher.comments[0],
      })
    }
    // A general comment.
    if (teacher.comments.length > 0) {
      const timestamp = isoDaysAgo(now, 5)
      out.push({
        id: makeFeedbackId({
          source: 'teacher',
          kind: 'comment',
          authorId: teacher.id,
          timestamp,
        }),
        source: 'teacher',
        kind: 'comment',
        rating: 0.3,
        confidence: 0.6,
        timestamp,
        authorId: teacher.id,
        authorName: teacher.displayName,
        note: teacher.comments[0],
      })
    }
  }

  // ---- Parent feedback ----
  for (const parent of PARENTS) {
    parent.notes.forEach((note, idx) => {
      const kind = idx % 3 === 0 ? 'regularity' : idx % 3 === 1 ? 'mood' : 'concern'
      // Naive tone scoring.
      const lower = note.toLowerCase()
      const positive = ['đều', 'tập trung', 'đáng khen', 'tự tin', 'duy trì'].some((w) =>
        lower.includes(w),
      )
      const negative = ['nản', 'phân tâm', 'mất tập trung', 'điện thoại', 'cần'].some((w) =>
        lower.includes(w),
      )
      const rating = positive ? 0.5 : negative ? -0.45 : 0.1
      const timestamp = isoDaysAgo(now, 2 + idx)
      out.push({
        id: makeFeedbackId({
          source: 'parent',
          kind,
          authorId: parent.id,
          timestamp,
        }),
        source: 'parent',
        kind: kind as FeedbackEvent['kind'],
        rating,
        confidence: 0.6,
        timestamp,
        authorId: parent.id,
        authorName: parent.displayName,
        note,
      })
    })
  }

  // ---- Peer feedback derived from peer outcomes ----
  // For each peer outcome whose topic exists in the current grade, emit a
  // positive peer signal proportional to mean improvement.
  for (const outcome of PEER_OUTCOMES) {
    const topicMeta = TOPICS.find((t) => t.id === outcome.topicId)
    if (!topicMeta || topicMeta.grade !== currentGrade) continue
    const timestamp = isoDaysAgo(now, 6)
    out.push({
      id: makeFeedbackId({
        source: 'peer',
        kind: 'peer_outcome',
        authorId: outcome.id,
        topicId: outcome.topicId,
        timestamp,
      }),
      source: 'peer',
      kind: 'peer_outcome',
      topicId: outcome.topicId,
      rating: Math.min(1, outcome.meanImprovement * 2.4),
      confidence: Math.min(1, outcome.cohortSize / 25),
      timestamp,
      authorId: outcome.id,
      authorName: `${outcome.cohortSize} bạn`,
      note: outcome.story,
    })
  }

  // ---- A handful of synthetic self-ratings to bootstrap the audit log ----
  if (gradeTopics.length > 0) {
    const seedTopics = gradeTopics.slice(0, Math.min(3, gradeTopics.length))
    seedTopics.forEach((t, i) => {
      const timestamp = isoDaysAgo(now, 1 + i)
      out.push({
        id: makeFeedbackId({
          source: 'self',
          kind: 'session_self',
          topicId: t.id,
          timestamp,
        }),
        source: 'self',
        kind: 'session_self',
        topicId: t.id,
        rating: i === 0 ? 0.4 : i === 1 ? -0.2 : 0.15,
        confidence: 0.55,
        timestamp,
        authorId: 'self',
        authorName: 'Tự đánh giá',
        note: i === 0 ? 'Khá tự tin hôm nay.' : i === 1 ? 'Hơi quá tải, cần nghỉ.' : 'Bình thường.',
      })
    })
  }

  return out
}

function isoDaysAgo(nowMs: number, days: number): string {
  return new Date(nowMs - days * 86_400_000).toISOString()
}
