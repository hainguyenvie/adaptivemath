import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { OnboardingPage } from './pages/OnboardingPage'
import { HomePage } from './pages/HomePage'
import { DiagnosticPage } from './pages/DiagnosticPage'
import { KnowledgeProfilePage } from './pages/KnowledgeProfilePage'
import { LearningPathPage } from './pages/LearningPathPage'
import { TheoryViewerPage } from './pages/TheoryViewerPage'
import { PracticeSessionPage } from './pages/PracticeSessionPage'
import { ErrorJournalPage } from './pages/ErrorJournalPage'
import { CommunityPage } from './pages/CommunityPage'
import { DebugQuestionsPage } from './pages/DebugQuestionsPage'
import { loadProfile } from './lib/storage'

/**
 * Root routing — clean flow:
 *
 *   /           → Home Dashboard (daily hub, today's tasks)
 *   /onboarding → First-time setup wizard
 *   /diagnostic → CAT entry test
 *   /profile    → Full knowledge stats (read-only)
 *   /learning-path → Sprint cards + roadmap
 *   /theory     → Theory viewer
 *   /practice   → Practice session runner
 *   /errors     → Error journal
 *   /debug/*    → Dev tools
 *
 * Gate: if no profile exists, redirect to /onboarding.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/" element={<HomeGate />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/diagnostic" element={<DiagnosticPage />} />
        <Route path="/profile" element={<KnowledgeProfilePage />} />
        <Route path="/learning-path" element={<LearningPathPage />} />
        <Route path="/theory" element={<TheoryViewerPage />} />
        <Route path="/practice" element={<PracticeSessionPage />} />
        <Route path="/errors" element={<ErrorJournalPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/debug/questions" element={<DebugQuestionsPage />} />
        {/* Legacy routes → redirect */}
        <Route path="/diagnostic/result" element={<Navigate to="/profile" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

/**
 * Gate component: if profile exists → show HomePage dashboard.
 * If not → redirect to /onboarding.
 */
function HomeGate() {
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)

  useEffect(() => {
    setHasProfile(loadProfile() !== null)
  }, [])

  if (hasProfile === null) return null
  if (!hasProfile) return <Navigate to="/onboarding" replace />
  return <HomePage />
}
