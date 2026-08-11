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
  { type: 'essential', label: 'Keep Circle working', description: 'Sign-in, storage, security, and the basic app.', required: true },
  { type: 'analytics', label: 'Usage analytics', description: 'Help us see what works and what needs fixing.' },
  { type: 'ai_processing', label: 'AI help', description: 'Use AI providers for research, transcription, and suggestions you ask for.' },
  { type: 'voice_recording', label: 'Voice input', description: 'Record and turn your voice into text when you tap the microphone.' },
  { type: 'third_party_sharing', label: 'Contact details', description: 'Use trusted data providers to fill gaps in a contact.' },
  { type: 'data_export', label: 'Send data elsewhere', description: 'Export your data to Google Sheets or another service you choose.' },
  { type: 'marketing', label: 'Product emails', description: 'Get product news, tips, and feature updates.' },
];

export function PrivacySettings() {
  const { updateConsent, isConsentGranted, loading: consentLoading } = useConsent();
  const { loading: privacyLoading, exportData, requestErasure, requests, fetchRequests } = useDataPrivacy();

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleExport = async () => {
    const data = await exportData();
    if (!data) {
      toast.error('Export failed. Check your connection and try again.');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fractionl-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Your data has been downloaded as a JSON file.');
  };

  const handleErasure = async () => {
    const success = await requestErasure();
    if (success) {
      toast.success('All your data has been deleted. You will be signed out.');
    } else {
      toast.error('Erasure failed. Please try again or contact support.');
    }
  };

  return (
    <div className="privacy-settings">
      {/* Consent Preferences */}
      <Card className="privacy-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Data Processing Preferences</CardTitle>
          </div>
          <CardDescription>
            Turn optional uses on or off. Changes apply right away.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CONSENT_OPTIONS.map(opt => (
            <div key={opt.type} className="privacy-option">
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
      <Card className="privacy-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Data Rights</CardTitle>
          </div>
          <CardDescription>
            Download what Circle keeps or delete your account and data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Data */}
          <div className="privacy-right">
            <div>
              <p className="text-sm font-medium">Download your data</p>
              <p className="text-xs text-muted-foreground">Get a copy of everything Circle keeps for you.</p>
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
          <div className="privacy-right">
            <div>
              <p className="text-sm font-medium text-destructive">Delete your account</p>
              <p className="text-xs text-muted-foreground">
                Permanently erase your account, people, ideas, and settings. This cannot be undone.
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
                  <AlertDialogTitle>Delete everything?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes your Circle account and all data tied to it. You cannot undo this.
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
        <Card className="privacy-card">
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
