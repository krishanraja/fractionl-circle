// UNLINKED design mock: the command-center Home. Route: /preview/cockpit.
// A living ember orb at the heart (charge, breathing), ringed by the venture's vitals (the
// two read verdicts) and a live MARKET MOVEMENT instrument fed by fractionl-pulse, with the
// one next move. Tasteful evolution of the quiet-instrument register: near-black + ember,
// plus depth, glow, motion. Equally stunning on desktop (a centered two-region console).
// All values are realistic fixtures mirroring the live Pulse API shapes.
import { C, MONO, FONT } from '../pathroom/tokens';
import { thesisCss } from '../pathroom/thesisViews';
import { chromeCss } from '../pathroom/thesisChrome';

const cockpitCss = `
.thx .ck { padding:14px 18px 16px; }
.thx .since { font-family:${MONO}; font-size:9px; letter-spacing:0.14em; text-transform:uppercase; color:${C.accent}; }
.thx .ckhero { display:flex; flex-direction:column; align-items:center; }
/* the orb: a fixed square so the core + percent center on the RING, not the column */
.thx .orb { position:relative; width:150px; height:150px; display:flex; align-items:center; justify-content:center; margin:6px 0; }
.thx .orbglow { position:absolute; top:50%; left:50%; width:180px; height:180px; transform:translate(-50%,-50%); border-radius:50%; background:radial-gradient(circle, rgba(224,162,60,0.30), rgba(224,162,60,0.06) 55%, transparent 70%); filter:blur(6px); animation:orbpulse 4.5s ease-in-out infinite; }
.thx .orbsvg { position:absolute; top:0; left:0; width:100%; height:100%; animation:orbbreath 4.5s ease-in-out infinite; }
.thx .orbcore { position:absolute; top:50%; left:50%; width:44px; height:44px; transform:translate(-50%,-50%); filter:drop-shadow(0 0 10px rgba(224,162,60,0.6)); }
.thx .orbpct { position:absolute; top:50%; left:50%; transform:translate(-50%, 24px); font-family:${MONO}; font-size:12px; color:${C.hi}; font-variant-numeric:tabular-nums; }
.thx .orbcap { text-align:center; font-family:${MONO}; font-size:9.5px; letter-spacing:0.12em; text-transform:uppercase; color:${C.mid}; }
@keyframes orbbreath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.035)} }
@keyframes orbpulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
.thx .vitals { display:flex; gap:10px; }
.thx .vital { flex:1; text-align:left; background:linear-gradient(180deg, ${C.panel2}, ${C.panel}); border:1px solid ${C.line2}; border-radius:12px; padding:12px; cursor:pointer; }
.thx .vital:active { transform:translateY(1px); }
.thx .vlabel { font-family:${MONO}; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:${C.lo}; }
.thx .vbars { display:flex; gap:4px; margin:9px 0 7px; }
.thx .vbar { flex:1; height:6px; border-radius:3px; background:${C.line2}; }
.thx .vword { font-size:13px; font-weight:600; color:${C.hi}; }
.thx .mkt { background:linear-gradient(180deg, rgba(143,184,201,0.06), ${C.panel}); border:1px solid ${C.line2}; border-radius:13px; padding:14px; margin-top:12px; }
.thx .mkthead { display:flex; align-items:center; justify-content:space-between; }
.thx .mkttitle { font-family:${MONO}; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:#8FB8C9; }
.thx .mktrow { display:flex; align-items:center; gap:10px; margin-top:11px; }
.thx .mktname { flex:1; font-size:13.5px; color:${C.hi}; }
.thx .mktval { font-family:${MONO}; font-size:12px; color:${C.mid}; font-variant-numeric:tabular-nums; width:84px; text-align:right; }
.thx .delta { font-family:${MONO}; font-size:11px; padding:2px 0; border-radius:999px; font-variant-numeric:tabular-nums; width:64px; text-align:center; flex:0 0 auto; }
.thx .up { color:${C.good}; background:rgba(127,185,150,0.12); }
.thx .dn { color:${C.risk}; background:rgba(204,119,119,0.12); }
.thx .mktchip { display:inline-block; margin-top:12px; font-size:12px; color:${C.hi}; background:rgba(224,162,60,0.1); border:1px solid ${C.accentEdge}; border-radius:999px; padding:6px 11px; }
.thx .nextmove { display:flex; align-items:center; gap:11px; width:100%; text-align:left; background:${C.panel}; border:1px solid ${C.line2}; border-radius:12px; padding:13px 14px; margin-top:12px; cursor:pointer; }
.thx .nextmove:active { transform:translateY(1px); }
.thx .nmk { font-family:${MONO}; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:${C.accent}; }
.thx .nmv { font-size:14px; font-weight:600; color:${C.hi}; margin-top:3px; }

/* desktop-native: a centered two-region console, larger orb, equally stunning */
@media (min-width:900px) {
  .thx .ck { display:flex; align-items:center; justify-content:center; min-height:100%; padding:32px; }
  .thx .ckgrid { display:grid; grid-template-columns:0.9fr 1.1fr; gap:56px; align-items:center; max-width:940px; width:100%; }
  .thx .ckhero .orb { width:260px; height:260px; margin:0; }
  .thx .ckhero .orbglow { width:320px; height:320px; }
  .thx .ckhero .orbcore { width:78px; height:78px; }
  .thx .ckhero .orbpct { transform:translate(-50%, 44px); font-size:15px; }
  .thx .ckhero .orbcap { font-size:11px; margin-top:18px; }
  .thx .ckpanels { min-width:0; }
  .thx .ckpanels .vitals { margin-bottom:14px; }
}
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
          <div className="ckgrid">
            <div className="ckhero">
              <div className="orb">
                <div className="orbglow" />
                <svg className="orbsvg" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={r} fill="none" stroke={C.line2} strokeWidth="7" />
                  <circle cx="60" cy="60" r={r} fill="none" stroke={C.accent} strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 60 60)"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(224,162,60,0.8))' }} />
                </svg>
                <img src="/brand/fractionl-icon.png" alt="" className="orbcore" />
                <div className="orbpct">62%</div>
              </div>
              <div className="orbcap">your venture · brightening</div>
            </div>

            <div className="ckpanels">
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
                  <span className="delta up">▲ 12%</span>
                </div>
                <div className="mktchip">Rising for you: AI inside the marketing function</div>
              </div>

              <button className="nextmove">
                <span style={{ flex: 1 }}>
                  <span className="nmk">Your next move</span>
                  <div className="nmv">Warm intro to Aisha Williams</div>
                </span>
                <span style={{ color: C.accent, fontFamily: FONT }}>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="thxfoot">
        <button className="cta"><span>Continue your path</span><span className="mono">→</span></button>
        <button className="foothint">read · path · circle · + new validation</button>
      </div>
    </div>
  );
}
