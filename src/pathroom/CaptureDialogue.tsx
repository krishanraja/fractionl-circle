// The guided, gated Start Here dialogue (live). One question at a time: it checks the
// thesis with the judge and pushes back on thin inputs (soft block, 2 rounds, then runs it
// anyway honestly), routes questions into discovery, lists into pick-one, verbose into a
// play-back. Then one line of background. The brand mark brightens as fuel goes in. On
// completion it hands the locked thesis + background up to ThesisApp to validate.
import { useEffect, useRef, useState } from 'react';
import { C } from './tokens';
import { thesisCss } from './thesisViews';
import { EmberNav, chromeCss } from './thesisChrome';
import type { Verdict } from './thesisJudge';

type Step = 'offer' | 'discover' | 'confirm' | 'background' | 'ready';
interface Turn { role: 'app' | 'you'; text: string; kicker?: string }

const BASE = 0.12, F_THESIS = 0.34, F_BG = 0.22;

export default function CaptureDialogue({ onJudge, onComplete }: {
  onJudge: (thesis: string, round: number) => Promise<Verdict>;
  onComplete: (thesis: string, background: string) => void;
}) {
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
  const [busy, setBusy] = useState(false);
  const [bgFinal, setBgFinal] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [step, log.length]);

  const fuel = BASE + (thesis ? F_THESIS : 0) + (step === 'ready' && log.some((t) => t.kicker === 'your background') ? F_BG : 0);
  const fuels = [
    { k: 'Thesis', on: !!thesis }, { k: 'Background', on: log.some((t) => t.kicker === 'your background') },
    { k: 'LinkedIn', on: false, hint: 'after read' }, { k: 'Businesses you admire', on: false, hint: 'after read' }, { k: 'Your circle', on: false, hint: 'after read' },
  ];

  function push(turns: Turn[]) { setLog((l) => [...l, ...turns]); }

  function accept(t: string, reaction: string, isThin = false) {
    push([{ role: 'app', text: reaction }]);
    setThesis(t); setThin(isThin); setOptions(null); setStep('background');
    setHead('One line on your background.');
    setSub('So we can judge if you can win this, not just whether it is winnable. Optional, but it sharpens the read.');
    setInput('');
  }

  async function submitOffer(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    push([{ role: 'you', text: t, kicker: round > 0 ? 'your answer' : 'your thesis' }]);
    setInput(''); setBusy(true);
    let r: Verdict;
    try { r = await onJudge(t, round); } finally { setBusy(false); }
    if (r.kind === 'strong') { accept(r.distilled?.trim() || t, 'Got it. That is sharp. Let me check it against the real market.'); return; }
    if (r.kind === 'question') {
      setStep('discover'); setHead('Let us find it together.');
      setSub(r.followup || 'What have you spent the most years actually doing? Plain words, no title needed.');
      return;
    }
    if (r.kind === 'multiple') {
      setOptions(r.options.length ? r.options : [t]); setHead('You have got a few in there.');
      setSub(r.followup || 'Which one do you want to pressure-test first? You can run the others after.');
      return;
    }
    if (r.kind === 'essay') {
      setPending(r.distilled || t); setStep('confirm');
      setHead('Let me play that back.'); setSub('I pulled the core of it out. Tell me if I have got it.');
      return;
    }
    // thin
    const nr = round + 1; setRound(nr);
    if (nr >= 3) { accept(t, 'Okay, we will run it. Heads up: it is broad, so the read will be a sketch, not a verdict. You can sharpen it any time.', true); return; }
    push([{ role: 'app', text: r.followup || 'That is the what, but not the who. Who is it for, and what makes you the one they pick?' }]);
    setHead(nr === 1 ? 'Almost. Give me the who.' : 'Closer. Get specific.');
    setSub(nr === 1 ? 'Who is it for, and why you?' : 'Which buyer, at what stage, with what problem?');
    setInput(t);
  }

  function submitDiscover(text: string) {
    const t = text.trim();
    if (!t) return;
    push([{ role: 'you', text: t, kicker: 'what you do' }]);
    setPending(`Fractional ${t.replace(/^i\s+/i, '').replace(/\.$/, '')}, offered to the people who already need it.`);
    setInput(''); setStep('confirm');
    setHead('Let me play that back.'); setSub('Here is a first cut of your thesis. We will sharpen it as we go.');
  }

  function submitBackground(text: string) {
    const t = text.trim();
    if (t) push([{ role: 'you', text: t, kicker: 'your background' }]);
    setStep('ready'); setInput('');
    setHead(thin ? 'Ready when you are.' : 'Good. That gives us something real to test.');
    setSub(thin ? 'The read will be a sketch until you sharpen the thesis.' : 'Next we check it against live demand, your buyers, the crowding, and your edge.');
    setBgFinal(t); // complete is triggered by the CTA on the ready step
  }

  // Show only the last exchange as context, so the dialogue never grows past one viewport.
  const recent = log.slice(-2);

  return (
    <div className="thx thxframe"><style>{thesisCss + chromeCss}</style>
      <EmberNav fuel={fuel} fuels={fuels} hint="tap the mark" />
      <div className="thxbody" ref={bodyRef}>
      <div className="wrap" key={step}>

        <div className="ovl">Start here</div>

        {recent.length ? (
          <div style={{ margin: '14px 0 18px' }}>
            {recent.map((t, i) => (
              <div key={i} className="tt">
                {t.role === 'you'
                  ? <div className="tyou"><span className="tyk">{t.kicker || 'you'}</span>{t.text}</div>
                  : <div className="tapp">{t.text}</div>}
              </div>
            ))}
          </div>
        ) : null}

        {step !== 'ready' ? (<><div className="h" style={{ marginTop: 12 }}>{head}</div><div className="sub">{sub}</div></>) : null}

        {(step === 'offer' || step === 'discover') ? (
          <>
            <textarea style={{ marginTop: 16 }} value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
              placeholder={step === 'discover' ? 'e.g. building and running marketing teams at early-stage B2B software' : 'e.g. Fractional CMO for seed B2B SaaS founders who hired too senior too early'} />
            <button className="cta" style={{ marginTop: 12 }} disabled={busy || !input.trim()} onClick={() => (step === 'offer' ? submitOffer(input) : submitDiscover(input))}>
              <span>{busy ? 'checking...' : step === 'discover' ? 'That is it' : round > 0 ? 'Try again' : 'Check my thesis'}</span><span className="mono">→</span>
            </button>
          </>
        ) : null}

        {options ? (
          <div style={{ marginTop: 8 }}>
            {options.map((o, i) => <button key={i} className="pickchip" onClick={() => accept(o, 'Good. We will start with that one and you can run the others later.')}>{o}</button>)}
          </div>
        ) : null}

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

        {step === 'background' ? (
          <>
            <input style={{ marginTop: 16 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. 12 years B2B SaaS marketing, two exits" />
            <button className="cta" style={{ marginTop: 12 }} onClick={() => submitBackground(input)}><span>{input.trim() ? 'Continue' : 'Add this'}</span><span className="mono">→</span></button>
            <button className="ghost" onClick={() => submitBackground('')}>skip for now</button>
          </>
        ) : null}

        {step === 'ready' ? (
          <>
            <div className="h" style={{ marginTop: 12 }}>{head}</div>
            <div className="sub">{sub}</div>
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="grp">Your thesis</div>
              <div style={{ fontSize: 14.5, color: C.hi, marginTop: 8, lineHeight: 1.4 }}>{thesis}</div>
            </div>
            <button className="cta" style={{ marginTop: 18 }} onClick={() => onComplete(thesis, bgFinal)}>
              <span>{thin ? 'Run it anyway' : 'Run the deep dive'}</span><span className="mono">→</span>
            </button>
          </>
        ) : null}
      </div>
      </div>
    </div>
  );
}
