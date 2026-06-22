// The real thesis-validation product (live), at /. Redesigned onboarding journey, mobile
// no-scroll: a fixed app frame (header + one focused body + a pinned action) locked to the
// visible viewport via useAppFrame; the body resets to the top on every screen change.
// Flow: guided gated capture dialogue -> live research -> the read (glanceable) -> an
// optional separate "sharpen" screen (admire a business -> your edge; card -> circle;
// LinkedIn -> fit) -> the living journey map. One thing per screen.
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useAppFrame } from '@/hooks/useAppFrame';
import { getPriceId } from '@/lib/tiers';
import { C } from './tokens';
import { thesisCss, ThinkingView, ReadView, CANONICAL_JOURNEY, type Scorecard, type JourneyT } from './thesisViews';
import { chromeCss, EmberNav, Loader, type FuelRow } from './thesisChrome';
import CaptureDialogue from './CaptureDialogue';
import SharpenPanel from './SharpenPanel';
import JourneyMap, { journeyState } from './JourneyMap';
import Home from './Home';
import {
  runValidation, getLatestRunFull, getRunCount, getCircle, getInspirationCount,
  judgeThesis, extractAdmire, saveInspiration, addContactFromImage, saveStepProgress,
  getMarketPulse, type CircleP, type MarketPulse,
} from './thesisData';
import ThesisCircle from './ThesisCircle';

type Phase = 'loading' | 'signin' | 'capture' | 'thinking' | 'read' | 'sharpen' | 'journey' | 'addpeople' | 'home' | 'gate';

export default function ThesisApp() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { isProOrAbove, openCheckout } = useSubscription();
  useAppFrame(); // lock the page: no page scroll, no rubber-band; publishes --app-height
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
  const [circleFrom, setCircleFrom] = useState<'home' | 'journey'>('journey');
  const [market, setMarket] = useState<MarketPulse | null>(null);
  const timers = useRef<number[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Land at the top of every new screen (kills "I end up half way down a new page").
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [phase]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) { setPhase('signin'); return; }
    getRunCount(userId).then(setRunCount).catch(() => {});
    getCircle(userId).then(setCircle).catch(() => {});
    getInspirationCount(userId).then(setInspCount).catch(() => {});
    getLatestRunFull(userId)
      .then((r) => {
        if (r) { setData(r.result); setRunId(r.id); setStepProgress(r.stepProgress); setThesisText(r.thesis); setBackground(r.background); setPhase('home'); getMarketPulse(r.thesis).then(setMarket).catch(() => {}); }
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
      getMarketPulse(thesis).then(setMarket).catch(() => {});
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

  const fuel = 0.12 + (data ? 0.3 : 0) + (linkedinDone ? 0.15 : 0) + (inspCount > 0 ? 0.18 : 0) + (circle.length > 0 ? 0.12 : 0);
  const fuels: FuelRow[] = [
    { k: 'Thesis', on: !!data }, { k: 'Background', on: !!background }, { k: 'LinkedIn', on: linkedinDone },
    { k: 'Businesses you admire', on: inspCount > 0 }, { k: 'Your circle', on: circle.length > 0 },
  ];

  // A short, centered standalone screen (loading / signin / gate) inside the locked frame.
  const centered = (body: React.ReactNode) => (
    <div className="thx thxframe" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{thesisCss + chromeCss}</style>{body}
    </div>
  );

  if (phase === 'loading') return centered(<Loader />);
  if (phase === 'signin') return centered(
    <div style={{ textAlign: 'center', maxWidth: 320 }}>
      <div className="h">Validate your fractional thesis.</div>
      <div className="sub" style={{ marginTop: 10 }}>Sign in to check your idea against the real market and get your first moves.</div>
      <a href="/auth" className="cta" style={{ marginTop: 18, textDecoration: 'none', justifyContent: 'center', gap: 8 }}><span>Sign in</span><span className="mono">→</span></a>
    </div>
  );
  if (phase === 'gate') return centered(
    <div style={{ maxWidth: 360 }}>
      <div className="ovl">Pro</div>
      <div className="h" style={{ marginTop: 10 }}>You have used your free validation.</div>
      <div className="sub">Pro gives you unlimited validations as your thesis evolves, your network warm reach, and ongoing market monitoring. $39 a month.</div>
      <button className="cta" style={{ marginTop: 18 }} onClick={async () => { const pid = getPriceId('pro'); if (pid) await openCheckout(pid); }}><span>Upgrade to Pro</span><span className="mono">→</span></button>
      <button className="foothint" style={{ marginTop: 14 }} onClick={() => setPhase(data ? 'read' : 'capture')}>back</button>
    </div>
  );

  if (phase === 'capture') return <CaptureDialogue onJudge={judgeThesis} onComplete={onComplete} />;

  // The framed phases: header + scrolling body + pinned footer action.
  const canHome = !!data && phase !== 'home' && phase !== 'thinking';
  const frame = (body: React.ReactNode, footer: React.ReactNode, hint?: string, wide?: boolean) => (
    <div className="thx thxframe"><style>{thesisCss + chromeCss}</style>
      <EmberNav fuel={fuel} fuels={fuels} hint={hint} onHome={canHome ? () => setPhase('home') : undefined} />
      <div className="thxbody" ref={bodyRef}>
        <div className={'wrap' + (wide ? ' wrapwide' : '')} key={phase}>
          {err ? <div className="mono" style={{ color: C.risk, fontSize: 11, marginBottom: 12 }}>{err}</div> : null}
          {body}
        </div>
      </div>
      {footer ? <div className="thxfoot">{footer}</div> : null}
    </div>
  );

  if (phase === 'addpeople' && userId) {
    return frame(<ThesisCircle userId={userId} onBack={() => { getCircle(userId).then(setCircle).catch(() => {}); setPhase(circleFrom); }} />, null);
  }

  if (phase === 'home' && data) {
    // One evolving thesis: the daily action is to deepen it, not start a new validation.
    return frame(
      <Home
        data={data} thesis={thesisText} stepProgress={stepProgress} circle={circle} fuel={fuel} market={market}
        onOpenRead={() => setPhase('read')}
        onOpenPath={() => setPhase('journey')}
        onOpenCircle={() => { setCircleFrom('home'); setPhase('addpeople'); }}
      />,
      <>
        <button className="cta" onClick={() => setPhase('journey')}><span>Continue your path</span><span className="mono">→</span></button>
        <button className="foothint" onClick={() => setPhase('sharpen')}>+ deepen your thesis · add a signal</button>
      </>,
      undefined, true,
    );
  }

  if (phase === 'thinking') {
    const steps: JourneyT[] = (done && data?.journey?.length) ? data.journey : CANONICAL_JOURNEY;
    return frame(
      <ThinkingView steps={steps} shown={shown} done={done} />,
      done ? <button className="cta" onClick={() => setPhase('read')}><span>See your read</span><span className="mono">→</span></button> : null,
    );
  }

  if (phase === 'read' && data) {
    return frame(
      <ReadView data={data} />,
      <>
        <button className="cta" onClick={() => setPhase('journey')}><span>See your path</span><span className="mono">→</span></button>
        <button className="foothint" onClick={() => setPhase('sharpen')}>add fuel to sharpen this read first</button>
      </>,
    );
  }

  if (phase === 'sharpen' && data) {
    return frame(
      <SharpenPanel
        thesis={thesisText}
        onAdmire={(d) => extractAdmire(d, thesisText)}
        onSaveInspiration={onSaveInsp}
        onCard={onCard}
        onLinkedin={(url) => { setLinkedin(url); setLinkedinDone(true); }}
        cardCount={cardCount}
        linkedinDone={linkedinDone}
        edges={edges}
      />,
      <>
        <button className="cta" onClick={() => setPhase('journey')}><span>See your path</span><span className="mono">→</span></button>
        <button className="foothint" disabled={busyRerun} onClick={onRerun}>{busyRerun ? 'reading...' : 're-run the read with your new fuel'}</button>
      </>,
      'tap the mark',
    );
  }

  if (phase === 'journey' && data) {
    const js = journeyState(data, circle, stepProgress);
    const steps = data.steps || [];
    let footer: React.ReactNode;
    if (js.weak) {
      footer = <button className="cta" onClick={startAnother}><span>Sharpen your thesis</span><span className="mono">→</span></button>;
    } else if (js.allDone) {
      footer = <button className="foothint" onClick={startAnother}>+ validate another thesis</button>;
    } else {
      const primary = js.warmBlocked
        ? { label: 'Add people to light up your warm reach', onClick: () => { setCircleFrom('journey'); setPhase('addpeople'); } }
        : { label: stepProgress.length === 0 ? 'Start with move one' : 'Mark this move done', onClick: () => onMarkDone(js.current) };
      footer = (
        <>
          <button className="cta" onClick={primary.onClick}><span>{primary.label}</span><span className="mono">→</span></button>
          <button className="foothint" onClick={startAnother}>+ validate another thesis</button>
        </>
      );
    }
    return frame(<JourneyMap data={data} circle={circle} progress={stepProgress} />, footer, 'your path, charged');
  }

  return centered(<Loader />);
}
