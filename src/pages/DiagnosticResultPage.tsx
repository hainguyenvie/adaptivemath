import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { SessionState, StopReason } from '../types/question'
import { CAT_CONFIG } from '../types/question'
import { QUESTION_BANK } from '../lib/questionBank'
import { getTopicById } from '../data/topics'
import { loadLastDiagnostic } from '../lib/diagnosticStorage'

const STOP_REASON_LABELS: Record<StopReason, string> = {
  'precision-reached': 'Đã đạt độ chính xác mục tiêu',
  'max-items': 'Đã đạt số câu tối đa',
  'time-expired': 'Hết thời gian làm bài',
  'no-more-items': 'Đã dùng hết ngân hàng câu',
  'user-cancelled': 'Bạn đã dừng bài',
  'coverage-complete': 'Đã đánh giá xong mọi chủ đề',
}

export function DiagnosticResultPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionState | null>(null)

  useEffect(() => {
    const loaded = loadLastDiagnostic()
    if (!loaded) {
      navigate('/', { replace: true })
      return
    }
    setSession(loaded)
  }, [navigate])

  const analysis = useMemo(() => {
    if (!session) return null
    return buildAnalysis(session)
  }, [session])

  if (!session || !analysis) return null

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-brand-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Kết quả bài kiểm tra 🎯
          </h1>
          <p className="mt-2 text-slate-600">
            {STOP_REASON_LABELS[session.stopReason ?? 'user-cancelled']}
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Năng lực ước lượng (θ)"
            value={session.theta.toFixed(2)}
            hint={abilityLabel(session.theta)}
            tooltip="θ (theta) là điểm năng lực của bạn theo mô hình IRT, quy chiếu trong khoảng [-4, +4]. θ=0 là trung bình, càng cao càng giỏi."
          />
          <StatCard
            label="Sai số chuẩn (SE)"
            value={
              Number.isFinite(session.standardError)
                ? session.standardError.toFixed(2)
                : '—'
            }
            hint={
              session.standardError < CAT_CONFIG.seThreshold
                ? 'Đủ tin cậy'
                : 'Cần thêm dữ liệu để chính xác hơn'
            }
            tooltip="SE càng nhỏ, ước lượng θ càng chắc. Mục tiêu SE < 0.3. SE cao có nghĩa là ngân hàng câu còn thô (IRT chưa calibrate thật), cần thêm dữ liệu thực từ học sinh."
          />
          <StatCard
            label="Câu đã làm"
            value={`${session.responses.length}`}
            hint={`${analysis.correctCount} đúng / ${session.responses.length - analysis.correctCount} sai`}
            tooltip="Số câu CAT engine đã chọn. Có thể dừng sớm nếu đạt SE < 0.3, hoặc chạy tới 40 câu / hết ngân hàng."
          />
        </div>

        <Card className="bg-slate-50/60 text-sm text-slate-600">
          <p className="font-medium text-slate-800">📖 Giải thích các con số</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>θ (theta)</strong> — năng lực ước lượng của bạn, từ −4
              (yếu nhất) đến +4 (giỏi nhất). 0 là trung bình.
            </li>
            <li>
              <strong>SE</strong> — sai số của θ. SE = 0.3 tức là θ thực có
              xác suất ~95% nằm trong ±0.6 của ước lượng.
            </li>
            <li>
              <strong>Proxy IRT</strong> — trong Phase 2 này, tham số độ khó
              được suy từ nhãn <code>N / H / V / T</code> trong ngân hàng, chưa
              calibrate thật. Nên nếu SE còn lớn sau nhiều câu là bình thường
              — phase sau sẽ cập nhật từ dữ liệu thực.
            </li>
            <li>
              Bảng <strong>Phân tích theo chủ đề</strong> mới là nguồn tin cậy
              nhất cho bước tiếp theo — chủ đề nào tỉ lệ đúng thấp, Adaptive
              Engine sẽ ưu tiên ôn lại.
            </li>
          </ul>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Phân tích theo chủ đề
          </h2>
          <div className="space-y-3">
            {analysis.topicBreakdown.map((row) => (
              <div key={row.topicId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{row.title}</span>
                  <span className="text-slate-500">
                    {row.correct}/{row.total} đúng
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{
                      width: `${(row.correct / Math.max(row.total, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {analysis.topicBreakdown.length === 0 && (
              <p className="text-sm text-slate-500">
                Chưa đủ dữ liệu phân tích theo chủ đề.
              </p>
            )}
          </div>
        </Card>

        <Card className="!border-brand-200 !bg-brand-50">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            📊 Hồ sơ kiến thức chi tiết
          </h2>
          <p className="mb-4 text-sm text-slate-700">
            Xem phân tích đầy đủ theo chương + chủ đề, lỗ hổng ưu tiên, và
            các tín hiệu hành vi (vội vàng, lỗ hổng nền, ứng dụng yếu).
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/profile')}
          >
            Xem hồ sơ chi tiết →
          </Button>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            ← Về trang chính
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/diagnostic', { replace: true })}
          >
            Làm lại bài kiểm tra
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: string
  hint?: string
  tooltip?: string
}

function StatCard({ label, value, hint, tooltip }: StatCardProps) {
  return (
    <Card className="text-center" title={tooltip}>
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

interface TopicRow {
  topicId: string
  title: string
  correct: number
  total: number
}

interface Analysis {
  correctCount: number
  topicBreakdown: TopicRow[]
}

function buildAnalysis(session: SessionState): Analysis {
  const itemById = new Map(QUESTION_BANK.questions.map((q) => [q.id, q]))
  const byTopic = new Map<string, { correct: number; total: number }>()
  let correctCount = 0

  for (const r of session.responses) {
    const q = itemById.get(r.questionId)
    if (!q) continue
    const bucket = byTopic.get(q.topicId) ?? { correct: 0, total: 0 }
    bucket.total += 1
    // Treat score >= 0.75 as "correct" for the breakdown (works for TF multiplex too).
    if (r.answered && r.score >= 0.75) {
      bucket.correct += 1
      correctCount += 1
    }
    byTopic.set(q.topicId, bucket)
  }

  const rows: TopicRow[] = Array.from(byTopic.entries())
    .map(([topicId, v]) => ({
      topicId,
      title: getTopicById(topicId)?.title ?? topicId,
      correct: v.correct,
      total: v.total,
    }))
    .sort((a, b) => a.correct / a.total - b.correct / b.total)

  return { correctCount, topicBreakdown: rows }
}
