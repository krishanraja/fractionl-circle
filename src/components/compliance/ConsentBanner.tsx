import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useConsent, ConsentType } from '@/hooks/useConsent';

const CONSENT_OPTIONS: { type: ConsentType; label: string; description: string; required?: boolean }[] = [
  { type: 'essential', label: 'Essential', description: 'Required for core app functionality (authentication, data storage).', required: true },
  { type: 'analytics', label: 'Analytics', description: 'Usage analytics to improve your experience.' },
  { type: 'ai_processing', label: 'AI Processing', description: 'Send data to AI services for insights, briefings, and voice parsing.' },
  { type: 'voice_recording', label: 'Voice Recording', description: 'Record and transcribe voice input for activity logging and contact creation.' },
  { type: 'third_party_sharing', label: 'Find contact details', description: 'Use Apollo, Clearbit, or Twilio to find contact details.' },
  { type: 'data_export', label: 'Data Export', description: 'Export your data to Google Sheets or download as files.' },
  { type: 'marketing', label: 'Marketing', description: 'Receive product updates and tips.' },
];

export function ConsentBanner() {
  const { hasConsented, updateAllConsents, isConsentGranted } = useConsent();
  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selections, setSelections] = useState<Record<ConsentType, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    CONSENT_OPTIONS.forEach(opt => {
      defaults[opt.type] = opt.required || isConsentGranted(opt.type);
    });
    return defaults as Record<ConsentType, boolean>;
  });

  if (hasConsented || dismissed) return null;

  const handleAcceptAll = () => {
    const all: Partial<Record<ConsentType, boolean>> = {};
    CONSENT_OPTIONS.forEach(opt => { all[opt.type] = true; });
    updateAllConsents(all);
    setDismissed(true);
  };

  const handleAcceptSelected = () => {
    updateAllConsents(selections);
    setDismissed(true);
  };

  const handleRejectOptional = () => {
    const minimal: Partial<Record<ConsentType, boolean>> = {};
    CONSENT_OPTIONS.forEach(opt => {
      minimal[opt.type] = !!opt.required;
    });
    updateAllConsents(minimal);
    setDismissed(true);
  };

  return (
    <div className="dark fixed inset-x-0 bottom-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start gap-3 mb-3">
          <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Privacy & Data Preferences</h3>
            <p className="text-xs text-muted-foreground mt-1">
              We use your data to provide and improve Fractionl Circle. Choose which data processing activities you consent to.
              You can change these anytime in{' '}
              <Link to="/privacy" className="text-primary hover:underline font-medium">
                Privacy settings
              </Link>
              .
            </p>
          </div>
        </div>

        {showDetails && (
          <Card className="mb-3">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs">Data Processing Preferences</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3 space-y-2">
              {CONSENT_OPTIONS.map(opt => (
                <div key={opt.type} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium">{opt.label}</span>
                    {opt.required && <span className="text-[10px] text-muted-foreground ml-1">(required)</span>}
                    <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                  </div>
                  <Switch
                    checked={selections[opt.type]}
                    disabled={opt.required}
                    onCheckedChange={checked => setSelections(prev => ({ ...prev, [opt.type]: checked }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            Customize
          </Button>
          <Button size="sm" variant="outline" onClick={handleRejectOptional}>
            Essential Only
          </Button>
          {showDetails && (
            <Button size="sm" variant="secondary" onClick={handleAcceptSelected}>
              Save Preferences
            </Button>
          )}
          <Button size="sm" onClick={handleAcceptAll}>
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}
