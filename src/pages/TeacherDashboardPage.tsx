import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar } from '../components/layout/AppSidebar'
import { RoleFeedbackForm } from '../components/rlhf/RoleFeedbackForm'
import { RewardBreakdownCard } from '../components/rlhf/RewardBreakdownCard'
import { loadProfile } from '../lib/storage'
import { loadLastDiagnostic } from '../lib/diagnosticStorage'
import { loadLearnerState } from '../lib/learnerStorage'
import { QUESTION_BANK } from '../lib/questionBank'
import { TOPICS } from '../data/topics'
import { TEACHERS } from '../data/teacherDirectory'
import { buildKnowledgeProfile } from '../lib/profiling'
import { buildKnowledgeTree, classifyStage } from '../lib/treeStability'
import { TREE_STAGES } from '../types/knowledgeTree'
import {
  filterFeedback,
  loadAllFeedback,
  upsertIdempotent,
  makeFeedbackId,
} from '../lib/rlhf/feedbackStore'
import { computeRewardForTopic, daysUntilDeadline } from '../lib/rlhf/rewardModel'
import { ensureRlhfSeed } from '../lib/rlhf/seedBootstrap'
import type { FeedbackEvent } from '../types/rlhf'
import { cn } from '../lib/cn'

export function TeacherDashboardPage() {
  const navigate = useNavigate()
  const profile = loadProfile()
  const diagnostic = profile ? loadLastDiagnostic() : null
  const learner = loadLearnerState()

  if (profile) ensureRlhfSeed(profile.grade)

  const [activeTeacherId, setActiveTeacherId] = useState<string>(
    TEACHERS[0]?.id ?? '',
  )
  const [refreshKey, setRefreshKey] = useState(0)
  const activeTeacher = TEACHERS.find((t) => t.id === activeTeacherId) ?? TEACHERS[0]

  const knowledge = useMemo(() => {
    if (!profile || !diagnostic) return null
    const pool = QUESTION_BANK.questions.filter(
      (q) => q.grade === diagnostic.grade,
    )
    return buildKnowledgeProfile(diagnostic, profile, pool, TOPICS)
  }, [profile, diagnostic])

  const treeModel = useMemo(
    () => (knowledge ? buildKnowledgeTree(knowledge, learner) : null),
    [knowledge, learner],
  )

  // Topic list for this teacher — only their specialty topics, in current grade.
  const teacherTopics = useMemo(() => {
    if (!activeTeacher || !profile) return []
    const all = activeTeacher.topicIds
      .map((tid) => TOPICS.find((t) => t.id === tid))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .filter((t) => t.grade === profile.grade)
    return all
  }, [activeTeacher, profile])

  const daysToExam = daysUntilDeadline(profile?.deadline ?? null)

  if (!profile || !diagnostic) {
    return (
      <div className="bg-bioluminescent min-h-screen">
        <AppSidebar />
        <main className="lg:ml-72">
          <div className="mx-auto max-w-2xl space-y-4 p-8 pt-32 text-center">
            <p className="text-5xl">🎓</p>
            <h1 className="text-3xl font-extrabold text-[#003527]">
              Vai trò Giáo viên
            </h1>
            <p className="text-base text-[#404944]">
              Cần có hồ sơ học sinh + bài chẩn đoán trước khi giáo viên có thể
              cho phản hồi RLHF.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const allFeedback = loadAllFeedback()
  void refreshKey // force re-read on change

  return (
    <div className="bg-bioluminescent min-h-screen">
      <AppSidebar />
      <main className="lg:ml-72">
        <TopBanner
          title="Vai trò Giáo viên"
          subtitle={`Phản hồi đi vào RLHF với trọng số 0.25 (mặc định) · Còn ${daysToExam !== null ? Math.round(daysToExam) + ' ngày tới kỳ thi' : 'không có deadline'}`}
          accent="#1d4ed8"
          icon="co_present"
          onHome={() => navigate('/')}
        />

        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-28 sm:px-8 sm:pt-32">
          <section className="space-y-1.5">
            <h1 className="text-3xl font-extrabold text-[#003527] sm:text-4xl">
              Bảng giáo viên · RLHF
            </h1>
            <p className="max-w-2xl text-base text-[#404944]">
              Đánh dấu chủ đề ưu tiên, để lại nhận xét chuyên môn, xác nhận
              phù hợp. Mỗi tương tác sinh ra một <code>FeedbackEvent</code>{' '}
              được nhân trọng số <b>0.25</b> trong hàm thưởng đa nguồn.
            </p>
          </section>

          {/* Teacher selector — pick which teacher seat you're using */}
          <div className="flex flex-wrap gap-2">
            {TEACHERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTeacherId(t.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition',
                  activeTeacherId === t.id
                    ? 'border-blue-400 bg-blue-50 text-blue-900'
                    : 'border-white bg-white/85 text-[#003527] hover:border-blue-200',
                )}
              >
                <span className="text-base">{t.avatar}</span>
                {t.displayName}
              </button>
            ))}
          </div>

          {activeTeacher && (
            <div className="rounded-[2rem] border border-blue-100 bg-blue-50/40 p-5">
              <p className="text-sm italic text-blue-900/85">
                <b>{activeTeacher.displayName}</b> — {activeTeacher.bio}
              </p>
            </div>
          )}

          {/* Topic grid — for each topic, show breakdown + feedback form + priority toggle */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {teacherTopics.map((topic) => {
              const events = filterFeedback({ topicId: topic.id })
              const breakdown = computeRewardForTopic({
                topicId: topic.id,
                events,
                daysToExam,
              })
              const tm = knowledge?.topics.find((t) => t.topicId === topic.id)
              const mastery = tm?.mastery ?? 0.5
              const stage = TREE_STAGES.find(
                (s) => s.id === (treeModel?.branches.flatMap((b) => b.topics).find((n) => n.topicId === topic.id)?.stage ?? classifyStage(mastery)),
              )

              // Find any existing teacher "priority" feedback by THIS teacher.
              const priorityEvent = events.find(
                (e) => e.source === 'teacher' && e.kind === 'priority' && e.authorId === activeTeacher?.id,
              )
              const isPriority = priorityEvent ? priorityEvent.rating > 0 : false

              return (
                <article
                  key={topic.id}
                  className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm"
                >
                  <header className="flex items-baseline justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
                        Chủ đề lớp {topic.grade}
                      </p>
                      <h3 className="text-base font-extrabold text-[#003527]">
                        {topic.title}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-[#446900]">
                        {topic.chapterTitle}
                      </p>
                    </div>
                    {stage && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                          stage.accent,
                        )}
                      >
                        <span aria-hidden>{stage.icon}</span>
                        {stage.label} · {(mastery * 100).toFixed(0)}%
                      </span>
                    )}
                  </header>

                  {/* Priority toggle */}
                  <div className="mt-3 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/40 px-3 py-2">
                    <div>
                      <p className="text-xs font-bold text-blue-900">
                        Đánh dấu ưu tiên
                      </p>
                      <p className="text-[10px] text-blue-700/80">
                        Đẩy reward sang phía +1 · weight 0.25 · confidence 0.9
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeTeacher) return
                        const timestamp = new Date().toISOString()
                        upsertIdempotent({
                          id: makeFeedbackId({
                            source: 'teacher',
                            kind: 'priority',
                            authorId: activeTeacher.id,
                            topicId: topic.id,
                            timestamp,
                          }),
                          source: 'teacher',
                          kind: 'priority',
                          topicId: topic.id,
                          rating: isPriority ? 0 : 0.8,
                          confidence: 0.9,
                          timestamp,
                          authorId: activeTeacher.id,
                          authorName: activeTeacher.displayName,
                          note: isPriority ? 'Bỏ ưu tiên' : 'Ưu tiên ôn ngay',
                        })
                        setRefreshKey((k) => k + 1)
                      }}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-xs font-black transition',
                        isPriority
                          ? 'bg-blue-700 text-white'
                          : 'border border-blue-300 bg-white text-blue-700 hover:bg-blue-50',
                      )}
                    >
                      {isPriority ? '✓ Đang ưu tiên' : 'Đặt ưu tiên'}
                    </button>
                  </div>

                  {/* Reward breakdown */}
                  <div className="mt-3">
                    <RewardBreakdownCard
                      breakdown={breakdown}
                      title={`R(${topic.title})`}
                      compact
                    />
                  </div>

                  {/* Feedback form */}
                  <div className="mt-3">
                    <RoleFeedbackForm
                      role="teacher"
                      authorId={activeTeacher?.id ?? 'tch'}
                      authorName={activeTeacher?.displayName ?? 'Giáo viên'}
                      topicId={topic.id}
                      topicTitle={topic.title}
                      variant="compact"
                      onSubmitted={() => setRefreshKey((k) => k + 1)}
                    />
                  </div>
                </article>
              )
            })}
          </div>

          {teacherTopics.length === 0 && (
            <div className="rounded-[2rem] border border-dashed border-blue-200 bg-blue-50/40 p-6 text-center text-sm text-blue-900/80">
              Giáo viên này không có chủ đề trùng với lớp hiện tại của học sinh.
              Chọn một giáo viên khác ở phía trên.
            </div>
          )}

          {/* Activity log for this teacher */}
          <section className="rounded-[2rem] border border-blue-100 bg-white p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
              Hoạt động gần đây của bạn
            </p>
            <ul className="space-y-1.5">
              {allFeedback
                .filter(
                  (e) => e.source === 'teacher' && e.authorId === activeTeacher?.id,
                )
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .slice(0, 10)
                .map((e) => (
                  <FeedbackRow key={e.id} event={e} />
                ))}
              {allFeedback.filter(
                (e) => e.source === 'teacher' && e.authorId === activeTeacher?.id,
              ).length === 0 && (
                <li className="text-xs italic text-slate-500">
                  Chưa có phản hồi nào.
                </li>
              )}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}

function FeedbackRow({ event }: { event: FeedbackEvent }) {
  const topic = event.topicId
    ? TOPICS.find((t) => t.id === event.topicId)
    : null
  const sign = event.rating >= 0 ? '+' : ''
  return (
    <li className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs">
      <span className="material-symbols-outlined mt-0.5 text-blue-700" style={{ fontSize: 14 }}>
        {kindIcon(event.kind)}
      </span>
      <div className="flex-1 space-y-0.5">
        <p className="font-bold text-[#003527]">
          {topic?.title ?? 'Tổng quát'} · <span className="text-blue-700">{kindLabel(event.kind)}</span>
        </p>
        {event.note && (
          <p className="italic text-[#404944]">"{event.note}"</p>
        )}
        <p className="text-[10px] text-slate-400">
          rating {sign}
          {event.rating.toFixed(2)} · conf {event.confidence.toFixed(2)} ·{' '}
          {timeAgo(event.timestamp)}
        </p>
      </div>
    </li>
  )
}

export function TopBanner({
  title,
  subtitle,
  accent,
  icon,
  onHome,
}: {
  title: string
  subtitle: string
  accent: string
  icon: string
  onHome: () => void
}) {
  return (
    <header className="fixed left-1/2 top-3 z-40 flex w-[calc(100vw-1rem)] max-w-6xl -translate-x-1/2 items-center justify-between gap-3 rounded-full border border-white/50 bg-white/95 px-5 py-3 shadow-[0_12px_40px_rgba(0,53,39,0.08)] ring-1 ring-white/60 sm:top-4 sm:w-[calc(100vw-2rem)] sm:px-6 lg:left-[calc(18rem+(100vw-18rem)/2)] lg:w-[calc(100vw-20rem)]">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-white"
          style={{ background: accent }}
        >
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <h2 className="text-base font-extrabold text-[#003527]">{title}</h2>
          <p className="hidden text-xs font-medium text-[#446900] sm:block">
            {subtitle}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onHome}
        className="rounded-full px-4 py-2 text-xs font-bold text-[#003527] hover:bg-slate-50"
      >
        ← Trang chủ
      </button>
    </header>
  )
}

function kindIcon(kind: FeedbackEvent['kind']): string {
  switch (kind) {
    case 'priority':
      return 'priority_high'
    case 'comment':
      return 'comment'
    case 'approve':
      return 'check_circle'
    case 'reject':
      return 'block'
    case 'suitability':
      return 'verified'
    case 'regularity':
      return 'event_repeat'
    case 'mood':
      return 'mood'
    case 'concern':
      return 'warning'
    case 'goal':
      return 'flag'
    case 'confidence':
    case 'overload':
    case 'interest':
    case 'session_self':
      return 'self_improvement'
    case 'peer_outcome':
    case 'peer_inspire':
    case 'peer_comment':
      return 'group'
    case 'session_outcome':
      return 'bolt'
    default:
      return 'circle'
  }
}

function kindLabel(kind: FeedbackEvent['kind']): string {
  switch (kind) {
    case 'priority':
      return 'Ưu tiên'
    case 'comment':
      return 'Nhận xét'
    case 'approve':
      return 'Đồng ý'
    case 'reject':
      return 'Hoãn'
    case 'suitability':
      return 'Phù hợp'
    case 'regularity':
      return 'Đều đặn'
    case 'mood':
      return 'Tâm trạng'
    case 'concern':
      return 'Cảnh báo'
    case 'goal':
      return 'Mục tiêu'
    case 'session_self':
      return 'Tự đánh giá'
    case 'peer_outcome':
      return 'Bạn cải thiện'
    case 'peer_inspire':
      return 'Inspire'
    case 'peer_comment':
      return 'Bình luận bạn'
    case 'session_outcome':
      return 'Kết quả phiên'
    default:
      return kind
  }
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
