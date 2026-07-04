import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/feedback';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthLegalFooter } from '@/components/auth/AuthLegalFooter';
import { setRememberMe } from '@/lib/rememberMe';

// "Remember me on this device" - opts out of the 30-min inactivity auto-logout, so a
// returning user stays signed in until they sign out or clear their site data. Shared
// by the welcome and sign-in surfaces so the choice reads the same in both.
const RememberMeToggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none text-caption text-foreground-secondary">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
    />
    Keep me signed in on this device
  </label>
);

// Stable animation variants defined at module level to prevent re-creation
const fadeInUpVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const fadeInUpTransition = {
  duration: 0.25,
  ease: [0, 0, 0.2, 1] as [number, number, number, number],
};

const successMessageVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// Google Icon component extracted to prevent re-creation
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Props interfaces for extracted components
interface WelcomeContentProps {
  email: string;
  onEmailChange: (value: string) => void;
  onContinue: () => void;
  onGoogleSignIn: () => void;
  googleLoading: boolean;
  onSignInClick: () => void;
  error: { title: string; message: string } | null;
  onDismissError: () => void;
  rememberMe: boolean;
  onRememberMeChange: (v: boolean) => void;
}

interface SignInContentProps {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  successMessage: string | null;
  error: { title: string; message: string } | null;
  onDismissError: () => void;
  onSignUpClick: () => void;
  onForgotPasswordClick: () => void;
  rememberMe: boolean;
  onRememberMeChange: (v: boolean) => void;
}

interface ForgotPasswordContentProps {
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  successMessage: string | null;
  error: { title: string; message: string } | null;
  onDismissError: () => void;
  onBackToSignIn: () => void;
}

interface SignUpContentProps {
  email: string;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  successMessage: string | null;
  error: { title: string; message: string } | null;
  onDismissError: () => void;
  onBackClick: () => void;
}

// Module-level component: WelcomeContent
const WelcomeContent = ({
  email,
  onEmailChange,
  onContinue,
  onGoogleSignIn,
  googleLoading,
  onSignInClick,
  error,
  onDismissError,
  rememberMe,
  onRememberMeChange,
}: WelcomeContentProps) => (
  <motion.div
    key="welcome"
    variants={fadeInUpVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={fadeInUpTransition}
    className="w-full max-w-sm mx-auto space-y-8"
  >
    {/* Logo */}
    <div className="text-center">
      <img 
        src="/brand/fractionl-wordmark.png" 
        alt="Fractionl"
        className="h-12 mx-auto mb-6"
      />
      <h1 className="text-title-1 text-foreground mb-2">Is your idea worth selling?</h1>
      <p className="text-body text-foreground-secondary">
        An honest read on whether your idea sells, grounded in the live market and your real network - plus the warm moves to land your first client.
      </p>
    </div>

    {/* Email Input */}
    <div className="space-y-4">
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
        <Input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="h-14 pl-12 text-body bg-input border-border"
          autoComplete="email"
        />
      </div>
      
      <Button 
        onClick={onContinue}
        disabled={!email.trim()}
        className="w-full h-14 text-body font-semibold btn-touch"
      >
        Continue
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>

    {/* Divider */}
    <div className="flex items-center gap-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-caption text-foreground-secondary">or</span>
      <div className="flex-1 h-px bg-border" />
    </div>

    {/* Google Sign In */}
    <Button 
      variant="outline"
      onClick={onGoogleSignIn}
      disabled={googleLoading}
      className="w-full h-14 text-body font-medium"
    >
      {googleLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <GoogleIcon />
          Continue with Google
        </>
      )}
    </Button>

    {/* Remember me - opts out of the inactivity auto-logout on this device */}
    <RememberMeToggle checked={rememberMe} onChange={onRememberMeChange} />

    {/* Sign In Link */}
    <p className="text-center text-body text-foreground-secondary">
      Already have an account?{' '}
      <button 
        onClick={onSignInClick}
        className="text-primary font-medium hover:underline"
      >
        Sign in
      </button>
    </p>

    {/* Error */}
    <ErrorBanner
      show={!!error}
      title={error?.title || ''}
      message={error?.message}
      onDismiss={onDismissError}
    />
  </motion.div>
);

// Module-level component: SignInContent
const SignInContent = ({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  onSubmit,
  loading,
  successMessage,
  error,
  onDismissError,
  onSignUpClick,
  onForgotPasswordClick,
  rememberMe,
  onRememberMeChange,
}: SignInContentProps) => (
  <motion.div
    key="signin"
    variants={fadeInUpVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={fadeInUpTransition}
    className="w-full max-w-sm mx-auto space-y-6"
  >
    <div className="text-center">
      <img 
        src="/brand/fractionl-wordmark.png" 
        alt="Circle" 
        className="h-8 mx-auto mb-4"
      />
      <h1 className="text-title-2 text-foreground mb-1">Welcome back</h1>
      <p className="text-caption text-foreground-secondary">
        Sign in to continue
      </p>
    </div>

    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email" className="text-caption font-medium">Email</Label>
        <Input
          id="signin-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="h-12 text-body bg-input border-border"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password" className="text-caption font-medium">Password</Label>
        <div className="relative">
          <Input
            id="signin-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="h-12 text-body pr-12 bg-input border-border"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <motion.div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="text-caption text-primary font-medium hover:underline"
          >
            Forgot password?
          </button>
        </motion.div>
      </div>
      <RememberMeToggle checked={rememberMe} onChange={onRememberMeChange} />
      <Button
        type="submit"
        className="w-full h-12 text-body font-semibold btn-touch"
        disabled={loading}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
      </Button>
    </form>

    {/* Success/Error Messages */}
    <AnimatePresence>
      {successMessage && (
        <motion.div
          variants={successMessageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-caption text-center"
        >
          {successMessage}
        </motion.div>
      )}
    </AnimatePresence>
    
    <ErrorBanner
      show={!!error}
      title={error?.title || ''}
      message={error?.message}
      onDismiss={onDismissError}
    />

    <p className="text-center text-caption text-foreground-secondary">
      Don't have an account?{' '}
      <button 
        onClick={onSignUpClick}
        className="text-primary font-medium hover:underline"
      >
        Sign up
      </button>
    </p>
  </motion.div>
);

const ForgotPasswordContent = ({
  email,
  onEmailChange,
  onSubmit,
  loading,
  successMessage,
  error,
  onDismissError,
  onBackToSignIn,
}: ForgotPasswordContentProps) => (
  <motion.div
    key="forgot"
    variants={fadeInUpVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={fadeInUpTransition}
    className="w-full max-w-sm mx-auto space-y-6"
  >
    <div className="text-center">
      <img
        src="/brand/fractionl-wordmark.png"
        alt="Circle"
        className="h-8 mx-auto mb-4"
      />
      <h1 className="text-title-2 text-foreground mb-1">Reset your password</h1>
      <p className="text-caption text-foreground-secondary">
        We will email you a link to choose a new password
      </p>
    </div>

    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="forgot-email" className="text-caption font-medium">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="h-12 text-body bg-input border-border"
          autoComplete="email"
          required
        />
      </div>
      <Button type="submit" className="w-full h-12 text-body font-semibold btn-touch" disabled={loading}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send reset link'}
      </Button>
    </form>

    <AnimatePresence>
      {successMessage && (
        <motion.div
          variants={successMessageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-caption text-center"
        >
          {successMessage}
        </motion.div>
      )}
    </AnimatePresence>

    <ErrorBanner
      show={!!error}
      title={error?.title || ''}
      message={error?.message}
      onDismiss={onDismissError}
    />

    <button
      type="button"
      onClick={onBackToSignIn}
      className="w-full text-center text-caption text-foreground-secondary hover:text-foreground"
    >
      ← Back to sign in
    </button>
  </motion.div>
);

// Module-level component: SignUpContent
const SignUpContent = ({
  email,
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  onSubmit,
  loading,
  successMessage,
  error,
  onDismissError,
  onBackClick,
}: SignUpContentProps) => (
  <motion.div
    key="signup"
    variants={fadeInUpVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={fadeInUpTransition}
    className="w-full max-w-sm mx-auto space-y-6"
  >
    <div className="text-center">
      <img 
        src="/brand/fractionl-wordmark.png" 
        alt="Circle" 
        className="h-8 mx-auto mb-4"
      />
      <h1 className="text-title-2 text-foreground mb-1">Create your account</h1>
      <p className="text-caption text-foreground-secondary">
        {email}
      </p>
    </div>

    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-caption font-medium">Create a password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="h-12 text-body pr-12 bg-input border-border"
            autoComplete="new-password"
            required
            minLength={8}
            autoFocus
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <Button 
        type="submit" 
        className="w-full h-12 text-body font-semibold btn-touch" 
        disabled={loading}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
      </Button>
    </form>

    {/* Success/Error Messages */}
    <AnimatePresence>
      {successMessage && (
        <motion.div
          variants={successMessageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-caption text-center"
        >
          {successMessage}
        </motion.div>
      )}
    </AnimatePresence>
    
    <ErrorBanner
      show={!!error}
      title={error?.title || ''}
      message={error?.message}
      onDismiss={onDismissError}
    />

    <button 
      onClick={onBackClick}
      className="w-full text-center text-caption text-foreground-secondary hover:text-foreground"
    >
      ← Use a different email
    </button>
  </motion.div>
);

// Main AuthPage component
interface AuthPageProps {
  onAuthenticated: () => void;
}

export const AuthPage = ({ onAuthenticated }: AuthPageProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'welcome' | 'signin' | 'signup' | 'forgot'>('welcome');
  const [rememberMe, setRememberMeState] = useState(false);

  // Persist the choice the moment it changes, so it's already saved before the Google
  // OAuth redirect navigates away from the page (the redirect flow never returns here).
  const handleRememberMeChange = useCallback((v: boolean) => {
    setRememberMeState(v);
    setRememberMe(v);
  }, []);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    console.log('[AuthPage] handleGoogleSignIn called');
    setGoogleLoading(true);
    clearMessages();
    
    const redirectUrl = `${window.location.origin}/`;
    console.log('[AuthPage] Google OAuth redirect URL:', redirectUrl);
    
    try {
      console.log('[AuthPage] Calling supabase.auth.signInWithOAuth...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      console.log('[AuthPage] OAuth response - data:', data);
      console.log('[AuthPage] OAuth response - error:', error);

      if (error) {
        console.error('[AuthPage] Google sign in error:', error);
        setError({ title: 'Google sign in failed', message: error.message });
      } else if (!data?.url) {
        console.error('[AuthPage] No OAuth URL returned - provider may not be configured');
        setError({ 
          title: 'Google sign in failed', 
          message: 'Google authentication is not configured. Please contact support.' 
        });
      } else {
        console.log('[AuthPage] OAuth URL received, redirecting to:', data.url);
        // The redirect should happen automatically, but log if we get here
      }
    } catch (err) {
      console.error('[AuthPage] Unexpected error during Google sign in:', err);
      setError({ title: 'Google sign in failed', message: 'An unexpected error occurred' });
    } finally {
      setGoogleLoading(false);
    }
  }, [clearMessages]);

  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        setError({ title: 'Sign up failed', message: error.message });
      } else if (data.session) {
        // Frictionless signup: email auto-confirm is on, so signUp returns a live
        // session and the auth listener drops the user straight into the app. No
        // email wall (which previously stranded ~45% of signups). If auto-confirm
        // is ever turned back off, data.session is null and we fall back below.
      } else {
        setSuccessMessage('Check your email to confirm your account. Once you\'re in, we\'ll turn who you know into a plan for your next clients.');
      }
    } catch (_err) {
      setError({ title: 'Sign up failed', message: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  }, [email, password, clearMessages]);

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Six of the last nine signups are stuck unconfirmed (emails lost to the
        // 2/hr Supabase mailer limit). Auto-resend the confirmation so they can
        // recover instead of dead-ending on "Email not confirmed".
        if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) {
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: `${window.location.origin}/` },
          });
          if (resendError) {
            setError({
              title: 'Confirm your email first',
              message: 'Your account exists but the email was never confirmed, and we could not send a new link right now. Try again in an hour.',
            });
          } else {
            setSuccessMessage('Your email is not confirmed yet, so we just sent you a fresh confirmation link. Open it, then sign in.');
          }
        } else {
          setError({ title: 'Sign in failed', message: error.message });
        }
      } else {
        onAuthenticated();
      }
    } catch (_err) {
      setError({ title: 'Sign in failed', message: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  }, [email, password, clearMessages, onAuthenticated]);

  const handleContinueWithEmail = useCallback(() => {
    if (email.trim()) {
      setMode('signup');
    }
  }, [email]);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  const handleTogglePassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const handleSetModeWelcome = useCallback(() => {
    setMode('welcome');
  }, []);

  const handleSetModeSignIn = useCallback(() => {
    setMode('signin');
  }, []);

  const handleForgotPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) {
        setError({ title: 'Reset failed', message: error.message });
      } else {
        setSuccessMessage('Check your email for a reset link');
      }
    } catch {
      setError({ title: 'Reset failed', message: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  }, [email, clearMessages]);

  const handleSetModeForgot = useCallback(() => {
    clearMessages();
    setMode('forgot');
  }, [clearMessages]);

  // Memoize the content to prevent unnecessary re-renders
  const content = useMemo(() => {
    switch (mode) {
      case 'signin':
        return (
          <SignInContent
            email={email}
            onEmailChange={setEmail}
            password={password}
            onPasswordChange={setPassword}
            showPassword={showPassword}
            onTogglePassword={handleTogglePassword}
            onSubmit={handleSignIn}
            loading={loading}
            successMessage={successMessage}
            error={error}
            onDismissError={handleDismissError}
            onSignUpClick={handleSetModeWelcome}
            onForgotPasswordClick={handleSetModeForgot}
            rememberMe={rememberMe}
            onRememberMeChange={handleRememberMeChange}
          />
        );
      case 'forgot':
        return (
          <ForgotPasswordContent
            email={email}
            onEmailChange={setEmail}
            onSubmit={handleForgotPassword}
            loading={loading}
            successMessage={successMessage}
            error={error}
            onDismissError={handleDismissError}
            onBackToSignIn={handleSetModeSignIn}
          />
        );
      case 'signup':
        return (
          <SignUpContent
            email={email}
            password={password}
            onPasswordChange={setPassword}
            showPassword={showPassword}
            onTogglePassword={handleTogglePassword}
            onSubmit={handleSignUp}
            loading={loading}
            successMessage={successMessage}
            error={error}
            onDismissError={handleDismissError}
            onBackClick={handleSetModeWelcome}
          />
        );
      default:
        return (
          <WelcomeContent
            email={email}
            onEmailChange={setEmail}
            onContinue={handleContinueWithEmail}
            onGoogleSignIn={handleGoogleSignIn}
            googleLoading={googleLoading}
            onSignInClick={handleSetModeSignIn}
            error={error}
            onDismissError={handleDismissError}
            rememberMe={rememberMe}
            onRememberMeChange={handleRememberMeChange}
          />
        );
    }
  }, [
    mode,
    email,
    password,
    showPassword,
    loading,
    googleLoading,
    successMessage,
    error,
    rememberMe,
    handleRememberMeChange,
    handleTogglePassword,
    handleSignIn,
    handleSignUp,
    handleContinueWithEmail,
    handleGoogleSignIn,
    handleDismissError,
    handleSetModeWelcome,
    handleSetModeSignIn,
    handleForgotPassword,
    handleSetModeForgot,
  ]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-top safe-bottom">
      <div className="w-full max-w-sm flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {content}
        </AnimatePresence>
      </div>
      <AuthLegalFooter />
    </div>
  );
};
