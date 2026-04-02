import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AuthPage } from "./components/AuthPage";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { useUserProfile } from "./hooks/useUserProfile";
import { PageLoader } from "./components/ui/loading-spinner";
import { ConsentBanner } from "./components/compliance/ConsentBanner";
import { SessionManager } from "./components/compliance/SessionManager";
import { useConsent } from "./hooks/useConsent";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, needsOnboarding, refetch } = useUserProfile();
  const { syncLocalConsents } = useConsent();

  // Sync any pre-login consent preferences to the database after auth
  useEffect(() => {
    if (user) syncLocalConsents();
  }, [user, syncLocalConsents]);

  if (authLoading || (user && profileLoading)) {
    return <PageLoader message="Loading your workspace..." />;
  }

  if (!user) {
    return <AuthPage onAuthenticated={() => {}} />;
  }

  if (needsOnboarding) {
    return <OnboardingWizard onComplete={refetch} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <SessionManager />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ConsentBanner />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
