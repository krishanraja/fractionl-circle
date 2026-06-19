// The real thesis-validation product (live), at /thesis. Capture the thesis + LinkedIn,
// watch the research journey while validate-thesis runs (live Perplexity, ~19s), then the
// scorecard and the deconstructed steps, on real data. The run persists, so a returning
// user lands on their read. Presentational layer is shared with the fixture mock.
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { getPriceId } from '@/lib/tiers';
import { C, MONO } from './tokens';
import { thesisCss, CaptureView, ThinkingView, ReadView, StepsView, CANONICAL_JOURNEY, type Scorecard, type JourneyT } from './thesisViews';
import { runValidation, getLatestRun, getRunCount } from './thesisData';
import ThesisCircle from './ThesisCircle';

type Phase = 'loading' | 'signin' | 'capture' | 'thinking' | 'read' | 'steps' | 'circle' | 'gate';

export default function ThesisApp() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { isProOrAbove, openCheckout } = useSubscription();
  const [phase, setPhase] = useState<Phase>('loading');
  const [data, setData] = useState<Scorecard | null>(null);
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) { setPhase('signin'); return; }
    getRunCount(userId).then(setRunCount).catch(() => {});
    getLatestRun(userId)
      .then((r) => { if (r) { setData(r); setPhase('read'); } else setPhase('capture'); })
      .catch(() => setPhase('capture'));
  }, [userId, authLoading]);

  // Free includes one full validation; re-validation is Pro.
  function startAnother() {
    if (!isProOrAbove && runCount >= 1) { setPhase('gate'); return; }
    setData(null); setDone(false); setShown(0); setPhase('capture');
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function onSubmit(thesis: string, linkedin: string, background: string) {
    setErr(null); setDone(false); setShown(0); setPhase('thinking');
    timers.current.forEach(clearTimeout);
    timers.current = CANONICAL_JOURNEY.map((_, i) => window.setTimeout(() => setShown((s) => Math.max(s, i + 1)), 2600 * (i + 1)));
    try {
      const r = await runValidation(thesis, linkedin, background);
      timers.current.forEach(clearTimeout);
      setData(r); setShown(r.journey?.length || CANONICAL_JOURNEY.length); setDone(true); setRunCount((c) => c + 1);
    } catch {
      timers.current.forEach(clearTimeout);
      setErr('Something went wrong reaching the research. Give it another try in a moment.');
      setPhase('capture');
    }
  }

  if (phase === 'loading') {
    return <div className="thx" style={{ display: 'grid', placeItems: 'center' }}><style>{thesisCss}</style><span className="mono" style={{ color: C.lo, fontSize: 12 }}>loading...</span></div>;
  }
  if (phase === 'signin') {
    return (
      <div className="thx" style={{ display: 'grid', placeItems: 'center', padding: 24 }}><style>{thesisCss}</style>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div className="h">Validate your fractional thesis.</div>
          <div className="sub" style={{ marginTop: 10 }}>Sign in to check your idea against the real market and get your first moves.</div>
          <a href="/auth" className="cta" style={{ marginTop: 18, textDecoration: 'none', justifyContent: 'center', gap: 8 }}><span>Sign in</span><span className="mono">→</span></a>
        </div>
      </div>
    );
  }

  if (phase === 'circle' && userId) {
    return <div className="thx"><style>{thesisCss}</style><ThesisCircle userId={userId} onBack={() => setPhase(data ? 'read' : 'capture')} /></div>;
  }
  if (phase === 'gate') {
    return <div className="thx"><style>{thesisCss}</style><div className="wrap">
      <div className="ovl">Pro</div>
      <div className="h" style={{ marginTop: 10 }}>You have used your free validation.</div>
      <div className="sub">Pro gives you unlimited validations as your thesis evolves, your network warm reach, and ongoing market monitoring. $39 a month.</div>
      <button className="cta" style={{ marginTop: 18 }} onClick={async () => { const pid = getPriceId('pro'); if (pid) await openCheckout(pid); }}><span>Upgrade to Pro</span><span className="mono">→</span></button>
      <button className="mono" style={{ background: 'none', border: 0, color: C.lo, fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 14, display: 'block' }} onClick={() => setPhase(data ? 'read' : 'capture')}>back</button>
    </div></div>;
  }

  const journeySteps: JourneyT[] = (done && data?.journey?.length) ? data.journey : CANONICAL_JOURNEY;

  return (
    <div className="thx"><style>{thesisCss}</style>
      <div className="wrap">
        {err ? <div className="mono" style={{ color: C.risk, fontSize: 11, marginBottom: 12 }}>{err}</div> : null}
        {phase === 'capture' ? <CaptureView onSubmit={onSubmit} onAddPeople={() => setPhase('circle')} /> : null}
        {phase === 'thinking' ? <ThinkingView steps={journeySteps} shown={shown} done={done} onSeeRead={() => setPhase('read')} /> : null}
        {phase === 'read' && data ? <ReadView data={data} onSteps={() => setPhase('steps')} /> : null}
        {phase === 'steps' && data ? <StepsView data={data} onStart={() => setPhase('circle')} /> : null}
        {(phase === 'read' || phase === 'steps') ? (
          <div style={{ textAlign: 'center', marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="mono" style={{ background: 'none', border: 0, color: C.accent, fontSize: 10.5, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
              onClick={() => setPhase('circle')}>build your circle to sharpen warm reach →</button>
            <button className="mono" style={{ background: 'none', border: 0, color: C.lo, fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
              onClick={startAnother}>＋ validate another thesis</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
