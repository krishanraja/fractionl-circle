// Ember-system chrome for the Circle surface, so it reads as the same app as the
// Deep dive tab. Provides `circleCss` (the .thx classes the circle components use)
// and BrandBar (the icon + wordmark lockup + theme toggle + settings entry).
import { useEffect, useState } from 'react';
import { Sun, Moon, Settings, UserPlus, Bell } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { applyTheme } from '@/lib/applyUserPreferences';
import { ProfileSettingsSheet } from '@/components/profile/ProfileSettingsSheet';
import { haptics } from '@/utils/haptics';
import { C, MONO } from './tokens';

interface BrandBarProps {
  /** Pins the app's most important action - dropping a contact - into the nav. */
  onDropContact?: () => void;
  /** Opens the warm-reach drawer (people going quiet + banked decisions). */
  onOpenWarmReach?: () => void;
  /** Badge count on the bell; 0 hides the badge (the bell itself still shows). */
  notifCount?: number;
}

// The branded top bar for the Circle tab. Mirrors EmberNav's lockup (icon +
// wordmark) and adds the pinned "Drop a contact" action, a warm-reach bell, a
// one-tap theme toggle + a settings entry (the new shell otherwise has no way to
// reach preferences).
export function BrandBar({ onDropContact, onOpenWarmReach, notifCount = 0 }: BrandBarProps = {}) {
  const { preferences, updatePreferences } = useUserProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  // The theme is applied asynchronously after the prefs load, so the initial DOM
  // read above can be stale. Re-sync the icon once preferences resolve.
  useEffect(() => {
    if (preferences?.theme) setIsDark(preferences.theme !== 'light');
  }, [preferences?.theme]);

  const toggleTheme = () => {
    // Read the ACTUAL current theme from the DOM rather than local state - state
    // could lag the async theme application, which made the first tap a no-op.
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    haptics.tap();
    applyTheme(next);          // instant flip
    setIsDark(next === 'dark');
    void updatePreferences({ theme: next }); // persist
  };

  return (
    <>
      <div className="topnav">
        <span className="emberbtn" aria-hidden>
          <img src="/brand/fractionl-icon.png" alt="" className="ember" style={{ opacity: 1 }} />
        </span>
        <img src="/brand/fractionl-wordmark.png" alt="Fractionl" className="wm" />
        <span style={{ flex: 1 }} />
        <div className="navbtns">
          {onDropContact && (
            <button className="navcta" onClick={() => { haptics.tap(); onDropContact(); }} aria-label="Drop a contact">
              <UserPlus size={15} strokeWidth={2.3} />
              <span className="navcta-label">Drop</span>
            </button>
          )}
          {onOpenWarmReach && (
            <button
              className="navbtn"
              style={{ position: 'relative' }}
              onClick={() => { haptics.tap(); onOpenWarmReach(); }}
              aria-label={notifCount > 0 ? `Warm reach - ${notifCount} waiting` : 'Warm reach'}
            >
              <Bell size={16} />
              {notifCount > 0 && <span className="navbadge">{notifCount > 9 ? '9+' : notifCount}</span>}
            </button>
          )}
          <button className="navbtn" onClick={toggleTheme} aria-label={isDark ? 'Switch to light' : 'Switch to dark'}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="navbtn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <Settings size={16} />
          </button>
        </div>
      </div>
      <ProfileSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

export const circleCss = `
/* Invariant: the locked shell is sized only by .app-frame (height = visible
   viewport). Pin min-height:0 so no inherited rule can ever force it taller than
   the viewport and push the bottom tab bar below the fold. Belt-and-suspenders
   now that .thx itself carries no sizing - kept as a guardrail against regressions. */
.thx.app-frame { min-height:0; }
/* bottom tab bar */
.thx .tabbar { flex:0 0 auto; display:flex; align-items:stretch; border-top:1px solid ${C.line}; background:${C.bg}; padding-bottom:max(env(safe-area-inset-bottom), 8px); }
.thx .tabbtn { position:relative; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:9px 0 7px; background:none; border:0; cursor:pointer; color:${C.lo}; transition:color .2s ease; }
.thx .tabbtn .tablabel { font-family:${MONO}; font-size:9px; letter-spacing:0.14em; text-transform:uppercase; }
.thx .tabbtn.on { color:${C.accent}; }
.thx .tablock { position:absolute; top:5px; left:50%; margin-left:6px; color:${C.lo}; }

/* top-bar control buttons */
.thx .navbtns { display:flex; align-items:center; gap:8px; }
.thx .navbtn { background:none; border:1px solid ${C.line2}; border-radius:8px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:${C.mid}; cursor:pointer; transition:border-color .2s ease, color .2s ease; }
.thx .navbtn:hover { color:${C.accent}; border-color:${C.accentEdge}; }

/* pinned primary action in the nav (Drop a contact) */
.thx .navcta { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 12px; border:0; border-radius:8px; background:${C.accent}; color:#1A1206; font-size:13px; font-weight:600; font-family:inherit; cursor:pointer; transition:filter .12s ease, transform .12s ease; }
.thx .navcta:hover { filter:brightness(0.96); }
.thx .navcta:active { transform:translateY(1px); }

/* warm-reach bell badge */
.thx .navbadge { position:absolute; top:-5px; right:-5px; min-width:16px; height:16px; padding:0 4px; border-radius:999px; background:${C.accent}; color:#1A1206; font-family:${MONO}; font-size:9px; font-weight:700; line-height:1; display:flex; align-items:center; justify-content:center; border:1.5px solid ${C.bg}; }

/* tight screens: collapse the Drop label to the icon so the lockup still fits */
@media (max-width: 384px) { .thx .navcta-label { display:none; } .thx .navcta { padding:0 9px; } }

/* the prominent primary action on the Circle hero (full-bleed .cta with an icon) */
.thx .cta .ctaicon { display:inline-flex; align-items:center; gap:8px; }

/* search field */
.thx .csearch { display:flex; align-items:center; gap:9px; background:${C.panel}; border:1px solid ${C.line2}; border-radius:9px; padding:0 12px; height:44px; }
.thx .csearch input { background:none; border:0; padding:0; height:100%; flex:1; color:${C.hi}; font-size:14.5px; font-family:inherit; }
.thx .csearch input::placeholder { color:${C.lo}; }

/* working-on input (single line + send) */
.thx .woin { display:flex; align-items:center; gap:9px; background:${C.panel}; border:1px solid ${C.line2}; border-radius:9px; padding:0 8px 0 12px; height:48px; }
.thx .woin input { background:none; border:0; padding:0; height:100%; flex:1; color:${C.hi}; font-size:14.5px; font-family:inherit; }
.thx .woin input::placeholder { color:${C.lo}; }
.thx .wosend { width:34px; height:34px; border-radius:7px; flex:0 0 auto; display:flex; align-items:center; justify-content:center; border:0; cursor:pointer; background:${C.accent}; color:#1A1206; }
.thx .wosend:disabled { background:${C.panel3}; color:${C.lo}; cursor:default; }
/* voice-note button inside the box */
.thx .womic { width:34px; height:34px; border-radius:7px; flex:0 0 auto; display:flex; align-items:center; justify-content:center; border:1px solid ${C.line2}; background:none; color:${C.mid}; cursor:pointer; transition:color .2s ease, border-color .2s ease; }
.thx .womic:hover { color:${C.accent}; border-color:${C.accentEdge}; }
.thx .womic:disabled { opacity:0.5; cursor:default; }
.thx .womic.rec { background:${C.accent}; color:#1A1206; border-color:${C.accent}; animation:thxpulse 1.3s ease-in-out infinite; }
@keyframes thxpulse { 0%,100% { box-shadow:0 0 0 0 rgba(224,162,60,0.5); } 50% { box-shadow:0 0 0 5px rgba(224,162,60,0); } }
/* provenance line on a people-search result */
.thx .cmatch { font-family:${MONO}; font-size:9.5px; letter-spacing:0.04em; color:${C.lo}; margin-top:6px; display:flex; align-items:center; gap:5px; }

/* contact / result rows */
.thx .crow { background:${C.panel}; border:1px solid ${C.line2}; border-radius:11px; overflow:hidden; margin-top:8px; }
.thx .crowbtn { display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:none; border:0; padding:12px 14px; cursor:pointer; }
.thx .cav { width:38px; height:38px; border-radius:50%; flex:0 0 auto; display:flex; align-items:center; justify-content:center; font-family:${MONO}; font-size:12.5px; font-weight:600; color:${C.accent}; background:${C.accentDim}; border:1px solid ${C.accentEdge}; }
.thx .cmeta { flex:1; min-width:0; }
/* Names and titles show in full - they wrap, they never truncate with an ellipsis. */
.thx .cname { font-size:14.5px; font-weight:600; color:${C.hi}; line-height:1.3; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.thx .csub { font-size:12.5px; color:${C.mid}; margin-top:2px; line-height:1.35; }
.thx .cwhy { font-size:12.5px; color:${C.mid}; line-height:1.45; margin-top:5px; }
.thx .cchev { color:${C.lo}; flex:0 0 auto; transition:transform .2s ease; }
.thx .cchev.open { transform:rotate(180deg); }
.thx .cbody { padding:2px 14px 14px; display:flex; flex-direction:column; gap:10px; }

/* tags (display) */
.thx .tagrow { display:flex; flex-wrap:wrap; gap:6px; }
.thx .tag { font-family:${MONO}; font-size:9px; letter-spacing:0.06em; text-transform:uppercase; padding:3px 8px; border-radius:999px; border:1px solid ${C.line2}; color:${C.mid}; }
.thx .tag.met { color:${C.accent}; border-color:${C.accentEdge}; }
.thx .tag.brings { color:${C.good}; border-color:rgba(127,185,150,0.4); }
.thx .tag.work { color:${C.cool}; border-color:rgba(143,184,201,0.4); }

/* selectable chips (tag picker) */
.thx .pchip { font-size:12px; padding:6px 11px; border-radius:999px; border:1px solid ${C.line2}; background:${C.panel}; color:${C.mid}; cursor:pointer; display:inline-flex; align-items:center; gap:5px; transition:border-color .15s ease; }
.thx .pchip:hover { border-color:${C.accentEdge}; }
.thx .pchip.sel { background:${C.accent}; border-color:${C.accent}; color:#1A1206; font-weight:600; }
.thx .pchip.sug { border-color:${C.accentEdge}; color:${C.accent}; }

/* role badge (working-on results) */
.thx .rolebadge { font-family:${MONO}; font-size:8.5px; letter-spacing:0.1em; text-transform:uppercase; padding:2px 7px; border-radius:999px; color:${C.accent}; border:1px solid ${C.accentEdge}; flex:0 0 auto; }
.thx .rolebadge.risk { color:${C.risk}; border-color:rgba(204,119,119,0.4); }
.thx .rolebadge.inferred { color:${C.cool}; border-color:rgba(143,184,201,0.4); }

/* secondary / ghost button (enrich, retry, none-of-these) */
.thx .ghostbtn { display:inline-flex; align-items:center; gap:6px; background:none; border:1px solid ${C.line2}; border-radius:8px; padding:7px 12px; font-family:${MONO}; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:${C.mid}; cursor:pointer; transition:border-color .2s ease, color .2s ease; }
.thx .ghostbtn:hover { color:${C.accent}; border-color:${C.accentEdge}; }
.thx .ghostbtn:disabled { opacity:0.5; cursor:default; }

/* contact split-button (primary reach) */
.thx .reachbtn { display:inline-flex; align-items:center; gap:6px; background:${C.accentDim}; border:1px solid ${C.accentEdge}; border-radius:8px; padding:7px 12px; font-size:12.5px; font-weight:600; color:${C.accent}; cursor:pointer; }

/* add-sheet container + mode grid */
.thx .sheetwrap { padding:8px 18px calc(20px + env(safe-area-inset-bottom)); background:${C.bg}; }
.thx .modegrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.thx .modetile { display:flex; flex-direction:column; gap:8px; align-items:flex-start; text-align:left; background:${C.panel}; border:1px solid ${C.line2}; border-radius:11px; padding:13px; min-height:106px; cursor:pointer; transition:border-color .2s ease; }
.thx .modetile:hover { border-color:${C.accentEdge}; }
.thx .modetile.on { border-color:${C.accentEdge}; background:${C.accentDim}; }
.thx .modeicon { width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; color:${C.accent}; background:${C.accentDim}; border:1px solid ${C.accentEdge}; }
.thx .modetitle { font-size:13.5px; font-weight:600; color:${C.hi}; }
.thx .modehint { font-size:11.5px; color:${C.mid}; line-height:1.35; }

/* editable field card (confirm) */
.thx .fieldcard { background:${C.panel}; border:1px solid ${C.line2}; border-radius:11px; overflow:hidden; }
.thx .fieldrow { display:flex; align-items:center; gap:12px; padding:11px 14px; border-top:1px solid ${C.line}; }
.thx .fieldrow:first-child { border-top:0; }
.thx .fieldlabel { width:80px; flex:0 0 auto; font-family:${MONO}; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:${C.lo}; }
.thx .fieldrow input { background:none; border:0; padding:0; height:auto; flex:1; font-size:14.5px; }

/* misc */
.thx .clabel { font-family:${MONO}; font-size:9px; letter-spacing:0.12em; text-transform:uppercase; color:${C.lo}; margin-bottom:7px; }
.thx .cerr { color:${C.risk}; font-size:12px; }
.thx .emptywrap { display:flex; flex-direction:column; align-items:center; text-align:center; padding:40px 16px; }
`;
