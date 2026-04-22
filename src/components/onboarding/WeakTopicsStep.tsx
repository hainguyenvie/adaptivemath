import { useMemo } from 'react'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { getTopicsByGrade, groupTopicsByChapter } from '../../data/topics'
import { cn } from '../../lib/cn'

const CHAPTER_ACCENTS = [
  {
    panel: 'from-[#f4ffe8] to-[#e7fff3]',
    chip: 'bg-[#b2f746]',
    text: 'text-[#446900]',
  },
  {
    panel: 'from-[#ecfff6] to-[#f6fffb]',
    chip: 'bg-[#95d3ba]',
    text: 'text-[#0b513d]',
  },
  {
    panel: 'from-[#eef8ff] to-[#fbfdff]',
    chip: 'bg-[#9bc9ea]',
    text: 'text-[#245573]',
  },
  {
    panel: 'from-[#fff8df] to-[#fffdf4]',
    chip: 'bg-[#f9d66a]',
    text: 'text-[#725c10]',
  },
  {
    panel: 'from-[#fff0f6] to-[#fffafd]',
    chip: 'bg-[#f4a7c3]',
    text: 'text-[#7a2d4c]',
  },
  {
    panel: 'from-[#f1f0ff] to-[#fbfbff]',
    chip: 'bg-[#a7a6f7]',
    text: 'text-[#3f3c84]',
  },
] as const

export function WeakTopicsStep() {
  const { state, dispatch } = useOnboarding()

  const groups = useMemo(() => {
    if (!state.grade) return []
    return groupTopicsByChapter(state.grade)
  }, [state.grade])

  const validIdsForGrade = useMemo(() => {
    if (!state.grade) return new Set<string>()
    return new Set(getTopicsByGrade(state.grade).map((topic) => topic.id))
  }, [state.grade])

  const selected = (state.weakTopicIds ?? []).filter((id) =>
    validIdsForGrade.has(id),
  )

  const toggleTopic = (topicId: string) => {
    const next = selected.includes(topicId)
      ? selected.filter((id) => id !== topicId)
      : [...selected, topicId]
    dispatch({ type: 'set', payload: { weakTopicIds: next } })
  }

  if (!state.grade) {
    return (
      <p className="text-slate-600">
        Vui lòng quay lại chọn lớp trước khi chọn chủ đề yếu.
      </p>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 text-center">
        <h2 className="mx-auto max-w-4xl text-3xl font-extrabold leading-[1.05] tracking-tight text-[#003527] sm:text-4xl">
          Chủ đề nào bạn thấy yếu nhất?
        </h2>
        <p className="mx-auto max-w-3xl text-sm leading-relaxed text-[#646f6a] sm:text-base">
          Chọn ít nhất một chủ đề. Đây là gợi ý cho adaptive engine - bạn có thể
          thay đổi bất cứ lúc nào.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="inline-flex items-center gap-3 rounded-full border border-[#d9e8de] bg-white px-4 py-2 text-sm font-semibold text-[#40544d] shadow-[0_8px_22px_rgba(0,53,39,0.05)]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#b2f746] text-[#223600] shadow-[0_6px_14px_rgba(178,247,70,0.28)]">
            {selected.length}
          </span>
          chủ đề đã chọn
        </div>
        <div className="hidden rounded-full bg-[#0b513d] px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(11,81,61,0.16)] sm:block">
          Chọn dạng tag
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(0,53,39,0.06)]">
        <div className="h-full space-y-4 overflow-y-auto pr-1">
          {groups.map((group, index) => {
            const accent = CHAPTER_ACCENTS[index % CHAPTER_ACCENTS.length]
            return (
              <section
                key={group.chapter}
                className={cn(
                  'rounded-[1.6rem] bg-gradient-to-br p-4 shadow-[0_10px_28px_rgba(0,53,39,0.04)] ring-1 ring-white/80',
                  accent.panel,
                )}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-[#002117] shadow-[0_8px_18px_rgba(0,53,39,0.08)]',
                      accent.chip,
                    )}
                  >
                    {index + 1}
                  </span>
                  <h3
                    className={cn(
                      'text-sm font-extrabold uppercase tracking-[0.22em]',
                      accent.text,
                    )}
                  >
                    {group.chapter}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {group.topics.map((topic) => {
                    const isSelected = selected.includes(topic.id)
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.id)}
                        className={cn(
                          'group inline-flex min-h-[58px] items-center gap-3 rounded-full border-2 px-5 py-3 text-left transition-all duration-300',
                          isSelected
                            ? 'scale-[1.02] border-[#446900] bg-[#b2f746] text-[#002117] shadow-[0_16px_34px_rgba(178,247,70,0.30)]'
                            : 'border-white bg-white/90 text-[#294e3f] shadow-[0_6px_18px_rgba(0,53,39,0.05)] hover:-translate-y-0.5 hover:border-[#95d3ba] hover:bg-white hover:shadow-[0_12px_26px_rgba(0,53,39,0.09)]',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-extrabold transition-all duration-300',
                            isSelected
                              ? 'rotate-45 bg-[#002117] text-white'
                              : 'bg-[#eff8f1] text-[#446900] group-hover:bg-[#dff8ea]',
                          )}
                          aria-hidden
                        >
                          +
                        </span>
                        <span className="text-lg font-extrabold leading-snug">
                          {topic.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
