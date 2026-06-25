// UNLINKED design fixture (mock 2): the AFTER-READ "add fuel to sharpen your read" panel.
// Route: /preview/sharpen. Public, lazy, no network, no auth.
// Carries the locked decisions:
//  - admire-screenshot feeds the THESIS / your edge (NOT the circle); business card feeds
//    the circle (warm reach); LinkedIn feeds fit + credibility. Three distinct intents.
//  - the "why do you admire them" capture is the point of the admire shot.
//  - the brand icon keeps charging as each fuel lands.
//  - honest handling of the messy cases (blurry, a person, a competitor, a different
//    field, a meme) instead of pretending the extraction always works.
import { useState } from 'react';
import { C, MONO } from '../pathroom/tokens';
import { thesisCss } from '../pathroom/thesisViews';

const sharpenCss = `
.thx .topnav { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:11px; padding:11px 18px; background:rgba(10,10,11,0.82); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-bottom:1px solid ${C.line}; }
.thx .ember { width:26px; height:26px; transition:filter .8s ease, opacity .8s ease; }
.thx .wm { height:15px; opacity:0.9; }
.thx .navspacer { flex:1; }
.thx .navhint { font-family:${MONO}; font-size:9px; letter-spacing:0.14em; text-transform:uppercase; color:${C.lo}; }
.thx .fuelcard { display:flex; gap:12px; align-items:flex-start; width:100%; text-align:left; background:${C.panel}; border:1px solid ${C.line2}; border-radius:11px; padding:14px; cursor:pointer; margin-top:10px; transition:border-color .2s ease; }
.thx .fuelcard:hover { border-color:${C.accentEdge}; }
.thx .fuelcard.done { border-color:rgba(127,185,150,0.4); cursor:default; }
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
`;

type Scenario = 'clear' | 'person' | 'competitor' | 'field' | 'blurry' | 'meme';
interface Extraction {
  ok: boolean;          // could we read a usable business/profile?
  name?: string;
  positioning?: string;
  kind?: 'business' | 'person' | 'competitor';
  note?: string;        // an honest caveat shown above the why-capture
  field?: string;       // for a different-field admire
  reject?: string;      // shown when we cannot use the image at all
}

const SCENARIOS: Record<Scenario, { label: string; ex: Extraction }> = {
  clear: {
    label: 'a business you admire',
    ex: { ok: true, kind: 'business', name: 'Lenny Rachitsky', positioning: 'a productized newsletter and community for product people, sold as a premium subscription rather than hourly work' },
  },
  person: {
    label: 'a person (no business)',
    ex: { ok: true, kind: 'person', name: 'this person', note: 'That reads as a person more than a business. Tell me what about them you want to emulate and I will aim it at your buyers.' },
  },
  competitor: {
    label: 'a direct competitor',
    ex: { ok: true, kind: 'competitor', name: 'a rival fractional CMO', positioning: 'almost the exact offer you described, to the same seed B2B SaaS buyers', note: 'Heads up: that looks like a direct competitor, not a model. I will treat it as a benchmark to beat, not a template to copy.' },
  },
  field: {
    label: 'a different field',
    ex: { ok: true, kind: 'business', name: 'a tasting-menu restaurant', field: 'food', positioning: 'one signature experience with a months-long waitlist and no à la carte', note: 'That is a different field. Pick the part that transfers to a fractional offer.' },
  },
  blurry: {
    label: 'a blurry shot',
    ex: { ok: false, reject: 'I could not read a profile in that clearly. Try a sharper screenshot, or just tell me in one line what they do.' },
  },
  meme: {
    label: 'a meme / junk',
    ex: { ok: false, reject: 'That does not look like a profile or a business. Want to try another shot?' },
  },
};

const WHY_CHIPS = ['Their positioning', 'Their offer shape', 'Their pricing model', 'Their audience', 'Their content', 'Something else'];

const BASE = 0.5; // thesis + background already in from the read
const F_LINKEDIN = 0.15;
const F_CARD = 0.12;
const F_ADMIRE = 0.18;

type AdmireStep = 'idle' | 'reading' | 'extracted' | 'why' | 'done' | 'reject';

export default function SharpenMock() {
  const [linkedinDone, setLinkedinDone] = useState(false);
  const [cards, setCards] = useState(0);
  const [admire, setAdmire] = useState<AdmireStep>('idle');
  const [scenario, setScenario] = useState<Scenario>('clear');
  const [why, setWhy] = useState('');
  const [edges, setEdges] = useState<{ name: string; why: string }[]>([]);
  const [fuelOpen, setFuelOpen] = useState(false);

  const f = Math.min(1, BASE + (linkedinDone ? F_LINKEDIN : 0) + (cards ? F_CARD : 0) + (edges.length ? F_ADMIRE : 0));
  const emberFilter = `brightness(${(0.4 + 0.6 * f).toFixed(2)}) saturate(${(0.15 + 0.95 * f).toFixed(2)}) drop-shadow(0 0 ${Math.round(f * 20)}px rgba(224,162,60,${(0.1 + 0.55 * f).toFixed(2)}))`;

  const ex = SCENARIOS[scenario].ex;

  function startAdmire(s: Scenario) {
    setScenario(s); setWhy(''); setAdmire('reading');
    setTimeout(() => setAdmire(SCENARIOS[s].ex.ok ? 'extracted' : 'reject'), 650);
  }
  function chooseWhy(w: string) {
    setWhy(w);
    setEdges((e) => [...e, { name: ex.name || 'them', why: w }]);
    setAdmire('done');
  }
  function resetAdmire() { setAdmire('idle'); setWhy(''); }

  const fuels = [
    { k: 'Thesis', on: true },
    { k: 'Background', on: true },
    { k: 'LinkedIn', on: linkedinDone },
    { k: 'Businesses you admire', on: edges.length > 0 },
    { k: 'Your circle', on: cards > 0 },
  ];

  return (
    <div className="thx thx-page" style={{ position: 'relative' }} data-admire={admire} data-scenario={scenario} data-fuel={f.toFixed(2)}>
      <style>{thesisCss + sharpenCss}</style>

      <div className="topnav">
        <button style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', lineHeight: 0 }} onClick={() => setFuelOpen((o) => !o)} aria-label="What's charging your read">
          <img src="/brand/fractionl-icon.png" alt="" className="ember" style={{ filter: emberFilter, opacity: (0.5 + 0.5 * f).toFixed(2) }} />
        </button>
        <img src="/brand/fractionl-wordmark.png" alt="Fractionl" className="wm" />
        <span className="navspacer" />
        <span className="navhint">the mark brightens as you add fuel</span>
      </div>

      {fuelOpen ? (
        <div style={{ position: 'absolute', top: 50, left: 14, width: 248, background: C.panel2, border: `1px solid ${C.line2}`, borderRadius: 12, padding: '14px 15px', zIndex: 9, boxShadow: '0 14px 50px rgba(0,0,0,0.55)' }}>
          <div className="navhint">What is charging your read</div>
          <div style={{ marginTop: 8 }}>
            {fuels.map((fl) => (
              <div key={fl.k} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', fontSize: 12.5, color: fl.on ? C.hi : C.lo }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: fl.on ? C.accent : C.line2 }} />
                <span style={{ flex: 1 }}>{fl.k}</span>
                <span className="navhint">{fl.on ? 'lit' : 'add'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="wrap">
        {/* test chips for the admire edge cases */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18, paddingBottom: 16, borderBottom: `1px dashed ${C.line2}` }}>
          <span className="navhint" style={{ alignSelf: 'center' }}>try an admire shot:</span>
          {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
            <button key={s} className="navhint" style={{ background: 'none', border: `1px solid ${C.line}`, borderRadius: 5, padding: '6px 9px', cursor: 'pointer' }} onClick={() => startAdmire(s)}>{SCENARIOS[s].label}</button>
          ))}
        </div>

        {/* compact read recap */}
        <div className="ovl">Your read</div>
        <div className="h" style={{ marginTop: 10, fontSize: 20 }}>A real opening, if you can reach the right founders fast.</div>
        <div className="sub">Your first read is in. The more we know about you, the sharper and more honest it gets. The mark up top shows how charged it is.</div>

        {edges.length ? (
          <div className="edgerow">
            <div className="navhint" style={{ color: C.accent }}>Your edge, sharpened</div>
            {edges.map((e, i) => (
              <div key={i} style={{ fontSize: 13, color: C.hi, marginTop: 6, lineHeight: 1.4 }}>You want {e.why.toLowerCase()} like {e.name}, aimed at your buyers.</div>
            ))}
          </div>
        ) : null}

        {/* the fuel panel, or the admire sub-flow when active */}
        {admire === 'idle' ? (
          <>
            <div className="ovl" style={{ marginTop: 22 }}>Sharpen your read</div>

            <button className="fuelcard" onClick={() => startAdmire('clear')}>
              <span className="fuelicon">◎</span>
              <span style={{ flex: 1 }}>
                <span className="fueltitle2">Screenshot a business you admire</span>
                <div className="fuelfor">A LinkedIn, an Instagram, or a site doing something you would love to build. We read what they do, then ask why, to sharpen what makes you different.</div>
                <span className="fueltag thesis">feeds your thesis</span>
              </span>
            </button>

            <button className={'fuelcard' + (cards ? ' done' : '')} onClick={() => setCards((c) => c + 1)}>
              <span className="fuelicon">▸</span>
              <span style={{ flex: 1 }}>
                <span className="fueltitle2">Snap a business card</span>
                <div className="fuelfor">A real person you know. We add them to your circle so warm reach gets real.</div>
                {cards ? <span className="donechk">✓ {cards} added to your circle</span> : <span className="fueltag circle">feeds your circle</span>}
              </span>
            </button>

            <button className={'fuelcard' + (linkedinDone ? ' done' : '')} onClick={() => setLinkedinDone(true)} disabled={linkedinDone}>
              <span className="fuelicon">in</span>
              <span style={{ flex: 1 }}>
                <span className="fueltitle2">Connect your LinkedIn</span>
                <div className="fuelfor">Your background, verified. Sharpens whether you can win it, not just whether it is winnable.</div>
                {linkedinDone ? <span className="donechk">✓ fit and credibility sharpened</span> : <span className="fueltag ability">feeds fit + credibility</span>}
              </span>
            </button>

            <div className="mono" style={{ fontSize: 10.5, color: C.lo, marginTop: 16, textAlign: 'center', lineHeight: 1.6 }}>When you are ready, re-run the read with what you have added.</div>
          </>
        ) : null}

        {/* admire sub-flow */}
        {admire === 'reading' ? (
          <div className="extracted">
            <div className="navhint">Reading the screenshot</div>
            <div style={{ fontSize: 14, color: C.mid, marginTop: 8 }}>Looking at what they do and how they position it...</div>
          </div>
        ) : null}

        {admire === 'reject' ? (
          <div className="extracted">
            <div className="navhint warn">Could not use that one</div>
            <div style={{ fontSize: 14, color: C.hi, marginTop: 8, lineHeight: 1.5 }}>{ex.reject}</div>
            <button className="backlink" onClick={resetAdmire}>↺ back to sharpen</button>
          </div>
        ) : null}

        {admire === 'extracted' ? (
          <div className="extracted">
            <div className="navhint" style={{ color: ex.kind === 'competitor' ? C.risk : C.accent }}>
              {ex.kind === 'competitor' ? 'A competitor, not a model' : ex.kind === 'person' ? 'A person' : ex.field ? 'A different field' : 'What they do'}
            </div>
            <div style={{ fontSize: 15, color: C.hi, marginTop: 8, fontWeight: 600 }}>{ex.name}</div>
            {ex.positioning ? <div style={{ fontSize: 13, color: C.mid, marginTop: 6, lineHeight: 1.45 }}>{ex.positioning}</div> : null}
            {ex.note ? <div style={{ fontSize: 12.5, color: ex.kind === 'competitor' ? C.risk : C.lo, marginTop: 10, lineHeight: 1.45 }}>{ex.note}</div> : null}
            <button className="cta" style={{ marginTop: 14 }} onClick={() => setAdmire('why')}><span>Why do you admire them?</span><span className="mono">→</span></button>
            <button className="backlink" onClick={resetAdmire}>not this one</button>
          </div>
        ) : null}

        {admire === 'why' ? (
          <div className="extracted">
            <div className="navhint">Why them</div>
            <div className="h" style={{ marginTop: 8, fontSize: 18 }}>What do you want to take from {ex.name}?</div>
            <div className="sub">{ex.field ? 'Pick the part that transfers to your offer.' : 'This sharpens your edge. It does not copy them.'}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {WHY_CHIPS.map((w) => <button key={w} className="whychip" onClick={() => chooseWhy(w)}>{w}</button>)}
            </div>
            <button className="backlink" onClick={resetAdmire}>cancel</button>
          </div>
        ) : null}

        {admire === 'done' ? (
          <div className="extracted">
            <div className="navhint" style={{ color: C.good }}>✓ Folded into your edge</div>
            <div style={{ fontSize: 14.5, color: C.hi, marginTop: 8, lineHeight: 1.5 }}>Got it. You want {why.toLowerCase()} like {ex.name}, aimed at your buyers. {ex.kind === 'competitor' ? 'And we will hold them as the bar to beat.' : ''}</div>
            <div className="mono" style={{ fontSize: 10.5, color: C.lo, marginTop: 12 }}>the mark just brightened. add more, or re-run the read.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="cta" onClick={resetAdmire}><span>Add more fuel</span><span className="mono">→</span></button>
              <button className="chip" style={{ justifyContent: 'center' }} onClick={resetAdmire}>Re-run the read</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
