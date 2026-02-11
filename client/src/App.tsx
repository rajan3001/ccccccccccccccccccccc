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

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  const needsOnboarding = isAuthenticated && !user?.onboardingCompleted;

  if (needsOnboarding) {
    return (
      <Suspense fallback={<PageLoader />}>
        <OnboardingPage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={isAuthenticated ? DashboardPage : LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/chat/new">{isAuthenticated ? <ChatPage /> : <Redirect to="/login" />}</Route>
        <Route path="/chat/:id" component={isAuthenticated ? ChatPage : LoginPage} />
        <Route path="/current-affairs" component={isAuthenticated ? CurrentAffairsPage : LoginPage} />
        <Route path="/current-affairs/topic/:id" component={isAuthenticated ? CurrentAffairsTopicPage : LoginPage} />
        <Route path="/practice-quiz" component={isAuthenticated ? PracticeQuizPage : LoginPage} />
        <Route path="/paper-evaluation" component={isAuthenticated ? PaperEvaluationPage : LoginPage} />
        <Route path="/notes" component={isAuthenticated ? NotesPage : LoginPage} />
        <Route path="/study-planner" component={isAuthenticated ? StudyPlannerPage : LoginPage} />
        <Route path="/study-progress" component={isAuthenticated ? StudyProgressPage : LoginPage} />
        <Route path="/settings" component={isAuthenticated ? SettingsPage : LoginPage} />
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
