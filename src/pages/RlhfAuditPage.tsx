import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar } from '../components/layout/AppSidebar'
import { TopBanner } from './TeacherDashboardPage'
import { RewardBreakdownCard } from '../components/rlhf/RewardBreakdownCard'
import { loadProfile } from '../lib/storage'
import { loadLastDiagnostic } from '../lib/diagnosticStorage'
import { loadLearnerState } from '../lib/learnerStorage'
import { loadLearningPath } from '../lib/pathStorage'
import { QUESTION_BANK } from '../lib/questionBank'
import { TOPICS, getTopicById } from '../data/topics'
import { buildKnowledgeProfile } from '../lib/profiling'
import { generateLearningPath } from '../lib/pathGenerator'
import { rerankPriorities, summarizeReranker } from '../lib/rlhf/reranker'
import {
  loadAllFeedback,
  clearAllFeedback,
} from '../lib/rlhf/feedbackStore'
import { rollupBySource, adjustedWeights, daysUntilDeadline } from '../lib/rlhf/rewardModel'
import { ensureRlhfSeed, reseedRlhf, clearSeedFlag } from '../lib/rlhf/seedBootstrap'
import { SOURCE_META, type FeedbackEvent } from '../types/rlhf'
import { cn } from '../lib/cn'

export function RlhfAuditPage() {
  const navigate = useNavigate()
  const profile = loadProfile()
  const diagnostic = profile ? loadLastDiagnostic() : null
  const learner = loadLearnerState()

  if (profile) ensureRlhfSeed(profile.grade)

  const [refreshKey, setRefreshKey] = useState(0)
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  const allFeedback = loadAllFeedback()
  void refreshKey

  // Generate or load a learning path to feed into the reranker.
  const reranker = useMemo(() => {
    if (!profile || !diagnostic) return null
    let path = loadLearningPath()
    if (!path) {
      // Compute on the fly so the audit always has data to reorder.
      const pool = QUESTION_BANK.questions.filter(
        (q) => q.grade === diagnostic.grade,
      )
      const knowledge = buildKnowledgeProfile(diagnostic, profile, pool, TOPICS)
      path = generateLearningPath(profile, knowledge, pool, learner)
    }
    return rerankPriorities({
      priorityList: path.priorityList,
      events: allFeedback,
      deadline: profile.deadline,
    })
  }, [profile, diagnostic, learner, allFeedback])

  if (!profile || !diagnostic) {
    return (
      <div className="bg-bioluminescent min-h-screen">
        <AppSidebar />
        <main className="lg:ml-72">
          <div className="mx-auto max-w-2xl space-y-4 p-8 pt-32 text-center">
            <p className="text-5xl">📊</p>
            <h1 className="text-3xl font-extrabold text-[#003527]">
              RLHF Audit
            </h1>
            <p className="text-base text-[#404944]">
              Cần có hồ sơ học sinh + bài chẩn đoán để xem audit RLHF.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const rollup = rollupBySource(allFeedback)
  const summary = reranker ? summarizeReranker(reranker) : null
  const daysToExam = daysUntilDeadline(profile.deadline)
  const weights = adjustedWeights(daysToExam)
  const filtered =
    sourceFilter === 'all'
      ? allFeedback
      : allFeedback.filter((e) => e.source === sourceFilter)

  return (
    <div className="bg-bioluminescent min-h-screen">
      <AppSidebar />
      <main className="lg:ml-72">
        <TopBanner
          title="RLHF Audit"
          subtitle={`${allFeedback.length} feedback events · ${reranker?.topics.length ?? 0} topic reranked`}
          accent="#0f766e"
          icon="account_tree"
          onHome={() => navigate('/')}
        />

        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-28 sm:px-8 sm:pt-32">
          <section className="space-y-1.5">
            <h1 className="text-3xl font-extrabold text-[#003527] sm:text-4xl">
              Audit · RLHF đa nguồn
            </h1>
            <p className="max-w-3xl text-base text-[#404944]">
              Mọi tín hiệu phản hồi từ 5 nguồn được tổng hợp thành reward và
              tái xếp hạng chủ đề. Trang này hiển thị các trọng số đang
              dùng, lịch sử feedback, cảnh báo mâu thuẫn, và thay đổi thứ
              hạng so với pathGenerator gốc.
            </p>
          </section>

          {/* Weights snapshot */}
          <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm">
            <header className="flex items-baseline justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b6954]">
                  Trọng số đang dùng
                </p>
                <h3 className="text-base font-extrabold text-[#003527]">
                  R = Σ wₛ × clamp(R̄ₛ)
                </h3>
              </div>
              {daysToExam !== null && daysToExam < 30 && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-900">
                  Tăng GV vì còn {daysToExam.toFixed(0)} ngày
                </span>
              )}
            </header>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(['system', 'teacher', 'parent', 'self', 'peer'] as const).map((s) => {
                const meta = SOURCE_META[s]
                return (
                  <div
                    key={s}
                    className={cn('rounded-2xl border bg-white px-3 py-2', meta.tint)}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
                      {meta.label}
                    </p>
                    <p className="text-xl font-extrabold tabular-nums text-[#003527]">
                      {weights[s].toFixed(2)}
                    </p>
                    <p className="text-[10px]">w<sub>{s}</sub></p>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] text-[#446900]">
              Clamp: system/teacher ±1.00 · parent ±0.75 · self/peer ±0.50 ·
              Recency decay {0.7} · Cửa sổ contradiction 3 chủ đề ·
              Ngưỡng |Δ| 0.45.
            </p>
          </section>

          {/* Source roll-up */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {rollup.map((r) => {
              const meta = SOURCE_META[r.source]
              return (
                <button
                  key={r.source}
                  type="button"
                  onClick={() =>
                    setSourceFilter(sourceFilter === r.source ? 'all' : r.source)
                  }
                  className={cn(
                    'rounded-2xl border bg-white px-4 py-3 text-left transition',
                    sourceFilter === r.source
                      ? 'ring-2 ring-emerald-400'
                      : 'hover:-translate-y-0.5',
                    meta.tint,
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
                    {meta.label}
                  </p>
                  <p className="text-2xl font-extrabold tabular-nums text-[#003527]">
                    {r.count}
                  </p>
                  <p className="text-[10px]">
                    rating TB {r.meanRating >= 0 ? '+' : ''}
                    {r.meanRating.toFixed(2)}
                  </p>
                </button>
              )
            })}
          </section>

          {/* Reranker summary */}
          {reranker && summary && (
            <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm">
              <header className="flex items-baseline justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b6954]">
                    Reranker output
                  </p>
                  <h3 className="text-base font-extrabold text-[#003527]">
                    Tái xếp hạng chủ đề · α = {reranker.alpha}
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-900">
                  ↑ {summary.promoted} · ↓ {summary.demoted} · = {summary.unchanged}
                </span>
              </header>

              {reranker.needsMoreData && (
                <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                  ⚠ Một số chủ đề có phản hồi mâu thuẫn — α tự động giảm
                  xuống 0.2 cho đến khi có thêm dữ liệu.
                </div>
              )}

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-[0.14em] text-[#446900]">
                      <th className="p-2">#</th>
                      <th className="p-2">Chủ đề</th>
                      <th className="p-2 text-right">base score</th>
                      <th className="p-2 text-right">R</th>
                      <th className="p-2 text-right">final</th>
                      <th className="p-2 text-center">Δ rank</th>
                      <th className="p-2">cờ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reranker.topics.map((r) => {
                      const topic = getTopicById(r.topicId)
                      return (
                        <tr
                          key={r.topicId}
                          className="border-b border-slate-100 align-top"
                        >
                          <td className="p-2 tabular-nums font-bold text-[#003527]">
                            {r.newRank}
                          </td>
                          <td className="p-2">
                            <p className="font-bold text-[#003527]">
                              {topic?.title ?? r.topicId}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {topic?.chapterTitle}
                            </p>
                          </td>
                          <td className="p-2 text-right font-mono text-[11px] tabular-nums">
                            {r.baseScore.toFixed(3)}
                          </td>
                          <td
                            className={cn(
                              'p-2 text-right font-mono text-[11px] tabular-nums',
                              r.reward >= 0.05
                                ? 'text-emerald-700'
                                : r.reward <= -0.05
                                  ? 'text-rose-700'
                                  : 'text-slate-500',
                            )}
                          >
                            {r.reward >= 0 ? '+' : ''}
                            {r.reward.toFixed(3)}
                          </td>
                          <td className="p-2 text-right font-mono text-[11px] font-bold tabular-nums text-[#003527]">
                            {r.finalScore.toFixed(3)}
                          </td>
                          <td className="p-2 text-center">
                            <RankDelta delta={r.rankDelta} />
                          </td>
                          <td className="p-2 text-[10px] text-amber-700">
                            {reranker.flagsByTopic[r.topicId] ?? ''}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Top reward breakdowns */}
          {reranker && (
            <section>
              <h2 className="mb-3 text-xl font-extrabold text-[#003527]">
                Breakdown 4 chủ đề có R cao nhất
              </h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {reranker.topics
                  .slice()
                  .sort((a, b) => b.reward - a.reward)
                  .slice(0, 4)
                  .map((r) => {
                    const topic = getTopicById(r.topicId)
                    return (
                      <RewardBreakdownCard
                        key={r.topicId}
                        breakdown={r.breakdown}
                        title={topic?.title ?? r.topicId}
                      />
                    )
                  })}
              </div>
            </section>
          )}

          {/* Feedback log */}
          <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm">
            <header className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b6954]">
                  Lịch sử feedback
                </p>
                <h3 className="text-base font-extrabold text-[#003527]">
                  {filtered.length} sự kiện
                  {sourceFilter !== 'all' && (
                    <span className="ml-1 text-sm font-normal text-[#446900]">
                      · lọc: {SOURCE_META[sourceFilter as keyof typeof SOURCE_META]?.label}
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    reseedRlhf(profile.grade)
                    setRefreshKey((k) => k + 1)
                  }}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
                >
                  Bơm thêm seed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm('Xoá toàn bộ feedback?')) return
                    clearAllFeedback()
                    clearSeedFlag()
                    setRefreshKey((k) => k + 1)
                  }}
                  className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                >
                  Xoá tất cả
                </button>
              </div>
            </header>
            <ul className="space-y-1.5">
              {filtered
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .slice(0, 60)
                .map((e) => (
                  <FeedbackLogRow key={e.id} event={e} />
                ))}
              {filtered.length === 0 && (
                <li className="text-xs italic text-slate-500">Chưa có feedback.</li>
              )}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}

function RankDelta({ delta }: { delta: number }) {
  if (delta === 0)
    return <span className="text-[10px] text-slate-400">=</span>
  if (delta > 0)
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-800">
        ↑{delta}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 text-[10px] font-bold text-rose-800">
      ↓{Math.abs(delta)}
    </span>
  )
}

function FeedbackLogRow({ event }: { event: FeedbackEvent }) {
  const meta = SOURCE_META[event.source]
  const topic = event.topicId ? getTopicById(event.topicId) : null
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/40 px-3 py-2 text-xs">
      <span
        className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white"
        style={{ background: meta.color }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
          {meta.icon}
        </span>
      </span>
      <div>
        <p className="font-bold text-[#003527]">
          {event.authorName ?? meta.label}
          {topic && <span className="ml-1 text-[#446900]">· {topic.title}</span>}
        </p>
        {event.note && (
          <p className="mt-0.5 italic text-[#404944]">"{event.note}"</p>
        )}
        <p className="mt-0.5 text-[10px] text-slate-400">
          {event.kind} · {new Date(event.timestamp).toLocaleString('vi-VN')}
        </p>
      </div>
      <div className="text-right">
        <span
          className={cn(
            'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
            event.rating >= 0.1
              ? 'bg-emerald-100 text-emerald-800'
              : event.rating <= -0.1
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-100 text-slate-700',
          )}
        >
          {event.rating >= 0 ? '+' : ''}
          {event.rating.toFixed(2)}
        </span>
        <p className="mt-0.5 text-[10px] text-slate-400">
          conf {event.confidence.toFixed(2)}
        </p>
      </div>
    </li>
  )
}
