import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/landing-page";
import LoginPage from "@/pages/login-page";
import ChatPage from "@/pages/chat-page";
import DashboardPage from "@/pages/dashboard-page";
import OnboardingPage from "@/pages/onboarding-page";
import CurrentAffairsPage from "@/pages/current-affairs-page";
import CurrentAffairsTopicPage from "@/pages/current-affairs-topic-page";
import PracticeQuizPage from "@/pages/practice-quiz-page";
import SubscriptionPage from "@/pages/subscription-page";
import PaperEvaluationPage from "@/pages/paper-evaluation-page";
import NotesPage from "@/pages/notes-page";
import StudyPlannerPage from "@/pages/study-planner-page";
import StudyProgressPage from "@/pages/study-progress-page";
import SettingsPage from "@/pages/settings-page";
import PrivacyPolicyPage from "@/pages/privacy-policy-page";
import TermsOfServicePage from "@/pages/terms-of-service-page";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import { LanguageProvider } from "@/i18n/context";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  const needsOnboarding = isAuthenticated && !user?.onboardingCompleted;

  if (needsOnboarding) {
    return <OnboardingPage />;
  }

  return (
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
