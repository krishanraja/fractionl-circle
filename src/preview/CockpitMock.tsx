// UNLINKED design mock: the command-center Home (the "dashboard" reimagined).
// Route: /preview/cockpit. A living ember orb at the heart (charge, breathing, brightens as
// it grows), ringed by the venture's vitals (the two read verdicts) and a live MARKET
// MOVEMENT instrument fed by fractionl-pulse (role-level FWI + demand + a rising topic;
// real, daily-fresh, the "grew overnight" magic), with the one next move. Tasteful
// evolution of the quiet-instrument register: near-black + ember, plus depth, glow, motion.
// All values here are realistic fixtures mirroring the live Pulse API shapes.
import { C, MONO, FONT } from '../pathroom/tokens';
import { thesisCss } from '../pathroom/thesisViews';
import { chromeCss } from '../pathroom/thesisChrome';

const cockpitCss = `
.thx .ck { padding:14px 18px 16px; }
.thx .since { font-family:${MONO}; font-size:9px; letter-spacing:0.14em; text-transform:uppercase; color:${C.accent}; }
.thx .orbwrap { position:relative; display:flex; flex-direction:column; align-items:center; margin:6px 0 16px; }
.thx .orbglow { position:absolute; top:6px; width:170px; height:170px; border-radius:50%; background:radial-gradient(circle, rgba(224,162,60,0.32), rgba(224,162,60,0.06) 55%, transparent 70%); filter:blur(6px); animation:orbpulse 4.5s ease-in-out infinite; }
.thx .orbsvg { position:relative; z-index:1; animation:orbbreath 4.5s ease-in-out infinite; }
.thx .orbcore { position:absolute; top:50%; left:50%; width:46px; height:46px; transform:translate(-50%,-58%); z-index:2; filter:drop-shadow(0 0 10px rgba(224,162,60,0.6)); }
.thx .orbpct { position:absolute; top:50%; left:50%; transform:translate(-50%, 14px); z-index:2; font-family:${MONO}; font-size:12px; color:${C.hi}; font-variant-numeric:tabular-nums; }
.thx .orbcap { margin-top:12px; font-family:${MONO}; font-size:9.5px; letter-spacing:0.12em; text-transform:uppercase; color:${C.mid}; }
@keyframes orbbreath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.035)} }
@keyframes orbpulse { 0%,100%{opacity:0.7; transform:scale(1)} 50%{opacity:1; transform:scale(1.06)} }
.thx .vitals { display:flex; gap:10px; }
.thx .vital { flex:1; background:linear-gradient(180deg, ${C.panel2}, ${C.panel}); border:1px solid ${C.line2}; border-radius:12px; padding:12px; cursor:pointer; }
.thx .vital:active { transform:translateY(1px); }
.thx .vlabel { font-family:${MONO}; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:${C.lo}; }
.thx .vbars { display:flex; gap:4px; margin:9px 0 7px; }
.thx .vbar { flex:1; height:6px; border-radius:3px; background:${C.line2}; }
.thx .vword { font-size:13px; font-weight:600; color:${C.hi}; }
.thx .mkt { background:linear-gradient(180deg, rgba(143,184,201,0.06), ${C.panel}); border:1px solid ${C.line2}; border-radius:13px; padding:14px; margin-top:12px; }
.thx .mkthead { display:flex; align-items:center; justify-content:space-between; }
.thx .mkttitle { font-family:${MONO}; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:#8FB8C9; }
.thx .mktrow { display:flex; align-items:center; gap:8px; margin-top:11px; }
.thx .mktname { flex:1; font-size:13.5px; color:${C.hi}; }
.thx .mktval { font-family:${MONO}; font-size:12px; color:${C.mid}; font-variant-numeric:tabular-nums; }
.thx .delta { font-family:${MONO}; font-size:11px; padding:2px 7px; border-radius:999px; font-variant-numeric:tabular-nums; }
.thx .up { color:${C.good}; background:rgba(127,185,150,0.12); }
.thx .dn { color:${C.risk}; background:rgba(204,119,119,0.12); }
.thx .mktchip { display:inline-block; margin-top:12px; font-size:12px; color:${C.hi}; background:rgba(224,162,60,0.1); border:1px solid ${C.accentEdge}; border-radius:999px; padding:6px 11px; }
.thx .nextmove { display:flex; align-items:center; gap:11px; background:${C.panel}; border:1px solid ${C.line2}; border-radius:12px; padding:13px 14px; margin-top:12px; cursor:pointer; }
.thx .nextmove:active { transform:translateY(1px); }
.thx .nmk { font-family:${MONO}; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:${C.accent}; }
.thx .nmv { font-size:14px; font-weight:600; color:${C.hi}; margin-top:3px; }
`;

const BANDN: Record<string, number> = { weak: 1, mixed: 2, strong: 3, risk: 3 };
function Vital({ label, band, word }: { label: string; band: string; word: string }) {
  const n = BANDN[band] || 0;
  const color = band === 'risk' ? C.risk : C.accent;
  return (
    <button className="vital">
      <div className="vlabel">{label}</div>
      <div className="vbars">{[0, 1, 2, 3].map((i) => <span key={i} className="vbar" style={i < n ? { background: color, boxShadow: `0 0 8px ${color}88` } : undefined} />)}</div>
      <div className="vword">{word}{band === 'risk' ? <span style={{ color: C.risk, fontWeight: 400, fontSize: 11 }}> · risk</span> : null}</div>
    </button>
  );
}

export default function CockpitMock() {
  const charge = 0.62;
  const r = 52, circ = 2 * Math.PI * r, off = circ * (1 - charge);
  return (
    <div className="thx thxframe"><style>{thesisCss + chromeCss + cockpitCss}</style>
      <div className="topnav">
        <span style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 1 }}>
          <img src="/brand/fractionl-icon.png" alt="" style={{ width: 22, height: 22, filter: 'drop-shadow(0 0 8px rgba(224,162,60,0.5))' }} />
          <img src="/brand/fractionl-wordmark.png" alt="Fractionl" className="wm" />
        </span>
        <span className="since">since yesterday</span>
      </div>
      <div className="thxbody">
        <div className="ck">
          <div className="orbwrap">
            <div className="orbglow" />
            <svg className="orbsvg" width="150" height="150" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={r} fill="none" stroke={C.line2} strokeWidth="7" />
              <circle cx="60" cy="60" r={r} fill="none" stroke={C.accent} strokeWidth="7" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 60 60)"
                style={{ filter: 'drop-shadow(0 0 6px rgba(224,162,60,0.8))' }} />
            </svg>
            <img src="/brand/fractionl-icon.png" alt="" className="orbcore" />
            <div className="orbpct">62%</div>
            <div className="orbcap">your venture · brightening</div>
          </div>

          <div className="vitals">
            <Vital label="Is it real?" band="mixed" word="Mixed" />
            <Vital label="Can you win?" band="strong" word="Strong" />
          </div>

          <div className="mkt">
            <div className="mkthead">
              <span className="mkttitle">The market · this week</span>
              <span className="since" style={{ color: C.lo }}>via pulse</span>
            </div>
            <div className="mktrow">
              <span className="mktname">Fractional market</span>
              <span className="mktval">Cooling 42</span>
              <span className="delta dn">▼ 5.2</span>
            </div>
            <div className="mktrow">
              <span className="mktname">CMO demand</span>
              <span className="mktval">Stable 52</span>
              <span className="delta up">▲ 12% wk</span>
            </div>
            <div className="mktchip">Rising for you: AI inside the marketing function</div>
          </div>

          <button className="nextmove">
            <span style={{ flex: 1 }}>
              <span className="nmk">Your next move</span>
              <div className="nmv">Warm intro to Aisha Williams</div>
            </span>
            <span className="mono" style={{ color: C.accent, fontFamily: FONT }}>→</span>
          </button>
        </div>
      </div>
      <div className="thxfoot">
        <button className="cta"><span>Continue your path</span><span className="mono">→</span></button>
        <button className="foothint">read · path · circle · + new validation</button>
      </div>
    </div>
  );
}
