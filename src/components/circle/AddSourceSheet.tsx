import { useState } from 'react';
import { Upload, ArrowLeft, Globe, Building2, Database, ChevronRight } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { LinkedInCsvDrop } from './LinkedInCsvDrop';
import { CrmCsvDrop } from './CrmCsvDrop';
import { GoogleConnect } from './GoogleConnect';
import { MicrosoftConnect } from './MicrosoftConnect';
import type { IngestResult } from '@/lib/circleIngest';

// Browser-extension pairing is intentionally omitted: it leaked a raw session
// token and required loading an unpacked dev build. It returns in P3 as a
// one-click, tokenless Web Store install. See docs/UX_REBUILD_VISION.
type View = 'pick' | 'linkedin' | 'crm' | 'google' | 'microsoft';

interface AddSourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIngested?: (result: IngestResult) => void;
}

const PickerBody = ({ onPick }: { onPick: (v: Exclude<View, 'pick'>) => void }) => (
  <div className="px-5 pt-2 pb-6 space-y-3">
    <div className="text-center sm:text-left mb-2">
      <h2 className="text-title-1 text-foreground">Add a source</h2>
      <p className="mt-1.5 text-sm text-foreground-secondary leading-relaxed">
        The more sources you connect, the better the Matches. Start with whichever is easiest.
      </p>
    </div>
    {/* Featured recommendation — hero card */}
    <button
      onClick={() => onPick('linkedin')}
      className="w-full text-left rounded-2xl bg-primary/8 p-4 flex items-center gap-4 hover:bg-primary/12 transition-colors active:scale-[0.99] transition-transform duration-100"
    >
      <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
        <Upload className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[15px] font-semibold text-foreground">Drop a LinkedIn CSV</p>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/15 rounded-full px-2 py-0.5">
            Recommended
          </span>
        </div>
        <p className="mt-1 text-[13px] text-foreground-secondary leading-snug">
          The richest single source. Takes 10 minutes to export.
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-foreground-muted shrink-0" />
    </button>

    {/* Grouped settings-style list — iOS Settings convention */}
    <div className="rounded-2xl bg-surface-muted/70 backdrop-blur overflow-hidden divide-y divide-border/40">
      {[
        { id: 'crm' as const, icon: Database, label: 'Import CRM or sheet', hint: 'HubSpot · Attio · Folk · spreadsheet' },
        { id: 'google' as const, icon: Globe, label: 'Connect Google', hint: 'Contacts + Calendar' },
        { id: 'microsoft' as const, icon: Building2, label: 'Connect Microsoft', hint: 'Outlook + Calendar' },
      ].map(({ id, icon: Icon, label, hint }) => (
        <button
          key={id}
          onClick={() => onPick(id)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-card/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px] text-primary" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-medium text-foreground leading-tight">{label}</p>
            <p className="text-[13px] text-foreground-muted leading-snug mt-0.5">{hint}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-foreground-muted shrink-0" />
        </button>
      ))}
    </div>

    <p className="pt-2 text-center text-xs text-foreground-muted">
      Just want to add one person? Use Quick add from the <span className="font-medium text-foreground-secondary">+</span> button.
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
  <div className="px-5 pt-2 pb-6">
    <button
      onClick={onBack}
      className="flex items-center gap-1 text-sm text-primary hover:opacity-80 mb-4 -ml-1 px-1 py-1"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
    {view === 'linkedin' && <LinkedInCsvDrop onDone={onIngested} />}
    {view === 'crm' && <CrmCsvDrop onDone={onIngested} />}
    {view === 'google' && <GoogleConnect />}
    {view === 'microsoft' && <MicrosoftConnect />}
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
