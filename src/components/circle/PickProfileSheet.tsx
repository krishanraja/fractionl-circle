// Disambiguation surface: when enrich-linkedin finds several plausible LinkedIn
// profiles for a contact, the user picks the right one. On pick we re-run
// enrichment with the chosen URL to build the dossier.
import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { enrichLinkedin, type ProfileCandidate, type EnrichResponse } from '@/lib/enrich';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

interface PickProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  personName: string;
  candidates: ProfileCandidate[];
  onResolved: (res: EnrichResponse) => void;
}

export const PickProfileSheet = ({ open, onOpenChange, personId, personName, candidates, onResolved }: PickProfileSheetProps) => {
  const isMobile = useIsMobile();
  const [pickingUrl, setPickingUrl] = useState<string | null>(null);

  const pick = async (c: ProfileCandidate) => {
    if (pickingUrl) return;
    haptics.tap();
    setPickingUrl(c.url);
    const res = await enrichLinkedin(personId, c.url);
    setPickingUrl(null);
    onResolved(res);
    onOpenChange(false);
  };

  const body = (
    <div className="px-5 pt-2 pb-6 space-y-4">
      <div>
        <h2 className="text-title-2 text-foreground">Which one is {personName}?</h2>
        <p className="mt-1 text-sm text-foreground-secondary">Pick the right profile so we pull the correct details.</p>
      </div>
      <div className="space-y-2">
        {candidates.map((c) => {
          const busy = pickingUrl === c.url;
          return (
            <button
              key={c.url}
              onClick={() => pick(c)}
              disabled={!!pickingUrl}
              className={cn(
                'w-full flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 text-left',
                'hover:border-primary/40 transition-colors disabled:opacity-60'
              )}
            >
              {c.photo_url ? (
                <img src={c.photo_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-primary/12 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
                  {c.name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-foreground truncate">{c.name}</p>
                {c.headline && <p className="text-[13px] text-foreground-secondary truncate mt-0.5">{c.headline}</p>}
                {c.city && <p className="text-[11px] text-foreground-muted truncate mt-0.5">{c.city}</p>}
              </div>
              {busy ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
              ) : (
                <Check className="w-5 h-5 text-foreground-muted shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onOpenChange(false)}
        disabled={!!pickingUrl}
        className="w-full h-11 rounded-full text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors disabled:opacity-40"
      >
        None of these
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]"><div className="overflow-y-auto pb-safe-bottom">{body}</div></DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden"><div className="max-h-[80vh] overflow-y-auto">{body}</div></DialogContent>
    </Dialog>
  );
};
