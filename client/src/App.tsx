import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/landing-page";
import { useAuth } from "@/hooks/use-auth";
import { LanguageProvider } from "@/i18n/context";

const LoginPage = lazy(() => import("@/pages/login-page"));
const ChatPage = lazy(() => import("@/pages/chat-page"));
const DashboardPage = lazy(() => import("@/pages/dashboard-page"));
const OnboardingPage = lazy(() => import("@/pages/onboarding-page"));
const CurrentAffairsPage = lazy(() => import("@/pages/current-affairs-page"));
const CurrentAffairsTopicPage = lazy(() => import("@/pages/current-affairs-topic-page"));
const PracticeQuizPage = lazy(() => import("@/pages/practice-quiz-page"));
const SubscriptionPage = lazy(() => import("@/pages/subscription-page"));
const PaperEvaluationPage = lazy(() => import("@/pages/paper-evaluation-page"));
const NotesPage = lazy(() => import("@/pages/notes-page"));
const StudyPlannerPage = lazy(() => import("@/pages/study-planner-page"));
const StudyProgressPage = lazy(() => import("@/pages/study-progress-page"));
const SettingsPage = lazy(() => import("@/pages/settings-page"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy-page"));
const TermsOfServicePage = lazy(() => import("@/pages/terms-of-service-page"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" data-testid="page-loader">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AuthGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <>{fallback || <PageLoader />}</>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <>{children}</>;
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!isLoading && isAuthenticated && !user?.onboardingCompleted) {
    return (
      <Suspense fallback={<PageLoader />}>
        <OnboardingPage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/">
          {isLoading ? <LandingPage /> : isAuthenticated ? <DashboardPage /> : <LandingPage />}
        </Route>
        <Route path="/login" component={LoginPage} />
        <Route path="/chat/new"><AuthGate><ChatPage /></AuthGate></Route>
        <Route path="/chat/:id"><AuthGate><ChatPage /></AuthGate></Route>
        <Route path="/current-affairs"><AuthGate><CurrentAffairsPage /></AuthGate></Route>
        <Route path="/current-affairs/topic/:id"><AuthGate><CurrentAffairsTopicPage /></AuthGate></Route>
        <Route path="/practice-quiz"><AuthGate><PracticeQuizPage /></AuthGate></Route>
        <Route path="/paper-evaluation"><AuthGate><PaperEvaluationPage /></AuthGate></Route>
        <Route path="/notes"><AuthGate><NotesPage /></AuthGate></Route>
        <Route path="/study-planner"><AuthGate><StudyPlannerPage /></AuthGate></Route>
        <Route path="/study-progress"><AuthGate><StudyProgressPage /></AuthGate></Route>
        <Route path="/settings"><AuthGate><SettingsPage /></AuthGate></Route>
        <Route path="/subscription" component={SubscriptionPage} />
        <Route path="/privacy-policy" component={PrivacyPolicyPage} />
        <Route path="/terms-of-service" component={TermsOfServicePage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <Toaster />
          <Router />
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
