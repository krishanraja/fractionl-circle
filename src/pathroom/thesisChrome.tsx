// Shared chrome for the thesis journey: the ember top nav (the brand mark IS the gauge,
// dim when we know little, brighter as real fuel goes in) plus the extra CSS the dialogue,
// the sharpen panel and the journey map all use. ThesisApp injects `chromeCss` once.
import { useState } from 'react';
import { C, MONO } from './tokens';

export interface FuelRow { k: string; on: boolean; hint?: string }

// fuel is 0..1; the brand icon's brightness, saturation and glow track it.
export function emberStyle(fuel: number): React.CSSProperties {
  const f = Math.max(0, Math.min(1, fuel));
  return {
    filter: `brightness(${(0.4 + 0.6 * f).toFixed(2)}) saturate(${(0.15 + 0.95 * f).toFixed(2)}) drop-shadow(0 0 ${Math.round(f * 18)}px rgba(224,162,60,${(0.1 + 0.55 * f).toFixed(2)}))`,
    opacity: 0.5 + 0.5 * f,
  };
}

export function EmberNav({ fuel, fuels, hint, onHome }: { fuel: number; fuels: FuelRow[]; hint?: string; onHome?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <div className="topnav">
        <button className="emberbtn" onClick={() => setOpen((o) => !o)} aria-label="What's charging your read">
          <img src="/brand/fractionl-icon.png" alt="" className="ember" style={emberStyle(fuel)} />
        </button>
        {onHome
          ? <button className="wmbtn" onClick={onHome} aria-label="Home"><img src="/brand/fractionl-wordmark.png" alt="Fractionl" className="wm" /></button>
          : <img src="/brand/fractionl-wordmark.png" alt="Fractionl" className="wm" />}
        <span style={{ flex: 1 }} />
        {onHome ? <button className="navhome" onClick={onHome}>home</button> : (hint ? <span className="navhint">{hint}</span> : null)}
      </div>
      {open ? (
        <div className="fuelpop">
          <div className="navhint">What is charging your read</div>
          <div style={{ marginTop: 8 }}>
            {fuels.map((fl) => (
              <div key={fl.k} className="fuelrow" style={{ color: fl.on ? C.hi : C.lo }}>
                <span className="fueldot" style={{ background: fl.on ? C.accent : C.line2 }} />
                <span style={{ flex: 1 }}>{fl.k}</span>
                <span className="navhint">{fl.on ? 'lit' : fl.hint || 'add'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// The brand's signature loading moment: a charging ember (glow pulse + a sweeping accent
// arc + the breathing mark). Replaces bare "loading..." everywhere. Renders inside .thx.
export function Loader({ label = 'charging your read' }: { label?: string }) {
  return (
    <div className="ldr">
      <div className="ldrorb">
        <div className="ldrglow" />
        <svg className="ldrring" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="33" stroke={C.line2} strokeWidth="2.5" />
          <circle cx="36" cy="36" r="33" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="52 156" style={{ filter: 'drop-shadow(0 0 4px rgba(224,162,60,0.85))' }} />
        </svg>
        <img src="/brand/fractionl-icon.png" alt="" className="ldricon" />
      </div>
      <div className="ldrlabel">{label}</div>
    </div>
  );
}

export const chromeCss = `
/* the charging-ember loader */
.thx .ldr { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:22px; height:100%; min-height:200px; }
.thx .ldrorb { position:relative; width:72px; height:72px; display:flex; align-items:center; justify-content:center; }
.thx .ldrglow { position:absolute; inset:-28%; border-radius:50%; background:radial-gradient(circle, rgba(224,162,60,0.3), transparent 65%); animation:ldrpulse 2.4s ease-in-out infinite; }
.thx .ldrring { position:absolute; inset:0; animation:ldrspin 1.5s cubic-bezier(.6,.1,.3,.9) infinite; }
.thx .ldricon { width:30px; height:30px; animation:ldrbreath 2.4s ease-in-out infinite; filter:drop-shadow(0 0 8px rgba(224,162,60,0.6)); }
.thx .ldrlabel { font-family:${MONO}; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:${C.lo}; animation:ldrfade 2.4s ease-in-out infinite; }
@keyframes ldrspin { to { transform:rotate(360deg); } }
@keyframes ldrpulse { 0%,100%{opacity:0.5; transform:scale(0.94)} 50%{opacity:1; transform:scale(1.06)} }
@keyframes ldrbreath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
@keyframes ldrfade { 0%,100%{opacity:0.45} 50%{opacity:0.85} }

/* Zero-scroll mobile frame: header + one focused body + a pinned action, locked to the
   visible viewport (--app-height from useAppFrame). The page itself never scrolls; only
   .thxbody may scroll internally, and it resets to the top on every screen change. */
.thx.thxframe { min-height:0; height:100vh; height:100dvh; height:var(--app-height,100dvh); display:flex; flex-direction:column; overflow:hidden; }
.thx .thxbody { flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; scrollbar-width:none; }
.thx .thxbody::-webkit-scrollbar { display:none; }
.thx .thxbody > .wrap { padding:16px 18px 16px; }
.thx .thxfoot { flex:0 0 auto; padding:10px 18px calc(12px + env(safe-area-inset-bottom)); border-top:1px solid ${C.line}; background:${C.bg}; }
.thx .thxfoot .cta { margin:0; }
.thx .foothint { font-family:${MONO}; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:${C.lo}; background:none; border:0; cursor:pointer; display:block; width:100%; text-align:center; padding:8px 0 2px; }
.thx .topnav { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:11px; padding:11px 18px; background:rgba(10,10,11,0.82); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-bottom:1px solid ${C.line}; }
.thx .emberbtn { background:none; border:0; padding:0; cursor:pointer; display:flex; align-items:center; line-height:0; }
.thx .ember { width:26px; height:26px; transition:filter .8s ease, opacity .8s ease; }
.thx .wm { height:15px; opacity:0.9; display:block; }
.thx .wmbtn { background:none; border:0; padding:0; cursor:pointer; line-height:0; }
.thx .navhome { background:none; border:1px solid ${C.line2}; border-radius:6px; padding:5px 10px; font-family:${MONO}; font-size:9px; letter-spacing:0.14em; text-transform:uppercase; color:${C.mid}; cursor:pointer; }
.thx .navhome:hover { color:${C.accent}; border-color:${C.accentEdge}; }
.thx .hometile { display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:${C.panel}; border:1px solid ${C.line2}; border-radius:11px; padding:14px; cursor:pointer; margin-top:10px; transition:border-color .2s ease, transform .12s ease; }
.thx .hometile:hover { border-color:${C.accentEdge}; }
.thx .hometile:active { transform:translateY(1px); }
.thx .htk { font-size:14.5px; font-weight:600; color:${C.hi}; }
.thx .htv { font-size:12.5px; color:${C.mid}; margin-top:3px; line-height:1.4; }
.thx .htarrow { color:${C.lo}; font-family:${MONO}; flex:0 0 auto; }
.thx .hticon { width:38px; height:38px; border-radius:10px; background:rgba(224,162,60,0.1); border:1px solid ${C.accentEdge}; display:flex; align-items:center; justify-content:center; color:${C.accent}; flex:0 0 auto; }
.thx .hometile.deepen { background:linear-gradient(180deg, rgba(224,162,60,0.1), ${C.panel}); border-color:${C.accentEdge}; }
/* the venture ember orb (charge) on the real command-center Home */
.thx .vorb { position:relative; width:118px; height:118px; display:flex; align-items:center; justify-content:center; margin:0 auto; }
.thx .vorbglow { position:absolute; inset:-26%; border-radius:50%; background:radial-gradient(circle, rgba(224,162,60,0.3), transparent 65%); filter:blur(6px); animation:vorbpulse 4.5s ease-in-out infinite; }
.thx .vorbsvg { position:absolute; inset:0; animation:vorbbreath 4.5s ease-in-out infinite; }
.thx .vorbcore { position:absolute; top:50%; left:50%; width:36px; height:36px; transform:translate(-50%,-50%); filter:drop-shadow(0 0 9px rgba(224,162,60,0.6)); }
.thx .vorbcap { text-align:center; font-family:${MONO}; font-size:9.5px; letter-spacing:0.12em; text-transform:uppercase; color:${C.mid}; margin-top:11px; }
@keyframes vorbbreath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
@keyframes vorbpulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
/* the live market-movement instrument (fed by Pulse) */
.thx .vmkt { background:linear-gradient(180deg, rgba(143,184,201,0.06), ${C.panel}); border:1px solid ${C.line2}; border-radius:12px; padding:12px 13px; }
.thx .vmkthead { display:flex; align-items:center; justify-content:space-between; }
.thx .vmkttitle { font-family:${MONO}; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:#8FB8C9; }
.thx .vmktrow { display:flex; align-items:center; gap:10px; margin-top:9px; }
.thx .vmktname { flex:1; font-size:13px; color:${C.hi}; }
.thx .vmktval { font-family:${MONO}; font-size:11.5px; color:${C.mid}; font-variant-numeric:tabular-nums; }
.thx .vdelta { font-family:${MONO}; font-size:10.5px; padding:2px 7px; border-radius:999px; font-variant-numeric:tabular-nums; flex:0 0 auto; }
.thx .vup { color:${C.good}; background:rgba(127,185,150,0.12); }
.thx .vdn { color:${C.risk}; background:rgba(204,119,119,0.12); }
.thx .vflat { color:${C.mid}; background:rgba(255,255,255,0.05); }
.thx .vmktchip { display:inline-block; margin-top:11px; font-size:11.5px; color:${C.hi}; background:rgba(224,162,60,0.1); border:1px solid ${C.accentEdge}; border-radius:999px; padding:5px 10px; }
.thx .navhint { font-family:${MONO}; font-size:9px; letter-spacing:0.14em; text-transform:uppercase; color:${C.lo}; }
.thx .fuelpop { position:absolute; top:50px; left:14px; width:248px; background:${C.panel2}; border:1px solid ${C.line2}; border-radius:12px; padding:14px 15px; z-index:9; box-shadow:0 14px 50px rgba(0,0,0,0.55); }
.thx .fuelrow { display:flex; align-items:center; gap:9px; padding:7px 0; font-size:12.5px; }
.thx .fueldot { width:7px; height:7px; border-radius:50%; flex:0 0 auto; }
/* guided dialogue */
.thx .tt { margin-bottom:13px; }
.thx .tyou { display:inline-block; font-size:13.5px; color:${C.hi}; background:${C.panel}; border:1px solid ${C.line2}; border-radius:9px 9px 9px 3px; padding:9px 12px; max-width:92%; }
.thx .tapp { font-size:13px; color:${C.mid}; line-height:1.5; padding:8px 2px 0; }
.thx .tyk { font-family:${MONO}; font-size:8.5px; letter-spacing:0.12em; text-transform:uppercase; color:${C.lo}; display:block; margin-bottom:4px; }
.thx .pickchip { display:block; width:100%; text-align:left; background:${C.panel}; border:1px solid ${C.line2}; border-radius:8px; padding:11px 13px; color:${C.hi}; font-size:13.5px; cursor:pointer; margin-top:8px; }
.thx .pickchip:hover { border-color:${C.accentEdge}; }
.thx .ghost { background:none; border:0; color:${C.lo}; font-family:${MONO}; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; margin-top:12px; display:block; }
.thx .twobtn { display:flex; gap:8px; margin-top:14px; }
/* sharpen / fuel cards */
.thx .fuelcard { display:flex; gap:12px; align-items:flex-start; width:100%; text-align:left; background:${C.panel}; border:1px solid ${C.line2}; border-radius:11px; padding:14px; cursor:pointer; margin-top:10px; transition:border-color .2s ease; }
.thx .fuelcard:hover { border-color:${C.accentEdge}; }
.thx .fuelcard.done { border-color:rgba(127,185,150,0.4); }
.thx .fuelcard:disabled { cursor:default; }
.thx .fuelicon { width:30px; height:30px; border-radius:8px; flex:0 0 auto; display:flex; align-items:center; justify-content:center; font-family:${MONO}; font-size:13px; border:1px solid ${C.line2}; color:${C.accent}; }
.thx .fueltitle2 { font-size:14.5px; font-weight:600; color:${C.hi}; }
.thx .fuelfor { font-size:12.5px; color:${C.mid}; line-height:1.4; margin-top:3px; }
.thx .fueltag { font-family:${MONO}; font-size:8.5px; letter-spacing:0.1em; text-transform:uppercase; color:${C.lo}; margin-top:7px; display:inline-block; }
.thx .fueltag.thesis { color:${C.accent}; }
.thx .fueltag.circle { color:#C9A24B; }
.thx .fueltag.ability { color:#8FB8C9; }
.thx .donechk { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.good}; margin-top:7px; display:inline-flex; gap:5px; }
.thx .extracted { background:${C.panel2}; border:1px solid ${C.line2}; border-radius:11px; padding:15px; margin-top:14px; }
.thx .whychip { display:inline-block; border:1px solid ${C.line2}; border-radius:999px; padding:8px 13px; font-size:13px; color:${C.hi}; cursor:pointer; background:${C.panel}; }
.thx .whychip:hover { border-color:${C.accentEdge}; color:${C.accent}; }
.thx .backlink { background:none; border:0; color:${C.lo}; font-family:${MONO}; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; margin-top:14px; }
.thx .edgerow { background:rgba(224,162,60,0.08); border:1px solid ${C.accentEdge}; border-radius:9px; padding:12px 13px; margin-top:14px; }
.thx .warn { color:${C.risk}; }
/* journey map */
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
.thx .jtag { font-family:${MONO}; font-size:8.5px; letter-spacing:0.1em; text-transform:uppercase; border-radius:3px; padding:1px 5px; margin-left:8px; color:${C.accent}; border:1px solid ${C.accentEdge}; }
.thx .jwhy { font-size:12.5px; color:${C.mid}; line-height:1.45; margin-top:5px; }
.thx .jval { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.good}; margin-top:8px; display:inline-flex; gap:5px; }
.thx .faces { display:flex; align-items:center; margin-top:10px; }
.thx .face { width:26px; height:26px; border-radius:50%; background:${C.panel3}; border:1.5px solid ${C.bg}; margin-right:-7px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; color:${C.accent}; font-family:${MONO}; }
.thx .facemore { font-family:${MONO}; font-size:10px; color:${C.lo}; margin-left:13px; }
.thx .litprompt { display:flex; align-items:center; gap:8px; margin-top:10px; padding:9px 11px; border:1px dashed ${C.line2}; border-radius:8px; background:${C.panel}; }
.thx .litdot { width:8px; height:8px; border-radius:50%; background:${C.line2}; flex:0 0 auto; }
.thx .secondary { background:none; border:0; color:${C.lo}; font-family:${MONO}; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; }
/* living + breathing motion, restrained for the quiet-instrument register */
@keyframes thxrise { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:none; } }
@keyframes thxfade { from { opacity:0; } to { opacity:1; } }
@keyframes emberbreath { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }
.thx .thxbody > .wrap { animation: thxrise .34s cubic-bezier(.2,.7,.2,1) both; }
.thx .ember { animation: emberbreath 4.5s ease-in-out infinite; will-change:transform; }
.thx .cta { transition: transform .12s ease, filter .12s ease; }
.thx .cta:active { transform: translateY(1px); filter: brightness(.95); }
.thx .rev { animation: thxfade .2s ease both; }
.thx .extracted { animation: thxrise .3s ease both; }
.thx .fuelcard, .thx .pickchip, .thx .whychip { transition: border-color .2s ease, transform .12s ease; }
.thx .fuelcard:active, .thx .pickchip:active { transform: translateY(1px); }
@media (prefers-reduced-motion: reduce) { .thx *, .thx *::before, .thx *::after { animation:none !important; } }
/* desktop baseline: every surface centers into a console instead of a narrow left column */
@media (min-width:900px) {
  .thx .topnav { padding-left:max(18px, calc((100% - 760px) / 2)); padding-right:max(18px, calc((100% - 760px) / 2)); }
  .thx .thxbody { display:flex; flex-direction:column; justify-content:center; }
  .thx .thxbody > .wrap { max-width:680px; width:100%; margin:0 auto; padding-top:24px; padding-bottom:24px; }
  .thx .thxbody > .wrap.wrapwide { max-width:920px; }
  .thx .thxfoot { padding-left:0; padding-right:0; }
  .thx .thxfoot .cta, .thx .thxfoot .foothint { max-width:680px; margin-left:auto; margin-right:auto; }
  /* command-center Home: two regions, orb hero beside the instruments */
  .thx .vhome { display:grid; grid-template-columns:0.85fr 1.15fr; gap:52px; align-items:center; }
  .thx .vhome .vorb { width:190px; height:190px; }
  .thx .vhome .vorbcore { width:56px; height:56px; }
  .thx .vhome .vorbcap { font-size:11px; margin-top:16px; }
}
`;
