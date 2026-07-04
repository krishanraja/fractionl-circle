// First-run "Start here" (live). The warm, grounded gate that runs before a new
// user ever sees a result - deliberately NOT a one-box "type an idea -> AI report"
// (that reads as an LLM wrapper). To unlock "See how it lands" you give the things
// only you can: at least ten people who could help you sell, at least one business
// you admire, and a few honest words about who you want to sell to and why.
//
// Those three are exactly the inputs the read is grounded in, so the friction buys
// real, non-generic value. The brand mark brightens as each goes in. On unlock we
// run the live read once and hand off to the app.
import { useEffect, useRef, useState } from 'react';
import { Users, Sparkles, PenLine, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AddToCircleSheet } from '@/components/circle/AddToCircleSheet';
import { AddSourceSheet } from '@/components/circle/AddSourceSheet';
import { C } from './tokens';
import { PLAN } from './copy';
import { thesisCss, ThinkingView, CANONICAL_JOURNEY } from './thesisViews';
import { EmberNav, chromeCss, type FuelRow } from './thesisChrome';
import {
  getCircleCount, getInspirationCount, saveInspiration, extractAdmire,
  saveAboutYou, markFirstRunComplete, runValidation,
} from './thesisData';

const MIN_PEOPLE = 10;

type Phase = 'intake' | 'thinking';

export default function StartHere({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [phase, setPhase] = useState<Phase>('intake');
  const [sellTo, setSellTo] = useState('');
  const [why, setWhy] = useState('');
  const [objective, setObjective] = useState('');
  const [aboutOpen, setAboutOpen] = useState(true);

  const [circleCount, setCircleCount] = useState(0);
  const [inspCount, setInspCount] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [srcOpen, setSrcOpen] = useState(false);

  const [inspOpen, setInspOpen] = useState(false);
  const [inspName, setInspName] = useState('');
  const [inspWhy, setInspWhy] = useState('');
  const [inspBusy, setInspBusy] = useState(false);
  const [inspErr, setInspErr] = useState<string | null>(null);

  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshCounts = () => {
    if (!userId) return;
    getCircleCount(userId).then(setCircleCount).catch(() => {});
    getInspirationCount(userId).then(setInspCount).catch(() => {});
  };
  useEffect(refreshCounts, [userId]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Preserve the about-you across a reload or an OAuth contacts-sync redirect
  // (connecting Google/Microsoft leaves and returns to the app), so a time-poor
  // user never loses what they typed.
  const aboutKey = userId ? `fr_about_${userId}` : '';
  useEffect(() => {
    if (!aboutKey) return;
    try { const s = JSON.parse(localStorage.getItem(aboutKey) || '{}'); if (s.sellTo) setSellTo(s.sellTo); if (s.why) setWhy(s.why); if (s.objective) setObjective(s.objective); } catch { /* ignore */ }
  }, [aboutKey]);
  useEffect(() => {
    if (!aboutKey) return;
    try { localStorage.setItem(aboutKey, JSON.stringify({ sellTo, why, objective })); } catch { /* ignore */ }
  }, [aboutKey, sellTo, why, objective]);

  const aboutDone = !!(objective.trim() && sellTo.trim() && why.trim());
  const peopleDone = circleCount >= MIN_PEOPLE;
  const inspDone = inspCount >= 1;
  const ready = aboutDone && peopleDone && inspDone;

  const aboutFrac = aboutDone ? 1 : (objective || sellTo || why ? 0.4 : 0);
  const fuel = Math.min(1, 0.1 + 0.3 * aboutFrac + 0.32 * Math.min(circleCount / MIN_PEOPLE, 1) + 0.28 * Math.min(inspCount, 1));
  const fuels: FuelRow[] = [
    { k: 'About you', on: aboutDone, hint: 'tell us' },
    { k: 'Your people', on: peopleDone, hint: `${circleCount}/${MIN_PEOPLE}` },
    { k: 'An inspiration', on: inspDone, hint: `${inspCount}/1` },
  ];

  async function addInspiration() {
    if (!userId || !inspName.trim() || inspBusy) return;
    setInspBusy(true); setInspErr(null);
    try {
      await saveInspiration(userId, { name: inspName.trim(), why: inspWhy.trim() || 'Something about how they show up that I want for my own work.' });
      setInspName(''); setInspWhy(''); setInspOpen(false);
      getInspirationCount(userId).then(setInspCount).catch(() => {});
    } catch {
      setInspErr('Could not save that just now. Try again in a moment.');
    } finally {
      setInspBusy(false);
    }
  }

  async function onScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId) return;
    setInspBusy(true); setInspErr(null);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(file);
      });
      const r = await extractAdmire(dataUrl, objective.trim());
      if (!r.ok || !r.name) { setInspErr(r.reject || 'Could not read that clearly. Try a name instead.'); return; }
      await saveInspiration(userId, { name: r.name, positioning: r.positioning, kind: r.kind, field: r.field, why: inspWhy.trim() || 'Something in how they position themselves that I admire.' });
      getInspirationCount(userId).then(setInspCount).catch(() => {});
      setInspOpen(false);
    } catch {
      setInspErr('Could not read that image. Try a sharper screenshot, or type a name.');
    } finally {
      setInspBusy(false);
    }
  }

  async function run() {
    if (!ready || !userId) return;
    const thesis = `${objective.trim()}${sellTo.trim() ? ` - for ${sellTo.trim()}` : ''}`;
    const background = why.trim();
    const transcript = `Who I want to sell to: ${sellTo.trim()}\nWhy me: ${why.trim()}\nObjective & ideas: ${objective.trim()}`;
    await saveAboutYou(userId, { target_buyer: sellTo.trim(), positioning: objective.trim().slice(0, 280), first_run_transcript: transcript });

    setErr(null); setDone(false); setShown(0); setPhase('thinking');
    timers.current.forEach(clearTimeout);
    timers.current = CANONICAL_JOURNEY.map((_, i) => window.setTimeout(() => setShown((s) => Math.max(s, i + 1)), 2600 * (i + 1)));
    try {
      await runValidation(thesis, '', background);
      timers.current.forEach(clearTimeout);
      setShown(CANONICAL_JOURNEY.length); setDone(true);
      await markFirstRunComplete(userId);
      try { if (aboutKey) localStorage.removeItem(aboutKey); } catch { /* ignore */ }
      // brief beat on the completed checklist, then into the app
      window.setTimeout(onComplete, 900);
    } catch {
      timers.current.forEach(clearTimeout);
      setErr('Something went wrong reaching the research. Give it another moment and try again.');
      setPhase('intake');
    }
  }

  if (phase === 'thinking') {
    return (
      <div className="thx thxframe"><style>{thesisCss + chromeCss}</style>
        <EmberNav fuel={Math.max(fuel, 0.85)} fuels={fuels} hint="reading" />
        <div className="thxbody"><div className="wrap">
          <ThinkingView steps={CANONICAL_JOURNEY} shown={shown} done={done} />
          {done ? <div className="sub" style={{ textAlign: 'center', marginTop: 16, color: C.good }}>Ready. Taking you to {PLAN.result}…</div> : null}
        </div></div>
      </div>
    );
  }

  const GateCard = ({ icon: Icon, title, sub, done: gdone, badge, onClick }: {
    icon: typeof Users; title: string; sub: string; done: boolean; badge: string; onClick: () => void;
  }) => (
    <button className={'fuelcard' + (gdone ? ' done' : '')} onClick={onClick} style={{ alignItems: 'center' }}>
      <span className="fuelicon" style={gdone ? { borderColor: C.good, color: C.good } : undefined}>
        {gdone ? <Check size={15} strokeWidth={2.5} /> : <Icon size={15} strokeWidth={2} />}
      </span>
      <span style={{ flex: 1 }}>
        <span className="fueltitle2" style={{ display: 'block' }}>{title}</span>
        <span className="fuelfor">{sub}</span>
      </span>
      <span className="navhint" style={{ color: gdone ? C.good : C.accent }}>{gdone ? 'done' : badge}</span>
    </button>
  );

  return (
    <div className="thx thxframe"><style>{thesisCss + chromeCss}</style>
      <EmberNav fuel={fuel} fuels={fuels} hint="tap the mark" />
      <div className="thxbody"><div className="wrap">
        <div className="ovl">Start here</div>
        <div className="h" style={{ marginTop: 8 }}>Let's build your plan from what you actually know.</div>
        <div className="sub">No generic advice. We start with your people, your taste, and your goal - then read the market against all three. Three quick things and you're set.</div>
        {err ? <div className="mono" style={{ color: C.risk, fontSize: 11, marginTop: 12 }}>{err}</div> : null}

        {/* 1 - About you */}
        <div className="fuelcard" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default', marginTop: 18 }}>
          <button onClick={() => setAboutOpen((o) => !o)} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>
            <span className="fuelicon" style={aboutDone ? { borderColor: C.good, color: C.good } : undefined}>
              {aboutDone ? <Check size={15} strokeWidth={2.5} /> : <PenLine size={15} strokeWidth={2} />}
            </span>
            <span style={{ flex: 1 }}>
              <span className="fueltitle2" style={{ display: 'block' }}>A bit about you</span>
              <span className="fuelfor">Who you want to sell to, why you, and what you're going for. Plain words.</span>
            </span>
            <span className="navhint" style={{ color: aboutDone ? C.good : C.accent }}>{aboutDone ? 'done' : aboutOpen ? '-' : 'open'}</span>
          </button>
          {aboutOpen ? (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={sellTo} onChange={(e) => setSellTo(e.target.value)} placeholder="Who do you want to sell to? (e.g. seed B2B SaaS founders)" />
              <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Why you? (the experience that makes you the one they pick)" />
              <textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What are you going for right now - your objective and any ideas? A stream of consciousness is fine." />
            </div>
          ) : null}
        </div>

        {/* 2 - Your people */}
        <GateCard
          icon={Users}
          title="Add your people"
          sub={`At least ${MIN_PEOPLE} people who could help you sell - clients, peers, anyone warm. Snap a screenshot, paste a list, or import your contacts in one go.`}
          done={peopleDone}
          badge={`${circleCount}/${MIN_PEOPLE}`}
          onClick={() => setAddOpen(true)}
        />

        {/* 3 - An inspiration */}
        <div className={'fuelcard' + (inspDone ? ' done' : '')} style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
          <button onClick={() => setInspOpen((o) => !o)} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>
            <span className="fuelicon" style={inspDone ? { borderColor: C.good, color: C.good } : undefined}>
              {inspDone ? <Check size={15} strokeWidth={2.5} /> : <Sparkles size={15} strokeWidth={2} />}
            </span>
            <span style={{ flex: 1 }}>
              <span className="fueltitle2" style={{ display: 'block' }}>A business you admire</span>
              <span className="fuelfor">Someone whose work you'd love to build toward. It helps us learn your taste and shape what makes you different.</span>
            </span>
            <span className="navhint" style={{ color: inspDone ? C.good : C.accent }}>{inspDone ? 'done' : `${inspCount}/1`}</span>
          </button>
          {inspOpen ? (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={inspName} onChange={(e) => setInspName(e.target.value)} placeholder="Business or person's name" />
              <input value={inspWhy} onChange={(e) => setInspWhy(e.target.value)} placeholder="What do you admire about them? (optional)" />
              {inspErr ? <div className="mono" style={{ color: C.risk, fontSize: 11 }}>{inspErr}</div> : null}
              <div className="twobtn">
                <button className="cta" disabled={inspBusy || !inspName.trim()} onClick={addInspiration}>
                  <span>{inspBusy ? 'saving…' : 'Add this'}</span><span className="mono">→</span>
                </button>
                <button className="chip" style={{ justifyContent: 'center', flex: '0 0 auto' }} disabled={inspBusy} onClick={() => fileRef.current?.click()}>
                  Use a screenshot
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onScreenshot} />
            </div>
          ) : null}
        </div>

        <div className="mono" style={{ fontSize: 10.5, color: C.lo, marginTop: 16, lineHeight: 1.6 }}>
          Everything you add stays yours and keeps working after today - your people become your circle, your inspiration shapes what makes you different.
        </div>
      </div></div>

      <div className="thxfoot">
        <button className="cta" disabled={!ready} onClick={run}>
          <span>{PLAN.run}</span><span className="mono">→</span>
        </button>
        {!ready ? (
          <div className="foothint" style={{ pointerEvents: 'none' }}>
            {!aboutDone ? 'tell us a bit about you' : !peopleDone ? `add ${MIN_PEOPLE - circleCount} more ${MIN_PEOPLE - circleCount === 1 ? 'person' : 'people'}` : 'add a business you admire'}
          </div>
        ) : null}
      </div>

      <AddToCircleSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={refreshCounts}
        onConnectSourceClick={() => { setAddOpen(false); setSrcOpen(true); }}
      />
      <AddSourceSheet open={srcOpen} onOpenChange={setSrcOpen} onIngested={refreshCounts} />
    </div>
  );
}
