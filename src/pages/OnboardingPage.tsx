import { OnboardingProvider } from '../contexts/OnboardingContext'
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard'

export function OnboardingPage() {
  return (
    <OnboardingProvider>
      <div className="relative h-[100dvh] w-full overflow-hidden bg-[#e7fff3] px-4 py-4 text-[#002117] sm:px-6 sm:py-5">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(178,247,70,0.45),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(168,231,205,0.5),transparent_28%),radial-gradient(circle_at_50%_84%,rgba(168,231,205,0.35),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.55),rgba(255,255,255,0.2)_45%,rgba(231,255,243,0)_72%)]" />
          <div className="absolute -left-12 top-1/4 h-32 w-32 rounded-full bg-[#95d3ba]/30 blur-3xl" />
          <div className="absolute right-4 top-28 h-40 w-40 rounded-full bg-[#b2f746]/25 blur-3xl" />
          <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-[radial-gradient(circle_at_50%_100%,rgba(168,231,205,0.35),transparent_55%)]" />
        </div>

        <div className="relative z-10 mx-auto flex h-full max-w-screen-xl flex-col">
          <OnboardingWizard />
        </div>
      </div>
    </OnboardingProvider>
  )
}
