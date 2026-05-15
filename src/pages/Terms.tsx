import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold mb-1">Terms of use</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Fractionl Circle — last updated May 2026
        </p>
        <div className="space-y-4 text-sm text-foreground leading-relaxed">
          <p>
            By using Circle you agree to use the product lawfully and to keep your account credentials
            secure. Circle helps you manage your professional network and related data; you remain
            responsible for contacts and messages you send through third-party services (email, LinkedIn, etc.).
          </p>
          <p>
            Paid plans are billed through Stripe. You can manage or cancel subscriptions from in-app billing
            settings when available on your account.
          </p>
          <p>
            We may update these terms as the product evolves. Continued use after changes constitutes acceptance.
            For privacy and data rights, see{' '}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy &amp; data settings
            </Link>
            .
          </p>
          <p className="text-muted-foreground">
            Questions:{' '}
            <a href="mailto:support@fractionl.ai" className="text-primary hover:underline">
              support@fractionl.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
