import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/feedback';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface SetNewPasswordScreenProps {
  onComplete: () => void;
}

export const SetNewPasswordScreen = ({ onComplete }: SetNewPasswordScreenProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError({ title: 'Password too short', message: 'Use at least 8 characters.' });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError({ title: 'Update failed', message: updateError.message });
        return;
      }
      toast.success('Password updated');
      window.history.replaceState({}, '', `${window.location.origin}/`);
      onComplete();
    } catch {
      setError({ title: 'Update failed', message: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  }, [password, onComplete]);

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <img
          src="/brand/fractionl-wordmark.png"
          alt="Circle"
          className="h-8 mx-auto mb-4"
        />
        <h1 className="text-title-2 text-foreground mb-1">Set a new password</h1>
        <p className="text-caption text-foreground-secondary">
          Choose a new password for your account
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Label htmlFor="new-password" className="text-caption font-medium">New password</Label>
          <motion.div className="relative">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-body pr-12 bg-input border-border"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </motion.div>
        </motion.div>
        <Button type="submit" className="w-full h-12 text-body font-semibold" disabled={loading}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update password'}
        </Button>
      </form>

      <ErrorBanner
        show={!!error}
        title={error?.title || ''}
        message={error?.message}
        onDismiss={() => setError(null)}
      />
    </div>
  );
};
