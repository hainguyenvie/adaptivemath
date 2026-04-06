import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import KnowledgeMapPage from "@/pages/knowledge-map";
import LearnPage from "@/pages/learn";
import TutorPage from "@/pages/tutor";
import LearningPathPage from "@/pages/learning-path";
import ReviewPage from "@/pages/review";
import ReportPage from "@/pages/report";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/knowledge-map" component={KnowledgeMapPage} />
      <Route path="/learn/:topicId" component={LearnPage} />
      <Route path="/tutor" component={TutorPage} />
      <Route path="/learning-path" component={LearningPathPage} />
      <Route path="/review" component={ReviewPage} />
      <Route path="/report" component={ReportPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
