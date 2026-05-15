import { PrivacySettings } from '@/components/compliance/PrivacySettings';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold mb-1">Privacy & Data Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your data processing preferences and exercise your privacy rights.
        </p>
        <PrivacySettings />
      </div>
    </div>
  );
}
