// Shared presentational layer for the thesis hero, used by both the fixture mock
// (/thesis-preview) and the live app (/thesis). Pure props in, no data. Quiet-instrument
// register, plain language. Types match the validate-thesis edge function output.
import { useState } from 'react';
import { C, FONT, MONO } from './tokens';

export type Band = 'weak' | 'mixed' | 'strong' | 'risk';
export interface ScoreRowT { label: string; band: Band; evidence: string; confidence: 'high' | 'medium' | 'low' }
export interface StepT { title: string; why: string; tag?: string; touches?: string; big?: boolean }
export interface JourneyT { label: string; finding?: string; source?: string; low?: boolean }
export interface Scorecard {
  read: string; from?: string; to?: string;
  opportunity: ScoreRowT[]; ability: ScoreRowT[]; flags: string[]; steps: StepT[]; journey: JourneyT[]; citations?: string[];
}

// The canonical journey labels shown while the live research call runs (~19s).
export const CANONICAL_JOURNEY: JourneyT[] = [
  { label: 'Reading your background' },
  { label: 'Sizing demand against supply' },
  { label: 'Scanning where your buyers complain' },
  { label: 'Checking who else offers this' },
  { label: 'Mapping your network to the buyers' },
  { label: 'Weighing your edge and pricing' },
];

const BANDVAL: Record<Band, number> = { weak: 1, mixed: 2, strong: 3, risk: 3 };

export const thesisCss = `
.thx * { box-sizing:border-box; margin:0; padding:0; }
/* .thx is THEME ONLY — colour, type, component skins. It must never set
   width/height/min-height/position. All sizing lives on the layout classes
   (.app-frame, .thxframe, .thx-page) so a broadly-applied theme rule can never
   fight a frame's height. (A stray min-height:100vh here once forced the locked
   shell taller than the viewport and hid the bottom tab bar.) */
.thx { background:${C.bg}; color:${C.hi}; font-family:${FONT}; -webkit-font-smoothing:antialiased; letter-spacing:-0.01em; }
/* Standalone, normally-scrolling full-page surface (preview fixtures, and any
   future non-framed page): fill the viewport so the themed background covers it.
   Locked/​framed surfaces do NOT use this — they size via .app-frame/.thxframe. */
.thx-page { min-height:100dvh; }
.thx .wrap { max-width:520px; margin:0 auto; padding:22px 18px 80px; }
.thx .ovl { font-family:${MONO}; font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:${C.lo}; }
.thx .mono { font-family:${MONO}; font-variant-numeric:tabular-nums; }
.thx .h { font-size:23px; line-height:1.18; letter-spacing:-0.02em; font-weight:600; }
.thx .sub { font-size:13.5px; color:${C.mid}; line-height:1.5; margin-top:8px; }
.thx textarea, .thx input { width:100%; background:${C.panel}; border:1px solid ${C.line2}; border-radius:9px; padding:13px 14px; color:${C.hi}; font-size:14px; font-family:${FONT}; line-height:1.5; }
.thx textarea { min-height:92px; resize:none; }
.thx .cta { display:flex; align-items:center; justify-content:space-between; background:${C.accent}; color:#1A1206; border-radius:7px; padding:14px 16px; font-weight:600; font-size:15px; cursor:pointer; border:0; width:100%; }
.thx .cta:disabled { opacity:0.5; cursor:default; }
.thx .chip { display:inline-flex; gap:6px; align-items:center; border:1px solid ${C.line2}; border-radius:7px; padding:9px 12px; font-size:12.5px; color:${C.mid}; cursor:pointer; background:${C.panel}; }
.thx .step { display:flex; gap:12px; padding:8px 0; border-top:1px solid ${C.line}; opacity:0; transform:translateY(4px); transition:opacity .4s ease, transform .4s ease; }
.thx .step.on { opacity:1; transform:none; }
.thx .dot { width:16px; height:16px; border-radius:50%; flex:0 0 auto; margin-top:2px; border:1.5px solid ${C.line2}; display:flex; align-items:center; justify-content:center; font-size:10px; color:${C.bg}; }
.thx .dot.done { background:${C.accent}; border-color:${C.accent}; }
.thx .dot.spin { border-top-color:${C.accent}; animation:thxspin 0.8s linear infinite; }
@keyframes thxspin { to { transform:rotate(360deg); } }
.thx .slabel { font-size:13.5px; color:${C.hi}; font-weight:500; }
.thx .sfind { font-size:12.5px; color:${C.mid}; line-height:1.4; margin-top:3px; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
.thx .ssrc { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.lo}; margin-top:5px; }
.thx .panel { background:${C.panel2}; border:1px solid ${C.line}; border-radius:11px; padding:16px; }
.thx .grp { font-family:${MONO}; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:${C.accent}; }
.thx .row { padding:9px 0; border-top:1px solid ${C.line}; }
.thx .row:first-of-type { border-top:0; }
.thx .rtop { display:flex; align-items:center; gap:10px; }
.thx .rlabel { font-size:14px; font-weight:600; flex:1; }
.thx .pips { display:flex; gap:3px; flex:0 0 auto; justify-content:flex-end; }
.thx .pip { width:16px; height:4px; border-radius:2px; background:${C.line2}; }
.thx .conf { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.lo}; border:1px solid ${C.line2}; border-radius:3px; padding:1px 5px; display:inline-block; min-width:62px; text-align:center; flex:0 0 auto; }
.thx .risktag { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.risk}; border:1px solid rgba(204,119,119,0.4); border-radius:3px; padding:1px 5px; margin-left:8px; }
.thx .ft { display:flex; gap:10px; margin-top:14px; }
.thx .ftcol { flex:1; background:${C.panel}; border:1px solid ${C.line}; border-radius:9px; padding:11px 12px; }
.thx .ftk { font-family:${MONO}; font-size:9px; letter-spacing:0.12em; text-transform:uppercase; color:${C.lo}; }
.thx .ftv { font-size:12.5px; color:${C.hi}; margin-top:5px; line-height:1.4; }
.thx .plan { margin-top:20px; }
.thx .pstep { display:flex; gap:13px; padding-bottom:18px; }
.thx .pnum { width:26px; height:26px; border-radius:50%; border:1px solid ${C.line2}; color:${C.mid}; font-family:${MONO}; font-size:12px; flex:0 0 auto; display:flex; align-items:center; justify-content:center; }
.thx .pstep.big .pnum { border-color:${C.accentEdge}; color:${C.accent}; }
.thx .ptitle { font-size:14.5px; font-weight:600; line-height:1.32; }
.thx .pwhy { font-size:12.5px; color:${C.mid}; line-height:1.45; margin-top:5px; }
.thx .vchip { display:inline-flex; align-items:center; gap:6px; font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.good}; margin-top:8px; }
.thx .ptag { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.accent}; border:1px solid ${C.accentEdge}; border-radius:3px; padding:1px 5px; margin-left:8px; }
.thx .nav { display:flex; gap:6px; justify-content:center; margin-bottom:16px; flex-wrap:wrap; }
.thx .nb { font-family:${MONO}; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:${C.lo}; background:none; border:1px solid ${C.line}; border-radius:5px; padding:6px 10px; cursor:pointer; }
.thx .nb.on { color:${C.accent}; border-color:${C.accentEdge}; background:${C.accentDim}; }
`;

function Pips({ band }: { band: Band }) {
  const n = BANDVAL[band];
  const color = band === 'risk' ? C.risk : band === 'strong' ? C.accent : band === 'mixed' ? C.gold : C.mid;
  return <div className="pips">{[0, 1, 2].map((i) => <div key={i} className="pip" style={{ background: i < n ? color : C.line2 }} />)}</div>;
}

// Glanceable by default (label + band + confidence on one line); tap to reveal the
// evidence. Keeps the read short enough to fit a phone without scrolling, with the depth
// one tap away (exhaustive under the hood, simple on the surface).
function ScoreRow({ r }: { r: ScoreRowT }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="row" onClick={() => setOpen((o) => !o)} style={{ cursor: 'pointer' }}>
      <div className="rtop">
        <span className="rlabel">{r.label}{r.band === 'risk' ? <span className="risktag">risk</span> : null}</span>
        <Pips band={r.band} />
        <span className="conf">{r.confidence}</span>
      </div>
      {open ? <div className="rev" style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.45, marginTop: 6 }}>{r.evidence}</div> : null}
    </div>
  );
}

export function CaptureView({ onSubmit, busy, onAddPeople }: { onSubmit: (thesis: string, linkedin: string, background: string) => void; busy?: boolean; onAddPeople?: () => void }) {
  const [thesis, setThesis] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [background, setBackground] = useState('');
  return (
    <>
      <div className="ovl">Start here</div>
      <div className="h" style={{ marginTop: 10 }}>What do you want to offer, and who to?</div>
      <div className="sub">In your words. A sentence is enough. We will go and check if it holds up.</div>
      <textarea style={{ marginTop: 16 }} value={thesis} onChange={(e) => setThesis(e.target.value)} placeholder="Fractional CMO for seed-stage B2B SaaS founders who hired too senior too early and need strategy, not a full-time hire." />
      <input style={{ marginTop: 10 }} value={background} onChange={(e) => setBackground(e.target.value)} placeholder="One line on your background, so we can judge your fit (e.g. 12 years B2B SaaS marketing, two exits)" />
      <input style={{ marginTop: 10 }} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/your-profile (optional)" />
      {onAddPeople ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="chip" onClick={onAddPeople}>＋ Snap a business card</button>
          <button className="chip" onClick={onAddPeople}>＋ Screenshot someone you admire</button>
        </div>
      ) : null}
      <div className="mono" style={{ fontSize: 10.5, color: C.lo, margin: '14px 0' }}>We will be upfront about anything we are not sure of.</div>
      <button className="cta" disabled={busy || !thesis.trim()} onClick={() => onSubmit(thesis.trim(), linkedin.trim(), background.trim())}>
        <span>{busy ? 'starting...' : 'Run the deep dive'}</span><span className="mono">→</span>
      </button>
    </>
  );
}

export function ThinkingView({ steps, shown, done }: { steps: JourneyT[]; shown: number; done: boolean }) {
  const charge = done ? 1 : Math.max(0.1, shown / (steps.length || 6));
  const rr = 28, rc = 2 * Math.PI * rr;
  return (
    <>
      <div className="ovl" style={{ textAlign: 'center' }}>Working on it</div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 4px' }}>
        <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 64 64" style={{ position: 'absolute', inset: 0 }}>
            <circle cx="32" cy="32" r={rr} fill="none" stroke={C.line2} strokeWidth="3" />
            <circle cx="32" cy="32" r={rr} fill="none" stroke={C.accent} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={rc} strokeDashoffset={rc * (1 - charge)} transform="rotate(-90 32 32)"
              style={{ transition: 'stroke-dashoffset .7s ease', filter: 'drop-shadow(0 0 5px rgba(224,162,60,0.8))' }} />
          </svg>
          <img src="/brand/fractionl-icon.png" alt="" style={{ width: 26, height: 26, filter: 'drop-shadow(0 0 8px rgba(224,162,60,0.55))', animation: done ? 'none' : 'ldrbreath 2.4s ease-in-out infinite' }} />
        </div>
      </div>
      <div className="sub" style={{ marginTop: 4, textAlign: 'center' }}>Reading the market, your buyers, and your edge.</div>
      <div style={{ marginTop: 16 }}>
        {steps.map((s, i) => (
          <div key={i} className={'step' + (i < shown ? ' on' : '')}>
            <div className={'dot' + (i < shown ? ' done' : i === shown && !done ? ' spin' : '')}>{i < shown ? '✓' : ''}</div>
            <div style={{ flex: 1 }}>
              <div className="slabel">{s.label}</div>
              {i < shown && s.finding ? <div className="sfind" style={s.low ? { color: C.lo, fontStyle: 'italic' } : undefined}>{s.finding}</div> : null}
              {i < shown && s.source ? <div className="ssrc" style={s.low ? { color: C.risk } : undefined}>{s.source}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ReadView({ data }: { data: Scorecard }) {
  const [flagsOpen, setFlagsOpen] = useState(false);
  const [readOpen, setReadOpen] = useState(false);
  const clamp: React.CSSProperties = readOpen ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' };
  return (
    <>
      <div className="ovl">Your read</div>
      <div className="h" onClick={() => setReadOpen((o) => !o)} style={{ marginTop: 8, fontSize: 19, lineHeight: 1.32, cursor: 'pointer', ...clamp }}>{data.read}</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
        <div className="panel" style={{ flex: '1 1 230px', padding: 13 }}>
          <div className="grp">Is it a real opportunity?</div>
          <div style={{ marginTop: 6 }}>{data.opportunity.map((r) => <ScoreRow key={r.label} r={r} />)}</div>
        </div>
        <div className="panel" style={{ flex: '1 1 230px', padding: 13 }}>
          <div className="grp">Can you win it, fast?</div>
          <div style={{ marginTop: 6 }}>{data.ability.map((r) => <ScoreRow key={r.label} r={r} />)}</div>
        </div>
      </div>
      <div className="mono" style={{ fontSize: 9.5, color: C.lo, marginTop: 9, textAlign: 'center' }}>tap any line for the evidence. bands, not exact numbers.</div>
      {data.flags?.length ? (
        <div style={{ marginTop: 12 }}>
          <button className="row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, borderTop: `1px solid ${C.line}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 0' }} onClick={() => setFlagsOpen((o) => !o)}>
            <span className="ovl" style={{ flex: 1 }}>Worth knowing before you commit</span>
            <span className="mono" style={{ color: C.lo, fontSize: 11 }}>{flagsOpen ? '–' : `+${data.flags.length}`}</span>
          </button>
          {flagsOpen ? data.flags.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, marginTop: 8 }}>
              <span style={{ color: C.lo, marginTop: 1 }}>·</span><span style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.45 }}>{f}</span>
            </div>
          )) : null}
        </div>
      ) : null}
    </>
  );
}

export function StepsView({ data, onStart }: { data: Scorecard; onStart: () => void }) {
  return (
    <>
      <div className="ovl">Your path</div>
      <div className="h" style={{ marginTop: 10 }}>Here is how you get there.</div>
      <div className="sub">{data.steps.length} moves from where you are to your first retained clients. Small, in order, and each one earns its place.</div>
      {data.from || data.to ? (
        <div className="ft">
          <div className="ftcol"><div className="ftk">Where you are</div><div className="ftv">{data.from || 'Where you are now.'}</div></div>
          <div className="ftcol"><div className="ftk">Where you are going</div><div className="ftv">{data.to || 'Your goal.'}</div></div>
        </div>
      ) : null}
      <div className="plan">
        {data.steps.map((s, i) => (
          <div key={i} className={'pstep' + (s.big ? ' big' : '')}>
            <div className="pnum">{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div className="ptitle">{s.title}{s.tag ? <span className="ptag">{s.tag}</span> : null}{s.big ? <span className="ptag">the big one</span> : null}</div>
              <div className="pwhy">{s.why}</div>
              <div className="vchip">✓ validated{s.touches ? ' · touches ' + s.touches : ''}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mono" style={{ fontSize: 11, color: C.lo, lineHeight: 1.55, marginTop: 2 }}>Milestone: your first retained client. Then we run the warm moves again, to three. This is the long ramp made concrete, and we adjust as the world responds.</div>
      <button className="cta" style={{ marginTop: 18 }} onClick={onStart}><span>Build your circle to begin</span><span className="mono">→</span></button>
    </>
  );
}
