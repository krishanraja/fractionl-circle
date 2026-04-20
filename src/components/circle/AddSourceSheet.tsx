import { useState } from 'react';
import { Upload, Mic, ArrowLeft, Globe, Building2, Chrome, Database } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { LinkedInCsvDrop } from './LinkedInCsvDrop';
import { CrmCsvDrop } from './CrmCsvDrop';
import { VoiceSeedCapture } from './VoiceSeedCapture';
import { GoogleConnect } from './GoogleConnect';
import { MicrosoftConnect } from './MicrosoftConnect';
import { ExtensionPair } from './ExtensionPair';
import type { IngestResult } from '@/lib/circleIngest';

type View = 'pick' | 'linkedin' | 'crm' | 'voice' | 'google' | 'microsoft' | 'extension';

interface AddSourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIngested?: (result: IngestResult) => void;
}

const PickerBody = ({ onPick }: { onPick: (v: Exclude<View, 'pick'>) => void }) => (
  <div className="p-6 pt-3 space-y-3">
    <div>
      <h2 className="text-lg font-semibold text-foreground">Add a source</h2>
      <p className="mt-1 text-sm text-foreground-secondary">
        The more sources you connect, the better the Matches. Start with whichever is easiest.
      </p>
    </div>
    <button
      onClick={() => onPick('linkedin')}
      className="w-full text-left rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4 flex items-start gap-3 hover:border-primary/50 transition-colors"
    >
      <div className="mt-0.5 rounded-full bg-primary/10 p-2">
        <Upload className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Drop a LinkedIn CSV</p>
        <p className="mt-0.5 text-xs text-foreground-secondary leading-relaxed">
          Request your connections export from LinkedIn, drop the file here. The richest single source.
        </p>
      </div>
    </button>
    <button
      onClick={() => onPick('crm')}
      className="w-full text-left rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4 flex items-start gap-3 hover:border-primary/50 transition-colors"
    >
      <div className="mt-0.5 rounded-full bg-primary/10 p-2">
        <Database className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Import from another CRM or sheet</p>
        <p className="mt-0.5 text-xs text-foreground-secondary leading-relaxed">
          HubSpot, Attio, Folk, or any spreadsheet with a name column. Auto-detects the format.
        </p>
      </div>
    </button>
    <button
      onClick={() => onPick('google')}
      className="w-full text-left rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4 flex items-start gap-3 hover:border-primary/50 transition-colors"
    >
      <div className="mt-0.5 rounded-full bg-primary/10 p-2">
        <Globe className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Connect Google</p>
        <p className="mt-0.5 text-xs text-foreground-secondary leading-relaxed">
          Contacts + Calendar (last 90 days). No email body scanning.
        </p>
      </div>
    </button>
    <button
      onClick={() => onPick('microsoft')}
      className="w-full text-left rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4 flex items-start gap-3 hover:border-primary/50 transition-colors"
    >
      <div className="mt-0.5 rounded-full bg-primary/10 p-2">
        <Building2 className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Connect Microsoft</p>
        <p className="mt-0.5 text-xs text-foreground-secondary leading-relaxed">
          Outlook contacts + Calendar. Personal or work-or-school accounts.
        </p>
      </div>
    </button>
    <button
      onClick={() => onPick('extension')}
      className="w-full text-left rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4 flex items-start gap-3 hover:border-primary/50 transition-colors"
    >
      <div className="mt-0.5 rounded-full bg-primary/10 p-2">
        <Chrome className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Connect browser extension</p>
        <p className="mt-0.5 text-xs text-foreground-secondary leading-relaxed">
          Capture LinkedIn profiles client-side as you browse. Pair once, then it runs in the background.
        </p>
      </div>
    </button>
    <button
      onClick={() => onPick('voice')}
      className="w-full text-left rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4 flex items-start gap-3 hover:border-primary/50 transition-colors"
    >
      <div className="mt-0.5 rounded-full bg-primary/10 p-2">
        <Mic className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Talk — name 5 people</p>
        <p className="mt-0.5 text-xs text-foreground-secondary leading-relaxed">
          Don't have a CSV handy? Voice a few names and I'll seed your Circle right now.
        </p>
      </div>
    </button>
    <p className="pt-2 text-center text-xs text-foreground-muted">
      Outlook + iOS contacts land in follow-up sessions.
    </p>
  </div>
);

const DetailBody = ({
  view,
  onBack,
  onIngested,
}: {
  view: Exclude<View, 'pick'>;
  onBack: () => void;
  onIngested?: (result: IngestResult) => void;
}) => (
  <div className="p-6 pt-3">
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 text-xs text-foreground-secondary hover:text-foreground mb-4"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Back
    </button>
    {view === 'linkedin' && <LinkedInCsvDrop onDone={onIngested} />}
    {view === 'crm' && <CrmCsvDrop onDone={onIngested} />}
    {view === 'voice' && <VoiceSeedCapture onDone={onIngested} />}
    {view === 'google' && <GoogleConnect />}
    {view === 'microsoft' && <MicrosoftConnect />}
    {view === 'extension' && <ExtensionPair />}
  </div>
);

export const AddSourceSheet = ({ open, onOpenChange, onIngested }: AddSourceSheetProps) => {
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>('pick');

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) setView('pick');
  };

  const body = view === 'pick'
    ? <PickerBody onPick={setView} />
    : <DetailBody view={view} onBack={() => setView('pick')} onIngested={onIngested} />;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <div className="overflow-y-auto pb-safe-bottom">
            {body}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="max-h-[80vh] overflow-y-auto">
          {body}
        </div>
      </DialogContent>
    </Dialog>
  );
};
