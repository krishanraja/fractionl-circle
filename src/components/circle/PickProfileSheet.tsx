// Disambiguation surface: when enrich-linkedin finds several plausible LinkedIn
// profiles for a contact, the user picks the right one. On pick we re-run
// enrichment with the chosen URL to build the dossier.
import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { enrichLinkedin, type ProfileCandidate, type EnrichResponse } from '@/lib/enrich';
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
    <div className="sheetwrap" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div className="ovl">Disambiguate</div>
        <div className="h" style={{ marginTop: 6 }}>Which one is {personName}?</div>
        <div className="sub">Pick the right profile so we pull the correct details.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {candidates.map((c) => {
          const busy = pickingUrl === c.url;
          return (
            <button key={c.url} className="crow" onClick={() => pick(c)} disabled={!!pickingUrl}
              style={{ marginTop: 0, opacity: pickingUrl && !busy ? 0.6 : 1, cursor: pickingUrl ? 'default' : 'pointer' }}>
              <div className="crowbtn" style={{ cursor: 'inherit' }}>
                {c.photo_url ? (
                  <img src={c.photo_url} alt="" className="cav" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="cav">{c.name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}</div>
                )}
                <div className="cmeta">
                  <div className="cname">{c.name}</div>
                  {c.headline && <div className="csub">{c.headline}</div>}
                  {c.city && <div className="ssrc" style={{ marginTop: 4 }}>{c.city}</div>}
                </div>
                {busy
                  ? <Loader2 size={18} style={{ color: 'var(--thx-accent)', animation: 'thxspin 0.8s linear infinite', flex: '0 0 auto' }} />
                  : <Check size={18} style={{ color: 'var(--thx-lo)', flex: '0 0 auto' }} />}
              </div>
            </button>
          );
        })}
      </div>
      <button className="foothint" onClick={() => onOpenChange(false)} disabled={!!pickingUrl}>None of these</button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]"><div className="thx overflow-y-auto pb-safe-bottom" style={{ background: 'var(--thx-bg)' }}>{body}</div></DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden"><div className="thx max-h-[80vh] overflow-y-auto" style={{ background: 'var(--thx-bg)' }}>{body}</div></DialogContent>
    </Dialog>
  );
};
