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
const PyqPage = lazy(() => import("@/pages/pyq-page"));
const SettingsPage = lazy(() => import("@/pages/settings-page"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy-page"));
const TermsOfServicePage = lazy(() => import("@/pages/terms-of-service-page"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5" data-testid="page-loader" style={{ background: 'linear-gradient(160deg, #0c0a08 0%, #1a1410 40%, #0f0d0a 100%)' }}>
      <img src="/favicon.png" alt="" width={40} height={40} style={{ borderRadius: 8, filter: 'drop-shadow(0 0 12px rgba(196,127,23,0.4))', animation: 'lp-pulse 2.4s ease-in-out infinite' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 3, color: '#c97a0a', textTransform: 'uppercase' as const }}>
          Learnpro <span style={{ color: '#e8d5b0', fontWeight: 300 }}>AI</span><span style={{ marginLeft: 4, fontSize: 7, fontWeight: 500, opacity: 0.5, verticalAlign: 'baseline' }}>v1.1</span>
        </div>
        <div style={{ marginTop: 4, fontFamily: "'Inter',system-ui,sans-serif", fontSize: 9, letterSpacing: 4, color: 'rgba(232,213,176,0.35)', textTransform: 'uppercase' as const, fontWeight: 500 }}>
          Intelligence Redefined
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1 h-1 rounded-full" style={{ background: '#c97a0a', animation: `lp-dots 1.4s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
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
        <Route path="/pyq"><AuthGate><PyqPage /></AuthGate></Route>
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
