export function WelcomeStep() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-4xl">
        👋
      </div>
      <h1 className="mb-3 text-3xl font-bold text-slate-900 sm:text-4xl">
        Chào mừng đến với KNTT Adaptive
      </h1>
      <p className="max-w-xl text-base text-slate-600 sm:text-lg">
        Hệ thống học Toán cấp 3 thích ứng — tự phát hiện lỗ hổng kiến thức và
        xây lộ trình cá nhân hoá cho riêng bạn.
      </p>
      <p className="mt-4 max-w-xl text-sm text-slate-500">
        Chỉ mất khoảng <strong className="text-slate-700">2 phút</strong> để cài
        đặt profile ban đầu.
      </p>
    </div>
  )
}
