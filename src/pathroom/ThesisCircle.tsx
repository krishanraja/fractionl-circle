// The circle screen: add people instantly by screenshot (Gemini vision), and connect the
// full LinkedIn network by CSV export (the deep link + the honest 24 to 48 hour wait).
// Renders inside ThesisApp's .thx wrapper, so it inherits thesisCss.
import { useEffect, useRef, useState } from 'react';
import { C, MONO } from './tokens';
import { getCircle, addContactFromImage, importConnectionsCsv, type CircleP } from './thesisData';

const LINKEDIN_EXPORT = 'https://www.linkedin.com/mypreferences/d/download-my-data';

function avatar(name: string) {
  return (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function ThesisCircle({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [list, setList] = useState<CircleP[]>([]);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [csvMsg, setCsvMsg] = useState<string | null>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);

  useEffect(() => { getCircle(userId).then(setList).catch(() => {}); }, [userId]);

  async function onImage(file: File) {
    setErr(null); setAdding(true);
    try {
      const dataUrl: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
      const person = await addContactFromImage(dataUrl);
      setList((l) => [person, ...l]);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not read that image.'); }
    finally { setAdding(false); if (imgInput.current) imgInput.current.value = ''; }
  }

  async function onCsv(file: File) {
    setErr(null); setCsvMsg('Reading your connections...');
    try {
      const text = await file.text();
      const n = await importConnectionsCsv(userId, text);
      setCsvMsg(`Added ${n} people from your network.`);
      setList(await getCircle(userId));
    } catch (e) { setCsvMsg(null); setErr(e instanceof Error ? e.message : 'Could not read that CSV.'); }
    finally { if (csvInput.current) csvInput.current.value = ''; }
  }

  return (
    <div className="wrap">
      <button className="nb" style={{ border: 0, paddingLeft: 0, color: C.lo, marginBottom: 8 }} onClick={onBack}>‹ back</button>
      <div className="ovl">Your circle</div>
      <div className="h" style={{ marginTop: 10 }}>Who do you already know?</div>
      <div className="sub">Add a few people now by screenshot to see it working. Connect your full LinkedIn network for the real warm-reach read.</div>

      <div style={{ marginTop: 18 }}>
        <label className="cta" style={{ cursor: adding ? 'default' : 'pointer', opacity: adding ? 0.6 : 1 }}>
          <span>{adding ? 'reading the profile...' : 'Screenshot a profile to add them'}</span><span className="mono">＋</span>
          <input ref={imgInput} type="file" accept="image/*" style={{ display: 'none' }} disabled={adding}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImage(f); }} />
        </label>
        <div className="mono" style={{ fontSize: 10.5, color: C.lo, marginTop: 8 }}>A LinkedIn or Instagram profile, or a business card. We read the name, title, and company.</div>
        {err ? <div className="mono" style={{ fontSize: 11, color: C.risk, marginTop: 8 }}>{err}</div> : null}
      </div>

      <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
        <div className="ovl">Connect your full network</div>
        <div className="sub" style={{ marginTop: 6 }}>LinkedIn lets you export your connections. It is buried and takes 24 to 48 hours to arrive, so start it now and upload the file when it lands.</div>
        <a href={LINKEDIN_EXPORT} target="_blank" rel="noreferrer" className="chip" style={{ marginTop: 10, textDecoration: 'none' }}>Open LinkedIn export →</a>
        <div style={{ marginTop: 10 }}>
          <label className="chip" style={{ cursor: 'pointer' }}>
            Upload Connections.csv
            <input ref={csvInput} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onCsv(f); }} />
          </label>
        </div>
        {csvMsg ? <div className="mono" style={{ fontSize: 11, color: C.good, marginTop: 8 }}>{csvMsg}</div> : null}
      </div>

      <div style={{ marginTop: 22 }}>
        <div className="ovl">In your circle · {list.length}</div>
        {list.length === 0 ? <div className="mono" style={{ fontSize: 11, color: C.lo, marginTop: 12 }}>No one yet. Add your first by screenshot above.</div> : null}
        {list.slice(0, 60).map((p) => (
          <div key={p.id} style={{ display: 'flex', gap: 11, marginTop: 13, alignItems: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.panel3, border: `1px solid ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 11, color: C.mid, flex: '0 0 auto' }}>{avatar(p.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: C.mid }}>{[p.title, p.company].filter(Boolean).join(' · ') || (p.note ?? '')}</div>
            </div>
            {p.source === 'screenshot' ? <span className="conf" style={{ minWidth: 0 }}>shot</span> : null}
          </div>
        ))}
        {list.length > 60 ? <div className="mono" style={{ fontSize: 10.5, color: C.lo, marginTop: 12 }}>and {list.length - 60} more</div> : null}
      </div>
    </div>
  );
}
