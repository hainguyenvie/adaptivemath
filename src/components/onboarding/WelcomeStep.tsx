export function WelcomeStep() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#b2f746]/20 blur-3xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-5xl shadow-[0_10px_40px_rgba(0,53,39,0.08)]">
          👋
        </div>
      </div>
      <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-[#002117] sm:text-5xl">
        Chào mừng đến với
        <span className="block text-[#294e3f]">Adaptive Math</span>
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#404944]">
        Khám phá lộ trình học Toán được thiết kế riêng cho bạn.
        Chúng tôi dùng trí tuệ nhân tạo để tối ưu hóa từng bước tiến.
      </p>

      <div className="mt-10 grid w-full max-w-lg grid-cols-3 gap-3 sm:gap-4">
        <FeaturePill icon="🧠" label="ADAPTIVE" />
        <FeaturePill icon="🧭" label="LỘ TRÌNH" />
        <FeaturePill icon="🛡️" label="CHÍNH XÁC" />
      </div>
    </div>
  )
}

function FeaturePill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/80 px-3 py-4 text-center shadow-sm ring-1 ring-white/60">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#294e3f]">
        {label}
      </div>
    </div>
  )
}
