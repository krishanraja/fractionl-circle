// The warm-reach step's ACTUAL action (live). Not advice: the few people going
// quiet, each with a pre-written, grounded draft, and one tap to open it in the
// user's own email or LinkedIn. Acting stamps last_interaction_at so warmth
// recovers and they stop surfacing as cold. Renders BODY only inside ThesisApp's
// frame; the pinned "back to path" action lives in the footer.
import { useEffect, useState } from 'react';
import { C } from './tokens';
import { getWarmDigest, markReachedOut, type ReachPerson } from './thesisData';
import { openLinkedIn, copyToClipboard } from '@/utils/contactActions';

function initials(name: string) {
  return (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const bandColor: Record<string, string> = { cold: C.risk, cooling: C.accent, warm: C.good };

function mailto(p: ReachPerson): string {
  return `mailto:${encodeURIComponent(p.email || '')}?subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(p.message)}`;
}

export default function ReachOut({ onLoaded }: { onLoaded?: (n: number) => void }) {
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<ReachPerson[]>([]);
  const [reached, setReached] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    getWarmDigest()
      .then((ppl) => { if (!live) return; setPeople(ppl); onLoaded?.(ppl.length); })
      .catch(() => { if (live) setFailed(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(p: ReachPerson, channel: 'email' | 'linkedin' | 'copy') {
    if (channel === 'email' && p.email) window.location.href = mailto(p);
    else if (channel === 'linkedin' && p.linkedin_url) openLinkedIn(p.linkedin_url);
    else if (channel === 'copy') await copyToClipboard(p.message, 'Draft');
    // Acting on a draft counts as reaching out: warm them back up.
    if (channel !== 'copy') {
      setReached((s) => new Set(s).add(p.id));
      await markReachedOut(p.id).catch(() => {});
    }
  }

  return (
    <>
      <div className="ovl">Your move</div>
      <div className="h" style={{ marginTop: 8, fontSize: 20 }}>Reach out to your network.</div>
      <div className="sub" style={{ marginTop: 6 }}>
        Pre-written and grounded in your real relationship. Open one, send it, and it counts. No new tool to learn.
      </div>

      {loading ? (
        <div className="rmuted" style={{ marginTop: 22 }}>Finding who's going quiet…</div>
      ) : failed ? (
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="rmuted">Couldn't load your people just now. Try again in a moment.</div>
        </div>
      ) : people.length === 0 ? (
        <div className="panel" style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, color: C.hi, fontWeight: 600 }}>Your circle is warm right now.</div>
          <div className="rmuted" style={{ marginTop: 6 }}>No one's gone cold. Add more people and warm-reach moves will surface here as relationships cool.</div>
        </div>
      ) : (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {people.map((p) => {
            const done = reached.has(p.id);
            const sub = [p.title, p.company].filter(Boolean).join(' · ');
            return (
              <div key={p.id} className={'rperson' + (done ? ' done' : '')}>
                <div className="rhead">
                  <span className="rface">{initials(p.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rname">{p.name}{done ? <span className="rdone">✓ reached out</span> : null}</div>
                    {sub ? <div className="rsub">{sub}</div> : null}
                  </div>
                  <span className="rband" style={{ color: bandColor[p.band] || C.mid, borderColor: (bandColor[p.band] || C.mid) + '55' }}>{p.band}</span>
                </div>
                <div className="rwhy">{p.why_now}</div>
                <div className="rdraft">{p.message}</div>
                <div className="ractions">
                  {p.email ? <button className="rbtn primary" onClick={() => act(p, 'email')}>Open in email</button> : null}
                  {p.linkedin_url ? <button className="rbtn" onClick={() => act(p, 'linkedin')}>LinkedIn</button> : null}
                  <button className="rbtn ghost" onClick={() => act(p, 'copy')}>Copy</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
