import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { RadarChart } from '../components/profile/RadarChart'
import { MasteryBandLegend } from '../components/profile/MasteryBandLegend'
import { ChapterBarList } from '../components/profile/ChapterBarList'
import { GapList } from '../components/profile/GapList'
import { ErrorSignalsCard } from '../components/profile/ErrorSignalsCard'
import { ProfileDebugPanel } from '../components/profile/ProfileDebugPanel'
import { PathSummaryHeader } from '../components/learning-path/PathSummaryHeader'
import { SprintCard } from '../components/learning-path/SprintCard'
import { PathDebugPanel } from '../components/learning-path/PathDebugPanel'
import {
  PathLoadingAnimation,
  LOADING_TOTAL_MS,
} from '../components/learning-path/PathLoadingAnimation'
import { PathRoadmap } from '../components/learning-path/PathRoadmap'
import { loadLastDiagnostic } from '../lib/diagnosticStorage'
import { loadProfile } from '../lib/storage'
import { QUESTION_BANK } from '../lib/questionBank'
import { TOPICS } from '../data/topics'
import { buildKnowledgeProfile } from '../lib/profiling'
import { generateLearningPath } from '../lib/pathGenerator'
import {
  saveLearningPath,
  loadLearningPath,
  clearLearningPath,
} from '../lib/pathStorage'
import type { KnowledgeProfile } from '../types/profile'
import type { LearningPath } from '../types/learningPath'
import type { SessionState } from '../types/question'
import type { UserProfile } from '../types/user'
import { GRADE_LABELS } from '../types/user'

/**
 * Phase 3 entry point. Reads the last finished diagnostic session and the
 * student's onboarding profile, runs `buildKnowledgeProfile`, then renders
 * the visual + numeric breakdown.
 *
 * Nothing on this page is persisted — the profile is always recomputed
 * from the stored `SessionState` so changes to the profiling logic take
 * effect on the next page load without a storage migration.
 */
export function KnowledgeProfilePage() {
  const navigate = useNavigate()
  const [ctx, setCtx] = useState<{
    session: SessionState
    profile: UserProfile
  } | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [learningPath, setLearningPath] = useState<LearningPath | null>(
    () => loadLearningPath(),
  )
  const [pathLoading, setPathLoading] = useState(false)
  const [showPathSprints, setShowPathSprints] = useState(3)

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

  if (!ctx || !knowledge) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Đang tổng hợp hồ sơ…
      </div>
    )
  }

  const testedCount = knowledge.topics.filter((t) => t.tested).length
  const avgMastery =
    knowledge.topics.reduce((a, t) => a + t.mastery, 0) /
    Math.max(1, knowledge.topics.length)

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-brand-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              📊 Hồ sơ kiến thức
            </h1>
            <p className="mt-1 text-slate-600">
              {GRADE_LABELS[knowledge.grade]} · cập nhật{' '}
              {formatTime(knowledge.builtAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
            >
              ← Về trang chính
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/diagnostic/result')}
            >
              Xem tóm tắt
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/diagnostic', { replace: true })}
            >
              🔄 Làm lại
            </Button>
          </div>
        </header>

        {/* Banners */}
        {flash && (
          <Card className="!border-sky-200 !bg-sky-50 text-sm text-sky-800">
            ℹ️ {flash}
          </Card>
        )}
        {knowledge.isPreliminary && (
          <Card className="!border-amber-200 !bg-amber-50 text-sm text-amber-900">
            ⚠️ <strong>Ước lượng sơ bộ</strong> — SE còn cao hoặc số câu đã
            làm còn ít (SE = {knowledge.standardError.toFixed(2)}, đã làm{' '}
            {knowledge.stats.totalAnswered} câu). Làm thêm bài kiểm tra để
            tinh chỉnh.
          </Card>
        )}

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Năng lực (θ)"
            value={knowledge.theta.toFixed(2)}
            hint={abilityLabel(knowledge.theta)}
          />
          <StatCard
            label="Mastery trung bình"
            value={avgMastery.toFixed(2)}
            hint={`Mục tiêu ${knowledge.target.toFixed(2)}`}
          />
          <StatCard
            label="Chủ đề đã kiểm tra"
            value={`${testedCount}/${knowledge.topics.length}`}
            hint={`${knowledge.stats.totalAnswered} câu trả lời`}
          />
          <StatCard
            label="Lỗ hổng ưu tiên"
            value={String(knowledge.gaps.length)}
            hint={
              knowledge.gaps.length === 0
                ? 'Không có gap > 0.15'
                : `gap lớn nhất ${knowledge.gaps[0]?.gap.toFixed(2)}`
            }
          />
        </div>

        {/* Radar + legend */}
        <Card>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex-1">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Bản đồ năng lực theo chương
              </h2>
              <RadarChart
                axes={knowledge.chapters.map((c) => ({
                  label: c.chapterTitle,
                  value: c.mastery,
                }))}
                target={knowledge.target}
                isPreliminary={knowledge.isPreliminary}
              />
            </div>
            <div className="lg:w-72 lg:shrink-0">
              <h3 className="mb-2 text-sm font-medium text-slate-700">
                Thang mastery
              </h3>
              <MasteryBandLegend />
              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-0.5 w-6 rounded bg-amber-500" />
                  <span>
                    Vòng mục tiêu {knowledge.target.toFixed(2)} (dashed)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-6 rounded bg-brand-500/30 ring-1 ring-brand-600" />
                  <span>Năng lực hiện tại</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Chapter bar list */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            📖 Phân tích chi tiết theo chủ đề
          </h2>
          <ChapterBarList
            topics={knowledge.topics}
            chapters={knowledge.chapters}
          />
        </Card>

        {/* Gap list */}
        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              🎯 Lỗ hổng ưu tiên
            </h2>
            <span className="text-xs text-slate-500">
              target = {knowledge.target.toFixed(2)} · chỉ hiển thị gap {'>'} 0.15
            </span>
          </div>
          <GapList gaps={knowledge.gaps} target={knowledge.target} />
        </Card>

        {/* Learning path — inline generation */}
        {knowledge.gaps.length > 0 && !learningPath && !pathLoading && (
          <Card className="!border-brand-200 !bg-brand-50 text-center">
            <div className="text-3xl">📚</div>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">
              Lộ trình học tập cá nhân hoá
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-700">
              Phân tích {knowledge.gaps.length} lỗ hổng, kết hợp lý thuyết +
              ví dụ mẫu + bài tập theo thứ tự ưu tiên, xen kẽ ôn tập.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="mt-5"
              onClick={() => {
                setPathLoading(true)
                // The animation runs for ~5s. The actual computation happens
                // after the animation finishes.
                setTimeout(() => {
                  const pool = QUESTION_BANK.questions.filter(
                    (q) => q.grade === knowledge.grade,
                  )
                  const result = generateLearningPath(
                    ctx!.profile,
                    knowledge,
                    pool,
                  )
                  setLearningPath(result)
                  saveLearningPath(result)
                  setPathLoading(false)
                }, LOADING_TOTAL_MS + 200)
              }}
            >
              Tạo lộ trình học tập →
            </Button>
          </Card>
        )}

        {pathLoading && (
          <Card>
            <PathLoadingAnimation gapCount={knowledge.gaps.length} />
          </Card>
        )}

        {learningPath && (
          <>
            <PathSummaryHeader path={learningPath} />
            <PathRoadmap path={learningPath} />

            <div className="space-y-4">
              {learningPath.sprints
                .slice(0, showPathSprints)
                .map((sprint, i) => (
                  <SprintCard
                    key={sprint.weekNumber}
                    sprint={sprint}
                    defaultOpen={i === 0}
                  />
                ))}
            </div>

            {showPathSprints < learningPath.sprints.length && (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowPathSprints((v) => v + 3)}
                >
                  Xem thêm (
                  {learningPath.sprints.length - showPathSprints} tuần còn lại)
                </Button>
              </div>
            )}

            <Card className="bg-slate-50/60 text-sm text-slate-600">
              <p className="font-medium text-slate-800">
                📖 Cách lộ trình được tạo
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                <li>
                  Mỗi chủ đề bắt đầu bằng <strong>đọc lý thuyết</strong>{' '}
                  (định nghĩa, chú ý, nhận xét) + xem <strong>ví dụ mẫu</strong>{' '}
                  có lời giải.
                </li>
                <li>
                  Sau đó luyện tập với câu hỏi ở các mức N → H → V theo
                  thứ tự từ dễ đến khó.
                </li>
                <li>
                  Cứ 3 ngày học → 1 ngày ôn (3 câu/chủ đề), mỗi ngày tối đa
                  2 chủ đề mới.
                </li>
                <li>
                  Ưu tiên = gap × 0.40 + urgency × 0.25 + tự nhận yếu ×
                  0.20 + mật độ đề thi × 0.15.
                </li>
              </ul>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearLearningPath()
                  setLearningPath(null)
                  setShowPathSprints(3)
                }}
              >
                🔄 Tạo lại lộ trình
              </Button>
            </div>

            <PathDebugPanel path={learningPath} />
          </>
        )}

        {/* Error signals */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            🔍 Pattern phát hiện
          </h2>
          <ErrorSignalsCard signals={knowledge.signals} />
          <p className="mt-3 text-xs text-slate-500">
            Các pattern ở trên là heuristic dựa trên timing + cấp độ câu hỏi,
            không phải phân tích bước giải. Sẽ chính xác hơn sau khi có dữ
            liệu thật từ nhiều phiên làm bài.
          </p>
        </Card>

        {/* Debug panel */}
        <ProfileDebugPanel profile={knowledge} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: string
  hint?: string
}

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <Card className="text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-brand-700">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}

function abilityLabel(theta: number): string {
  if (theta < -1) return 'Yếu'
  if (theta < 0) return 'Trung bình'
  if (theta < 1) return 'Khá'
  return 'Giỏi'
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
