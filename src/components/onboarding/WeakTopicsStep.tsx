import { useMemo } from 'react'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { getTopicsByGrade, groupTopicsByChapter } from '../../data/topics'
import { cn } from '../../lib/cn'

export function WeakTopicsStep() {
  const { state, dispatch } = useOnboarding()

  // Early guard: the wizard should never land here without a grade, but protect anyway.
  const groups = useMemo(() => {
    if (!state.grade) return []
    return groupTopicsByChapter(state.grade)
  }, [state.grade])

  // Only count selections that actually belong to the currently-visible grade.
  // The reducer clears `weakTopicIds` on grade change, so this is belt-and-suspenders:
  // keeps the count honest even if state drifts for any reason.
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
    <div>
      <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        Chủ đề nào bạn thấy yếu nhất?
      </h2>
      <p className="mb-6 text-slate-600">
        Chọn ít nhất một chủ đề. Đây là gợi ý cho adaptive engine — bạn có thể
        thay đổi bất cứ lúc nào.
      </p>

      <div className="flex items-center justify-between pb-3">
        <span className="text-sm text-slate-500">
          Đã chọn <strong className="text-slate-800">{selected.length}</strong>{' '}
          chủ đề
        </span>
      </div>

      <div className="max-h-[55vh] space-y-5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
        {groups.map((group) => (
          <div key={group.chapter}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.chapter}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.topics.map((topic) => {
                const isSelected = selected.includes(topic.id)
                return (
                  <label
                    key={topic.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition',
                      isSelected
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-brand-600"
                      checked={isSelected}
                      onChange={() => toggleTopic(topic.id)}
                    />
                    <span
                      className={cn(
                        'block font-medium leading-snug',
                        isSelected ? 'text-brand-800' : 'text-slate-700',
                      )}
                    >
                      {topic.title}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
