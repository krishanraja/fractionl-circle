import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrivacySignInPrompt() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-md mx-auto pt-8 space-y-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Privacy &amp; data settings</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sign in to manage consent preferences, export your data, or request account deletion.
        </p>
        <Button asChild className="w-full">
          <Link to="/">Sign in to Circle</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          <Link to="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
