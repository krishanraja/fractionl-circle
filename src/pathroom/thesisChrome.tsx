// Shared chrome for the thesis journey: the ember top nav (the brand mark IS the gauge,
// dim when we know little, brighter as real fuel goes in) plus the extra CSS the dialogue,
// the sharpen panel and the journey map all use. ThesisApp injects `chromeCss` once.
import { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Settings, Activity, ChevronLeft } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { applyTheme } from '@/lib/applyUserPreferences';
import { ProfileSettingsSheet } from '@/components/profile/ProfileSettingsSheet';
import { haptics } from '@/utils/haptics';
import PulseDrawer from './PulseDrawer';
import type { MarketPulse } from './thesisData';
import { C, MONO } from './tokens';

export interface FuelRow { k: string; on: boolean; hint?: string }

// fuel is 0..1; the brand icon's brightness, saturation and glow track it.
export function emberStyle(fuel: number): React.CSSProperties {
  const f = Math.max(0, Math.min(1, fuel));
  // The fuel-tracking brightness/saturation/opacity is the ember everywhere; the
  // orange drop-shadow halo, however, only belongs on the dark Walnut Desk. On the
  // cream Daylight Desk it smears, so the mark stays crisp (no glow term) and reads
  // its charge through brightness alone.
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const glow = dark ? ` drop-shadow(0 0 ${Math.round(f * 18)}px rgba(224,162,60,${(0.1 + 0.55 * f).toFixed(2)}))` : '';
  return {
    filter: `brightness(${(0.4 + 0.6 * f).toFixed(2)}) saturate(${(0.15 + 0.95 * f).toFixed(2)})${glow}`,
    opacity: 0.5 + 0.5 * f,
  };
}

export function EmberNav({ fuel, fuels, onHome, market, marketLoading, onStrengthen }: {
  fuel: number; fuels: FuelRow[]; hint?: string; onHome?: () => void;
  market?: MarketPulse | null; marketLoading?: boolean; onStrengthen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pulseOpen, setPulseOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { preferences, updatePreferences } = useUserProfile();
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  useEffect(() => { if (preferences?.theme) setIsDark(preferences.theme !== 'light'); }, [preferences?.theme]);

  const toggleTheme = () => {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    haptics.tap();
    applyTheme(next);
    setIsDark(next === 'dark');
    void updatePreferences({ theme: next });
  };

  // The always-visible pulse indicator shows the fractional-market core metric.
  const core = market?.market ?? null;

  // The ember mark IS the strength gauge, so it's the single door to strength:
  //   tap  → what's powering your plan (the fuel breakdown)
  //   hold → make it stronger (the coach question + the fuel cards)
  // One door, two gestures - no duplicate "strengthen" prompts scattered elsewhere.
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const startHold = () => {
    held.current = false;
    if (!onStrengthen) return;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      haptics.medium();
      setOpen(false);
      onStrengthen();
    }, 450);
  };
  const endHold = () => { if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; } };
  const onEmberClick = () => { if (held.current) { held.current = false; return; } setOpen((o) => !o); };

  return (
    <div style={{ position: 'relative' }}>
      <div className="topnav">
        <button
          className="emberbtn"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onClick={onEmberClick}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={onStrengthen ? "Your plan strength - tap for what's powering it, press and hold to make it stronger" : "What's powering your plan"}
        >
          <img src="/brand/fractionl-icon.png" alt="" className="ember" style={emberStyle(fuel)} />
        </button>
        {onHome
          ? <button className="navback" onClick={onHome} aria-label="Back to your plan"><ChevronLeft size={15} strokeWidth={2.4} /><span>Plan</span></button>
          : <img src="/brand/fractionl-wordmark.png" alt="Fractionl" className="wm" />}
        <span style={{ flex: 1 }} />
        <div className="navbtns">
          {onStrengthen ? (
            <button className={'navpulse' + (marketLoading && !core ? ' navpulse-loading' : '')} onClick={() => { haptics.tap(); setPulseOpen(true); }} aria-label={core ? `Market pulse - ${core.label} ${core.score}` : (marketLoading ? 'Reading the market' : 'Market pulse')}>
              <Activity size={13} strokeWidth={2.2} />
              {core ? (
                <>
                  <span className="navpulse-num">{core.score}</span>
                  {core.delta != null && core.delta !== 0 ? (
                    <span style={{ color: core.delta > 0 ? C.good : C.risk, fontFamily: MONO, fontSize: 10 }}>
                      {core.delta > 0 ? '▲' : '▼'}{Math.abs(core.delta)}
                    </span>
                  ) : null}
                </>
              ) : marketLoading ? (
                <span className="navpulse-dots"><span /><span /><span /></span>
              ) : null}
            </button>
          ) : null}
          <button className="navbtn" onClick={toggleTheme} aria-label={isDark ? 'Switch to light' : 'Switch to dark'}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="navbtn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <Settings size={16} />
          </button>
        </div>
      </div>
      {open ? (
        <div className="fuelpop">
          <div className="navhint">What's powering your plan</div>
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
      <PulseDrawer open={pulseOpen} onOpenChange={setPulseOpen} market={market ?? null} loading={!!marketLoading} />
      <ProfileSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

// The brand's signature loading moment: a charging ember (glow pulse + a sweeping accent
// arc + the breathing mark). Replaces bare "loading..." everywhere. Renders inside .thx.
export function Loader({ label = 'reading the market' }: { label?: string }) {
  return (
    <div className="ldr">
      <div className="ldrorb">
        <div className="ldrglow" />
        <svg className="ldrring" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="33" stroke={C.line2} strokeWidth="2.5" />
          <circle cx="36" cy="36" r="33" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="52 156" style={{ filter: 'var(--thx-glow-ring)' }} />
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
.thx .ldrglow { position:absolute; inset:-28%; border-radius:50%; background:radial-gradient(circle, var(--thx-glow-halo), transparent 65%); animation:ldrpulse 2.4s ease-in-out infinite; }
.thx .ldrring { position:absolute; inset:0; animation:ldrspin 1.5s cubic-bezier(.6,.1,.3,.9) infinite; }
.thx .ldricon { width:30px; height:30px; animation:ldrbreath 2.4s ease-in-out infinite; filter:var(--thx-glow-core); }
.thx .ldrlabel { font-family:${MONO}; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:${C.lo}; animation:ldrfade 2.4s ease-in-out infinite; }
@keyframes ldrspin { to { transform:rotate(360deg); } }
@keyframes ldrpulse { 0%,100%{opacity:0.5; transform:scale(0.94)} 50%{opacity:1; transform:scale(1.06)} }
@keyframes ldrbreath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
@keyframes ldrfade { 0%,100%{opacity:0.45} 50%{opacity:0.85} }

/* Zero-scroll mobile frame: header + one focused body + a pinned action, locked to the
   visible viewport (--app-height from useAppFrame). The page itself never scrolls; only
   .thxbody may scroll internally, and it resets to the top on every screen change. */
.thx.thxframe { min-height:0; height:100vh; height:var(--app-height,100vh); height:100dvh; display:flex; flex-direction:column; overflow:hidden; }
.thx .thxbody { flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; scrollbar-width:none; }
.thx .thxbody::-webkit-scrollbar { display:none; }
.thx .thxbody > .wrap { padding:24px 20px 20px; }
.thx .thxfoot { flex:0 0 auto; padding:14px 20px calc(16px + env(safe-area-inset-bottom)); border-top:1px solid ${C.line}; background:${C.bg}; }
.thx .thxfoot .cta { margin:0; }
.thx .foothint { font-family:${MONO}; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:${C.lo}; background:none; border:0; cursor:pointer; display:block; width:100%; text-align:center; padding:8px 0 2px; }
.thx .topnav { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:11px; padding:12px 20px; background:var(--thx-nav); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-bottom:1px solid ${C.line}; }
.thx .emberbtn { background:none; border:0; padding:0; cursor:pointer; display:flex; align-items:center; line-height:0; touch-action:manipulation; -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; }
.thx .ember { width:26px; height:26px; transition:filter .8s ease, opacity .8s ease; pointer-events:none; -webkit-user-drag:none; }
.thx .wm { height:15px; opacity:0.9; display:block; }
.thx .wmbtn { background:none; border:0; padding:0; cursor:pointer; line-height:0; }
/* explicit back-to-Plan control shown on deep screens (replaces the old hidden
   wordmark-is-home trick): an obvious labelled exit back to the venture home. */
.thx .navback { display:inline-flex; align-items:center; gap:3px; background:none; border:1px solid ${C.line2}; border-radius:8px; height:30px; padding:0 11px 0 7px; color:${C.mid}; font-family:${MONO}; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; cursor:pointer; transition:border-color .2s ease, color .2s ease; }
.thx .navback:hover { color:${C.accent}; border-color:${C.accentEdge}; }
.thx .navback:active { transform:translateY(1px); }
.thx .navhome { background:none; border:1px solid ${C.line2}; border-radius:6px; padding:5px 10px; font-family:${MONO}; font-size:9px; letter-spacing:0.14em; text-transform:uppercase; color:${C.mid}; cursor:pointer; }
.thx .navhome:hover { color:${C.accent}; border-color:${C.accentEdge}; }
/* Plan header control cluster: pulse indicator + theme + settings */
.thx .navbtns { display:flex; align-items:center; gap:8px; }
.thx .navbtn { background:none; border:1px solid ${C.line2}; border-radius:8px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:${C.mid}; cursor:pointer; transition:border-color .2s ease, color .2s ease; }
.thx .navbtn:hover { color:${C.accent}; border-color:${C.accentEdge}; }
.thx .navpulse { display:inline-flex; align-items:center; gap:5px; height:34px; padding:0 10px; border:1px solid ${C.line2}; border-radius:8px; background:none; color:${C.cool}; cursor:pointer; transition:border-color .2s ease; }
.thx .navpulse:hover { border-color:${C.accentEdge}; }
.thx .navpulse-num { font-family:${MONO}; font-size:12px; font-weight:600; color:${C.hi}; font-variant-numeric:tabular-nums; }
@media (max-width:360px) { .thx .topnav { gap:8px; } .thx .navpulse { padding:0 8px; } }
.thx .hometile { display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:${C.panel}; border:1px solid ${C.line2}; border-radius:11px; padding:13px; cursor:pointer; margin-top:9px; transition:border-color .2s ease, transform .12s ease; }
.thx .hometile:hover { border-color:${C.accentEdge}; }
.thx .hometile:active { transform:translateY(1px); }
.thx .htk { font-size:14.5px; font-weight:600; color:${C.hi}; }
.thx .htv { font-size:12.5px; color:${C.mid}; margin-top:3px; line-height:1.4; }
.thx .htarrow { color:${C.lo}; font-family:${MONO}; flex:0 0 auto; }
.thx .hticon { width:38px; height:38px; border-radius:10px; background:rgba(224,162,60,0.1); border:1px solid ${C.accentEdge}; display:flex; align-items:center; justify-content:center; color:${C.accent}; flex:0 0 auto; }
.thx .hometile.deepen { background:linear-gradient(180deg, rgba(224,162,60,0.1), ${C.panel}); border-color:${C.accentEdge}; }
/* the venture ember orb (charge) on the real command-center Home. Compact on mobile
   so the hero + the three action tiles + the pinned footer fit one no-scroll viewport;
   the desktop grid (min-width:900px) restores the larger orb. */
.thx .vorb { position:relative; width:clamp(76px, 19vh, 96px); height:clamp(76px, 19vh, 96px); display:flex; align-items:center; justify-content:center; margin:0 auto; }
.thx .vorbglow { position:absolute; inset:-26%; border-radius:50%; background:radial-gradient(circle, var(--thx-glow-halo), transparent 65%); filter:blur(var(--thx-glow-halo-blur)); animation:vorbpulse 4.5s ease-in-out infinite; }
.thx .vorbsvg { position:absolute; inset:0; animation:vorbbreath 4.5s ease-in-out infinite; }
.thx .vorbcore { position:absolute; top:50%; left:50%; width:30px; height:30px; transform:translate(-50%,-50%); filter:var(--thx-glow-core); }
.thx .vorbcap { text-align:center; font-family:${MONO}; font-size:9.5px; letter-spacing:0.12em; text-transform:uppercase; color:${C.mid}; margin-top:6px; }
/* mobile: a tighter gap before the instruments (reset on the desktop grid) */
.thx .vpanels { margin-top:10px; }
/* Mobile no-scroll home: fill the framed body and center the hero+tiles so the
   venture orb, the three action tiles and the pinned footer always fit one
   viewport without an internal scroll. The desktop grid (min-width:900px) below
   re-lays this into two regions, so these rules are effectively mobile-only. */
.thx .thxbody:has(.vhome) > .wrap { min-height:100%; display:flex; flex-direction:column; justify-content:center; padding-top:14px; padding-bottom:14px; }
@keyframes vorbbreath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
@keyframes vorbpulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
/* the live market-movement instrument (fed by Pulse) */
.thx .vmkt { background:linear-gradient(180deg, rgba(143,184,201,0.06), ${C.panel}); border:1px solid ${C.line2}; border-radius:12px; padding:12px 13px; }
.thx .vmkthead { display:flex; align-items:center; justify-content:space-between; }
.thx .vmkttitle { font-family:${MONO}; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:${C.cool}; }
.thx .vmktrow { display:flex; align-items:center; gap:10px; margin-top:9px; }
.thx .vmktname { flex:1; font-size:13px; color:${C.hi}; }
.thx .vmktval { font-family:${MONO}; font-size:11.5px; color:${C.mid}; font-variant-numeric:tabular-nums; }
.thx .vdelta { font-family:${MONO}; font-size:10.5px; padding:2px 7px; border-radius:999px; font-variant-numeric:tabular-nums; flex:0 0 auto; }
.thx .vup { color:${C.good}; background:rgba(127,185,150,0.12); }
.thx .vdn { color:${C.risk}; background:rgba(204,119,119,0.12); }
.thx .vflat { color:${C.mid}; background:rgba(255,255,255,0.05); }
.thx .vmktchip { display:inline-block; margin-top:11px; font-size:11.5px; color:${C.hi}; background:rgba(224,162,60,0.1); border:1px solid ${C.accentEdge}; border-radius:999px; padding:5px 10px; }
/* Pulse drawer: a fixed, full-height flex column that NEVER scrolls. The header,
   market card and role card are fixed; the rising-themes region flexes and clips;
   the "as of" line is pinned - so content can't force a scroll on any device. */
.thx .vpulsewrap { display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden; padding:16px 18px calc(14px + env(safe-area-inset-bottom)); }
.thx .vpulsehead { flex:0 0 auto; padding-right:44px; }
.thx .vpulsecard { background:linear-gradient(180deg, rgba(143,184,201,0.05), ${C.panel}); border:1px solid ${C.line2}; border-radius:12px; padding:11px 13px; }
.thx .vpulsecard-fixed { flex:0 0 auto; }
.thx .vpulsefoot { flex:0 0 auto; margin-top:10px; color:${C.lo}; }
/* segmented control - Market | Trends; each intent gets its own no-scroll screen */
.thx .vpseg { flex:0 0 auto; display:flex; gap:4px; margin-top:12px; padding:3px; background:${C.panel}; border:1px solid ${C.line2}; border-radius:10px; }
.thx .vpseg button { flex:1; padding:7px 0; border:0; border-radius:7px; background:none; cursor:pointer; font-family:${MONO}; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:${C.mid}; transition:background .2s ease, color .2s ease; }
.thx .vpseg button.on { background:${C.panel3}; color:${C.hi}; box-shadow:0 1px 2px rgba(0,0,0,0.25); }
/* the active view - the single flex region; never scrolls vertically */
.thx .vpview { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; overflow:hidden; margin-top:12px; animation:thxfade .22s ease both; }
/* trends - all cards stacked, sharing the view height equally, no scroll and no swipe */
.thx .vpstack { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:9px; }
.thx .vptcard { flex:1 1 0; min-height:0; display:flex; }
.thx .vptcardin { flex:1 1 auto; min-height:0; overflow:hidden; display:flex; flex-direction:column; justify-content:center; background:linear-gradient(180deg, rgba(143,184,201,0.05), ${C.panel}); border:1px solid ${C.line2}; border-radius:13px; padding:11px 13px; }
.thx .vptcardhead { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
.thx .vptcardtitle { flex:1 1 auto; min-width:0; font-size:15.5px; font-weight:600; color:${C.hi}; line-height:1.25; letter-spacing:-0.01em; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.thx .vptcardsum { font-size:12.5px; color:${C.mid}; line-height:1.4; margin-top:5px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
/* A. the plain market verdict hero + calm sentiment dot */
.thx .vpverdict { display:flex; gap:9px; align-items:flex-start; }
.thx .vpdot { width:9px; height:9px; border-radius:50%; flex:0 0 auto; margin-top:6px; box-shadow:0 0 0 3px rgba(255,255,255,0.04); }
.thx .vpverdicttext { font-size:15.5px; font-weight:600; color:${C.hi}; line-height:1.35; }
.thx .vpfollow { font-size:13px; color:${C.mid}; line-height:1.45; margin-top:7px; }
/* B. the plain role read */
.thx .vprole { font-size:14.5px; font-weight:600; color:${C.hi}; line-height:1.35; }
.thx .vpmeaning { font-size:12.5px; color:${C.mid}; line-height:1.45; margin-top:6px; }
/* trend badge + "your angle" (shared by the stacked trend card) */
.thx .vptrendbadge { flex:0 0 auto; margin-top:1px; font-family:${MONO}; font-size:8px; letter-spacing:0.08em; text-transform:uppercase; color:${C.cool}; border:1px solid ${C.line2}; border-radius:4px; padding:2px 5px; line-height:1; }
.thx .vptrendbadge.hot { color:${C.accent}; border-color:${C.accentEdge}; background:rgba(224,162,60,0.08); }
.thx .vptrendangle { flex:0 1 auto; min-height:0; margin-top:8px; background:rgba(224,162,60,0.08); border:1px solid ${C.accentEdge}; border-radius:9px; padding:7px 10px; overflow:hidden; }
.thx .vptrendanglec { font-size:12px; color:${C.hi}; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.thx .vptrendanglek { font-family:${MONO}; font-size:8.5px; letter-spacing:0.1em; text-transform:uppercase; color:${C.accent}; margin-right:6px; }
/* the metric rail: eye-catching value + colour-coded 30-day arrow down the left,
   the strategic read on the right - all vertically aligned. */
.thx .vpmetrics { flex:0 0 auto; margin-top:6px; }
.thx .vpmetric { display:flex; gap:14px; align-items:flex-start; padding:11px 0; border-top:1px solid ${C.line}; }
.thx .vpmetric:first-child { border-top:0; }
.thx .vpmval { flex:0 0 60px; display:flex; flex-direction:column; align-items:flex-start; }
.thx .vpmnum { font-family:${MONO}; font-size:25px; font-weight:600; color:${C.hi}; line-height:1; font-variant-numeric:tabular-nums; }
.thx .vpmarrow { font-family:${MONO}; font-size:11px; margin-top:6px; font-variant-numeric:tabular-nums; white-space:nowrap; }
.thx .vpmarrow.up { color:${C.good}; }
.thx .vpmarrow.dn { color:${C.risk}; }
.thx .vpmarrow.flat { color:${C.mid}; }
.thx .vpmtext { flex:1; min-width:0; padding-top:1px; }
.thx .vpmlabel { font-family:${MONO}; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:${C.cool}; }
.thx .vpminsight { font-size:12.5px; color:${C.mid}; line-height:1.4; margin-top:4px; }
/* Pulse loading: a heartbeat pulse-wave tracing across the market, over a shimmer
   skeleton in the exact shape of the metric rail so the content settles into place. */
.thx .vploading { flex:0 0 auto; }
.thx .vpwave { width:100%; height:34px; margin-top:12px; overflow:visible; }
.thx .vpwave path { fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
.thx .vpwave-base { stroke:${C.line2}; }
.thx .vpwave-run { stroke:${C.accent}; stroke-dasharray:26 520; filter:drop-shadow(0 0 5px ${C.accentDim}); animation:vpwaverun 1.8s linear infinite; }
@keyframes vpwaverun { from { stroke-dashoffset:546; } to { stroke-dashoffset:0; } }
.thx .vploadlabel { font-family:${MONO}; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:${C.lo}; margin-top:6px; animation:vploadfade 1.8s ease-in-out infinite; }
@keyframes vploadfade { 0%,100%{opacity:0.5} 50%{opacity:0.9} }
.thx .vpskel { display:block; background:linear-gradient(90deg, ${C.line2} 25%, ${C.line} 37%, ${C.line2} 63%); background-size:400% 100%; border-radius:5px; animation:spkshimmer 1.4s ease infinite; }
.thx .vpskel-num { width:38px; height:24px; }
.thx .vpskel-arr { width:30px; height:11px; margin-top:8px; border-radius:999px; }
.thx .vpskel-label { width:110px; height:8px; }
.thx .vpskel-line { width:100%; height:11px; margin-top:8px; }
.thx .vpskel-line.short { width:66%; }
/* the nav pulse pill while the market reads */
.thx .navpulse-loading { color:${C.accent}; border-color:${C.accentEdge}; }
.thx .navpulse-loading svg { animation:navpulsebeat 1.2s ease-in-out infinite; }
@keyframes navpulsebeat { 0%,100%{opacity:0.5; transform:scale(0.9)} 50%{opacity:1; transform:scale(1.12)} }
.thx .navpulse-dots { display:inline-flex; gap:3px; align-items:center; }
.thx .navpulse-dots span { width:4px; height:4px; border-radius:50%; background:${C.accent}; animation:navpulsedot 1s ease-in-out infinite; }
.thx .navpulse-dots span:nth-child(2) { animation-delay:.15s; }
.thx .navpulse-dots span:nth-child(3) { animation-delay:.3s; }
@keyframes navpulsedot { 0%,100%{opacity:0.3} 50%{opacity:1} }
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
/* compact one-line variant for the focused "Make it stronger" screen */
.thx .fuelrowc { display:flex; align-items:center; gap:11px; width:100%; text-align:left; background:${C.panel}; border:1px solid ${C.line2}; border-radius:10px; padding:10px 13px; cursor:pointer; margin-top:8px; transition:border-color .2s ease, transform .12s ease; }
.thx .fuelrowc:hover { border-color:${C.accentEdge}; }
.thx .fuelrowc:active { transform:translateY(1px); }
.thx .fuelrowc:disabled { cursor:default; opacity:0.85; }
.thx .fuelrowc.done { border-color:rgba(127,185,150,0.4); }
.thx .fuelrowc-t { flex:1; min-width:0; font-size:13.5px; font-weight:600; color:${C.hi}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.thx .fuelrowc .fueltag { margin-top:0; flex:0 0 auto; }
.thx .fuelrowc .donechk { margin-top:0; flex:0 0 auto; }
.thx .fuelrowc .htarrow { flex:0 0 auto; }
.thx .fuelicon { width:30px; height:30px; border-radius:8px; flex:0 0 auto; display:flex; align-items:center; justify-content:center; font-family:${MONO}; font-size:13px; border:1px solid ${C.line2}; color:${C.accent}; }
.thx .fueltitle2 { font-size:14.5px; font-weight:600; color:${C.hi}; }
.thx .fuelfor { font-size:12.5px; color:${C.mid}; line-height:1.4; margin-top:3px; }
.thx .fueltag { font-family:${MONO}; font-size:8.5px; letter-spacing:0.1em; text-transform:uppercase; color:${C.lo}; margin-top:7px; display:inline-block; }
.thx .fueltag.thesis { color:${C.accent}; }
.thx .fueltag.circle { color:${C.gold}; }
.thx .fueltag.ability { color:${C.cool}; }
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
/* title + badges wrap as a flex row so a long title plus two tags never collide
   or cram the tags onto a cramped second baseline. */
.thx .jtitle { display:flex; flex-wrap:wrap; align-items:center; gap:6px 7px; }
.thx .jtitletext { font-size:15px; font-weight:600; color:${C.hi}; line-height:1.3; }
.thx .jtag { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; line-height:1; white-space:nowrap; border-radius:4px; padding:3px 7px; color:${C.accent}; border:1px solid ${C.accentEdge}; }
.thx .jtag.big { background:${C.accent}; border-color:${C.accent}; color:#1A1206; }
.thx .jwhy { font-size:12.5px; color:${C.mid}; line-height:1.45; margin-top:5px; }
.thx .jval { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.good}; margin-top:8px; display:inline-flex; gap:5px; }
.thx .faces { display:flex; align-items:center; margin-top:10px; }
.thx .face { width:26px; height:26px; border-radius:50%; background:${C.panel3}; border:1.5px solid ${C.bg}; margin-right:-7px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; color:${C.accent}; font-family:${MONO}; }
.thx .facemore { font-family:${MONO}; font-size:10px; color:${C.lo}; margin-left:13px; }
.thx .litprompt { display:flex; align-items:center; gap:8px; margin-top:10px; padding:9px 11px; border:1px dashed ${C.line2}; border-radius:8px; background:${C.panel}; }
.thx .litdot { width:8px; height:8px; border-radius:50%; background:${C.line2}; flex:0 0 auto; }
/* reach-out (the warm step's action) */
.thx .rmuted { font-size:13px; color:${C.mid}; line-height:1.5; }
.thx .rperson { border:1px solid ${C.line}; border-radius:12px; padding:14px; background:${C.panel2}; transition:opacity .25s ease; }
.thx .rperson.done { opacity:0.6; }
.thx .rhead { display:flex; align-items:center; gap:10px; }
.thx .rface { width:34px; height:34px; border-radius:50%; flex:0 0 auto; background:${C.panel3}; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; color:${C.accent}; font-family:${MONO}; }
.thx .rname { font-size:15px; font-weight:600; color:${C.hi}; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.thx .rdone { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.good}; }
.thx .rsub { font-size:12.5px; color:${C.mid}; margin-top:1px; }
.thx .rband { font-family:${MONO}; font-size:8.5px; letter-spacing:0.08em; text-transform:uppercase; border:1px solid; border-radius:4px; padding:2px 6px; flex:0 0 auto; line-height:1; }
.thx .rwhy { font-size:12.5px; color:${C.accent}; line-height:1.45; margin-top:10px; }
.thx .rdraft { font-size:13px; color:${C.hi}; line-height:1.5; white-space:pre-wrap; background:${C.panel}; border:1px solid ${C.line}; border-radius:8px; padding:11px 12px; margin-top:8px; }
/* The editable draft: the same visual register as .rdraft, but a real textarea so
   the user makes it theirs BEFORE sending - every edit teaches the voice loop. */
.thx textarea.rdraft { width:100%; display:block; resize:none; font-family:${FONT}; min-height:0; }
.thx textarea.rdraft:focus { outline:none; border-color:${C.accentEdge}; }
.thx .redited { font-family:${MONO}; font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${C.accent}; margin-top:4px; }
.thx .ractions { display:flex; flex-wrap:wrap; gap:8px; margin-top:11px; }
.thx .rbtn { font-size:12.5px; font-weight:600; border-radius:7px; padding:9px 13px; cursor:pointer; border:1px solid ${C.line2}; background:${C.panel}; color:${C.hi}; }
.thx .rbtn.primary { background:${C.accent}; border-color:${C.accent}; color:#1A1206; }
.thx .rbtn.ghost { color:${C.mid}; }
/* proactive sharpen coach */
.thx .spk { border:1px solid ${C.accentEdge}; border-radius:12px; padding:14px; background:${C.panel2}; }
.thx .spk-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.thx .spk-tag { font-family:${MONO}; font-size:9.5px; letter-spacing:0.1em; text-transform:uppercase; color:${C.accent}; }
.thx .spk-ctrls { display:flex; gap:4px; }
.thx .spk-icon { width:24px; height:24px; border-radius:6px; border:1px solid ${C.line2}; background:${C.panel}; color:${C.mid}; cursor:pointer; font-size:13px; line-height:1; display:flex; align-items:center; justify-content:center; }
.thx .spk-icon:disabled { opacity:0.4; cursor:default; }
.thx .spk-q { font-size:15.5px; font-weight:600; color:${C.hi}; line-height:1.35; margin-top:10px; }
.thx .spk-why { font-size:12px; color:${C.mid}; line-height:1.45; margin-top:5px; }
.thx .spk-opts { display:flex; flex-direction:column; gap:7px; margin-top:12px; }
.thx .spk-opt { text-align:left; font-size:13.5px; color:${C.hi}; background:${C.panel}; border:1px solid ${C.line2}; border-radius:8px; padding:11px 12px; cursor:pointer; line-height:1.35; }
.thx .spk-opt:hover:not(:disabled) { border-color:${C.accent}; }
.thx .spk-opt:disabled { opacity:0.5; cursor:default; }
.thx .spk-skip { background:none; border:0; color:${C.lo}; font-family:${MONO}; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; padding:10px 0 2px; }
.thx .spk-typed { display:flex; gap:8px; margin-top:12px; }
.thx .spk-input { flex:1; }
.thx .spk-send { flex:0 0 auto; width:44px; border-radius:8px; border:0; background:${C.accent}; color:#1A1206; font-weight:700; cursor:pointer; }
.thx .spk-send:disabled { opacity:0.5; cursor:default; }
.thx .spk-done { display:flex; align-items:center; gap:9px; border:1px solid ${C.line}; border-radius:12px; padding:13px 14px; background:${C.panel}; font-size:13px; color:${C.mid}; line-height:1.45; }
.thx .spk-doneicon { color:${C.good}; font-weight:700; }
/* The "Make it stronger" centrepiece owns a stable slot: a reserved min-height so
   the skeleton, the loaded question and the resting state share one footprint and
   the quick-input rows below never get shoved as the AI question loads. */
.thx .spk-focus { min-height:360px; }
.thx .spk-focus.spk-rest { display:flex; align-items:center; justify-content:center; text-align:center; gap:9px; font-size:13.5px; color:${C.mid}; line-height:1.5; }
.thx .spk-skel { background:linear-gradient(90deg, ${C.line2} 25%, ${C.line} 37%, ${C.line2} 63%); background-size:400% 100%; border-radius:6px; animation:spkshimmer 1.4s ease infinite; }
.thx .spk-skel-q { height:18px; margin-top:12px; }
.thx .spk-skel-q.short { width:68%; margin-top:8px; }
.thx .spk-skel-opt { height:42px; border-radius:8px; }
.thx .spk-body { animation: thxfade .28s ease both; }
.thx .spk-skelnote { font-family:${MONO}; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:${C.lo}; margin-top:14px; }
@keyframes spkshimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }
/* strength score readout */
.thx .scorewrap { display:flex; align-items:baseline; gap:8px; }
.thx .scorenum { font-family:${MONO}; font-size:30px; font-weight:600; color:${C.hi}; font-variant-numeric:tabular-nums; line-height:1; }
.thx .scoremax { font-family:${MONO}; font-size:13px; color:${C.lo}; }
.thx .scorepend { font-family:${MONO}; font-size:11px; color:${C.accent}; }
.thx .scorehold { font-size:12px; color:${C.mid}; margin-top:4px; }
/* the single, visible door to strengthening - sits right under the score/weakness */
.thx .strengthencta { display:inline-flex; align-items:center; gap:6px; margin-top:10px; padding:9px 15px; border-radius:999px; border:1px solid ${C.accent}; background:${C.accent}; color:#1A1206; font-size:12.5px; font-weight:700; cursor:pointer; transition:filter .12s ease, transform .12s ease; }
.thx .strengthencta:hover { filter:brightness(1.05); }
.thx .strengthencta:active { transform:translateY(1px); }
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
  .thx .topnav { padding-left:max(20px, calc((100% - 760px) / 2)); padding-right:max(20px, calc((100% - 760px) / 2)); }
  .thx .thxbody { display:flex; flex-direction:column; justify-content:center; }
  .thx .thxbody > .wrap { max-width:680px; width:100%; margin:0 auto; padding-top:24px; padding-bottom:24px; }
  .thx .thxbody > .wrap.wrapwide { max-width:920px; }
  .thx .thxfoot { padding-left:0; padding-right:0; }
  .thx .thxfoot .cta, .thx .thxfoot .foothint { max-width:680px; margin-left:auto; margin-right:auto; }
  /* command-center Home: two regions, orb hero beside the instruments */
  .thx .vhome { display:grid; grid-template-columns:0.85fr 1.15fr; gap:52px; align-items:center; }
  .thx .vhome .vpanels { margin-top:0; }
  .thx .vhome .vorb { width:190px; height:190px; }
  .thx .vhome .vorbcore { width:56px; height:56px; }
  .thx .vhome .vorbcap { font-size:11px; margin-top:16px; }
}
`;
