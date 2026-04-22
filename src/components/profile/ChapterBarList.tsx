import { useMemo, useState } from 'react'
import type { ChapterMastery, TopicMastery } from '../../types/profile'
import { MASTERY_BANDS } from '../../types/profile'
import { cn } from '../../lib/cn'
import {
  BAND_BAR_CLASS,
  BAND_CHIP_CLASS,
} from './MasteryBandLegend'

interface ChapterBarListProps {
  topics: TopicMastery[]
  chapters: ChapterMastery[]
}

/**
 * Grouped, collapsible mastery bars — one section per chapter, each topic
 * rendered with a horizontal bar colored by band plus raw counts on the
 * right. Sorted within each chapter by mastery ascending so the weakest
 * items surface first.
 */
export function ChapterBarList({ topics, chapters }: ChapterBarListProps) {
  const grouped = useMemo(() => groupTopics(topics, chapters), [topics, chapters])

  // All chapters open by default — a student scanning their profile wants
  // to see everything. They can collapse chapters they've already reviewed.
  const [openChapters, setOpenChapters] = useState<Set<string>>(
    () => new Set(grouped.map((g) => g.chapter.chapterTitle)),
  )

  const toggle = (chapterTitle: string) => {
    setOpenChapters((prev) => {
      const next = new Set(prev)
      if (next.has(chapterTitle)) next.delete(chapterTitle)
      else next.add(chapterTitle)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {grouped.map(({ chapter, topics }) => {
        const open = openChapters.has(chapter.chapterTitle)
        return (
          <div
            key={chapter.chapterTitle}
            className="overflow-hidden rounded-2xl border border-[#cdeedd]"
          >
            <button
              type="button"
              onClick={() => toggle(chapter.chapterTitle)}
              className="flex w-full items-center justify-between gap-4 bg-[#f4fff9] px-5 py-3 text-left transition hover:bg-[#e4fbef]"
              aria-expanded={open}
            >
              <div className="flex items-center gap-3">
                <span className="text-[#9fb3aa]">{open ? '▾' : '▸'}</span>
                <div>
                  <div className="font-black text-[#003527]">
                    {chapter.chapterTitle}
                  </div>
                  <div className="text-xs text-[#9fb3aa]">
                    {chapter.testedCount}/{chapter.topicCount} chủ đề đã kiểm tra
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MiniBar value={chapter.mastery} />
                <span className="tabular-nums text-sm font-black text-[#446900]">
                  {(chapter.mastery * 100).toFixed(0)}%
                </span>
              </div>
            </button>

            {open && (
              <div className="space-y-2 border-l-4 border-[#e4fbef] bg-white px-5 py-4">
                {topics.map((t) => (
                  <TopicRow key={t.topicId} topic={t} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Topic row
// ---------------------------------------------------------------------------

function TopicRow({ topic }: { topic: TopicMastery }) {
  const bandMeta = MASTERY_BANDS.find((b) => b.id === topic.band)!
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn('truncate font-medium', topic.tested ? 'text-slate-800' : 'text-slate-500 italic')}
          >
            {topic.title}
          </span>
          <span
            className={cn(
              'shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
              BAND_CHIP_CLASS[topic.band],
            )}
          >
            {bandMeta.label}
          </span>
        </div>
        <div className="flex items-center gap-3 tabular-nums text-xs text-slate-500">
          <span>{(topic.mastery * 100).toFixed(0)}%</span>
          <span>
            {topic.tested ? (
              <>
                {topic.attempts}{' '}
                {topic.attempts === 1 ? 'câu' : 'câu'}
              </>
            ) : (
              'ước lượng từ θ'
            )}
          </span>
        </div>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            'h-full rounded-full',
            BAND_BAR_CLASS[topic.band],
            !topic.tested && 'opacity-60',
          )}
          style={{ width: `${Math.max(2, topic.mastery * 100)}%` }}
        />
        {!topic.tested && (
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(100,116,139,0.3) 4px, rgba(100,116,139,0.3) 8px)',
            }}
          />
        )}
      </div>
    </div>
  )
}

function MiniBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#cdeedd]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#34d399]"
        style={{ width: `${value * 100}%` }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sorting / grouping helpers
// ---------------------------------------------------------------------------

interface Group {
  chapter: ChapterMastery
  topics: TopicMastery[]
}

function groupTopics(
  topics: TopicMastery[],
  chapters: ChapterMastery[],
): Group[] {
  const byChapter = new Map<string, TopicMastery[]>()
  for (const t of topics) {
    const bucket = byChapter.get(t.chapterTitle) ?? []
    bucket.push(t)
    byChapter.set(t.chapterTitle, bucket)
  }
  // Sort topics inside each chapter — weakest first so the student sees
  // what needs work at the top.
  for (const bucket of byChapter.values()) {
    bucket.sort((a, b) => a.mastery - b.mastery)
  }
  return chapters.map((chapter) => ({
    chapter,
    topics: byChapter.get(chapter.chapterTitle) ?? [],
  }))
}
