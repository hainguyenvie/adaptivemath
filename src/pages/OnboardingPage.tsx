import { OnboardingProvider } from '../contexts/OnboardingContext'
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard'

export function OnboardingPage() {
  return (
    <OnboardingProvider>
      <div className="flex min-h-screen w-full items-start justify-center bg-gradient-to-b from-slate-50 via-white to-brand-50 px-4 py-10 sm:py-16">
        <OnboardingWizard />
      </div>
    </OnboardingProvider>
  )
}
