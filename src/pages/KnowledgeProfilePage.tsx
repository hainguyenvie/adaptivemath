import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RadarChart } from '../components/profile/RadarChart'
import { MasteryBandLegend } from '../components/profile/MasteryBandLegend'
import { ChapterBarList } from '../components/profile/ChapterBarList'
import { GapList } from '../components/profile/GapList'
import { ErrorSignalsCard } from '../components/profile/ErrorSignalsCard'
import { ProfileDebugPanel } from '../components/profile/ProfileDebugPanel'
import { ProfileSidebar } from '../components/profile/ProfileSidebar'
import {
  PathLoadingAnimation,
  LOADING_TOTAL_MS,
} from '../components/learning-path/PathLoadingAnimation'
import { loadLastDiagnostic } from '../lib/diagnosticStorage'
import { loadProfile } from '../lib/storage'
import { QUESTION_BANK } from '../lib/questionBank'
import { TOPICS } from '../data/topics'
import { buildKnowledgeProfile } from '../lib/profiling'
import { generateLearningPath } from '../lib/pathGenerator'
import {
  saveLearningPath,
  loadLearningPath,
} from '../lib/pathStorage'
import type { KnowledgeProfile } from '../types/profile'
import type { SessionState } from '../types/question'
import type { UserProfile } from '../types/user'
import { GRADE_LABELS } from '../types/user'

export function KnowledgeProfilePage() {
  const navigate = useNavigate()
  const [ctx, setCtx] = useState<{
    session: SessionState
    profile: UserProfile
  } | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [pathExists, setPathExists] = useState(() => loadLearningPath() !== null)
  const [pathLoading, setPathLoading] = useState(false)

  useEffect(() => {
    const session = loadLastDiagnostic()
    const profile = loadProfile()
    if (!profile) {
      navigate('/', { replace: true })
      return
    }
    if (!session) {
      navigate('/', {
        replace: true,
        state: { flash: 'Bạn chưa hoàn thành bài kiểm tra đầu vào nào.' },
      })
      return
    }
    if (session.grade !== profile.grade) {
      setFlash(
        `Bài kiểm tra đã làm ở lớp ${session.grade}, profile hiện tại là lớp ${profile.grade}. Các con số dưới đây dựa trên lớp ${session.grade}.`,
      )
    }
    setCtx({ session, profile })
  }, [navigate])

  const knowledge = useMemo<KnowledgeProfile | null>(() => {
    if (!ctx) return null
    const pool = QUESTION_BANK.questions.filter(
      (q) => q.grade === ctx.session.grade,
    )
    return buildKnowledgeProfile(ctx.session, ctx.profile, pool, TOPICS)
  }, [ctx])

  const handleGeneratePath = useCallback(() => {
    if (!ctx || !knowledge) return
    setPathLoading(true)
    setTimeout(() => {
      const pool = QUESTION_BANK.questions.filter(
        (q) => q.grade === knowledge.grade,
      )
      const result = generateLearningPath(ctx.profile, knowledge, pool)
      saveLearningPath(result)
      setPathLoading(false)
      navigate('/learning-path')
    }, LOADING_TOTAL_MS + 200)
  }, [ctx, knowledge, navigate])

  if (!ctx || !knowledge) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: '#e7fff3' }}
      >
        <div className="rounded-full border border-white/60 bg-white/95 px-6 py-4 text-sm font-bold text-[#446900] shadow-[0_18px_45px_rgba(0,53,39,0.08)]">
          Đang tổng hợp hồ sơ…
        </div>
      </div>
    )
  }

  const answeredPct = Math.round(knowledge.signals.engagement.answeredRate * 100)
  const avgMs = knowledge.stats.avgDurationMs
  const totalSec = Math.round(avgMs / 1000)
  const avgDurLabel =
    avgMs > 0
      ? `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`
      : '–'

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: [
          '#e7fff3',
          'radial-gradient(circle at 18% 24%, rgba(178,247,70,0.38) 0%, transparent 30%)',
          'radial-gradient(circle at 82% 10%, rgba(168,231,205,0.42) 0%, transparent 28%)',
          'radial-gradient(circle at 50% 90%, rgba(168,231,205,0.28) 0%, transparent 34%)',
        ].join(' '),
      }}
    >
      {/* Fixed sidebar */}
      <ProfileSidebar
        knowledge={knowledge}
        goal={ctx.profile.goal}
        onGeneratePath={handleGeneratePath}
        pathExists={pathExists}
      />

      {/* Floating header */}
      <header className="fixed left-1/2 top-3 z-50 flex w-[calc(100vw-1rem)] max-w-6xl -translate-x-1/2 items-center justify-between gap-4 rounded-full border border-white/50 bg-white/92 px-4 py-3 shadow-[0_12px_40px_rgba(0,53,39,0.08)] ring-1 ring-white/60 sm:top-4 sm:w-[calc(100vw-2rem)] sm:px-6 lg:left-[calc(18rem+(100vw-18rem)/2)] lg:w-[calc(100vw-20rem)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#064e3b] shadow-lg shadow-[#003527]/15">
            <span className="material-symbols-outlined text-[#b2f746]">psychology</span>
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-[#003527]">
              Hồ Sơ Năng Lực
            </div>
            <div className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[#446900] sm:block">
              {GRADE_LABELS[knowledge.grade]} · {knowledge.stats.totalAnswered} câu
            </div>
          </div>
        </div>
        <Link
          to="/"
          className="text-xs font-bold text-[#9fb3aa] transition-colors hover:text-[#003527]"
        >
          ← Trang chủ
        </Link>
      </header>

      {/* Main content offset for fixed sidebar + header */}
      <div className="min-h-screen pt-[72px] lg:ml-72">
        <main className="px-4 pb-16 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-5">

            {/* Page heading */}
            <div className="pt-4">
              <h1 className="text-2xl font-black tracking-tight text-[#003527] sm:text-3xl">
                Hồ Sơ <span className="text-[#064e3b]">Năng Lực</span>
              </h1>
              <p className="mt-1 text-sm font-medium text-[#446900]">
                Kết quả chẩn đoán thích nghi · {knowledge.stats.totalAnswered} câu · {GRADE_LABELS[knowledge.grade]}
              </p>
            </div>

            {/* Grade mismatch flash */}
            {flash && (
              <div className="flex items-center gap-2 rounded-full border border-sky-300/50 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-800">
                ℹ️ {flash}
              </div>
            )}

            {/* Preliminary warning */}
            {knowledge.isPreliminary && (
              <div className="flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900">
                ⚠️ Ước lượng sơ bộ — SE = {knowledge.standardError.toFixed(2)}, đã làm {knowledge.stats.totalAnswered} câu. Làm thêm để tinh chỉnh.
              </div>
            )}

            {/* Stats pills */}
            <div id="profile-overview" className="flex flex-wrap gap-2.5">
              <StatPill value={knowledge.theta.toFixed(2)} label="Năng lực θ" />
              <StatPill value={`${answeredPct}%`} label="Trả lời" />
              <StatPill value={String(knowledge.gaps.length)} label="Điểm yếu" accent />
              <StatPill value={`${(knowledge.target * 100).toFixed(0)}%`} label="Mục tiêu" />
              <StatPill value={avgDurLabel} label="Thời gian TB" />
            </div>

            {/* Radar chart */}
            <div
              id="profile-gaps"
              className="rounded-[32px] border border-white/65 bg-white/95 p-6 shadow-[0_18px_55px_rgba(0,53,39,0.09)]"
            >
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#446900]">
                📡 Năng lực theo chương
              </p>
              <RadarChart
                axes={knowledge.chapters.map((c) => ({
                  label: c.chapterTitle,
                  value: c.mastery,
                }))}
                target={knowledge.target}
                isPreliminary={knowledge.isPreliminary}
                size={460}
              />
              <div className="mt-4">
                <MasteryBandLegend />
              </div>
            </div>

            {/* Gap list */}
            <div className="rounded-[32px] border border-white/65 bg-white/95 p-6 shadow-[0_18px_55px_rgba(0,53,39,0.09)]">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#446900]">
                🎯 Điểm yếu ưu tiên ({knowledge.gaps.length})
              </p>
              <GapList gaps={knowledge.gaps} target={knowledge.target} />
            </div>

            {/* Chapter breakdown */}
            <div
              id="profile-chapters"
              className="rounded-[32px] border border-white/65 bg-white/95 p-6 shadow-[0_18px_55px_rgba(0,53,39,0.09)]"
            >
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[#446900]">
                📚 Chi tiết chủ đề theo chương
              </p>
              <ChapterBarList
                topics={knowledge.topics}
                chapters={knowledge.chapters}
              />
            </div>

            {/* Generate path / view path CTA */}
            {pathLoading ? (
              <div className="rounded-[32px] border border-white/65 bg-white/95 p-8 shadow-[0_18px_55px_rgba(0,53,39,0.09)]">
                <PathLoadingAnimation gapCount={knowledge.gaps.length} />
              </div>
            ) : (
              <div className="rounded-[32px] border border-[#b2f746]/40 bg-white/95 p-7 shadow-[0_18px_55px_rgba(178,247,70,0.12)]">
                {pathExists ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#446900]">
                        Lộ trình đã tạo
                      </p>
                      <h2 className="mt-1 text-xl font-black text-[#003527]">
                        Xem lộ trình học cá nhân hoá
                      </h2>
                      <p className="mt-1 text-sm text-[#446900]">
                        Dựa trên {knowledge.gaps.length} điểm yếu ưu tiên · ~{ctx.profile.dailyMinutes} phút/ngày
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <button
                        type="button"
                        onClick={() => navigate('/learning-path')}
                        className="rounded-full bg-[#b2f746] px-7 py-3 text-sm font-black text-[#003527] shadow-[0_8px_28px_rgba(178,247,70,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#a3e635] active:translate-y-0"
                      >
                        Xem lộ trình →
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPathExists(false); handleGeneratePath() }}
                        className="rounded-full border border-[#95d3ba] bg-white/95 px-5 py-3 text-sm font-bold text-[#003527] shadow-sm transition hover:bg-[#e4fbef]"
                      >
                        Tạo lại
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#446900]">
                        Bước tiếp theo
                      </p>
                      <h2 className="mt-1 text-xl font-black text-[#003527]">
                        Tạo lộ trình học cá nhân hoá
                      </h2>
                      <p className="mt-1 text-sm text-[#446900]">
                        Dựa trên {knowledge.gaps.length} điểm yếu ưu tiên · ~{ctx.profile.dailyMinutes} phút/ngày
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGeneratePath}
                      className="shrink-0 rounded-full bg-[#b2f746] px-7 py-3 text-sm font-black text-[#003527] shadow-[0_8px_28px_rgba(178,247,70,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#a3e635] active:translate-y-0"
                    >
                      🗺️ Tạo lộ trình
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error signals */}
            <div id="profile-signals">
              <ErrorSignalsCard signals={knowledge.signals} />
            </div>

            {/* Debug panel */}
            <ProfileDebugPanel profile={knowledge} />

          </div>
        </main>
      </div>
    </div>
  )
}

interface StatPillProps {
  value: string
  label: string
  accent?: boolean
}

function StatPill({ value, label, accent = false }: StatPillProps) {
  return (
    <div
      className={[
        'flex items-center gap-2 rounded-full border px-4 py-2 shadow-[0_8px_24px_rgba(0,53,39,0.07)]',
        accent
          ? 'border-[#b2f746]/40 bg-[#b2f746]/20'
          : 'border-white/65 bg-white/95',
      ].join(' ')}
    >
      <span className="text-base font-black text-[#003527]">{value}</span>
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#9fb3aa]">
        {label}
      </span>
    </div>
  )
}
