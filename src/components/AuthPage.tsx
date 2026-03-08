import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/feedback';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

// Stable animation variants defined at module level to prevent re-creation
const fadeInUpVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const fadeInUpTransition = {
  duration: 0.25,
  ease: [0, 0, 0.2, 1],
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
        src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png" 
        alt="Circle" 
        className="h-12 mx-auto mb-6"
      />
      <h1 className="text-title-1 text-foreground mb-2">Welcome to Circle</h1>
      <p className="text-body text-foreground-secondary">
        Track your portfolio, one voice note at a time
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
        src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png" 
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
      </div>
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
        src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png" 
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
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="h-12 text-body pr-12 bg-input border-border"
            autoComplete="new-password"
            required
            minLength={6}
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
  const [mode, setMode] = useState<'welcome' | 'signin' | 'signup'>('welcome');

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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        setError({ title: 'Sign up failed', message: error.message });
      } else {
        setSuccessMessage('Check your email to confirm your account');
      }
    } catch (err) {
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
        setError({ title: 'Sign in failed', message: error.message });
      } else {
        onAuthenticated();
      }
    } catch (err) {
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
    handleTogglePassword,
    handleSignIn,
    handleSignUp,
    handleContinueWithEmail,
    handleGoogleSignIn,
    handleDismissError,
    handleSetModeWelcome,
    handleSetModeSignIn,
  ]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 safe-top safe-bottom">
      <AnimatePresence mode="wait">
        {content}
      </AnimatePresence>
    </div>
  );
};
