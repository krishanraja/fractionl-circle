// The "Make it stronger" panel (live). Everything here strengthens the PLAN, and every
// strengthener is a clean tappable row that opens the SAME focused bottom-sheet overlay -
// nothing expands inline or clips at the fold. Four rows:
//  - screenshot a business you admire -> Freya reads its positioning, folds into your edge
//  - voice a concern                  -> Freya researches it, tells you what it means
//  - voice an idea/evolution          -> Freya folds it into what makes you different
//  - answer a question                -> Freya asks the one decision that sharpens the plan
// The three AI-driven ones are personified as Freya so it reads like talking to someone
// (the name IS the personification - no magic sparkles or decorative icons). The overlay is
// hand-rolled (the DecisionSheet / TrendSheet pattern) and rendered in place inside the
// already-.thx surface, so the ember styles resolve with no re-scoping.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { C } from './tokens';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { haptics } from '@/utils/haptics';
import { STRENGTHENERS, ASSISTANT } from './copy';
import SharpenPrompt from './SharpenPrompt';
import { transcribeAudio, strengthenPlan, saveThesisAnswer, type AdmireResult, type StrengthenResult } from './thesisData';

type Kind = 'admire' | 'concern' | 'idea' | 'question';
const WHY_CHIPS = ['Their positioning', 'Their offer shape', 'Their pricing model', 'Their audience', 'Their content', 'Something else'];

function readDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
}

// The shared bottom-sheet chrome. Portaled to document.body (with the .thx scope re-added,
// the documented pattern for portaled ember content) so it is anchored to the VIEWPORT and
// covers the pinned footer - not confined to the animated `.wrap` (a transform containing
// block), which would strand a short sheet's action below the fold. Tap the scrim to close;
// the inner panel stops propagation. Locks body scroll while open.
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return createPortal(
    <div className="thx" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, maxHeight: '88dvh', overflowY: 'auto', background: C.bg, borderTop: `1px solid ${C.line2}`, borderRadius: '16px 16px 0 0', padding: '16px 20px calc(24px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className="ovl" style={{ flex: 1 }}>{title}</span>
          <button className="mono" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 0, color: C.lo, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// --- Admire (screenshot a business you admire) ---
type AdmireStep = 'idle' | 'reading' | 'extracted' | 'why' | 'done' | 'reject';
function AdmireBody({ onAdmire, onSaveInspiration }: {
  onAdmire: (dataUrl: string) => Promise<AdmireResult>;
  onSaveInspiration: (insp: { name: string; positioning?: string | null; kind?: string; field?: string | null; why: string }) => Promise<void>;
}) {
  const [step, setStep] = useState<AdmireStep>('idle');
  const [res, setRes] = useState<AdmireResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setStep('reading');
    try {
      const r = await onAdmire(await readDataUrl(file));
      setRes(r); setStep(r.ok ? 'extracted' : 'reject');
    } catch { setRes({ ok: false, reject: 'Something went wrong reading that. Try again.' }); setStep('reject'); }
    finally { if (inputRef.current) inputRef.current.value = ''; }
  }
  async function chooseWhy(w: string) {
    if (!res?.name) return;
    await onSaveInspiration({ name: res.name, positioning: res.positioning, kind: res.kind, field: res.field, why: w });
    setStep('done');
  }
  const reset = () => { setStep('idle'); setRes(null); };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {step === 'idle' ? (
        <>
          <div style={{ fontSize: 14, color: C.hi, lineHeight: 1.5, marginTop: 4 }}>A LinkedIn, an Instagram, or a site doing something you would love to build. {ASSISTANT.name} reads how they position it, then asks what you want to take from them - to sharpen what makes you different.</div>
          <button className="cta" style={{ marginTop: 16 }} onClick={() => inputRef.current?.click()}><span>Choose a screenshot</span><span className="mono">→</span></button>
        </>
      ) : null}
      {step === 'reading' ? <div style={{ marginTop: 8 }}><div className="navhint" style={{ color: C.accent }}>{ASSISTANT.name} is reading the screenshot</div><div style={{ fontSize: 14, color: C.mid, marginTop: 8 }}>Looking at what they do and how they position it…</div></div> : null}
      {step === 'reject' ? <div style={{ marginTop: 8 }}><div className="navhint warn">Could not use that one</div><div style={{ fontSize: 14, color: C.hi, marginTop: 8, lineHeight: 1.5 }}>{res?.reject}</div><button className="backlink" onClick={reset}>↺ back</button></div> : null}
      {step === 'extracted' && res ? (
        <div style={{ marginTop: 8 }}>
          <div className="navhint" style={{ color: res.kind === 'competitor' ? C.risk : C.accent }}>{res.kind === 'competitor' ? 'A competitor, not a model' : res.kind === 'person' ? 'A person' : res.field ? 'A different field' : 'What they do'}</div>
          <div style={{ fontSize: 15, color: C.hi, marginTop: 8, fontWeight: 600 }}>{res.name}</div>
          {res.positioning ? <div style={{ fontSize: 13, color: C.mid, marginTop: 6, lineHeight: 1.45 }}>{res.positioning}</div> : null}
          {res.kind === 'competitor' ? <div style={{ fontSize: 12.5, color: C.risk, marginTop: 10, lineHeight: 1.45 }}>Heads up: that looks like a direct competitor, not a model. {ASSISTANT.name} will treat it as a benchmark to beat, not a template to copy.</div> : null}
          {res.field ? <div style={{ fontSize: 12.5, color: C.lo, marginTop: 10, lineHeight: 1.45 }}>That is a different field. Pick the part that transfers to your offer.</div> : null}
          <button className="cta" style={{ marginTop: 14 }} onClick={() => setStep('why')}><span>Why do you admire them?</span><span className="mono">→</span></button>
          <button className="backlink" onClick={reset}>not this one</button>
        </div>
      ) : null}
      {step === 'why' && res ? (
        <div style={{ marginTop: 8 }}>
          <div className="navhint">Why them</div>
          <div className="h" style={{ marginTop: 8, fontSize: 18 }}>What do you want to take from {res.name}?</div>
          <div className="sub">{res.field ? 'Pick the part that transfers to your offer.' : 'This clarifies what makes you different. It does not copy them.'}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {WHY_CHIPS.map((w) => <button key={w} className="whychip" onClick={() => chooseWhy(w)}>{w}</button>)}
          </div>
        </div>
      ) : null}
      {step === 'done' ? (
        <div style={{ marginTop: 8 }}>
          <div className="navhint" style={{ color: C.good }}>✓ {ASSISTANT.name} folded it into what makes you different</div>
          <div style={{ fontSize: 14.5, color: C.hi, marginTop: 8, lineHeight: 1.5 }}>Got it. The mark just brightened. Add another, or see how it lands again from below to fold it in.</div>
          <button className="cta" style={{ marginTop: 14 }} onClick={reset}><span>Add another</span><span className="mono">→</span></button>
        </div>
      ) : null}
    </div>
  );
}

// --- Voice a concern / an idea ---
type VStep = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'result' | 'error';
function VoiceBody({ mode, thesis, runId, onBanked }: {
  mode: 'concern' | 'evolution'; thesis: string; runId: string | null; onBanked?: () => void;
}) {
  const [step, setStep] = useState<VStep>('idle');
  const [said, setSaid] = useState('');
  const [res, setRes] = useState<StrengthenResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [banked, setBanked] = useState(false);
  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording, error: recError } = useVoiceRecording();

  useEffect(() => { if (recError) { setErr(recError); setStep('error'); } }, [recError]);
  useEffect(() => {
    if (!audioBlob) return;
    let cancelled = false;
    (async () => {
      try {
        setStep('transcribing'); setErr(null);
        const tr = await transcribeAudio(audioBlob);
        if (cancelled) return;
        if (!tr) { setErr('Nothing came through - try again?'); setStep('error'); return; }
        setSaid(tr); setStep('thinking');
        const r = await strengthenPlan(mode, tr, thesis);
        if (cancelled) return;
        setRes(r); setStep('result');
      } catch (e) {
        if (!cancelled) { setErr(e instanceof Error ? e.message : 'Could not work that through.'); setStep('error'); }
      } finally { if (!cancelled) resetRecording(); }
    })();
    return () => { cancelled = true; };
  }, [audioBlob]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    if (isRecording) { haptics.tap(); stopRecording(); }
    else { haptics.medium(); setErr(null); setRes(null); setSaid(''); setStep('recording'); void startRecording(); }
  };
  const reset = () => { setStep('idle'); setRes(null); setErr(null); setSaid(''); setBanked(false); resetRecording(); };

  async function bank() {
    if (!res) return;
    await saveThesisAnswer({ run_id: runId, dimension: res.dimension, topic: res.topic, question: said || STRENGTHENERS[mode === 'concern' ? 'concern' : 'idea'].title, answer: res.finding + (res.impact ? ` — ${res.impact}` : '') });
    setBanked(true); onBanked?.();
  }

  const prompt = mode === 'concern'
    ? `Say what's worrying you about this plan - a doubt, a risk, a what-if. ${ASSISTANT.name} will research it, then tell you what it means for your plan.`
    : `Say a new angle, an offer tweak, or a direction you're considering. ${ASSISTANT.name} will fold it into what makes you different and show how it strengthens the plan.`;

  return (
    <div>
      {step === 'idle' ? (
        <>
          <div style={{ fontSize: 14, color: C.hi, lineHeight: 1.5, marginTop: 4 }}>{prompt}</div>
          <button className="cta" style={{ marginTop: 16 }} onClick={toggle}><span>Tap to talk</span><span className="mono">●</span></button>
        </>
      ) : null}
      {step === 'recording' ? (
        <>
          <div className="navhint" style={{ color: C.accent }}>{ASSISTANT.name} is listening…</div>
          <div style={{ fontSize: 14, color: C.hi, marginTop: 8, lineHeight: 1.5 }}>Say it in your own words. Take your time.</div>
          <button className="cta" style={{ marginTop: 14 }} onClick={toggle}><span>Stop and work it through</span><span className="mono">■</span></button>
        </>
      ) : null}
      {step === 'transcribing' ? <div className="navhint">Hearing you out…</div> : null}
      {step === 'thinking' ? (
        <>
          <div className="navhint" style={{ color: C.accent }}>{mode === 'concern' ? `${ASSISTANT.name} is researching that` : `${ASSISTANT.name} is folding that in`}</div>
          {said ? <div style={{ fontSize: 13.5, color: C.mid, marginTop: 8, lineHeight: 1.5, fontStyle: 'italic' }}>“{said}”</div> : null}
          <div style={{ fontSize: 13, color: C.lo, marginTop: 8 }}>{mode === 'concern' ? 'Checking the market and what survivors did…' : 'Working out how it sharpens what makes you different…'}</div>
        </>
      ) : null}
      {step === 'result' && res ? (
        <>
          <div className="navhint" style={{ color: banked ? C.good : C.accent }}>{banked ? '✓ Banked - folds into your next read' : mode === 'concern' ? `${ASSISTANT.name} looked into it` : `${ASSISTANT.name} strengthened your plan`}</div>
          {said ? <div style={{ fontSize: 12.5, color: C.lo, marginTop: 8, lineHeight: 1.45, fontStyle: 'italic' }}>“{said}”</div> : null}
          <div style={{ fontSize: 14.5, color: C.hi, marginTop: 10, lineHeight: 1.55 }}>{res.finding}</div>
          {res.impact ? <div style={{ fontSize: 13, color: C.accent, marginTop: 10, lineHeight: 1.5 }}>{res.impact}</div> : null}
          {res.sources?.length ? <div className="mono" style={{ fontSize: 9.5, color: C.lo, marginTop: 10, lineHeight: 1.6 }}>{res.sources.slice(0, 3).map((s, i) => <div key={i}>{s}</div>)}</div> : null}
          {!banked ? <button className="cta" style={{ marginTop: 14 }} onClick={bank}><span>Bank this into my plan</span><span className="mono">→</span></button>
            : <div style={{ fontSize: 13, color: C.mid, marginTop: 12, lineHeight: 1.5 }}>See how it lands again from below to fold it in.</div>}
          <button className="backlink" onClick={reset}>{banked ? 'add another' : 'discard'}</button>
        </>
      ) : null}
      {step === 'error' ? <><div className="navhint warn">Could not use that one</div><div style={{ fontSize: 14, color: C.hi, marginTop: 8, lineHeight: 1.5 }}>{err}</div><button className="backlink" onClick={reset}>↺ back</button></> : null}
    </div>
  );
}

// One clean, compact trigger row: title + one-line personified subtitle on the left,
// tag + arrow on the right. No decorative icon - the personification is the name.
function Row({ s, onClick }: { s: { title: string; sub: string; tag: string }; onClick: () => void }) {
  return (
    <button className="strow" onClick={onClick}>
      <span className="strow-t">
        <span className="strow-title">{s.title}</span>
        <span className="strow-sub">{s.sub}</span>
      </span>
      <span className="strow-tag">{s.tag}</span>
      <span className="htarrow">→</span>
    </button>
  );
}

export default function SharpenPanel({ thesis, runId, onAdmire, onSaveInspiration, onBanked, edges, sharpenFocus }: {
  thesis: string;
  runId: string | null;
  onAdmire: (dataUrl: string) => Promise<AdmireResult>;
  onSaveInspiration: (insp: { name: string; positioning?: string | null; kind?: string; field?: string | null; why: string }) => Promise<void>;
  onBanked?: () => void;
  edges: { name: string; why: string }[];
  sharpenFocus?: string | null;
}) {
  const [active, setActive] = useState<Kind | null>(null);
  const title = (k: Kind) => STRENGTHENERS[k].title;

  return (
    <div style={{ marginTop: 4 }}>
      {edges.length ? (
        <div className="edgerow">
          <div className="navhint" style={{ color: C.accent }}>What makes you different, sharper</div>
          {edges.map((e, i) => <div key={i} style={{ fontSize: 13, color: C.hi, marginTop: 6, lineHeight: 1.4 }}>You want {e.why.toLowerCase()} like {e.name}, aimed at your buyers.</div>)}
          <div className="mono" style={{ fontSize: 10, color: C.lo, marginTop: 9 }}>See how it lands again to fold this into your plan.</div>
        </div>
      ) : null}

      <div className="ovl" style={{ marginTop: 10 }}>Make your plan stronger</div>
      <Row s={STRENGTHENERS.admire} onClick={() => setActive('admire')} />
      <Row s={STRENGTHENERS.concern} onClick={() => setActive('concern')} />
      <Row s={STRENGTHENERS.idea} onClick={() => setActive('idea')} />
      <Row s={STRENGTHENERS.question} onClick={() => setActive('question')} />

      {active ? (
        <Sheet title={title(active)} onClose={() => setActive(null)}>
          {active === 'admire' ? <AdmireBody onAdmire={onAdmire} onSaveInspiration={onSaveInspiration} /> : null}
          {active === 'concern' ? <VoiceBody mode="concern" thesis={thesis} runId={runId} onBanked={onBanked} /> : null}
          {active === 'idea' ? <VoiceBody mode="evolution" thesis={thesis} runId={runId} onBanked={onBanked} /> : null}
          {active === 'question' ? <SharpenPrompt onAnswered={onBanked} focus topic={sharpenFocus || undefined} /> : null}
        </Sheet>
      ) : null}
    </div>
  );
}
