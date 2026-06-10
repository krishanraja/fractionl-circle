import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SetNewPasswordScreen } from "@/components/SetNewPasswordScreen";
import { PreferencesApplier } from "@/components/PreferencesApplier";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import Index from "./pages/Index";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import ShareContact from "./pages/ShareContact";
import TryDemo from "./pages/TryDemo";
import MarketingLanding from "./pages/MarketingLanding";
import { PrivacySignInPrompt } from "./pages/PrivacySignInPrompt";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AuthPage } from "./components/AuthPage";
import { FirstVoice } from "./components/onboarding/FirstVoice";
import { IdentityFirstRun } from "./components/onboarding/IdentityFirstRun";
import { useUserProfile } from "./hooks/useUserProfile";
import { PageLoader } from "./components/ui/loading-spinner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ConsentBanner } from "./components/compliance/ConsentBanner";
import { SessionManager } from "./components/compliance/SessionManager";
import { useConsent } from "./hooks/useConsent";

const queryClient = new QueryClient();

// Marketing landing flag. Default OFF: when false, logged-out "/" behaves exactly as
// before (AuthPage). When true, logged-out "/" renders the marketing landing instead.
// Instantly reversible via env, no code change.
const MARKETING_ENABLED = import.meta.env.VITE_MARKETING_LANDING_ENABLED === 'true';

// P1 borrowed-conviction first-run. Default ON: new users get the identity flow
// (Welcome → Talk → Proposal → First Move). Set VITE_IDENTITY_FIRSTRUN_ENABLED
// =false to fall back to the original FirstVoice. Only affects users who still
// need onboarding, so existing accounts are untouched.
const IDENTITY_FIRSTRUN_ENABLED = import.meta.env.VITE_IDENTITY_FIRSTRUN_ENABLED !== 'false';

/**
 * Public /auth route. Renders the working AuthPage (Google OAuth + email).
 * On a successful password sign-in, AuthPage calls onAuthenticated; we navigate
 * to "/" so the user lands in the app. Google OAuth and email-confirm/reset all
 * redirect to "/" themselves (window.location.origin + "/"), so the app gate
 * picks them up there. This mirrors how AuthenticatedShell uses AuthPage.
 */
function AuthRoute() {
  const navigate = useNavigate();
  return <AuthPage onAuthenticated={() => navigate('/')} />;
}

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
    // Flag ON: logged-out "/" shows the marketing landing.
    // Flag OFF: exact prior behavior (logged-out "/" = AuthPage).
    if (MARKETING_ENABLED) {
      return <MarketingLanding />;
    }
    return <AuthPage onAuthenticated={() => {}} />;
  }

  if (needsOnboarding) {
    return IDENTITY_FIRSTRUN_ENABLED
      ? <IdentityFirstRun onComplete={refetch} />
      : <FirstVoice onComplete={refetch} />;
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

/**
 * Failed email links (expired confirmation, used reset link) redirect back to
 * "/" with the failure in the URL hash. supabase-js only consumes success
 * tokens, so these errors were silently ignored — the user just saw the
 * landing page with no explanation. Surface them once, then clean the URL.
 */
function AuthHashErrorNotice() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('error_code=')) return;
    const params = new URLSearchParams(hash.slice(1));
    const code = params.get('error_code');
    if (!code) return;
    const expired = code === 'otp_expired';
    toast.error(expired ? 'That email link has expired' : 'Sign-in link problem', {
      description: expired
        ? 'Sign in with your email and password and we will send you a fresh confirmation link.'
        : params.get('error_description') || 'Please try signing in again.',
      duration: 12000,
    });
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);
  return null;
}

function AppRoutes() {
  return (
  <>
      <AuthHashErrorNotice />
      <Routes>
        <Route path="/privacy" element={<PrivacyRoute />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/share-contact" element={<ShareContact />} />
        <Route path="/try" element={<TryDemo />} />
        <Route path="/auth" element={<AuthRoute />} />
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
