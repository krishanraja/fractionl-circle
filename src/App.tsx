import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SetNewPasswordScreen } from "@/components/SetNewPasswordScreen";
import { PreferencesApplier } from "@/components/PreferencesApplier";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Index from "./pages/Index";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import ShareContact from "./pages/ShareContact";
import TryDemo from "./pages/TryDemo";
import { PrivacySignInPrompt } from "./pages/PrivacySignInPrompt";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AuthPage } from "./components/AuthPage";
import { FirstVoice } from "./components/onboarding/FirstVoice";
import { useUserProfile } from "./hooks/useUserProfile";
import { PageLoader } from "./components/ui/loading-spinner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ConsentBanner } from "./components/compliance/ConsentBanner";
import { SessionManager } from "./components/compliance/SessionManager";
import { useConsent } from "./hooks/useConsent";

const queryClient = new QueryClient();

/** Privacy settings need auth; show a clear sign-in prompt when logged out. */
function PrivacyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader message="Loading..." />;
  if (!user) return <PrivacySignInPrompt />;
  return (
    <>
      <PreferencesApplier />
      <SessionManager />
      <Privacy />
    </>
  );
}

/** Main app shell: auth gate, onboarding, and tabbed home. */
function AuthenticatedShell() {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading, needsOnboarding, refetch } = useUserProfile();
  const { syncLocalConsents } = useConsent();
  const hasSynced = useRef(false);
  const [passwordRecovery, setPasswordRecovery] = useState(
    () => typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !hasSynced.current) {
      hasSynced.current = true;
      syncLocalConsents();
    }
  }, [user, syncLocalConsents]);

  if (authLoading || (user && profileLoading && !passwordRecovery)) {
    return <PageLoader message="Loading your workspace..." />;
  }

  if (passwordRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 safe-top safe-bottom">
        <SetNewPasswordScreen onComplete={() => setPasswordRecovery(false)} />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthenticated={() => {}} />;
  }

  if (needsOnboarding) {
    return <FirstVoice onComplete={refetch} />;
  }

  return (
    <>
      <PreferencesApplier />
      <SessionManager />
      <Index />
      <ConsentBanner />
    </>
  );
}

function AppRoutes() {
  return (
  <>
      <Routes>
        <Route path="/privacy" element={<PrivacyRoute />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/share-contact" element={<ShareContact />} />
        <Route path="/try" element={<TryDemo />} />
        <Route path="/" element={<AuthenticatedShell />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <BrowserRouter>
              <Toaster />
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
