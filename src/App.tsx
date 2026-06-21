import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SetNewPasswordScreen } from "@/components/SetNewPasswordScreen";
import { PreferencesApplier } from "@/components/PreferencesApplier";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import ThesisApp from "./pathroom/ThesisApp";
import { PrivacySignInPrompt } from "./pages/PrivacySignInPrompt";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AuthPage } from "./components/AuthPage";
import { PageLoader } from "./components/ui/loading-spinner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ConsentBanner } from "./components/compliance/ConsentBanner";
import { SessionManager } from "./components/compliance/SessionManager";
import { useConsent } from "./hooks/useConsent";

// Unlinked design fixtures (lazy so they stay out of the main prod bundle). Not in nav.
const StartHereMock = lazy(() => import("./preview/StartHereMock"));
const SharpenMock = lazy(() => import("./preview/SharpenMock"));
const JourneyMock = lazy(() => import("./preview/JourneyMock"));
const CockpitMock = lazy(() => import("./preview/CockpitMock"));
const LoaderMock = lazy(() => import("./preview/LoaderMock"));

const queryClient = new QueryClient();

/**
 * Public /auth route. Renders the AuthPage (Google OAuth + email). On a successful
 * password sign-in we navigate to "/"; OAuth and email-confirm/reset redirect to "/"
 * themselves, where the app gate picks them up.
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

/** Auth gate. Logged out -> AuthPage. Logged in -> the thesis-validation product. */
function AuthenticatedShell() {
  const { user, loading: authLoading } = useAuth();
  const { syncLocalConsents } = useConsent();
  const hasSynced = useRef(false);
  const [passwordRecovery, setPasswordRecovery] = useState(
    () => typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !hasSynced.current) {
      hasSynced.current = true;
      syncLocalConsents();
    }
  }, [user, syncLocalConsents]);

  if (authLoading) return <PageLoader message="Loading..." />;

  if (passwordRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 safe-top safe-bottom">
        <SetNewPasswordScreen onComplete={() => setPasswordRecovery(false)} />
      </div>
    );
  }

  if (!user) return <AuthPage onAuthenticated={() => {}} />;

  return (
    <>
      <PreferencesApplier />
      <SessionManager />
      <ThesisApp />
      <ConsentBanner />
    </>
  );
}

/**
 * Failed email links (expired confirmation, used reset link) redirect back to "/" with
 * the failure in the URL hash. supabase-js only consumes success tokens, so surface the
 * error once, then clean the URL.
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
        <Route path="/auth" element={<AuthRoute />} />
        <Route path="/preview/start" element={<Suspense fallback={null}><StartHereMock /></Suspense>} />
        <Route path="/preview/sharpen" element={<Suspense fallback={null}><SharpenMock /></Suspense>} />
        <Route path="/preview/journey" element={<Suspense fallback={null}><JourneyMock /></Suspense>} />
        <Route path="/preview/cockpit" element={<Suspense fallback={null}><CockpitMock /></Suspense>} />
        <Route path="/preview/loader" element={<Suspense fallback={null}><LoaderMock /></Suspense>} />
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
