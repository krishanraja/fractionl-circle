// The real thesis-validation product (live), at /. Redesigned onboarding journey, mobile
// no-scroll: a fixed app frame (header + one focused body + a pinned action) locked to the
// visible viewport via useAppFrame; the body resets to the top on every screen change.
// Flow: guided gated capture dialogue -> live research -> the read (glanceable) -> an
// optional separate "sharpen" screen (admire a business -> your edge; card -> circle;
// LinkedIn -> fit) -> the living journey map. One thing per screen.
import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { getPriceId } from '@/lib/tiers';
import { C } from './tokens';
import { COPY } from './copy';
import { thesisCss, ThinkingView, ReadView, CANONICAL_JOURNEY, type Scorecard, type JourneyT } from './thesisViews';
import { chromeCss, EmberNav, Loader, type FuelRow } from './thesisChrome';
import CaptureDialogue from './CaptureDialogue';
import SharpenPanel from './SharpenPanel';
import JourneyMap, { journeyState } from './JourneyMap';
import ReachOut from './ReachOut';
import SharpenPrompt from './SharpenPrompt';
import Home from './Home';
import { computeSharpness } from './sharpness';
import {
  runValidation, getLatestRunFull, getRunCount, getCircle, getInspirationCount,
  judgeThesis, extractAdmire, saveInspiration, addContactFromImage, saveStepProgress,
  getMarketPulse, getUnrunAnswerCount, type CircleP, type MarketPulse,
} from './thesisData';
import ThesisCircle from './ThesisCircle';

type Phase = 'loading' | 'signin' | 'capture' | 'thinking' | 'read' | 'sharpen' | 'journey' | 'addpeople' | 'reachout' | 'home' | 'gate';

export default function ThesisApp() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { isProOrAbove, openCheckout, loading: subLoading } = useSubscription();
  // Free users get one full pass and the read; the deepening tools are Pro.
  const locked = !isProOrAbove;
  // The page lock (useAppFrame) is owned by CircleApp, the shell that hosts this
  // flow under the Deep-dive tab — so we don't lock the viewport a second time here.
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
  const [unrunAnswers, setUnrunAnswers] = useState(0);
  const timers = useRef<number[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Land at the top of every new screen (kills "I end up half way down a new page").
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [phase]);

  // Banked-but-not-yet-run sharpen answers drive the provisional score lift.
  const refreshAnswers = () => { if (userId) getUnrunAnswerCount(userId).then(setUnrunAnswers).catch(() => {}); };
  useEffect(refreshAnswers, [userId, data]);

  useEffect(() => {
    if (authLoading || subLoading) return;
    if (!userId) { setPhase('signin'); return; }
    getRunCount(userId).then(setRunCount).catch(() => {});
    getCircle(userId).then(setCircle).catch(() => {});
    getInspirationCount(userId).then(setInspCount).catch(() => {});
    getLatestRunFull(userId)
      .then((r) => {
        if (r) {
          setData(r.result); setRunId(r.id); setStepProgress(r.stepProgress); setThesisText(r.thesis); setBackground(r.background);
          // Pro lands on the deepening dashboard; free re-views the read they earned (Home is Pro-only).
          setPhase(isProOrAbove ? 'home' : 'read');
          getMarketPulse(r.thesis).then(setMarket).catch(() => {});
        } else setPhase('capture');
      })
      .catch(() => setPhase('capture'));
  }, [userId, authLoading, subLoading, isProOrAbove]);

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

  // Deepening phases are Pro. For locked users, any attempt to open one opens the gate instead.
  const DEEP_PHASES: Phase[] = ['sharpen', 'journey', 'home', 'addpeople', 'reachout'];
  const go = (p: Phase) => { if (locked && DEEP_PHASES.includes(p)) { setPhase('gate'); return; } setPhase(p); };

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

  // The ember now reflects real thesis STRENGTH (toward 100), not just input
  // breadth: the read's graded dimensions + grounded inputs + provisional credit
  // for banked sharpen-decisions. The fuel rows stay as the breakdown chips.
  const sharp = computeSharpness(data, {
    hasBackground: !!background, hasLinkedin: linkedinDone, inspirationCount: inspCount, circleCount: circle.length,
  }, unrunAnswers);
  const fuel = sharp.pending / 100;
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
      <div className="h">{COPY.signinTitle}</div>
      <div className="sub" style={{ marginTop: 10 }}>{COPY.signinSub}</div>
      <a href="/auth" className="cta" style={{ marginTop: 18, textDecoration: 'none', justifyContent: 'center', gap: 8 }}><span>Sign in</span><span className="mono">→</span></a>
    </div>
  );
  if (phase === 'gate') return centered(
    <div style={{ maxWidth: 360 }}>
      <div className="ovl">Pro</div>
      <div className="h" style={{ marginTop: 10 }}>Your plan is free — going deeper is Pro.</div>
      <div className="sub">You've seen where you stand. Pro opens the rest: make your plan stronger and re-read as it evolves, your living path, your network's warm reach, and ongoing market monitoring. $39 a month.</div>
      <button className="cta" style={{ marginTop: 18 }} onClick={async () => { const pid = getPriceId('pro'); if (pid) await openCheckout(pid); }}><span>Upgrade to Pro</span><span className="mono">→</span></button>
      <button className="foothint" style={{ marginTop: 14 }} onClick={() => setPhase(data ? 'read' : 'capture')}>back</button>
    </div>
  );

  if (phase === 'capture') return <CaptureDialogue onJudge={judgeThesis} onComplete={onComplete} />;

  // The framed phases: header + scrolling body + pinned footer action.
  const canHome = !!data && phase !== 'home' && phase !== 'thinking';
  const frame = (body: React.ReactNode, footer: React.ReactNode, hint?: string, wide?: boolean) => (
    <div className="thx thxframe"><style>{thesisCss + chromeCss}</style>
      <EmberNav fuel={fuel} fuels={fuels} hint={hint} onHome={canHome ? () => go('home') : undefined} />
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

  if (phase === 'reachout' && data) {
    // The warm-reach step's action. On return, mark that step done and refresh
    // the circle so warmth/faces reflect anyone the user just reached.
    const warmIdx = (data.steps || []).findIndex((s) => s.big);
    const js = journeyState(data, circle, stepProgress);
    const markIdx = warmIdx >= 0 ? warmIdx : js.current;
    const back = (markDone: boolean) => {
      if (markDone) onMarkDone(markIdx);
      if (userId) getCircle(userId).then(setCircle).catch(() => {});
      setPhase('journey');
    };
    return frame(
      <ReachOut />,
      <>
        <button className="cta" onClick={() => back(true)}><span>Done — back to path</span><span className="mono">→</span></button>
        <button className="foothint" onClick={() => back(false)}>back without marking done</button>
      </>,
      'reach, then it warms',
    );
  }

  if (phase === 'home' && data) {
    // One evolving thesis: the daily action is to deepen it, not start a new validation.
    return frame(
      <Home
        data={data} thesis={thesisText} stepProgress={stepProgress} circle={circle} fuel={fuel} market={market}
        sharp={sharp}
        coach={<SharpenPrompt onAnswered={refreshAnswers} />}
        onOpenRead={() => setPhase('read')}
        onOpenPath={() => go('journey')}
        onOpenCircle={() => { setCircleFrom('home'); go('addpeople'); }}
      />,
      <>
        <button className="cta" onClick={() => go('journey')}><span>Continue your path</span><span className="mono">→</span></button>
        <button className="foothint" onClick={() => go('sharpen')}>+ make your plan stronger · add a signal</button>
      </>,
      undefined, true,
    );
  }

  if (phase === 'thinking') {
    const steps: JourneyT[] = (done && data?.journey?.length) ? data.journey : CANONICAL_JOURNEY;
    return frame(
      <ThinkingView steps={steps} shown={shown} done={done} />,
      done ? <button className="cta" onClick={() => setPhase('read')}><span>See where you stand</span><span className="mono">→</span></button> : null,
    );
  }

  if (phase === 'read' && data) {
    const readFooter = locked ? (
      <>
        <button className="cta" onClick={() => setPhase('gate')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Lock size={14} strokeWidth={2.5} /> See your path</span>
          <span className="mono">→</span>
        </button>
        <button className="foothint" onClick={() => setPhase('gate')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lock size={11} strokeWidth={2.5} /> make it stronger &amp; go deeper with Pro</span>
        </button>
      </>
    ) : (
      <>
        <button className="cta" onClick={() => setPhase('journey')}><span>See your path</span><span className="mono">→</span></button>
        <button className="foothint" disabled={busyRerun} onClick={unrunAnswers > 0 ? onRerun : () => setPhase('sharpen')}>
          {busyRerun ? 'reading...' : unrunAnswers > 0 ? `see how it lands again to lock in your gains (+${sharp.provisional})` : 'add a bit more to make it stronger first'}
        </button>
      </>
    );
    return frame(
      <>
        <ReadView data={data} />
        {!locked ? <div style={{ marginTop: 18 }}><SharpenPrompt onAnswered={refreshAnswers} /></div> : null}
      </>,
      readFooter,
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
        <button className="cta" onClick={() => go('journey')}><span>See your path</span><span className="mono">→</span></button>
        <button className="foothint" disabled={busyRerun} onClick={onRerun}>{busyRerun ? 'reading...' : 'see how it lands now'}</button>
      </>,
      'tap the mark',
    );
  }

  if (phase === 'journey' && data) {
    const js = journeyState(data, circle, stepProgress);
    const steps = data.steps || [];
    let footer: React.ReactNode;
    if (js.weak) {
      footer = <button className="cta" onClick={startAnother}><span>Make your plan stronger</span><span className="mono">→</span></button>;
    } else if (js.allDone) {
      footer = <button className="foothint" onClick={startAnother}>+ start another plan</button>;
    } else {
      // Action-first: the primary button DOES the current move, it does not just
      // mark it complete. Marking done is the secondary affordance.
      const cur = steps[js.current];
      const t = (cur?.title || '').toLowerCase();
      let primary: { label: string; onClick: () => void };
      if (js.warmBlocked) {
        primary = { label: 'Add people to light up your warm reach', onClick: () => { setCircleFrom('journey'); go('addpeople'); } };
      } else if (cur?.big || /network|warm|reach|intro|referr|consult|client|prospect|outreach/.test(t)) {
        primary = { label: 'Reach out now', onClick: () => go('reachout') };
      } else if (/value|position|offer|edge|differen|prop|pric|message|brand|narrativ|credib/.test(t)) {
        primary = { label: 'Make this move stronger', onClick: () => go('sharpen') };
      } else {
        primary = { label: 'Work on this move', onClick: () => go('sharpen') };
      }
      footer = (
        <>
          <button className="cta" onClick={primary.onClick}><span>{primary.label}</span><span className="mono">→</span></button>
          {!js.warmBlocked ? <button className="foothint" onClick={() => onMarkDone(js.current)}>mark this move done</button> : null}
        </>
      );
    }
    return frame(
      <>
        <JourneyMap data={data} circle={circle} progress={stepProgress} />
        {/* When the read is too thin to map, asking the right question beats
            guessing at steps — surface the coach right here. */}
        {js.weak ? <div style={{ marginTop: 18 }}><SharpenPrompt onAnswered={refreshAnswers} /></div> : null}
      </>,
      footer, 'your path, charged',
    );
  }

  return centered(<Loader />);
}
