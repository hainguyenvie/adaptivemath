import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { HomePage } from './pages/HomePage'

const OnboardingPage = lazy(() =>
  import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const DiagnosticPage = lazy(() =>
  import('./pages/DiagnosticPage').then((m) => ({ default: m.DiagnosticPage })),
)
const KnowledgeProfilePage = lazy(() =>
  import('./pages/KnowledgeProfilePage').then((m) => ({ default: m.KnowledgeProfilePage })),
)
const LearningPathPage = lazy(() =>
  import('./pages/LearningPathPage').then((m) => ({ default: m.LearningPathPage })),
)
const TheoryViewerPage = lazy(() =>
  import('./pages/TheoryViewerPage').then((m) => ({ default: m.TheoryViewerPage })),
)
const PracticeSessionPage = lazy(() =>
  import('./pages/PracticeSessionPage').then((m) => ({ default: m.PracticeSessionPage })),
)
const ErrorJournalPage = lazy(() =>
  import('./pages/ErrorJournalPage').then((m) => ({ default: m.ErrorJournalPage })),
)
const CommunityPage = lazy(() =>
  import('./pages/CommunityPage').then((m) => ({ default: m.CommunityPage })),
)
const DebugQuestionsPage = lazy(() =>
  import('./pages/DebugQuestionsPage').then((m) => ({ default: m.DebugQuestionsPage })),
)

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
 * First visit lands on /; the homepage then guides new users to onboarding
 * before they can start the diagnostic.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/" element={<HomePage />} />
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
      </Suspense>
    </BrowserRouter>
  )
}
