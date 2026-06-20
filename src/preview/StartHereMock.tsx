// UNLINKED design fixture for the new Start Here guided dialogue (mock 1).
// Route: /preview/start (public, lazy-loaded, not in the nav, not the real app).
// Purpose: let the founder click every branch of the gated, one-question-at-a-time
// capture and react to the copy before any real wiring. No network, no auth.
// Locked decisions encoded here:
//  - soft block: 2 rounds of pushback, then run-it-anyway honestly (ember stays dim)
//  - guided, one question at a time (not a chat thread)
//  - the brand icon IS the gauge: dim/ashen at start, warms + glows as fuel goes in
//  - optional fuels (LinkedIn, business card, a business you admire) come AFTER the read
import { useState } from 'react';
import { C, MONO } from '../pathroom/tokens';
import { thesisCss } from '../pathroom/thesisViews';

const startCss = `
.thx .topnav { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:11px; padding:11px 18px; background:rgba(10,10,11,0.82); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-bottom:1px solid ${C.line}; }
.thx .emberbtn { background:none; border:0; padding:0; cursor:pointer; display:flex; align-items:center; line-height:0; }
.thx .ember { width:26px; height:26px; transition:filter .7s ease, opacity .7s ease; }
.thx .wm { height:15px; opacity:0.9; }
.thx .navspacer { flex:1; }
.thx .navhint { font-family:${MONO}; font-size:9px; letter-spacing:0.14em; text-transform:uppercase; color:${C.lo}; }
.thx .fuelpop { position:absolute; top:50px; left:14px; width:248px; background:${C.panel2}; border:1px solid ${C.line2}; border-radius:12px; padding:14px 15px; z-index:9; box-shadow:0 14px 50px rgba(0,0,0,0.55); }
.thx .fueltitle { font-family:${MONO}; font-size:9px; letter-spacing:0.14em; text-transform:uppercase; color:${C.lo}; }
.thx .fuelrow { display:flex; align-items:center; gap:9px; padding:7px 0; font-size:12.5px; }
.thx .fueldot { width:7px; height:7px; border-radius:50%; flex:0 0 auto; }
.thx .fuelnote { font-size:11px; color:${C.lo}; line-height:1.45; margin-top:8px; border-top:1px solid ${C.line}; padding-top:9px; }
.thx .tt { margin-bottom:13px; }
.thx .tyou { display:inline-block; font-size:13.5px; color:${C.hi}; background:${C.panel}; border:1px solid ${C.line2}; border-radius:9px 9px 9px 3px; padding:9px 12px; max-width:92%; }
.thx .tapp { font-size:13px; color:${C.mid}; line-height:1.5; padding:8px 2px 0; }
.thx .tyk { font-family:${MONO}; font-size:8.5px; letter-spacing:0.12em; text-transform:uppercase; color:${C.lo}; display:block; margin-bottom:4px; }
.thx .testbar { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:18px; padding-bottom:16px; border-bottom:1px dashed ${C.line2}; }
.thx .testchip { font-family:${MONO}; font-size:9px; letter-spacing:0.06em; text-transform:uppercase; color:${C.lo}; background:none; border:1px solid ${C.line}; border-radius:5px; padding:6px 9px; cursor:pointer; }
.thx .testchip:hover { color:${C.accent}; border-color:${C.accentEdge}; }
.thx .ghost { background:none; border:0; color:${C.lo}; font-family:${MONO}; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; margin-top:12px; display:block; }
.thx .pickchip { display:block; width:100%; text-align:left; background:${C.panel}; border:1px solid ${C.line2}; border-radius:8px; padding:11px 13px; color:${C.hi}; font-size:13.5px; cursor:pointer; margin-top:8px; }
.thx .pickchip:hover { border-color:${C.accentEdge}; }
.thx .twobtn { display:flex; gap:8px; margin-top:14px; }
`;

type Step = 'offer' | 'discover' | 'confirm' | 'background' | 'ready' | 'ran';
type Role = 'app' | 'you';
interface Turn { role: Role; text: string; kicker?: string }

// --- mock sufficiency judge (deterministic; the real one will be a cheap LLM pass) ---
type JudgeKind = 'strong' | 'thin' | 'question' | 'multiple' | 'essay';
const ROLE_WORDS = ['cmo', 'cfo', 'coo', 'cto', 'cpo', 'chief', 'fractional', 'head of', 'vp ', 'marketing', 'finance', 'operations', 'product', 'growth', 'sales', 'design', 'people ', 'revenue', 'brand', 'content', 'data', 'rev ops', 'revops', 'coach', 'advisor'];
// Explicit role TITLES only. Used to detect "several offers in one" so common prose words
// (revenue, growth, sales) inside a single thesis do not split it into false multiples.
const MULTIPLE_ROLES = ['cmo', 'cfo', 'coo', 'cto', 'cpo', 'cro', 'cgo', 'chief ', 'fractional ', 'head of', 'vp of', 'vp ', 'interim '];
const AUDIENCE_WORDS = ['founder', 'startup', 'start-up', 'b2b', 'b2c', 'saas', 'seed', 'series', 'pre-seed', 'dtc', 'd2c', 'ecommerce', 'e-commerce', 'smb', 'enterprise', 'agency', 'agencies', 'scaleup', 'scale-up', 'fintech', 'healthtech', 'climate', 'marketplace', 'company', 'companies', 'team', 'teams'];

function judge(t: string): { kind: JudgeKind; options?: string[]; distilled?: string } {
  const raw = t.trim();
  const s = raw.toLowerCase();
  if (/\?\s*$/.test(raw) || /^(what should|what could|i (don'?t|do not) know|not sure|help me|no idea|i'?m not sure|where do i)/.test(s)) {
    return { kind: 'question' };
  }
  // A long input is an essay to distil, not a list to split (check length first so prose
  // that happens to contain role words is not mistaken for multiple offers).
  if (raw.length > 260) return { kind: 'essay', distilled: distil(raw) };
  // Multiple distinct offers: split on connectors, then require >=2 segments that each
  // carry an explicit role TITLE (so "Fractional CMO ... and need strategy", or a "$1M and
  // $5M revenue" range, is NOT mistaken for two offers).
  const segs = raw.split(/,| and | & | or |\/| plus | as well as /i).map((x) => x.trim()).filter((x) => x.length > 2);
  const roleSegs = segs.filter((seg) => { const ls = seg.toLowerCase(); return MULTIPLE_ROLES.some((w) => ls.includes(w)); });
  if (roleSegs.length >= 2) return { kind: 'multiple', options: roleSegs.slice(0, 4) };
  const roleHits = ROLE_WORDS.filter((w) => s.includes(w));
  const hasWhat = roleHits.length >= 1 || /(service|consult|advisor|coach|help|support|strateg|lead|manage)/.test(s);
  const audienceHits = AUDIENCE_WORDS.filter((w) => s.includes(w)).length;
  const hasWho = audienceHits >= 1;
  const wedge = /(who (hired|need|are|have|can'?t|cannot|struggle|want|keep)|instead of|not a full|rather than|because|so they|too (senior|early|expensive|big|small)|without|but can'?t afford|pre-revenue|post-raise|just raised|stuck (at|between)|between \$)/.test(s);
  const wordy = raw.split(/\s+/).length >= 10;
  const specificWho = audienceHits >= 2; // a qualified audience (e.g. "seed fintech startups") is itself a strong signal
  if (hasWhat && hasWho && (wedge || specificWho || wordy)) return { kind: 'strong' };
  return { kind: 'thin' };
}

function distil(t: string): string {
  const first = t.split(/[.\n]/)[0].trim();
  return first.length > 90 ? first.slice(0, 88).trim() + '...' : first;
}

// The scenario chips FORCE their branch (a demo harness, so each path is reliably shown);
// free typing still goes through judge() above.
const SAMPLES: { label: string; text: string; forced: ReturnType<typeof judge> }[] = [
  { label: 'thin input', text: 'marketing services', forced: { kind: 'thin' } },
  { label: 'strong', text: 'Fractional CMO for seed-stage B2B SaaS founders who hired too senior too early and need strategy, not a full-time hire.', forced: { kind: 'strong' } },
  { label: 'a question', text: 'what should I offer?', forced: { kind: 'question' } },
  { label: 'multiple', text: 'Fractional CMO and CFO advisory, plus some startup coaching', forced: { kind: 'multiple', options: ['Fractional CMO', 'CFO advisory', 'startup coaching'] } },
  { label: 'an essay', text: 'I have spent about fifteen years in marketing leadership across a few different B2B software companies, two of which had decent exits, and lately people keep asking me to help them part time with positioning and demand generation and team building, so I think there is something here but I am honestly not totally sure how to package it up or who exactly I should be going after first.', forced: { kind: 'essay', distilled: 'fifteen years in marketing leadership across a few B2B software companies' } },
];

const FUEL_THESIS = 0.34;
const FUEL_BG = 0.22;
const BASE = 0.12;

export default function StartHereMock() {
  const [step, setStep] = useState<Step>('offer');
  const [round, setRound] = useState(0);
  const [log, setLog] = useState<Turn[]>([]);
  const [head, setHead] = useState('What do you want to offer, and who to?');
  const [sub, setSub] = useState('One sentence, in your words. We will go and check if it holds up.');
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<string[] | null>(null);
  const [pending, setPending] = useState('');
  const [thesis, setThesis] = useState('');
  const [thin, setThin] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [haveBg, setHaveBg] = useState(false);
  const [lastKind, setLastKind] = useState(''); // exposed via data-judge for the test harness

  const fuel = BASE + (thesis ? FUEL_THESIS : 0) + (haveBg ? FUEL_BG : 0);
  const emberFilter = `brightness(${(0.4 + 0.6 * fuel).toFixed(2)}) saturate(${(0.15 + 0.95 * fuel).toFixed(2)}) drop-shadow(0 0 ${Math.round(fuel * 18)}px rgba(224,162,60,${(0.1 + 0.55 * fuel).toFixed(2)}))`;
  const emberOpacity = (0.5 + 0.5 * fuel).toFixed(2);

  function push(turns: Turn[]) { setLog((l) => [...l, ...turns]); }
  function reset() {
    setStep('offer'); setRound(0); setLog([]); setInput(''); setOptions(null);
    setPending(''); setThesis(''); setThin(false); setHaveBg(false); setLastKind('');
    setHead('What do you want to offer, and who to?');
    setSub('One sentence, in your words. We will go and check if it holds up.');
  }

  function accept(t: string, reaction: string, isThin = false) {
    push([{ role: 'app', text: reaction }]);
    setThesis(t); setThin(isThin); setOptions(null);
    setStep('background');
    setHead('One line on your background.');
    setSub('So we can judge if you can win this, not just whether it is winnable. Optional, but it sharpens the read.');
    setInput('');
  }

  function submitOffer(text: string, forced?: ReturnType<typeof judge>) {
    const t = text.trim();
    if (!t) return;
    push([{ role: 'you', text: t, kicker: round > 0 ? 'your answer' : 'your thesis' }]);
    const r = forced || judge(t);
    setLastKind(round > 0 && r.kind === 'thin' ? `thin${round + 1}` : r.kind);
    if (r.kind === 'strong') { accept(t, 'Got it. That is sharp. Let me check it against the real market.'); return; }
    if (r.kind === 'question') {
      setStep('discover'); setInput('');
      setHead('Let us find it together.');
      setSub('What have you spent the most years actually doing? Plain words, no title needed.');
      return;
    }
    if (r.kind === 'multiple') {
      setOptions(r.options || []); setInput('');
      setHead('You have got a few in there.');
      setSub('Which one do you want to pressure-test first? You can run the others after.');
      return;
    }
    if (r.kind === 'essay') {
      setPending(r.distilled || distil(t)); setInput(''); setStep('confirm');
      setHead('Let me play that back.');
      setSub('I pulled the core of it out. Tell me if I have got it.');
      return;
    }
    // thin
    const nr = round + 1;
    setRound(nr);
    if (nr === 1) {
      push([{ role: 'app', text: "That is the what, but not the who, or why you. Who is it for, and what makes you the one they pick? For example: “Fractional CMO for seed B2B SaaS founders who hired too senior too early.”" }]);
      setHead('Almost. Give me the who.');
      setSub('Who is it for, and why you?');
      setInput(t);
    } else if (nr === 2) {
      push([{ role: 'app', text: "Closer. Still need a real buyer. “Startups” could be anyone. Which ones, at what stage, with what problem?" }]);
      setHead('Closer. Get specific.');
      setSub('Which buyer, at what stage, with what problem?');
      setInput(t);
    } else {
      accept(t, 'Okay, we will run it. Heads up: it is broad, so the read will be a sketch, not a verdict. You can sharpen it any time.', true);
    }
  }

  function submitDiscover(text: string) {
    const t = text.trim();
    if (!t) return;
    push([{ role: 'you', text: t, kicker: 'what you do' }]);
    const composed = `Fractional ${t.replace(/^i\s+/i, '').replace(/\.$/, '')}, offered to the people who already need it.`;
    setPending(composed); setInput(''); setStep('confirm');
    setHead('Let me play that back.');
    setSub('Here is a first cut of your thesis. We will sharpen it as we go.');
  }

  function submitBackground(text: string) {
    const t = text.trim();
    if (t) { push([{ role: 'you', text: t, kicker: 'your background' }]); setHaveBg(true); }
    goReady();
  }

  function goReady() {
    setStep('ready'); setInput('');
    setHead(thin ? 'Ready when you are.' : 'Good. That gives us something real to test.');
    setSub(thin ? 'The read will be a sketch until you sharpen the thesis.' : 'Next we check it against live demand, your buyers, the crowding, and your edge.');
  }

  const ctaLabel = thin ? 'Run it anyway' : 'Validate my thesis';
  const fuels = [
    { k: 'Thesis', on: !!thesis },
    { k: 'Background', on: haveBg },
    { k: 'LinkedIn', on: false, later: true },
    { k: 'Businesses you admire', on: false, later: true },
    { k: 'Your circle', on: false, later: true },
  ];

  return (
    <div className="thx" style={{ position: 'relative' }} data-judge={lastKind} data-step={step}>
      <style>{thesisCss + startCss}</style>

      <div className="topnav">
        <button className="emberbtn" onClick={() => setFuelOpen((o) => !o)} aria-label="What's charging your read">
          <img src="/brand/fractionl-icon.png" alt="" className="ember" style={{ filter: emberFilter, opacity: emberOpacity }} />
        </button>
        <img src="/brand/fractionl-wordmark.png" alt="Fractionl" className="wm" />
        <span className="navspacer" />
        <span className="navhint">tap the mark</span>
      </div>

      {fuelOpen ? (
        <div className="fuelpop">
          <div className="fueltitle">What is charging your read</div>
          <div style={{ marginTop: 8 }}>
            {fuels.map((f) => (
              <div key={f.k} className="fuelrow" style={{ color: f.on ? C.hi : C.lo }}>
                <span className="fueldot" style={{ background: f.on ? C.accent : C.line2 }} />
                <span style={{ flex: 1 }}>{f.k}</span>
                <span className="navhint">{f.on ? 'lit' : f.later ? 'after read' : 'next'}</span>
              </div>
            ))}
          </div>
          <div className="fuelnote">The mark glows brighter as the read gets richer. Add LinkedIn, a card, or a business you admire after your first read to brighten it.</div>
        </div>
      ) : null}

      <div className="wrap">
        <div className="testbar">
          <span className="navhint" style={{ alignSelf: 'center', marginRight: 2 }}>try a scenario:</span>
          {SAMPLES.map((sm) => (
            <button key={sm.label} className="testchip" onClick={() => { reset(); setTimeout(() => submitOffer(sm.text, sm.forced), 0); }}>{sm.label}</button>
          ))}
          <button className="testchip" onClick={reset}>reset</button>
        </div>

        <div className="ovl">Start here</div>

        {log.length ? (
          <div style={{ margin: '14px 0 18px' }}>
            {log.map((t, i) => (
              <div key={i} className="tt">
                {t.role === 'you'
                  ? <div className="tyou"><span className="tyk">{t.kicker || 'you'}</span>{t.text}</div>
                  : <div className="tapp">{t.text}</div>}
              </div>
            ))}
          </div>
        ) : null}

        {step !== 'ready' && step !== 'ran' ? (
          <>
            <div className="h" style={{ marginTop: 12 }}>{head}</div>
            <div className="sub">{sub}</div>
          </>
        ) : null}

        {/* offer + discover share the textarea + submit (hidden while picking one of many) */}
        {((step === 'offer' && !options) || step === 'discover') ? (
          <>
            <textarea
              style={{ marginTop: 16 }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={step === 'discover' ? 'e.g. building and running marketing teams at early-stage B2B software' : 'e.g. Fractional CMO for seed B2B SaaS founders who hired too senior too early'}
            />
            <button className="cta" style={{ marginTop: 12 }} disabled={!input.trim()} onClick={() => (step === 'offer' ? submitOffer(input) : submitDiscover(input))}>
              <span>{step === 'discover' ? 'That is it' : round > 0 ? 'Try again' : 'Check my thesis'}</span><span className="mono">→</span>
            </button>
          </>
        ) : null}

        {/* multiple: pick one */}
        {options ? (
          <div style={{ marginTop: 8 }}>
            {options.map((o, i) => (
              <button key={i} className="pickchip" onClick={() => accept(o, 'Good. We will start with that one and you can run the others later.')}>{o}</button>
            ))}
          </div>
        ) : null}

        {/* confirm a distilled / composed thesis */}
        {step === 'confirm' ? (
          <>
            <div className="panel" style={{ marginTop: 14 }}>
              <div className="grp">In one line</div>
              <div style={{ fontSize: 15, color: C.hi, marginTop: 8, lineHeight: 1.4 }}>{pending}</div>
            </div>
            <div className="twobtn">
              <button className="cta" onClick={() => accept(pending, 'Good. That gives us something real to test.')}><span>That is it</span><span className="mono">→</span></button>
              <button className="chip" style={{ justifyContent: 'center', flex: '0 0 auto' }} onClick={() => { setStep('offer'); setInput(pending); setHead('Edit your thesis.'); setSub('Tweak it until it reads true.'); }}>Let me edit</button>
            </div>
          </>
        ) : null}

        {/* background */}
        {step === 'background' ? (
          <>
            <input style={{ marginTop: 16 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. 12 years B2B SaaS marketing, two exits" />
            <button className="cta" style={{ marginTop: 12 }} onClick={() => submitBackground(input)}><span>{input.trim() ? 'Continue' : 'Add this'}</span><span className="mono">→</span></button>
            <button className="ghost" onClick={goReady}>skip for now</button>
          </>
        ) : null}

        {/* ready to validate */}
        {step === 'ready' ? (
          <>
            <div className="h" style={{ marginTop: 12 }}>{head}</div>
            <div className="sub">{sub}</div>
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="grp">Your thesis</div>
              <div style={{ fontSize: 14.5, color: C.hi, marginTop: 8, lineHeight: 1.4 }}>{thesis}</div>
              {haveBg ? <div style={{ fontSize: 12, color: C.lo, marginTop: 10 }} className="mono">background captured</div> : null}
            </div>
            <button className="cta" style={{ marginTop: 18 }} onClick={() => { setStep('ran'); setHead(''); }}>
              <span>{ctaLabel}</span><span className="mono">→</span>
            </button>
            <div className="mono" style={{ fontSize: 10, color: C.lo, marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
              After your read, you can add fuel to brighten the mark:<br />LinkedIn, a business card, or a business you admire.
            </div>
          </>
        ) : null}

        {/* terminal note (fixture only; real app would call validate-thesis here) */}
        {step === 'ran' ? (
          <div className="panel" style={{ marginTop: 22, textAlign: 'center', padding: 24 }}>
            <div className="grp">Fixture</div>
            <div style={{ fontSize: 14, color: C.hi, marginTop: 10, lineHeight: 1.5 }}>This is where the live research runs.</div>
            <div className="sub" style={{ marginTop: 8 }}>In the real app this hands the locked thesis to validate-thesis (live Perplexity), then the read, the steps, and the journey map.</div>
            <button className="chip" style={{ justifyContent: 'center', marginTop: 16, display: 'inline-flex' }} onClick={reset}>↺ run another scenario</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
