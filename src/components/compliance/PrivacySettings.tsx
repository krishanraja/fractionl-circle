import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Download, Trash2, FileText, Clock } from 'lucide-react';
import { useConsent, ConsentType } from '@/hooks/useConsent';
import { useDataPrivacy } from '@/hooks/useDataPrivacy';
import { toast } from 'sonner';

const CONSENT_OPTIONS: { type: ConsentType; label: string; description: string; required?: boolean }[] = [
  { type: 'essential', label: 'Essential Services', description: 'Core app functionality — authentication, data storage, and session management.', required: true },
  { type: 'analytics', label: 'Usage Analytics', description: 'Behavioral analytics to improve features and user experience.' },
  { type: 'ai_processing', label: 'AI Processing', description: 'Send business data to AI services (OpenAI) for insights, briefings, and strategy analysis.' },
  { type: 'voice_recording', label: 'Voice Recording & Transcription', description: 'Record and transcribe voice for activity logging and contact creation.' },
  { type: 'third_party_sharing', label: 'Contact Enrichment', description: 'Share contact data with enrichment providers (Apollo, Clearbit, Twilio).' },
  { type: 'data_export', label: 'Third-Party Export', description: 'Export data to Google Sheets and other external services.' },
  { type: 'marketing', label: 'Marketing Communications', description: 'Product updates, tips, and feature announcements.' },
];

export function PrivacySettings() {
  const { updateConsent, isConsentGranted, loading: consentLoading } = useConsent();
  const { loading: privacyLoading, downloadData, requestErasure, requests, fetchRequests } = useDataPrivacy();
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleExport = async () => {
    await downloadData();
    toast({ title: 'Data exported', description: 'Your data has been downloaded as a JSON file.' });
  };

  const handleErasure = async () => {
    const success = await requestErasure();
    if (success) {
      toast({ title: 'Account erased', description: 'All your data has been deleted. You will be signed out.' });
    } else {
      toast({ title: 'Erasure failed', description: 'Please try again or contact support.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Consent Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Data Processing Preferences</CardTitle>
          </div>
          <CardDescription>
            Control how your data is used. Changes take effect immediately.
            These preferences comply with GDPR, CCPA, and ISO 27001 requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CONSENT_OPTIONS.map(opt => (
            <div key={opt.type} className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{opt.label}</span>
                  {opt.required && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">Required</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </div>
              <Switch
                checked={isConsentGranted(opt.type)}
                disabled={opt.required || consentLoading}
                onCheckedChange={checked => updateConsent(opt.type, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data Rights */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Data Rights</CardTitle>
          </div>
          <CardDescription>
            Under GDPR and CCPA, you have the right to access, export, and delete your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Export Your Data</p>
              <p className="text-xs text-muted-foreground">Download all your data as a portable JSON file (GDPR Art. 20).</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={privacyLoading}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>

          <Separator />

          {/* Delete Account */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-destructive">Delete All Data</p>
              <p className="text-xs text-muted-foreground">
                Permanently erase your account and all associated data (GDPR Art. 17).
                This action cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={privacyLoading}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account and all associated data including
                    clients, contacts, activity logs, AI conversations, revenue data, and preferences.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleErasure}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, delete everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Request History */}
      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Request History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requests.map(req => (
                <div key={req.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                  <div>
                    <span className="font-medium capitalize">{req.request_type.replace('_', ' ')}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(req.requested_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    req.status === 'completed' ? 'bg-green-100 text-green-800' :
                    req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
