import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/landing-page";
import ChatPage from "@/pages/chat-page";
import DashboardPage from "@/pages/dashboard-page";
import OnboardingPage from "@/pages/onboarding-page";
import CurrentAffairsPage from "@/pages/current-affairs-page";
import PracticeQuizPage from "@/pages/practice-quiz-page";
import SubscriptionPage from "@/pages/subscription-page";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";

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
      <Route path="/chat/new">{isAuthenticated ? <ChatPage /> : <Redirect to="/" />}</Route>
      <Route path="/chat/:id" component={isAuthenticated ? ChatPage : LandingPage} />
      <Route path="/current-affairs" component={isAuthenticated ? CurrentAffairsPage : LandingPage} />
      <Route path="/practice-quiz" component={isAuthenticated ? PracticeQuizPage : LandingPage} />
      <Route path="/subscription" component={SubscriptionPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
