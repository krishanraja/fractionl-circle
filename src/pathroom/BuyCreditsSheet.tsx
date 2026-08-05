// Buy credits - the top-up surface, shown from Settings and from the "Dig deeper"
// flow when a search wants to go 10/10 but the balance is short. Lists the packs,
// shows the live balance, and sends the user to Stripe checkout for a one-time buy.
import { useState } from 'react';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useCredits } from '@/hooks/useCredits';
import { CREDIT_PACKS, packEnrichments, getCreditPackPriceId, type CreditPack } from '@/lib/creditPacks';
import { DEEP_ENRICH_CREDITS } from '@/lib/creditCosts';
import { haptics } from '@/utils/haptics';
import { C } from './tokens';

interface BuyCreditsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BuyCreditsSheet({ open, onOpenChange }: BuyCreditsSheetProps) {
  const { balance, buyCredits } = useCredits();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const buy = async (p: CreditPack) => {
    const priceId = getCreditPackPriceId(p);
    if (!priceId) { setErr('Credit packs aren’t available just yet.'); return; }
    setBusy(p.slug); setErr(null);
    haptics.tap();
    try {
      await buyCredits(priceId); // redirects to Stripe
    } catch {
      setErr('Could not start checkout - try again in a moment.');
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="thx w-full sm:max-w-md p-0 overflow-y-auto" style={{ background: 'var(--thx-bg)' }}>
        <SheetTitle className="sr-only">Buy credits</SheetTitle>
        <SheetDescription className="sr-only">
          Top up credits to run the max-effort enrichment that searches every source.
        </SheetDescription>

        <div className="wrap" style={{ padding: '20px 18px calc(24px + env(safe-area-inset-bottom))' }}>
          <div className="grp" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={11} strokeWidth={2.5} /> Credits
          </div>
          <div className="h" style={{ marginTop: 10, fontSize: 20 }}>Go deeper on anyone</div>
          <div className="sub">
            Credits fund the 10/10 enrichment - live web research across every source we can reach - so the
            right person surfaces even when your data is thin. {DEEP_ENRICH_CREDITS} credits per deep dive.
          </div>

          <div className="sub" style={{ marginTop: 12, color: C.hi }}>
            Balance: <span className="mono" style={{ color: C.accent }}>{balance ?? '-'}</span> credits
          </div>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CREDIT_PACKS.map((p) => (
              <button
                key={p.slug}
                className="panel"
                onClick={() => void buy(p)}
                disabled={!!busy}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  width: '100%', textAlign: 'left', cursor: busy ? 'default' : 'pointer',
                  borderColor: p.highlighted ? C.accentEdge : C.line,
                  background: p.highlighted ? 'linear-gradient(180deg, rgba(224,162,60,0.07), var(--thx-panel2, ' + C.panel2 + '))' : undefined,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.hi }}>
                    {p.credits.toLocaleString()} credits
                    {p.highlighted && <span className="rolebadge" style={{ marginLeft: 8 }}>Best value</span>}
                  </div>
                  <div className="csub">≈ {packEnrichments(p)} deep dives</div>
                </div>
                <div className="mono" style={{ color: C.accent, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {busy === p.slug ? <Loader2 size={14} style={{ animation: 'thxspin 0.8s linear infinite' }} /> : <Check size={14} />}
                  {p.priceLabel}
                </div>
              </button>
            ))}
          </div>

          {err && <p className="cerr" style={{ marginTop: 12 }}>{err}</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
