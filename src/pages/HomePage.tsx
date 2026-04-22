import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { clearProfile, loadProfile } from '../lib/storage'
import { AppSidebar } from '../components/layout/AppSidebar'
import { clearLastDiagnostic, loadLastDiagnostic } from '../lib/diagnosticStorage'
import { clearLearnerState, loadLearnerState } from '../lib/learnerStorage'
import { clearLearningPath } from '../lib/pathStorage'
import { getPracticeDatesThisMonth } from '../lib/todayActivities'
import { GOAL_OPTIONS } from '../types/user'
import { cn } from '../lib/cn'

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAMVtvNlLuDtOkcZO_SapXSNjKkBUpd7W5yCscHJqQi7CqcpIlHy28zR8gf2r1GEiYY82MiXewUHkdlOnrao5WtonU8cNyxyAw_CUwlvILQ_gBxKgR0OcEvQshgnxJS3Y-PsCAKJJNIV-Q2EmpJ1sPniHRTIvzidXf-U_-xiHV7eInjJ522EJCUySinxlkim0ZCm_Oxu7SboiEfpgLRMrhmrIF0PbCW7ysy-AOJH_YQNVxFUJgjXuRgXAX6Pqb-aIwLRS2DZANpaD8'

const AVATAR_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCc61v83w4i34r-ZTfL6gEFQWErdM441g4V_qQO9R5AjRbDSxsq1vgmpAQp9shZrYQ2d_gYRqa88d_qkUnXvgjo8jvNSGKLIvV7rH94AjzSRiQ18FzGaraXn4RDwPnQSXnqgAQSc69-HDEbRLUxZtKqJgwmxai1mn0uvghAPOGzPvHIyaRg728_NcbxtW21P5uN3P6hzk43jGMiHOf7u-gcGtCxTyFetZcwJ8MIbbDDcxtImk2n8ieNee6vKijVcxSSZ144DUEKi1w'

const MEMBER_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB0aHb01dpZZHRGCTdS0QfDEN8Ut6guKI0-SYYOfpyrQ2J_xHfHOWm86b3IBHP5JWuXOG4jkPZ-aQLH7ZXa-48MMpv4IzB1VrFLbFSE2UyGZFKZbhpfgdAbIJ5ZazrcrYZ0lVmoOHUsoJrxzoHrlbvCh0-FSz5V6ZDmdScJ4xgwBGV-Zdvr51_qjvLvkAFs9kJGArCf6q1ffEW7nn7KEWWu36jEzeIePNojcuBYcjZYiZi2Rzfphclym95i9ZwJd6Y05E7rkif7hLg',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA9WkwVhPxFbj3Qv5m4CUgu0N5kktFLNJOnZqIXELnAuxCm7LAoXmaDVMfHmSlWbZyIyWEeFWR0LJkwqrbY5q074aCcb66yi39hD5dtHe6qcmNO5aXVmX-AcLuGcbDHsd_PipYxXhbgO2RaQDfYg-dS37mIg_RrtPV1TCgZwXytLUCyCh80-F10K8vxn8ZQTaLGYyOndayMq8e2bC8BNQq7NFYc4-oJxC8eajY4hWQmvmAhGlSkXnjjmAWO3qp-frdv11xRBI6AfZY',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC2RM6Gkqf4cDQIdRYUdogoGFvsYOmItB7LRkaKWFXYNZjRg0rCwZE8EmAg7CxfIMht4Fp2-WwXrF2aX3nD7ULgBv_o6l8p52wn5chrOzqDi6Wjz-qlPHi0qcNXm6Q57TGBSMROhUYpeUOzv8LKxXaFL850TrX7xXW5ovY_iMp0sD_WNpOMnE36YFwgTfq85Vbse3PpF5Pu1Hn7W79R3xwCel9B8CZTlYaF93cwIlLHtAz7B9XYMB1GetPz6CuDqeKdHR8cEX7WJ_Y',
]

export function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [flash, setFlash] = useState<string | null>(() => {
    const state = location.state as { flash?: string } | null
    return state?.flash ?? null
  })
  const profile = loadProfile()
  const diagnostic = profile ? loadLastDiagnostic() : null
  const learner = loadLearnerState()
  const practiceDates = getPracticeDatesThisMonth(learner)

  const hasProfile = profile !== null
  const goalLabel = profile
    ? GOAL_OPTIONS.find((goal) => goal.value === profile.goal)?.label ??
      profile.goal
    : null
  const hasDiagnostic = hasProfile && diagnostic !== null
  const primaryPath = !hasProfile
    ? '/onboarding'
    : hasDiagnostic
      ? '/profile'
      : '/diagnostic'
  const handleResetAllData = () => {
    const confirmed = window.confirm(
      'Đặt lại toàn bộ dữ liệu học tập trên thiết bị này?',
    )
    if (!confirmed) return

    clearAllLocalLearningData()
    setFlash('Đã đặt lại toàn bộ dữ liệu học tập trên thiết bị này.')
    navigate('/', { replace: true })
  }

  return (
    <div className="bg-bioluminescent min-h-screen overflow-x-hidden text-[#002117]">
      <AppSidebar />

      <main className="lg:ml-72">
        <TopNav onResetAllData={handleResetAllData} />

        <div className="mx-auto max-w-7xl space-y-10 p-6 pt-28 sm:p-8 sm:pt-32">
          <section>
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-[0] text-[#003527]">
                {hasProfile
                  ? `Xin chào, học sinh Lớp ${profile.grade}!`
                  : 'Chào mừng đến Adaptive Math!'}
              </h1>
              <p className="max-w-2xl text-lg font-medium leading-relaxed text-[#404944]">
                {hasProfile && goalLabel
                  ? `Sẵn sàng cho ${profile.dailyMinutes} phút học tập trung hôm nay để tiến gần hơn tới mục tiêu ${goalLabel.toLowerCase()} của bạn chứ?`
                  : 'Bắt đầu bằng cách nhập lớp học, mục tiêu và thời gian học để hệ thống chuẩn bị bài kiểm tra đầu vào phù hợp.'}
              </p>
            </div>
          </section>

          {flash && (
            <div className="flex items-start justify-between gap-3 rounded-[2rem] border border-[#95d3ba] bg-white/75 px-5 py-4 text-sm font-semibold text-[#0b513d] shadow-lg shadow-[#003527]/5">
              <span>{flash}</span>
              <button
                type="button"
                onClick={() => setFlash(null)}
                className="text-[#446900] transition hover:text-[#003527]"
                aria-label="Đóng thông báo"
              >
                ×
              </button>
            </div>
          )}

          <HeroAssessment
            hasProfile={hasProfile}
            hasDiagnostic={hasDiagnostic}
            onClick={() => navigate(primaryPath)}
          />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <DashboardCalendar practiceDates={practiceDates} />

            <div className="space-y-8">
              <CommunityCard
                grade={profile?.grade}
                onClick={() => navigate('/community')}
              />
              <AssessmentCard
                hasProfile={hasProfile}
                onClick={() => navigate(hasProfile ? '/diagnostic' : '/onboarding')}
              />
            </div>
          </div>

          <footer className="flex justify-center pt-12 pb-8 opacity-45">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#80bea6]">
                energy_program_saving
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#003527]">
                Nurturing Human Potential
              </span>
            </div>
          </footer>
        </div>
      </main>

      <button
        type="button"
        onClick={() => navigate(hasProfile ? '/diagnostic' : '/onboarding')}
        className="group fixed right-8 bottom-8 z-50 hidden h-16 w-16 items-center justify-center rounded-full bg-[#b2f746] text-[#496f00] shadow-2xl shadow-[#446900]/40 transition hover:scale-110 active:scale-95 sm:right-10 sm:bottom-10 sm:flex"
        aria-label="Cập nhật kiểm tra"
      >
        <span className="material-symbols-outlined text-3xl transition-transform group-hover:rotate-12">
          edit_note
        </span>
      </button>
    </div>
  )
}


function TopNav({ onResetAllData }: { onResetAllData: () => void }) {
  return (
    <header className="fixed top-3 left-1/2 z-50 flex w-[calc(100vw-1rem)] max-w-5xl -translate-x-1/2 items-center justify-between gap-4 rounded-full border border-white/50 bg-white/92 px-5 py-3 shadow-[0_12px_40px_rgba(0,53,39,0.08)] ring-1 ring-white/60 sm:top-4 sm:w-[calc(100vw-2rem)] sm:px-6 lg:left-[calc(18rem+(100vw-18rem)/2)] lg:w-[calc(100vw-20rem)]">
      <h2 className="min-w-0 text-lg font-extrabold tracking-tight text-[#003527] sm:text-2xl">
        Dashboard
      </h2>
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <label className="hidden min-w-0 items-center rounded-full bg-[#e4fbef]/80 px-4 py-2 md:flex">
          <span className="material-symbols-outlined mr-2 text-[#2b6954]/70">
            search
          </span>
          <input
            className="w-56 border-none bg-transparent text-sm text-[#003527] outline-none lg:w-64"
            placeholder="Search knowledge..."
            type="text"
          />
        </label>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onResetAllData}
            className="rounded-full p-2 text-[#2b6954]/70 transition hover:bg-white/45 hover:text-[#ba1a1a]"
            aria-label="Đặt lại toàn bộ dữ liệu"
            title="Đặt lại toàn bộ dữ liệu"
          >
            <span className="material-symbols-outlined">restart_alt</span>
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-[#2b6954]/70 transition hover:bg-white/45"
            aria-label="Thông báo"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#064e3b] shadow-inner">
            <img
              alt="Student avatar"
              className="h-full w-full object-cover"
              src={AVATAR_IMAGE}
            />
          </div>
        </div>
      </div>
    </header>
  )
}

function clearAllLocalLearningData(): void {
  clearProfile()
  clearLastDiagnostic()
  clearLearnerState()
  clearLearningPath()

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index)
      if (key?.startsWith('kntt.')) {
        storage.removeItem(key)
      }
    }
  }
}

function HeroAssessment({
  hasProfile,
  hasDiagnostic,
  onClick,
}: {
  hasProfile: boolean
  hasDiagnostic: boolean
  onClick: () => void
}) {
  const title = !hasProfile
    ? 'Nhập thông tin ban đầu'
    : hasDiagnostic
      ? 'Cập nhật hồ sơ năng lực'
      : 'Bắt đầu với bài kiểm tra đầu vào'
  const description = !hasProfile
    ? 'Cho chúng tôi biết lớp học, mục tiêu và thời gian học của bạn trước. Sau đó hệ thống sẽ mở bài kiểm tra đầu vào đúng với hồ sơ này.'
    : 'Xác định các lỗ hổng kiến thức và nhận lộ trình học tập cá nhân hóa được thiết kế riêng cho năng lực hiện tại của bạn.'
  const actionLabel = !hasProfile
    ? 'Nhập thông tin'
    : hasDiagnostic
      ? 'Xem hồ sơ'
      : 'Bắt đầu kiểm tra'

  return (
    <section className="group relative overflow-hidden rounded-[3rem]">
      <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-[#064e3b] to-[#003527] opacity-90" />
      <img
        alt="Learning Forest"
        className="h-[400px] w-full rounded-[3rem] object-cover opacity-30"
        src={HERO_IMAGE}
      />
      <div className="absolute inset-0 flex flex-col items-start justify-center space-y-6 p-8 sm:p-12">
        <div className="rounded-full border border-white/10 bg-[#b2f746]/25 px-4 py-1.5">
          <span className="text-sm font-bold tracking-[0.08em] text-[#b2f746]">
            {hasProfile ? 'MỚI BẮT ĐẦU' : 'BƯỚC ĐẦU TIÊN'}
          </span>
        </div>
        <div className="max-w-xl">
          <h2 className="mb-4 text-4xl font-black leading-[1.1] tracking-[0] text-white sm:text-5xl">
            {title}
          </h2>
          <p className="text-base leading-relaxed text-white/80 sm:text-lg">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-3 rounded-full bg-[#b2f746] px-8 py-4 text-base font-black text-[#496f00] transition hover:shadow-[0_0_30px_rgba(178,247,70,0.4)] sm:px-10 sm:py-5 sm:text-lg"
        >
          {actionLabel}
          <span className="material-symbols-outlined">trending_flat</span>
        </button>
      </div>
    </section>
  )
}

function DashboardCalendar({ practiceDates }: { practiceDates: Set<string> }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const todayStr = today.toISOString().slice(0, 10)
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

  const mondayOffset = (firstDay + 6) % 7
  const cells: Array<{
    day: number
    dateStr: string
    practiced: boolean
    isToday: boolean
    muted: boolean
  }> = []

  for (let index = 0; index < mondayOffset; index += 1) {
    cells.push({
      day: daysInPrevMonth - mondayOffset + index + 1,
      dateStr: '',
      practiced: false,
      isToday: false,
      muted: true,
    })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      day,
      dateStr,
      practiced: practiceDates.has(dateStr),
      isToday: dateStr === todayStr,
      muted: false,
    })
  }

  const nextMonthPadding = (7 - (cells.length % 7)) % 7
  for (let index = 1; index <= nextMonthPadding; index += 1) {
    cells.push({
      day: index,
      dateStr: '',
      practiced: false,
      isToday: false,
      muted: true,
    })
  }

  return (
    <div className="flex flex-col rounded-[3rem] bg-white p-8 shadow-2xl shadow-[#002117]/5 lg:col-span-2">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-extrabold text-[#003527]">
            Tháng {month + 1} Năm {year}
          </h3>
          <p className="font-medium text-[#404944]">Lịch học của bạn</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full p-2 transition hover:bg-[#bbfbe1]"
            aria-label="Tháng trước"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            className="rounded-full p-2 transition hover:bg-[#bbfbe1]"
            aria-label="Tháng sau"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4 text-center">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-xs font-black uppercase text-[#404944]/50"
          >
            {day}
          </div>
        ))}

        {cells.slice(0, 42).map((cell, index) => (
          <div
            key={`${cell.dateStr}-${index}`}
            className={cn(
              'relative flex h-14 items-center justify-center rounded-2xl font-bold transition',
              cell.muted && 'text-[#002117]/20',
              !cell.muted && 'cursor-pointer hover:bg-[#bbfbe1]',
              cell.isToday && 'rounded-full bg-[#003527] text-white shadow-lg shadow-[#003527]/20 hover:bg-[#003527]',
              cell.practiced && !cell.isToday && 'text-[#446900]',
            )}
          >
            {cell.day}
            {cell.practiced && !cell.isToday && (
              <div className="absolute bottom-2 h-1 w-1 rounded-full bg-[#446900]" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-4 rounded-r-2xl border-l-4 border-[#b2f746] bg-[#064e3b]/10 p-4">
        <span className="material-symbols-outlined text-[#446900]">
          event_note
        </span>
        <p className="text-sm font-medium text-[#003527]">
          Sắp tới: Ôn tập Hình học không gian lúc 15:00 hôm nay.
        </p>
      </div>
    </div>
  )
}

function CommunityCard({
  grade,
  onClick,
}: {
  grade?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-[3rem] bg-[#b6f6db] p-8 text-left transition hover:scale-[1.02]"
    >
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md transition group-hover:bg-[#b2f746]">
        <span className="material-symbols-outlined text-[#003527]">group</span>
      </div>
      <h3 className="mb-2 text-2xl font-extrabold text-[#003527]">Cộng đồng</h3>
      <p className="mb-6 font-medium leading-relaxed text-[#404944]">
        {grade
          ? `Kết nối với 5,000+ học sinh Lớp ${grade} khác. Chia sẻ và xem lộ trình học tập hiệu quả nhất.`
          : 'Xem cách các bạn học khác xây dựng lộ trình sau khi hoàn thành thông tin ban đầu.'}
      </p>
      <div className="flex -space-x-3">
        {MEMBER_IMAGES.map((src) => (
          <img
            key={src}
            alt="user"
            className="h-10 w-10 rounded-full border-2 border-[#b6f6db] object-cover"
            src={src}
          />
        ))}
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#b6f6db] bg-[#0e3427] text-xs font-bold text-white">
          +42
        </div>
      </div>
    </button>
  )
}

function AssessmentCard({
  hasProfile,
  onClick,
}: {
  hasProfile: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-[3rem] bg-[#b0f0d6] p-8 text-left transition hover:scale-[1.02]"
    >
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md transition group-hover:bg-[#064e3b] group-hover:text-white">
        <span className="material-symbols-outlined">psychology</span>
      </div>
      <h3 className="mb-2 text-2xl font-extrabold text-[#003527]">
        {hasProfile ? 'Kiểm tra đầu vào' : 'Thông tin ban đầu'}
      </h3>
      <p className="mb-6 font-medium leading-relaxed text-[#404944]">
        {hasProfile
          ? 'Cập nhật hồ sơ năng lực của bạn để nhận các gợi ý bài tập nâng cao phù hợp.'
          : 'Hoàn thành hồ sơ học tập để hệ thống biết nên bắt đầu bài kiểm tra ở đâu.'}
      </p>
      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#446900]">
        {hasProfile ? 'Cập nhật ngay' : 'Nhập ngay'}
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </div>
    </button>
  )
}
