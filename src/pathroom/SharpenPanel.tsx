// The "Make it stronger" panel (live). Everything here strengthens the PLAN - never
// the circle. Three plan-only intents:
//  - a business you admire -> reads its positioning, asks WHY, folds into your edge
//  - voice a concern       -> the tool researches it, then tells you how it changes the plan
//  - voice an idea/evolution -> the AI folds it into what makes you different
// Contact actions (business card, your LinkedIn) used to live here; they moved to the
// Circle tab and Profile & Settings, where they belong. Re-running the read is an
// explicit choice, since it spends a live research call.
import { useEffect, useRef, useState } from 'react';
import { C } from './tokens';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { haptics } from '@/utils/haptics';
import { transcribeAudio, strengthenPlan, saveThesisAnswer, type AdmireResult, type StrengthenResult } from './thesisData';

const WHY_CHIPS = ['Their positioning', 'Their offer shape', 'Their pricing model', 'Their audience', 'Their content', 'Something else'];
type AdmireStep = 'idle' | 'reading' | 'extracted' | 'why' | 'done' | 'reject';

function readDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
}

// One voiced-strengthener row: record -> transcribe -> the tool works it through ->
// show the grounded result -> bank it into the next read. Two of these on the
// surface (a concern to research, an idea/evolution to fold in).
type VStep = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'result' | 'error';
function VoiceStrengthenRow({ mode, icon, title, tag, hint, thesis, runId, onBanked }: {
  mode: 'concern' | 'evolution';
  icon: string; title: string; tag: string; hint: string;
  thesis: string; runId: string | null; onBanked?: () => void;
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
      } finally {
        if (!cancelled) resetRecording();
      }
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
    await saveThesisAnswer({
      run_id: runId,
      dimension: res.dimension,
      topic: res.topic,
      question: said || title,
      answer: res.finding + (res.impact ? ` — ${res.impact}` : ''),
    });
    setBanked(true);
    onBanked?.();
  }

  if (step === 'idle') {
    return (
      <button className="fuelrowc" onClick={toggle}>
        <span className="fuelicon">{icon}</span>
        <span className="fuelrowc-t">{title}</span>
        <span className="fueltag thesis">{tag}</span>
        <span className="htarrow">→</span>
      </button>
    );
  }

  return (
    <div className="extracted">
      {step === 'recording' ? (
        <>
          <div className="navhint" style={{ color: C.accent }}>Listening…</div>
          <div style={{ fontSize: 14, color: C.hi, marginTop: 8, lineHeight: 1.5 }}>{hint}</div>
          <button className="cta" style={{ marginTop: 14 }} onClick={toggle}><span>Stop and work it through</span><span className="mono">■</span></button>
        </>
      ) : null}
      {step === 'transcribing' ? <div className="navhint">Hearing you out…</div> : null}
      {step === 'thinking' ? (
        <>
          <div className="navhint" style={{ color: C.accent }}>{mode === 'concern' ? 'Researching that concern' : 'Folding that into your plan'}</div>
          {said ? <div style={{ fontSize: 13.5, color: C.mid, marginTop: 8, lineHeight: 1.5, fontStyle: 'italic' }}>“{said}”</div> : null}
          <div style={{ fontSize: 13, color: C.lo, marginTop: 8 }}>{mode === 'concern' ? 'Checking the market and what survivors did…' : 'Working out how it sharpens what makes you different…'}</div>
        </>
      ) : null}
      {step === 'result' && res ? (
        <>
          <div className="navhint" style={{ color: banked ? C.good : C.accent }}>{banked ? '✓ Banked - folds into your next read' : mode === 'concern' ? 'What the research says' : 'How this strengthens your plan'}</div>
          {said ? <div style={{ fontSize: 12.5, color: C.lo, marginTop: 8, lineHeight: 1.45, fontStyle: 'italic' }}>“{said}”</div> : null}
          <div style={{ fontSize: 14.5, color: C.hi, marginTop: 10, lineHeight: 1.55 }}>{res.finding}</div>
          {res.impact ? <div style={{ fontSize: 13, color: C.accent, marginTop: 10, lineHeight: 1.5 }}>{res.impact}</div> : null}
          {res.sources?.length ? (
            <div className="mono" style={{ fontSize: 9.5, color: C.lo, marginTop: 10, lineHeight: 1.6 }}>
              {res.sources.slice(0, 3).map((s, i) => <div key={i}>{s}</div>)}
            </div>
          ) : null}
          {!banked ? (
            <button className="cta" style={{ marginTop: 14 }} onClick={bank}><span>Bank this into my plan</span><span className="mono">→</span></button>
          ) : (
            <div style={{ fontSize: 13, color: C.mid, marginTop: 12, lineHeight: 1.5 }}>See how it lands again from below to fold it in.</div>
          )}
          <button className="backlink" onClick={reset}>{banked ? 'add another' : 'discard'}</button>
        </>
      ) : null}
      {step === 'error' ? (
        <>
          <div className="navhint warn">Could not use that one</div>
          <div style={{ fontSize: 14, color: C.hi, marginTop: 8, lineHeight: 1.5 }}>{err}</div>
          <button className="backlink" onClick={reset}>↺ back</button>
        </>
      ) : null}
    </div>
  );
}

export default function SharpenPanel({ thesis, runId, onAdmire, onSaveInspiration, onBanked, edges, compact = false }: {
  thesis: string;
  runId: string | null;
  onAdmire: (dataUrl: string) => Promise<AdmireResult>;
  onSaveInspiration: (insp: { name: string; positioning?: string | null; kind?: string; field?: string | null; why: string }) => Promise<void>;
  onBanked?: () => void;
  edges: { name: string; why: string }[];
  compact?: boolean; // one-line rows instead of tall description cards (the focused "Make it stronger" screen)
}) {
  const [admire, setAdmire] = useState<AdmireStep>('idle');
  const [res, setRes] = useState<AdmireResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const admireInput = useRef<HTMLInputElement>(null);

  async function onAdmireFile(file: File) {
    setAdmire('reading'); setErr(null);
    try {
      const r = await onAdmire(await readDataUrl(file));
      setRes(r);
      setAdmire(r.ok ? 'extracted' : 'reject');
    } catch { setRes({ ok: false, reject: 'Something went wrong reading that. Try again.' }); setAdmire('reject'); }
    finally { if (admireInput.current) admireInput.current.value = ''; }
  }
  async function chooseWhy(w: string) {
    if (!res?.name) return;
    await onSaveInspiration({ name: res.name, positioning: res.positioning, kind: res.kind, field: res.field, why: w });
    setAdmire('done');
  }
  function reset() { setAdmire('idle'); setRes(null); }

  const admireRow = compact ? (
    <button className="fuelrowc" onClick={() => admireInput.current?.click()}>
      <span className="fuelicon">◎</span>
      <span className="fuelrowc-t">Screenshot a business you admire</span>
      <span className="fueltag thesis">difference</span>
      <span className="htarrow">→</span>
    </button>
  ) : (
    <button className="fuelcard" onClick={() => admireInput.current?.click()}>
      <span className="fuelicon">◎</span>
      <span style={{ flex: 1 }}>
        <span className="fueltitle2">Screenshot a business you admire</span>
        <div className="fuelfor">A LinkedIn, an Instagram, or a site doing something you would love to build. We read what they do, then ask why, to clarify what makes you different.</div>
        <span className="fueltag thesis">sharpens your difference</span>
      </span>
    </button>
  );

  return (
    <div style={{ marginTop: compact ? 10 : 18 }}>
      {edges.length ? (
        <div className="edgerow">
          <div className="navhint" style={{ color: C.accent }}>What makes you different, sharper</div>
          {edges.map((e, i) => <div key={i} style={{ fontSize: 13, color: C.hi, marginTop: 6, lineHeight: 1.4 }}>You want {e.why.toLowerCase()} like {e.name}, aimed at your buyers.</div>)}
          <div className="mono" style={{ fontSize: 10, color: C.lo, marginTop: 9 }}>See how it lands again to fold this into your plan.</div>
        </div>
      ) : null}

      {admire === 'idle' ? (
        <>
          <div className="ovl" style={{ marginTop: compact ? 20 : 22 }}>Make your plan stronger</div>
          {admireRow}
          <input ref={admireInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onAdmireFile(f); }} />

          <VoiceStrengthenRow
            mode="concern" icon="?" tag="research"
            title="Voice a concern"
            hint="Say what's worrying you about this plan - a doubt, a risk, a what-if. I'll go and research it, then tell you what it means for your plan."
            thesis={thesis} runId={runId} onBanked={onBanked}
          />
          <VoiceStrengthenRow
            mode="evolution" icon="✧" tag="evolve"
            title="Voice an idea or evolution"
            hint="Say a new angle, an offer tweak, or a direction you're considering. I'll fold it into what makes you different and show how it strengthens the plan."
            thesis={thesis} runId={runId} onBanked={onBanked}
          />

          {err ? <div className="mono" style={{ fontSize: 11, color: C.risk, marginTop: 10 }}>{err}</div> : null}
        </>
      ) : null}

      {admire === 'reading' ? (
        <div className="extracted"><div className="navhint">Reading the screenshot</div><div style={{ fontSize: 14, color: C.mid, marginTop: 8 }}>Looking at what they do and how they position it...</div></div>
      ) : null}

      {admire === 'reject' ? (
        <div className="extracted">
          <div className="navhint warn">Could not use that one</div>
          <div style={{ fontSize: 14, color: C.hi, marginTop: 8, lineHeight: 1.5 }}>{res?.reject}</div>
          <button className="backlink" onClick={reset}>↺ back</button>
        </div>
      ) : null}

      {admire === 'extracted' && res ? (
        <div className="extracted">
          <div className="navhint" style={{ color: res.kind === 'competitor' ? C.risk : C.accent }}>{res.kind === 'competitor' ? 'A competitor, not a model' : res.kind === 'person' ? 'A person' : res.field ? 'A different field' : 'What they do'}</div>
          <div style={{ fontSize: 15, color: C.hi, marginTop: 8, fontWeight: 600 }}>{res.name}</div>
          {res.positioning ? <div style={{ fontSize: 13, color: C.mid, marginTop: 6, lineHeight: 1.45 }}>{res.positioning}</div> : null}
          {res.kind === 'competitor' ? <div style={{ fontSize: 12.5, color: C.risk, marginTop: 10, lineHeight: 1.45 }}>Heads up: that looks like a direct competitor, not a model. I will treat it as a benchmark to beat, not a template to copy.</div> : null}
          {res.field ? <div style={{ fontSize: 12.5, color: C.lo, marginTop: 10, lineHeight: 1.45 }}>That is a different field. Pick the part that transfers to your offer.</div> : null}
          <button className="cta" style={{ marginTop: 14 }} onClick={() => setAdmire('why')}><span>Why do you admire them?</span><span className="mono">→</span></button>
          <button className="backlink" onClick={reset}>not this one</button>
        </div>
      ) : null}

      {admire === 'why' && res ? (
        <div className="extracted">
          <div className="navhint">Why them</div>
          <div className="h" style={{ marginTop: 8, fontSize: 18 }}>What do you want to take from {res.name}?</div>
          <div className="sub">{res.field ? 'Pick the part that transfers to your offer.' : 'This clarifies what makes you different. It does not copy them.'}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {WHY_CHIPS.map((w) => <button key={w} className="whychip" onClick={() => chooseWhy(w)}>{w}</button>)}
          </div>
          <button className="backlink" onClick={reset}>cancel</button>
        </div>
      ) : null}

      {admire === 'done' ? (
        <div className="extracted">
          <div className="navhint" style={{ color: C.good }}>✓ Folded into what makes you different</div>
          <div style={{ fontSize: 14.5, color: C.hi, marginTop: 8, lineHeight: 1.5 }}>Got it. The mark just brightened. Add more, or see how it lands again from below to fold it into your plan.</div>
          <button className="cta" style={{ marginTop: 14 }} onClick={reset}><span>Add more</span><span className="mono">→</span></button>
        </div>
      ) : null}
    </div>
  );
}
