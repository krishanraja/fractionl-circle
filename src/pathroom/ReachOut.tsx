// The warm-reach step's ACTUAL action (live). Not advice: the few people going
// quiet, each with a pre-written, grounded draft, and one tap to open it in the
// user's own email or LinkedIn. The draft is EDITABLE in place - make it yours,
// then send - and every edit is recorded (draft_edits) so the digest brain
// learns the user's real voice and future drafts need less editing. Acting
// stamps last_interaction_at so warmth recovers and they stop surfacing as
// cold. Renders BODY only inside ThesisApp's frame; the pinned "back to path"
// action lives in the footer.
import { useEffect, useState } from 'react';
import { C } from './tokens';
import { getWarmDigest, markReachedOut, recordDraftEdit, type ReachPerson } from './thesisData';
import { openLinkedIn, copyToClipboard } from '@/utils/contactActions';

function initials(name: string) {
  return (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const bandColor: Record<string, string> = { cold: C.risk, cooling: C.accent, warm: C.good };

function mailto(p: ReachPerson, body: string): string {
  return `mailto:${encodeURIComponent(p.email || '')}?subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(body)}`;
}

// Grow the textarea to its content so the editable draft reads like the old
// static card, never a scrollbox.
function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

export default function ReachOut({ thesis, move, onLoaded, onReached }: {
  thesis?: string;
  move?: string | null;
  onLoaded?: (n: number) => void;
  onReached?: (count: number) => void;
}) {
  const focused = !!thesis?.trim();
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<ReachPerson[]>([]);
  const [reached, setReached] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  // The user's in-place edits, per person. Missing key = untouched draft.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    getWarmDigest(focused ? { thesis: thesis!, move } : undefined)
      .then((ppl) => { if (!live) return; setPeople(ppl); onLoaded?.(ppl.length); })
      .catch(() => { if (live) setFailed(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thesis, move]);

  async function act(p: ReachPerson, channel: 'email' | 'linkedin' | 'copy') {
    const finalText = (drafts[p.id] ?? p.message).trim() || p.message;
    if (channel === 'email' && p.email) window.location.href = mailto(p, finalText);
    else if (channel === 'linkedin' && p.linkedin_url) openLinkedIn(p.linkedin_url);
    else if (channel === 'copy') await copyToClipboard(finalText, 'Draft');
    // The correction loop: what was drafted vs what they sent, so the digest
    // brain learns their voice. Best-effort, never blocks the send.
    void recordDraftEdit({ person_id: p.id, channel, generated: p.message, final: finalText });
    // Acting on a draft counts as reaching out: warm them back up, and tell the
    // path this move actually happened (so completion is evidence-based).
    if (channel !== 'copy') {
      setReached((s) => {
        const next = new Set(s).add(p.id);
        onReached?.(next.size);
        return next;
      });
      await markReachedOut(p.id).catch(() => {});
    }
  }

  return (
    <>
      <div className="ovl">Your move</div>
      <div className="h" style={{ marginTop: 8, fontSize: 20 }}>Reach out to your network.</div>
      <div className="sub" style={{ marginTop: 6 }}>
        {focused
          ? 'The people in your circle who fit this idea - each with why they fit and a ready draft about it. Open one, send it, and it counts.'
          : 'Pre-written and grounded in your real relationship. Open one, send it, and it counts. No new tool to learn.'}
      </div>

      {loading ? (
        <div className="rmuted" style={{ marginTop: 22 }}>{focused ? 'Finding who fits this idea…' : "Finding who's going quiet…"}</div>
      ) : failed ? (
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="rmuted">Couldn't load your people just now. Try again in a moment.</div>
        </div>
      ) : people.length === 0 ? (
        <div className="panel" style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, color: C.hi, fontWeight: 600 }}>{focused ? 'No one in your circle fits this yet.' : 'Your circle is warm right now.'}</div>
          <div className="rmuted" style={{ marginTop: 6 }}>{focused
            ? 'Add people who match your buyer - or connect a source - and the right people to reach for this idea will surface here.'
            : "No one's gone cold. Add more people and warm-reach moves will surface here as relationships cool."}</div>
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
                <div className="rwhy">{p.why_fit || p.why_now}</div>
                <textarea
                  className="rdraft"
                  ref={autosize}
                  value={drafts[p.id] ?? p.message}
                  onChange={(e) => {
                    setDrafts((d) => ({ ...d, [p.id]: e.target.value }));
                    autosize(e.target);
                  }}
                  aria-label={`Draft to ${p.name} - edit before sending`}
                />
                {(drafts[p.id] ?? p.message).trim() !== p.message.trim()
                  ? <div className="redited">made yours - it learns your voice</div>
                  : <div className="redited" style={{ color: C.lo }}>tap the draft to make it yours</div>}
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
