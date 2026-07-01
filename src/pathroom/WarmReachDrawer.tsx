// Warm reach, moved out of the body and into a nav-triggered drawer. Two honest
// sections, both computed from data we already have:
//   • Going quiet — people you've spoken to but not in 30+ days, each with one-tap
//     warm reach (never never-contacted rows, so we never nag strangers).
//   • Banked decisions — answers you've made but not yet folded into a read; one
//     tap opens the Plan to lock them in.
// Renders an honest empty state when there is genuinely nothing waiting.
import { useEffect, useState } from 'react';
import { Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ContactButton } from '@/components/circle/ContactButton';
import type { ContactablePerson } from '@/lib/primaryContact';
import { getGoingQuietPeople, getUnrunAnswerCount, type QuietPerson } from './thesisData';
import { C } from './tokens';

const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const subtitle = (p: QuietPerson) => [p.title, p.company].filter(Boolean).join(' · ');

const daysSince = (iso: string | null): number | null =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null;

interface WarmReachDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPlan: () => void;
}

export default function WarmReachDrawer({ open, onOpenChange, onOpenPlan }: WarmReachDrawerProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const [quiet, setQuiet] = useState<QuietPerson[]>([]);
  const [banked, setBanked] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Load fresh each time the drawer opens so the counts never go stale after a reach.
  useEffect(() => {
    if (!open || !userId) return;
    setLoaded(false);
    Promise.all([
      getGoingQuietPeople(userId).catch(() => [] as QuietPerson[]),
      getUnrunAnswerCount(userId).catch(() => 0),
    ]).then(([q, b]) => { setQuiet(q); setBanked(b); setLoaded(true); });
  }, [open, userId]);

  const nothingWaiting = loaded && quiet.length === 0 && banked === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="thx w-full sm:max-w-md p-0 overflow-y-auto"
        style={{ background: 'var(--thx-bg)' }}
      >
        <SheetTitle className="sr-only">Since you were away</SheetTitle>
        <SheetDescription className="sr-only">
          People going quiet and decisions you've banked but not yet folded into your plan.
        </SheetDescription>

        <div className="wrap" style={{ padding: '20px 18px calc(24px + env(safe-area-inset-bottom))' }}>
          <div className="grp" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Clock size={11} strokeWidth={2.5} /> Since you were away
          </div>

          {/* Going quiet */}
          {quiet.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 15, color: C.hi, fontWeight: 600 }}>
                {quiet.length} {quiet.length === 1 ? 'person is' : 'people are'} going quiet
              </div>
              <div className="sub" style={{ marginTop: 4 }}>
                You've spoken before — a quick, warm note keeps the door open.
              </div>
              <div style={{ marginTop: 12 }}>
                {quiet.map((p) => {
                  const d = daysSince(p.last_interaction_at);
                  return (
                    <div className="crow" key={p.id}>
                      <div className="crowbtn" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                        <div className="cav">{initials(p.display_name)}</div>
                        <div className="cmeta">
                          <div className="cname">{p.display_name}</div>
                          {subtitle(p) && <div className="csub">{subtitle(p)}</div>}
                          {d != null && (
                            <div className="cwhy">Quiet for {d} {d === 1 ? 'day' : 'days'}.</div>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: '0 14px 12px 64px' }}>
                        <ContactButton person={p as unknown as ContactablePerson} raws={[]} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Banked decisions -> Plan */}
          {banked > 0 && (
            <button
              className="panel"
              onClick={() => { onOpenChange(false); onOpenPlan(); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                borderColor: C.accentEdge, marginTop: 16,
                background: 'linear-gradient(180deg, rgba(224,162,60,0.07), var(--thx-panel2, ' + C.panel2 + '))',
              }}
            >
              <div className="grp" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={11} strokeWidth={2.5} /> Banked decisions
              </div>
              <div style={{ fontSize: 15, color: C.hi, marginTop: 8, fontWeight: 600, lineHeight: 1.3 }}>
                {banked} decision{banked === 1 ? '' : 's'} banked
              </div>
              <div className="sub" style={{ marginTop: 4 }}>
                See how it lands again to lock the gains into your plan.
              </div>
              <div className="mono" style={{ color: C.accent, fontSize: 11, marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Open your plan <ArrowRight size={12} />
              </div>
            </button>
          )}

          {nothingWaiting && (
            <div className="sub" style={{ marginTop: 16 }}>
              Nothing waiting right now — you're all caught up. We'll surface people here as
              they start to go quiet.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
