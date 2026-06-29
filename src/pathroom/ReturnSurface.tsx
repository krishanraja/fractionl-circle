// "What's waiting for you" — the in-app reason to come back, computed entirely
// from data we already have (no new backend): people you've let go quiet, and
// decisions you've banked but not yet folded into a read. Shows the single most
// important hook with one tap back into the Plan. Honest: renders nothing when
// there's nothing genuinely waiting, and respects the goal-reminders preference
// (the toggle that previously controlled nothing).
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { C } from './tokens';
import { getGoingQuietCount, getUnrunAnswerCount } from './thesisData';

export default function ReturnSurface({ onOpenPlan }: { onOpenPlan: () => void }) {
  const { user } = useAuth();
  const userId = user?.id;
  const { preferences } = useUserProfile();
  const [quiet, setQuiet] = useState(0);
  const [banked, setBanked] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getGoingQuietCount(userId).catch(() => 0),
      getUnrunAnswerCount(userId).catch(() => 0),
    ]).then(([q, b]) => { setQuiet(q); setBanked(b); setLoaded(true); });
  }, [userId]);

  // The toggle is opt-out (default on); only an explicit false silences this.
  if (preferences?.goal_reminders === false) return null;
  if (!loaded) return null;

  let headline: string | null = null;
  let sub = '';
  let cta = 'Open your plan';
  if (quiet > 0) {
    headline = `${quiet} ${quiet === 1 ? 'person is' : 'people are'} going quiet`;
    sub = "You've spoken before — a quick, warm note keeps the door open.";
    cta = 'Open your warm reach';
  } else if (banked > 0) {
    headline = `${banked} decision${banked === 1 ? '' : 's'} banked`;
    sub = 'See how it lands again to lock the gains into your plan.';
    cta = 'Open your plan';
  }
  if (!headline) return null;

  return (
    <button
      className="panel"
      onClick={onOpenPlan}
      style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', borderColor: C.accentEdge, marginBottom: 16, background: 'linear-gradient(180deg, rgba(224,162,60,0.07), var(--thx-panel2, ' + C.panel2 + '))' }}
    >
      <div className="grp" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Clock size={11} strokeWidth={2.5} /> Since you were away
      </div>
      <div style={{ fontSize: 15, color: C.hi, marginTop: 8, fontWeight: 600, lineHeight: 1.3 }}>{headline}</div>
      <div className="sub" style={{ marginTop: 4 }}>{sub}</div>
      <div className="mono" style={{ color: C.accent, fontSize: 11, marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {cta} <span>→</span>
      </div>
    </button>
  );
}
