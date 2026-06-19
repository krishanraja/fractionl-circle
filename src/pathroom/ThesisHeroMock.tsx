// Interactive mock of the hero sequence: capture the thesis + LinkedIn, watch the
// validation journey happen, then the scorecard lands. Fixtures + a simulated research
// journey (no live Perplexity/Apify yet). Quiet-instrument register, plain language.
// Public, unlinked, no data. The surface we react to before building for real.
import { useEffect, useRef, useState } from 'react';
import { C, FONT, MONO } from './tokens';

const PHASES: Array<[string, string]> = [['capture', 'Capture'], ['thinking', 'Watch it think'], ['read', 'The read']];

// The visible research journey. Each step resolves to a finding; some are honest about low confidence.
const STEPS = [
  { k: 'bg', label: 'Reading your background', find: '12 years in B2B SaaS marketing, two exits.', src: 'LinkedIn' },
  { k: 'demand', label: 'Sizing demand against supply', find: 'Real, growing demand from seed-stage founders, but ~110,000 fractional profiles now compete.', src: 'Perplexity' },
  { k: 'pain', label: 'Scanning where your buyers complain', find: '"Hired a CMO too senior, too early." "I need strategy, not a full-timer." Recurring in r/SaaS and founder LinkedIn.', src: 'Reddit · LinkedIn' },
  { k: 'comp', label: 'Checking who else offers this', find: 'Dozens of generalist fractional CMOs. Very few own seed-stage specifically.', src: 'Perplexity' },
  { k: 'reach', label: 'Mapping your network to the buyers', find: 'Nine seed-stage founders already sit in your first-degree network.', src: 'Your network' },
  { k: 'pay', label: 'Confirming willingness to pay at seed stage', find: 'Could not strongly confirm seed-stage budgets. Treating this as medium confidence.', src: 'low confidence', low: true },
];

type Band = 'weak' | 'mixed' | 'strong' | 'risk';
const BANDVAL: Record<Band, number> = { weak: 1, mixed: 2, strong: 3, risk: 3 };
type Row = { label: string; band: Band; ev: string; conf: 'high' | 'medium' };

const OPPORTUNITY: Row[] = [
  { label: 'Demand', band: 'strong', ev: 'Founders increasingly buy outcomes over headcount.', conf: 'high' },
  { label: 'Burning need', band: 'mixed', ev: 'They pay to avoid a premature full-time hire, but seed budgets are tight.', conf: 'medium' },
  { label: 'Crowding', band: 'risk', ev: '~110,000 fractional profiles. The generalist middle is saturated.', conf: 'high' },
  { label: 'Your edge', band: 'strong', ev: 'Seed-stage focus plus two exits is a defensible niche.', conf: 'high' },
];
const ABILITY: Row[] = [
  { label: 'Fit to you', band: 'strong', ev: 'Operator background, and you have sold before.', conf: 'high' },
  { label: 'Warm reach', band: 'strong', ev: 'Nine seed-stage founders already in your network.', conf: 'high' },
  { label: 'Credibility', band: 'mixed', ev: 'Two exits prove value fast; the category still needs explaining.', conf: 'medium' },
];
const FLAGS = [
  'Plan for a 12 to 24 month income ramp while the pipeline builds.',
  'Name the scope tightly. Strategy-only offers invite scope creep.',
  'A seed-stage onboarding playbook would productize this beyond hourly.',
  'Comparable retainers land around $6K to $8K per month.',
];
const READ = 'Worth it. The idea is strong and yours to win, but the lane is crowded, so your edge, seed-stage plus two exits, has to lead everything you say. Here is the hard middle, broken down.';

const css = `
.thx * { box-sizing:border-box; margin:0; padding:0; }
.thx { background:${C.bg}; color:${C.hi}; font-family:${FONT}; min-height:100vh; -webkit-font-smoothing:antialiased; letter-spacing:-0.01em; }
.thx .wrap { max-width:520px; margin:0 auto; padding:22px 18px 80px; }
.thx .ovl { font-family:${MONO}; font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:${C.lo}; }
.thx .mono { font-family:${MONO}; font-variant-numeric:tabular-nums; }
.thx .h { font-size:23px; line-height:1.18; letter-spacing:-0.02em; font-weight:600; }
.thx .sub { font-size:13.5px; color:${C.mid}; line-height:1.5; margin-top:8px; }
.thx textarea, .thx input { width:100%; background:${C.panel}; border:1px solid ${C.line2}; border-radius:9px; padding:13px 14px; color:${C.hi}; font-size:14px; font-family:${FONT}; line-height:1.5; }
.thx textarea { min-height:92px; resize:none; }
.thx .cta { display:flex; align-items:center; justify-content:space-between; background:${C.accent}; color:#1A1206; border-radius:7px; padding:14px 16px; font-weight:600; font-size:15px; cursor:pointer; border:0; width:100%; }
.thx .chip { display:inline-flex; gap:6px; align-items:center; border:1px solid ${C.line2}; border-radius:7px; padding:9px 12px; font-size:12.5px; color:${C.mid}; cursor:pointer; background:${C.panel}; }
.thx .step { display:flex; gap:12px; padding:13px 0; border-top:1px solid ${C.line}; opacity:0; transform:translateY(4px); transition:opacity .4s ease, transform .4s ease; }
.thx .step.on { opacity:1; transform:none; }
.thx .dot { width:16px; height:16px; border-radius:50%; flex:0 0 auto; margin-top:2px; border:1.5px solid ${C.line2}; display:flex; align-items:center; justify-content:center; font-size:10px; color:${C.bg}; }
.thx .dot.done { background:${C.accent}; border-color:${C.accent}; }
.thx .slabel { font-size:13.5px; color:${C.hi}; font-weight:500; }
.thx .sfind { font-size:12.5px; color:${C.mid}; line-height:1.45; margin-top:3px; }
.thx .ssrc { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.lo}; margin-top:5px; }
.thx .panel { background:${C.panel2}; border:1px solid ${C.line}; border-radius:11px; padding:16px; }
.thx .grp { font-family:${MONO}; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:${C.accent}; }
.thx .row { padding:11px 0; border-top:1px solid ${C.line}; }
.thx .row:first-of-type { border-top:0; }
.thx .rtop { display:flex; align-items:center; gap:10px; }
.thx .rlabel { font-size:14px; font-weight:600; flex:1; }
.thx .pips { display:flex; gap:3px; flex:0 0 auto; justify-content:flex-end; }
.thx .pip { width:16px; height:4px; border-radius:2px; background:${C.line2}; }
.thx .conf { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.lo}; border:1px solid ${C.line2}; border-radius:3px; padding:1px 5px; display:inline-block; min-width:62px; text-align:center; flex:0 0 auto; }
.thx .risktag { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.risk}; border:1px solid rgba(204,119,119,0.4); border-radius:3px; padding:1px 5px; margin-left:8px; }
.thx .rev { font-size:12.5px; color:${C.mid}; line-height:1.45; margin-top:5px; }
.thx .nav { display:flex; gap:6px; justify-content:center; margin-bottom:16px; }
.thx .nb { font-family:${MONO}; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:${C.lo}; background:none; border:1px solid ${C.line}; border-radius:5px; padding:6px 10px; cursor:pointer; }
.thx .nb.on { color:${C.accent}; border-color:${C.accentEdge}; background:${C.accentDim}; }
`;

function Pips({ band }: { band: Band }) {
  const n = BANDVAL[band];
  const color = band === 'risk' ? C.risk : band === 'strong' ? C.accent : band === 'mixed' ? '#C9A24B' : C.mid;
  return <div className="pips">{[0, 1, 2].map((i) => <div key={i} className="pip" style={{ background: i < n ? color : C.line2 }} />)}</div>;
}

function ScoreRow({ r }: { r: Row }) {
  return (
    <div className="row">
      <div className="rtop">
        <span className="rlabel">{r.label}{r.band === 'risk' ? <span className="risktag">risk</span> : null}</span>
        <Pips band={r.band} />
        <span className="conf">{r.conf}</span>
      </div>
      <div className="rev">{r.ev}</div>
    </div>
  );
}

export default function ThesisHeroMock() {
  const [phase, setPhase] = useState('capture');
  const [shown, setShown] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (phase !== 'thinking') { setShown(phase === 'read' ? STEPS.length : 0); return; }
    setShown(0);
    STEPS.forEach((_, i) => { timers.current.push(window.setTimeout(() => setShown(i + 1), 700 * (i + 1))); });
    return () => { timers.current.forEach(clearTimeout); };
  }, [phase]);

  return (
    <div className="thx">
      <style>{css}</style>
      <div className="wrap">
        <div className="nav">
          {PHASES.map(([k, l]) => <button key={k} className={'nb' + (phase === k ? ' on' : '')} onClick={() => setPhase(k)}>{l}</button>)}
        </div>

        {phase === 'capture' ? (
          <>
            <div className="ovl">Start here</div>
            <div className="h" style={{ marginTop: 10 }}>What do you want to offer, and who to?</div>
            <div className="sub">In your words. A sentence is enough. We will go and check if it holds up.</div>
            <textarea style={{ marginTop: 16 }} defaultValue="Fractional CMO for seed-stage B2B SaaS founders who hired too senior too early and need strategy, not a full-time hire." />
            <input style={{ marginTop: 10 }} defaultValue="linkedin.com/in/your-profile" />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span className="chip">＋ Snap a business card</span>
              <span className="chip">＋ Screenshot someone you admire</span>
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: C.lo, margin: '14px 0' }}>We will be upfront about anything we are not sure of.</div>
            <button className="cta" onClick={() => setPhase('thinking')}><span>Validate my thesis</span><span className="mono">→</span></button>
          </>
        ) : null}

        {phase === 'thinking' ? (
          <>
            <div className="ovl">Working on it</div>
            <div className="h" style={{ marginTop: 10 }}>Pulling the world together on your idea.</div>
            <div className="sub">Reading your background, sizing the market, listening to your buyers, weighing your edge.</div>
            <div style={{ marginTop: 16 }}>
              {STEPS.map((s, i) => (
                <div key={s.k} className={'step' + (i < shown ? ' on' : '')}>
                  <div className={'dot' + (i < shown ? ' done' : '')}>{i < shown ? '✓' : ''}</div>
                  <div style={{ flex: 1 }}>
                    <div className="slabel">{s.label}</div>
                    {i < shown ? <div className="sfind" style={s.low ? { color: C.lo, fontStyle: 'italic' } : undefined}>{s.find}</div> : null}
                    {i < shown ? <div className="ssrc" style={s.low ? { color: C.risk } : undefined}>{s.src}</div> : null}
                  </div>
                </div>
              ))}
            </div>
            {shown >= STEPS.length ? <button className="cta" style={{ marginTop: 18 }} onClick={() => setPhase('read')}><span>See your read</span><span className="mono">→</span></button> : null}
          </>
        ) : null}

        {phase === 'read' ? (
          <>
            <div className="ovl">Your read</div>
            <div className="h" style={{ marginTop: 10 }}>Strong idea. Crowded lane. Yours to win.</div>
            <div className="sub">{READ}</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 18 }}>
              <div className="panel" style={{ flex: '1 1 230px' }}>
                <div className="grp">Is it a real opportunity?</div>
                <div style={{ marginTop: 10 }}>{OPPORTUNITY.map((r) => <ScoreRow key={r.label} r={r} />)}</div>
              </div>
              <div className="panel" style={{ flex: '1 1 230px' }}>
                <div className="grp">Can you win it, fast?</div>
                <div style={{ marginTop: 10 }}>{ABILITY.map((r) => <ScoreRow key={r.label} r={r} />)}</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="ovl">Worth knowing before you commit</div>
              {FLAGS.map((f) => (
                <div key={f} style={{ display: 'flex', gap: 9, marginTop: 9 }}>
                  <span style={{ color: C.lo, marginTop: 1 }}>·</span><span style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.45 }}>{f}</span>
                </div>
              ))}
            </div>
            <button className="cta" style={{ marginTop: 20 }} onClick={() => setPhase('capture')}><span>Show me the steps to get there</span><span className="mono">→</span></button>
            <div className="mono" style={{ fontSize: 10, color: C.lo, marginTop: 10, textAlign: 'center' }}>scores are bands with evidence, not exact numbers</div>
          </>
        ) : null}
      </div>
    </div>
  );
}
