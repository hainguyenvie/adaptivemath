import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar } from '../components/layout/AppSidebar'
import { RoleFeedbackForm } from '../components/rlhf/RoleFeedbackForm'
import { TopBanner } from './TeacherDashboardPage'
import { loadProfile } from '../lib/storage'
import { loadLearnerState } from '../lib/learnerStorage'
import { PARENTS } from '../data/parentNotes'
import { loadAllFeedback, upsertIdempotent, makeFeedbackId } from '../lib/rlhf/feedbackStore'
import { ensureRlhfSeed } from '../lib/rlhf/seedBootstrap'
import { rollupBySource } from '../lib/rlhf/rewardModel'
import { cn } from '../lib/cn'
import type { FeedbackEvent } from '../types/rlhf'
import { SOURCE_META } from '../types/rlhf'

export function ParentDashboardPage() {
  const navigate = useNavigate()
  const profile = loadProfile()
  const learner = loadLearnerState()

  if (profile) ensureRlhfSeed(profile.grade)

  const [activeParentId, setActiveParentId] = useState<string>(PARENTS[0]?.id ?? '')
  const [refreshKey, setRefreshKey] = useState(0)
  const activeParent = PARENTS.find((p) => p.id === activeParentId) ?? PARENTS[0]

  const allFeedback = loadAllFeedback()
  void refreshKey

  const myFeedback = useMemo(
    () => allFeedback.filter((e) => e.source === 'parent' && e.authorId === activeParent?.id),
    [allFeedback, activeParent],
  )
  const rollup = useMemo(() => rollupBySource(allFeedback), [allFeedback])
  const [nowMs] = useState(() => Date.now())
  const sessionsLast30 = useMemo(() => {
    const cutoff = nowMs - 30 * 86_400_000
    return learner.sessions.filter((s) => Date.parse(s.date) >= cutoff).length
  }, [learner.sessions, nowMs])

  if (!profile) {
    return (
      <div className="bg-bioluminescent min-h-screen">
        <AppSidebar />
        <main className="lg:ml-72">
          <div className="mx-auto max-w-2xl space-y-4 p-8 pt-32 text-center">
            <p className="text-5xl">👪</p>
            <h1 className="text-3xl font-extrabold text-[#003527]">
              Vai trò Phụ huynh
            </h1>
            <p className="text-base text-[#404944]">
              Cần có hồ sơ học sinh trước khi phụ huynh có thể cho phản hồi.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-bioluminescent min-h-screen">
      <AppSidebar />
      <main className="lg:ml-72">
        <TopBanner
          title="Vai trò Phụ huynh"
          subtitle={`Trọng số 0.15 trong RLHF · Streak hiện tại: ${learner.gamification.currentStreak} ngày`}
          accent="#a16207"
          icon="family_restroom"
          onHome={() => navigate('/')}
        />

        <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-28 sm:px-8 sm:pt-32">
          <section className="space-y-1.5">
            <h1 className="text-3xl font-extrabold text-[#003527] sm:text-4xl">
              Bảng phụ huynh · RLHF
            </h1>
            <p className="max-w-2xl text-base text-[#404944]">
              Quan sát con từ phía gia đình — đều đặn, tâm trạng, kỷ luật, mục
              tiêu tuần. Tín hiệu của phụ huynh được nhân trọng số <b>0.15</b>{' '}
              và clamp ±0.75 để không lấn át tín hiệu chuyên môn của giáo viên.
            </p>
          </section>

          {/* Parent selector */}
          <div className="flex flex-wrap gap-2">
            {PARENTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveParentId(p.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition',
                  activeParentId === p.id
                    ? 'border-amber-400 bg-amber-50 text-amber-900'
                    : 'border-white bg-white/85 text-[#003527] hover:border-amber-200',
                )}
              >
                <span className="text-base">{p.avatar}</span>
                {p.displayName}
              </button>
            ))}
          </div>

          {/* At-a-glance learning habits */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Chuỗi ngày" value={`${learner.gamification.currentStreak}`} hint="Học sinh đang giữ" />
            <Stat label="XP tích luỹ" value={`${learner.gamification.xp}`} hint="Tổng đến nay" />
            <Stat
              label="Phiên 30 ngày qua"
              value={`${sessionsLast30}`}
              hint="Tần suất luyện tập"
            />
          </div>

          {/* Source roll-up */}
          <section className="rounded-[2rem] border border-amber-100 bg-amber-50/40 p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
              Tổng quan các nguồn phản hồi RLHF
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {rollup.map((r) => {
                const meta = SOURCE_META[r.source]
                return (
                  <div
                    key={r.source}
                    className={cn(
                      'rounded-2xl border bg-white px-3 py-2',
                      meta.tint,
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
                      {meta.label}
                    </p>
                    <p className="text-lg font-extrabold tabular-nums text-[#003527]">
                      {r.count}
                    </p>
                    <p className="text-[10px]">
                      rating TB {r.meanRating >= 0 ? '+' : ''}
                      {r.meanRating.toFixed(2)}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Composer (general — no topic) */}
          {activeParent && (
            <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <RoleFeedbackForm
                role="parent"
                authorId={activeParent.id}
                authorName={activeParent.displayName}
                onSubmitted={() => setRefreshKey((k) => k + 1)}
              />
              <ParentTemplates
                parentId={activeParent.id}
                parentName={activeParent.displayName}
                onApplied={() => setRefreshKey((k) => k + 1)}
              />
            </section>
          )}

          {/* History */}
          <section className="rounded-[2rem] border border-amber-100 bg-white p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
              Ghi chú của bạn ({myFeedback.length})
            </p>
            <ul className="space-y-1.5">
              {myFeedback
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .slice(0, 15)
                .map((e) => (
                  <li
                    key={e.id}
                    className="rounded-xl border border-amber-100 bg-amber-50/30 px-3 py-2"
                  >
                    <p className="text-xs font-bold text-amber-900">
                      {labelForKind(e.kind)} · {timeAgo(e.timestamp)}
                    </p>
                    {e.note && (
                      <p className="mt-0.5 text-sm italic text-[#404944]">"{e.note}"</p>
                    )}
                    <p className="mt-1 text-[10px] text-amber-700/80">
                      rating {e.rating >= 0 ? '+' : ''}
                      {e.rating.toFixed(2)} · conf {e.confidence.toFixed(2)}
                    </p>
                  </li>
                ))}
              {myFeedback.length === 0 && (
                <p className="text-xs italic text-slate-500">Chưa có ghi chú.</p>
              )}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}

function ParentTemplates({
  parentId,
  parentName,
  onApplied,
}: {
  parentId: string
  parentName: string
  onApplied: () => void
}) {
  const templates: Array<{ label: string; kind: FeedbackEvent['kind']; rating: number; note: string }> = [
    { label: 'Tuần này đều đặn', kind: 'regularity', rating: 0.6, note: 'Học đều đặn mỗi tối 30 phút.' },
    { label: 'Mất tập trung điện thoại', kind: 'concern', rating: -0.55, note: 'Hay bị phân tâm bởi điện thoại.' },
    { label: 'Có dấu hiệu căng thẳng', kind: 'mood', rating: -0.4, note: 'Cảm thấy con đang căng thẳng với khối lượng học.' },
    { label: 'Tuần sau tập trung Đại số', kind: 'goal', rating: 0.5, note: 'Gia đình mong con tập trung Đại số tuần tới.' },
  ]
  return (
    <div className="rounded-[1.6rem] border border-amber-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
        Mẫu nhanh
      </p>
      <p className="text-sm font-extrabold text-[#003527]">
        Chọn một mẫu để gửi nhanh
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {templates.map((tpl) => (
          <button
            key={tpl.label}
            type="button"
            onClick={() => {
              const timestamp = new Date().toISOString()
              upsertIdempotent({
                id: makeFeedbackId({
                  source: 'parent',
                  kind: tpl.kind,
                  authorId: parentId,
                  timestamp,
                }),
                source: 'parent',
                kind: tpl.kind,
                rating: tpl.rating,
                confidence: 0.6,
                timestamp,
                authorId: parentId,
                authorName: parentName,
                note: tpl.note,
              })
              onApplied()
            }}
            className="rounded-2xl border border-amber-200 bg-amber-50/40 px-3 py-2 text-left text-xs font-bold text-amber-900 transition hover:border-amber-400 hover:bg-amber-50"
          >
            {tpl.label}
            <span className="block text-[10px] font-medium text-amber-700/80">
              {tpl.rating >= 0 ? '+' : ''}
              {tpl.rating.toFixed(2)} · {tpl.kind}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
        {label}
      </p>
      <p className="text-2xl font-extrabold tabular-nums text-[#003527]">
        {value}
      </p>
      <p className="text-[11px] text-amber-700/80">{hint}</p>
    </div>
  )
}

function labelForKind(kind: FeedbackEvent['kind']): string {
  const map: Record<string, string> = {
    regularity: 'Đều đặn',
    mood: 'Tâm trạng',
    concern: 'Lo lắng',
    goal: 'Mục tiêu',
    priority: 'Ưu tiên',
    comment: 'Bình luận',
    approve: 'Đồng ý',
    reject: 'Hoãn',
    suitability: 'Phù hợp',
    session_self: 'Tự đánh giá',
  }
  return map[kind] ?? kind
}

function timeAgo(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return iso
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return 'vừa xong'
  if (diff < 3600) return `${Math.round(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.round(diff / 3600)} giờ trước`
  return `${Math.round(diff / 86400)} ngày trước`
}
