// The real thesis-validation product (live), at /. The redesigned onboarding journey:
// a guided gated capture dialogue -> live research ("watch it think") -> the honest read
// with an after-read "add fuel" panel (admire a business -> sharpen your edge; a card ->
// your circle; LinkedIn -> fit) -> the living journey map (the path to first client, the
// circle woven in, step tracking). Runs persist, so a returning user lands on their map.
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { getPriceId } from '@/lib/tiers';
import { C, MONO } from './tokens';
import { thesisCss, ThinkingView, ReadView, CANONICAL_JOURNEY, type Scorecard, type JourneyT } from './thesisViews';
import { chromeCss, EmberNav, type FuelRow } from './thesisChrome';
import CaptureDialogue from './CaptureDialogue';
import SharpenPanel from './SharpenPanel';
import JourneyMap from './JourneyMap';
import {
  runValidation, getLatestRunFull, getRunCount, getCircle, getInspirationCount,
  judgeThesis, extractAdmire, saveInspiration, addContactFromImage, saveStepProgress,
  type CircleP,
} from './thesisData';
import ThesisCircle from './ThesisCircle';

type Phase = 'loading' | 'signin' | 'capture' | 'thinking' | 'read' | 'journey' | 'addpeople' | 'gate';

export default function ThesisApp() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { isProOrAbove, openCheckout } = useSubscription();
  const [phase, setPhase] = useState<Phase>('loading');
  const [data, setData] = useState<Scorecard | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [stepProgress, setStepProgress] = useState<number[]>([]);
  const [thesisText, setThesisText] = useState('');
  const [background, setBackground] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [linkedinDone, setLinkedinDone] = useState(false);
  const [circle, setCircle] = useState<CircleP[]>([]);
  const [cardCount, setCardCount] = useState(0);
  const [edges, setEdges] = useState<{ name: string; why: string }[]>([]);
  const [inspCount, setInspCount] = useState(0);
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const [busyRerun, setBusyRerun] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) { setPhase('signin'); return; }
    getRunCount(userId).then(setRunCount).catch(() => {});
    getCircle(userId).then(setCircle).catch(() => {});
    getInspirationCount(userId).then(setInspCount).catch(() => {});
    getLatestRunFull(userId)
      .then((r) => {
        if (r) { setData(r.result); setRunId(r.id); setStepProgress(r.stepProgress); setThesisText(r.thesis); setBackground(r.background); setPhase('read'); }
        else setPhase('capture');
      })
      .catch(() => setPhase('capture'));
  }, [userId, authLoading]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function runResearch(thesis: string, bg: string, li: string) {
    setErr(null); setDone(false); setShown(0); setPhase('thinking');
    timers.current.forEach(clearTimeout);
    timers.current = CANONICAL_JOURNEY.map((_, i) => window.setTimeout(() => setShown((s) => Math.max(s, i + 1)), 2600 * (i + 1)));
    try {
      const r = await runValidation(thesis, li, bg);
      timers.current.forEach(clearTimeout);
      setData(r); setShown(r.journey?.length || CANONICAL_JOURNEY.length); setDone(true);
      setRunCount((c) => c + 1);
      if (userId) { const full = await getLatestRunFull(userId); if (full) { setRunId(full.id); setStepProgress(full.stepProgress); } }
    } catch {
      timers.current.forEach(clearTimeout);
      setErr('Something went wrong reaching the research. Give it another try in a moment.');
      setPhase('capture');
    }
  }

  function onComplete(thesis: string, bg: string) {
    setThesisText(thesis); setBackground(bg);
    setEdges([]); setCardCount(0); setLinkedinDone(false); setLinkedin('');
    runResearch(thesis, bg, '');
  }

  async function onRerun() {
    if (busyRerun) return;
    setBusyRerun(true);
    try { await runResearch(thesisText, background, linkedin); }
    finally { setBusyRerun(false); }
  }

  // Free includes one full validation; re-validation is Pro.
  function startAnother() {
    if (!isProOrAbove && runCount >= 1) { setPhase('gate'); return; }
    setData(null); setRunId(null); setStepProgress([]); setDone(false); setShown(0); setPhase('capture');
  }

  async function onCard(dataUrl: string) {
    const person = await addContactFromImage(dataUrl);
    setCircle((l) => [person, ...l]); setCardCount((c) => c + 1);
  }
  async function onSaveInsp(insp: { name: string; positioning?: string | null; kind?: string; field?: string | null; why: string }) {
    if (!userId) return;
    await saveInspiration(userId, insp);
    setEdges((e) => [...e, { name: insp.name, why: insp.why }]); setInspCount((n) => n + 1);
  }
  async function onMarkDone(index: number) {
    const next = Array.from(new Set([...stepProgress, index])).sort((a, b) => a - b);
    setStepProgress(next);
    if (runId) await saveStepProgress(runId, next).catch(() => {});
  }

  // fuel for the ember on the read/journey phases, from real signals
  const fuel = 0.12 + (data ? 0.3 : 0) + (linkedinDone ? 0.15 : 0) + (inspCount > 0 ? 0.18 : 0) + (circle.length > 0 ? 0.12 : 0);
  const fuels: FuelRow[] = [
    { k: 'Thesis', on: !!data }, { k: 'Background', on: !!background }, { k: 'LinkedIn', on: linkedinDone },
    { k: 'Businesses you admire', on: inspCount > 0 }, { k: 'Your circle', on: circle.length > 0 },
  ];

  if (phase === 'loading') {
    return <div className="thx" style={{ display: 'grid', placeItems: 'center' }}><style>{thesisCss + chromeCss}</style><span className="mono" style={{ color: C.lo, fontSize: 12 }}>loading...</span></div>;
  }
  if (phase === 'signin') {
    return (
      <div className="thx" style={{ display: 'grid', placeItems: 'center', padding: 24 }}><style>{thesisCss + chromeCss}</style>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div className="h">Validate your fractional thesis.</div>
          <div className="sub" style={{ marginTop: 10 }}>Sign in to check your idea against the real market and get your first moves.</div>
          <a href="/auth" className="cta" style={{ marginTop: 18, textDecoration: 'none', justifyContent: 'center', gap: 8 }}><span>Sign in</span><span className="mono">→</span></a>
        </div>
      </div>
    );
  }

  if (phase === 'capture') {
    return (
      <div className="thx"><style>{thesisCss + chromeCss}</style>
        {err ? <div className="wrap" style={{ paddingBottom: 0 }}><div className="mono" style={{ color: C.risk, fontSize: 11 }}>{err}</div></div> : null}
        <CaptureDialogue onJudge={judgeThesis} onComplete={onComplete} />
      </div>
    );
  }

  if (phase === 'addpeople' && userId) {
    return <div className="thx"><style>{thesisCss + chromeCss}</style><EmberNav fuel={fuel} fuels={fuels} />
      <ThesisCircle userId={userId} onBack={() => { getCircle(userId).then(setCircle).catch(() => {}); setPhase('journey'); }} /></div>;
  }

  if (phase === 'gate') {
    return <div className="thx"><style>{thesisCss + chromeCss}</style><EmberNav fuel={fuel} fuels={fuels} /><div className="wrap">
      <div className="ovl">Pro</div>
      <div className="h" style={{ marginTop: 10 }}>You have used your free validation.</div>
      <div className="sub">Pro gives you unlimited validations as your thesis evolves, your network warm reach, and ongoing market monitoring. $39 a month.</div>
      <button className="cta" style={{ marginTop: 18 }} onClick={async () => { const pid = getPriceId('pro'); if (pid) await openCheckout(pid); }}><span>Upgrade to Pro</span><span className="mono">→</span></button>
      <button className="mono" style={{ background: 'none', border: 0, color: C.lo, fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 14, display: 'block' }} onClick={() => setPhase(data ? 'read' : 'capture')}>back</button>
    </div></div>;
  }

  const journeySteps: JourneyT[] = (done && data?.journey?.length) ? data.journey : CANONICAL_JOURNEY;

  return (
    <div className="thx"><style>{thesisCss + chromeCss}</style>
      <EmberNav fuel={fuel} fuels={fuels} hint={phase === 'journey' ? 'your path, charged' : undefined} />
      <div className="wrap">
        {err ? <div className="mono" style={{ color: C.risk, fontSize: 11, marginBottom: 12 }}>{err}</div> : null}
        {phase === 'thinking' ? <ThinkingView steps={journeySteps} shown={shown} done={done} onSeeRead={() => setPhase('read')} /> : null}
        {phase === 'read' && data ? (
          <>
            <ReadView data={data} />
            <SharpenPanel
              thesis={thesisText}
              onAdmire={(d) => extractAdmire(d, thesisText)}
              onSaveInspiration={onSaveInsp}
              onCard={onCard}
              onLinkedin={(url) => { setLinkedin(url); setLinkedinDone(true); }}
              cardCount={cardCount}
              linkedinDone={linkedinDone}
              edges={edges}
              busyRerun={busyRerun}
              onRerun={onRerun}
              onSeePath={() => { if (userId) getCircle(userId).then(setCircle).catch(() => {}); setPhase('journey'); }}
            />
          </>
        ) : null}
        {phase === 'journey' && data ? (
          <JourneyMap
            data={data}
            circle={circle}
            progress={stepProgress}
            onAddPeople={() => setPhase('addpeople')}
            onMarkDone={onMarkDone}
            onSharpen={startAnother}
            onValidateAnother={startAnother}
          />
        ) : null}
      </div>
    </div>
  );
}
