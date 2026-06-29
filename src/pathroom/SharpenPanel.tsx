// The after-read "add fuel to sharpen your read" panel (live). Three distinct intents:
//  - a business you admire -> reads its positioning, asks WHY, folds into your edge (thesis)
//  - a business card -> adds a real person to your circle (warm reach)
//  - LinkedIn -> your background, for fit + credibility
// Honest admire handling (reject / person / competitor / different field). Re-running the
// read is an explicit choice, since it spends a live research call.
import { useRef, useState } from 'react';
import { C } from './tokens';
import type { AdmireResult } from './thesisData';

const WHY_CHIPS = ['Their positioning', 'Their offer shape', 'Their pricing model', 'Their audience', 'Their content', 'Something else'];
type AdmireStep = 'idle' | 'reading' | 'extracted' | 'why' | 'done' | 'reject';

function readDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
}

export default function SharpenPanel({ thesis, onAdmire, onSaveInspiration, onCard, onLinkedin, cardCount, linkedinDone, edges }: {
  thesis: string;
  onAdmire: (dataUrl: string) => Promise<AdmireResult>;
  onSaveInspiration: (insp: { name: string; positioning?: string | null; kind?: string; field?: string | null; why: string }) => Promise<void>;
  onCard: (dataUrl: string) => Promise<void>;
  onLinkedin: (url: string) => void;
  cardCount: number;
  linkedinDone: boolean;
  edges: { name: string; why: string }[];
}) {
  const [admire, setAdmire] = useState<AdmireStep>('idle');
  const [res, setRes] = useState<AdmireResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [liOpen, setLiOpen] = useState(false);
  const [li, setLi] = useState('');
  const admireInput = useRef<HTMLInputElement>(null);
  const cardInput = useRef<HTMLInputElement>(null);

  async function onAdmireFile(file: File) {
    setAdmire('reading'); setErr(null);
    try {
      const r = await onAdmire(await readDataUrl(file));
      setRes(r);
      setAdmire(r.ok ? 'extracted' : 'reject');
    } catch { setRes({ ok: false, reject: 'Something went wrong reading that. Try again.' }); setAdmire('reject'); }
    finally { if (admireInput.current) admireInput.current.value = ''; }
  }
  async function onCardFile(file: File) {
    setErr(null);
    try { await onCard(await readDataUrl(file)); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not read that card.'); }
    finally { if (cardInput.current) cardInput.current.value = ''; }
  }
  async function chooseWhy(w: string) {
    if (!res?.name) return;
    await onSaveInspiration({ name: res.name, positioning: res.positioning, kind: res.kind, field: res.field, why: w });
    setAdmire('done');
  }
  function reset() { setAdmire('idle'); setRes(null); }

  return (
    <div style={{ marginTop: 18 }}>
      {edges.length ? (
        <div className="edgerow">
          <div className="navhint" style={{ color: C.accent }}>Your edge, sharper</div>
          {edges.map((e, i) => <div key={i} style={{ fontSize: 13, color: C.hi, marginTop: 6, lineHeight: 1.4 }}>You want {e.why.toLowerCase()} like {e.name}, aimed at your buyers.</div>)}
          <div className="mono" style={{ fontSize: 10, color: C.lo, marginTop: 9 }}>See how it lands again to fold this into your plan.</div>
        </div>
      ) : null}

      {admire === 'idle' ? (
        <>
          <div className="ovl" style={{ marginTop: 22 }}>Make it stronger</div>

          <button className="fuelcard" onClick={() => admireInput.current?.click()}>
            <span className="fuelicon">◎</span>
            <span style={{ flex: 1 }}>
              <span className="fueltitle2">Screenshot a business you admire</span>
              <div className="fuelfor">A LinkedIn, an Instagram, or a site doing something you would love to build. We read what they do, then ask why, to clarify what makes you different.</div>
              <span className="fueltag thesis">feeds your edge</span>
            </span>
          </button>
          <input ref={admireInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onAdmireFile(f); }} />

          <button className={'fuelcard' + (cardCount ? ' done' : '')} onClick={() => cardInput.current?.click()}>
            <span className="fuelicon">▸</span>
            <span style={{ flex: 1 }}>
              <span className="fueltitle2">Snap a business card</span>
              <div className="fuelfor">A real person you know. We add them to your circle so warm reach gets real.</div>
              {cardCount ? <span className="donechk">✓ {cardCount} added to your circle</span> : <span className="fueltag circle">feeds your circle</span>}
            </span>
          </button>
          <input ref={cardInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onCardFile(f); }} />

          {!liOpen ? (
            <button className={'fuelcard' + (linkedinDone ? ' done' : '')} onClick={() => !linkedinDone && setLiOpen(true)} disabled={linkedinDone}>
              <span className="fuelicon">in</span>
              <span style={{ flex: 1 }}>
                <span className="fueltitle2">Connect your LinkedIn</span>
                <div className="fuelfor">Your background, verified. Shows whether you can win it, not just whether it is winnable.</div>
                {linkedinDone ? <span className="donechk">✓ linked — see how it lands to use it</span> : <span className="fueltag ability">feeds fit + credibility</span>}
              </span>
            </button>
          ) : (
            <div className="extracted">
              <div className="navhint">Your LinkedIn</div>
              <input style={{ marginTop: 10 }} value={li} onChange={(e) => setLi(e.target.value)} placeholder="linkedin.com/in/your-profile" />
              <button className="cta" style={{ marginTop: 10 }} disabled={!li.trim()} onClick={() => { onLinkedin(li.trim()); setLiOpen(false); }}><span>Link it</span><span className="mono">→</span></button>
            </div>
          )}

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
          <div className="sub">{res.field ? 'Pick the part that transfers to your offer.' : 'This clarifies your edge. It does not copy them.'}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {WHY_CHIPS.map((w) => <button key={w} className="whychip" onClick={() => chooseWhy(w)}>{w}</button>)}
          </div>
          <button className="backlink" onClick={reset}>cancel</button>
        </div>
      ) : null}

      {admire === 'done' ? (
        <div className="extracted">
          <div className="navhint" style={{ color: C.good }}>✓ Folded into your edge</div>
          <div style={{ fontSize: 14.5, color: C.hi, marginTop: 8, lineHeight: 1.5 }}>Got it. The mark just brightened. Add more, or see how it lands again from below to fold it into your plan.</div>
          <button className="cta" style={{ marginTop: 14 }} onClick={reset}><span>Add more</span><span className="mono">→</span></button>
        </div>
      ) : null}
    </div>
  );
}
