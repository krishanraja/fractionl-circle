// UNLINKED design fixture (mock 3): the living JOURNEY MAP that replaces ThesisCircle's
// static name-card list and the two duplicate "build your circle" CTAs.
// Route: /preview/journey. Public, lazy, no network, no auth.
// Locked decisions it carries:
//  - the path to first retained client as a living timeline; the circle is WOVEN IN.
//  - warm-reach steps show real faces from the circle and light up as people are added;
//    adding a person visibly strengthens a specific step.
//  - exactly ONE primary action per state (no duplicate CTAs). "validate another thesis"
//    is demoted to a quiet secondary.
//  - a weak read does NOT pretend: it pivots to "sharpen the thesis", not "go execute".
//  - a huge imported circle never renders thousands of cards; only the few that matter.
import { useState } from 'react';
import { C, MONO } from '../pathroom/tokens';
import { thesisCss } from '../pathroom/thesisViews';

const journeyCss = `
.thx .topnav { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:11px; padding:11px 18px; background:rgba(10,10,11,0.82); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-bottom:1px solid ${C.line}; }
.thx .ember { width:26px; height:26px; transition:filter .8s ease, opacity .8s ease; }
.thx .wm { height:15px; opacity:0.9; }
.thx .navspacer { flex:1; }
.thx .navhint { font-family:${MONO}; font-size:9px; letter-spacing:0.14em; text-transform:uppercase; color:${C.lo}; }
.thx .jstep { position:relative; display:flex; gap:14px; padding:0 0 22px 0; }
.thx .jrail { position:absolute; left:14px; top:30px; bottom:-2px; width:1.5px; background:${C.line2}; }
.thx .jstep:last-child .jrail { display:none; }
.thx .jnode { width:30px; height:30px; border-radius:50%; flex:0 0 auto; display:flex; align-items:center; justify-content:center; font-family:${MONO}; font-size:12px; border:1.5px solid ${C.line2}; color:${C.mid}; background:${C.bg}; z-index:1; }
.thx .jnode.done { background:${C.good}; border-color:${C.good}; color:${C.bg}; }
.thx .jnode.current { border-color:${C.accent}; color:${C.accent}; box-shadow:0 0 0 4px ${C.accentDim}; }
.thx .jnode.locked { border-style:dashed; color:${C.lo}; }
.thx .jbody { flex:1; padding-top:3px; }
.thx .jstep.dim .jbody { opacity:0.5; }
.thx .jtitle { font-size:15px; font-weight:600; color:${C.hi}; line-height:1.3; }
.thx .jtag { font-family:${MONO}; font-size:8.5px; letter-spacing:0.1em; text-transform:uppercase; border-radius:3px; padding:1px 5px; margin-left:8px; }
.thx .jtag.week { color:${C.accent}; border:1px solid ${C.accentEdge}; }
.thx .jtag.big { color:${C.accent}; border:1px solid ${C.accentEdge}; }
.thx .jwhy { font-size:12.5px; color:${C.mid}; line-height:1.45; margin-top:5px; }
.thx .jval { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.good}; margin-top:8px; display:inline-flex; gap:5px; }
.thx .faces { display:flex; align-items:center; gap:-6px; margin-top:10px; }
.thx .face { width:26px; height:26px; border-radius:50%; background:${C.panel3}; border:1.5px solid ${C.bg}; margin-right:-7px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; color:${C.accent}; font-family:${MONO}; }
.thx .facemore { font-family:${MONO}; font-size:10px; color:${C.lo}; margin-left:13px; }
.thx .litprompt { display:flex; align-items:center; gap:8px; margin-top:10px; padding:9px 11px; border:1px dashed ${C.line2}; border-radius:8px; background:${C.panel}; }
.thx .litdot { width:8px; height:8px; border-radius:50%; background:${C.line2}; }
.thx .secondary { background:none; border:0; color:${C.lo}; font-family:${MONO}; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; }
.thx .ftpath { display:flex; gap:10px; margin:14px 0 20px; }
.thx .ftcol { flex:1; background:${C.panel}; border:1px solid ${C.line}; border-radius:9px; padding:11px 12px; }
.thx .ftk { font-family:${MONO}; font-size:9px; letter-spacing:0.12em; text-transform:uppercase; color:${C.lo}; }
.thx .ftv { font-size:12.5px; color:${C.hi}; margin-top:5px; line-height:1.4; }
`;

type Scenario = 'empty' | 'circle' | 'big' | 'weak' | 'midway';
interface Person { initials: string }
interface Step { title: string; why: string; tag?: 'week' | 'big'; warm?: boolean }

const STEPS: Step[] = [
  { title: 'Sharpen your one-line value proposition', why: 'How you help product teams with AI, in a sentence a founder repeats to a peer.', tag: 'week' },
  { title: 'Ask three warm contacts for an intro', why: 'Referrals are how the vast majority of first fractional clients arrive. This is the move that matters most.', tag: 'big', warm: true },
  { title: 'Build two short proof points', why: 'A before-and-after from past work. Enough to make the warm intro land.' },
  { title: 'Show up where your buyers already gather', why: 'A few rooms, not all of them. Visible, not loud.' },
  { title: 'Land your first retained client', why: 'Then run the warm moves again, to three. The long ramp made concrete.' },
];

const POOL: Person[] = [{ initials: 'AW' }, { initials: 'RH' }, { initials: 'JT' }, { initials: 'MP' }];

const SCENARIOS: Record<Scenario, { label: string; circle: number; progress: number; weak?: boolean }> = {
  empty: { label: 'empty circle', circle: 0, progress: 1 },
  circle: { label: 'with a circle', circle: 4, progress: 1 },
  big: { label: 'big imported circle', circle: 1240, progress: 1 },
  midway: { label: 'mid-journey', circle: 4, progress: 3 },
  weak: { label: 'weak read', circle: 0, progress: 0, weak: true },
};

export default function JourneyMock() {
  const [scenario, setScenario] = useState<Scenario>('circle');
  const [circleN, setCircleN] = useState(SCENARIOS.circle.circle);
  const [progress, setProgress] = useState(SCENARIOS.circle.progress);
  const [fuelOpen, setFuelOpen] = useState(false);

  const cfg = SCENARIOS[scenario];
  const weak = !!cfg.weak;

  function pick(s: Scenario) { setScenario(s); setCircleN(SCENARIOS[s].circle); setProgress(SCENARIOS[s].progress); }

  // ember: bright when there is a real charged journey, dim+honest on a weak read
  const f = weak ? 0.34 : Math.min(1, 0.62 + (circleN > 0 ? 0.2 : 0) + progress * 0.04);
  const emberFilter = `brightness(${(0.4 + 0.6 * f).toFixed(2)}) saturate(${(0.15 + 0.95 * f).toFixed(2)}) drop-shadow(0 0 ${Math.round(f * 20)}px rgba(224,162,60,${(0.1 + 0.55 * f).toFixed(2)}))`;

  const faces = POOL.slice(0, Math.min(circleN, 4));
  const done = progress >= STEPS.length;

  // The current step is STEPS[progress]; the warm move is locked while the circle is empty.
  const currentIdx = progress;
  const warmIdx = STEPS.findIndex((s) => s.warm);
  const warmBlocked = circleN === 0;

  function primaryAction() {
    if (currentIdx === warmIdx && warmBlocked) { setCircleN(3); return; } // adding people lights the step
    setProgress((p) => Math.min(p + 1, STEPS.length));
  }
  const primaryLabel = (currentIdx === warmIdx && warmBlocked)
    ? 'Add people to light up your warm reach'
    : progress === 0 ? 'Start move one' : done ? '' : 'Mark this move done';

  return (
    <div className="thx" style={{ position: 'relative' }} data-scenario={scenario} data-circle={circleN} data-progress={progress}>
      <style>{thesisCss + journeyCss}</style>

      <div className="topnav">
        <button style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', lineHeight: 0 }} onClick={() => setFuelOpen((o) => !o)} aria-label="charge">
          <img src="/brand/fractionl-icon.png" alt="" className="ember" style={{ filter: emberFilter, opacity: (0.5 + 0.5 * f).toFixed(2) }} />
        </button>
        <img src="/brand/fractionl-wordmark.png" alt="Fractionl" className="wm" />
        <span className="navspacer" />
        <span className="navhint">{weak ? 'thin read, dim mark' : 'your path, charged'}</span>
      </div>

      <div className="wrap">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18, paddingBottom: 16, borderBottom: `1px dashed ${C.line2}` }}>
          <span className="navhint" style={{ alignSelf: 'center' }}>state:</span>
          {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
            <button key={s} className="navhint" style={{ background: 'none', border: `1px solid ${scenario === s ? C.accentEdge : C.line}`, color: scenario === s ? C.accent : C.lo, borderRadius: 5, padding: '6px 9px', cursor: 'pointer' }} onClick={() => pick(s)}>{SCENARIOS[s].label}</button>
          ))}
        </div>

        {weak ? (
          // a weak read must not be dressed up as a journey
          <>
            <div className="ovl">Your read</div>
            <div className="h" style={{ marginTop: 10 }}>This one is too thin to map yet.</div>
            <div className="sub">The thesis is too broad for the market to answer clearly, so a path would be guesswork. Sharpen who it is for and why you, and the map writes itself.</div>
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="grp">What is missing</div>
              <div style={{ fontSize: 13, color: C.mid, marginTop: 8, lineHeight: 1.5 }}>A specific buyer, and the one reason they pick you over the crowded field.</div>
            </div>
            <button className="cta" style={{ marginTop: 18 }} onClick={() => pick('circle')}><span>Sharpen your thesis</span><span className="mono">→</span></button>
          </>
        ) : (
          <>
            <div className="ovl">Your path</div>
            <div className="h" style={{ marginTop: 10 }}>From where you are to your first retained client.</div>
            <div className="ftpath">
              <div className="ftcol"><div className="ftk">Where you are</div><div className="ftv">Strong operator, no offer in market yet.</div></div>
              <div className="ftcol"><div className="ftk">Where you are going</div><div className="ftv">A repeatable fractional practice.</div></div>
            </div>

            <div>
              {STEPS.map((s, i) => {
                const state = i < progress ? 'done' : i === progress ? 'current' : 'upcoming';
                const locked = s.warm && warmBlocked && state !== 'done';
                return (
                  <div key={i} className={'jstep' + (locked ? ' dim' : '')}>
                    <div className="jrail" />
                    <div className={'jnode ' + (state === 'done' ? 'done' : locked ? 'locked' : state === 'current' ? 'current' : '')}>{state === 'done' ? '✓' : i + 1}</div>
                    <div className="jbody">
                      <div className="jtitle">{s.title}{s.tag === 'week' && state === 'current' ? <span className="jtag week">this week</span> : null}{s.tag === 'big' ? <span className="jtag big">the big one</span> : null}</div>
                      <div className="jwhy">{s.why}</div>
                      {s.warm ? (
                        circleN > 0 ? (
                          <>
                            <div className="faces">
                              {faces.map((p, k) => <span key={k} className="face">{p.initials}</span>)}
                              <span className="facemore">touches {Math.min(circleN, 3)}{circleN > 4 ? ` of ${circleN.toLocaleString()}` : ''} in your circle</span>
                            </div>
                          </>
                        ) : (
                          <div className="litprompt"><span className="litdot" /><span style={{ fontSize: 12, color: C.mid }}>Not lit yet. Add people and this move comes alive.</span></div>
                        )
                      ) : null}
                      {state !== 'upcoming' && !locked ? <div className="jval">✓ validated</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {done ? (
              <div className="panel" style={{ marginTop: 6, textAlign: 'center', padding: 20 }}>
                <div className="grp" style={{ color: C.good }}>Milestone</div>
                <div style={{ fontSize: 15, color: C.hi, marginTop: 8 }}>You are at your first retained client.</div>
                <div className="sub" style={{ marginTop: 6 }}>Now we run the warm moves again, to three.</div>
              </div>
            ) : (
              <button className="cta" style={{ marginTop: 2 }} onClick={primaryAction}><span>{primaryLabel}</span><span className="mono">→</span></button>
            )}

            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button className="secondary">+ validate another thesis</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
