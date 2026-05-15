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
import NotFound from "./pages/NotFound";
import ShareContact from "./pages/ShareContact";
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

const AppContent = () => {
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PreferencesApplier />
        <BrowserRouter>
          <SessionManager />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/share-contact" element={<ShareContact />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ConsentBanner />
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster />
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
