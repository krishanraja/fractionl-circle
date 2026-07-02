// The one box at the top of Circle. Say what you're working on (we surface the few
// people in your circle who matter most, each with a role + why) OR name who - or
// the kind of person - you're looking for (we search your whole network for a real,
// grounded fit). Type it or voice-note it. One-tap warm reach on every result.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, Sparkles, Mic, Square, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useCredits } from '@/hooks/useCredits';
import { ContactButton } from '@/components/circle/ContactButton';
import { runBoxQuery, getReadOffer, type BoxIntent, type InnerRole } from '@/lib/theRead';
import type { ContactablePerson } from '@/lib/primaryContact';
import BuyCreditsSheet from './BuyCreditsSheet';
import { DEEP_ENRICH_CREDITS } from '@/lib/creditCosts';
import { BOX } from './copy';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

const ROLE_LABEL: Record<string, string> = {
  PROOF: 'Proof', UNLOCK: 'Unlock', MULTIPLIER: 'Multiplier', RISK: 'Risk', MIRROR: 'Mirror',
};

const MAX_RECORDING_MS = 60_000;

// One shape the row renderer can draw whether the box was read as "what I'm
// working on" (has a role) or "who I'm looking for" (has matched_on provenance,
// a degree, and cited evidence).
interface DisplayPerson {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  why: string;
  role?: InnerRole | string;
  degree?: 'first' | 'second';
  matchedOn?: string | null;
}

const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const subtitle = (p: DisplayPerson) => [p.title, p.company].filter(Boolean).join(' · ');

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = typeof reader.result === 'string' ? reader.result : '';
      resolve(s.includes(',') ? s.split(',')[1] : s);
    };
    reader.onerror = () => reject(new Error('Could not read audio'));
    reader.readAsDataURL(blob);
  });

export default function WorkingOnInput() {
  const { user } = useAuth();
  const userId = user?.id;
  const { profile, updateProfile } = useUserProfile();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [intent, setIntent] = useState<BoxIntent | null>(null);
  const [results, setResults] = useState<DisplayPerson[] | null>(null);
  const [contacts, setContacts] = useState<Map<string, ContactablePerson>>(new Map());
  const [digging, setDigging] = useState<Set<string>>(new Set());
  const [buyOpen, setBuyOpen] = useState(false);
  const { balance, digDeeper } = useCredits();
  const seeded = useRef(false);

  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording, error: recError } =
    useVoiceRecording({ maxDuration: MAX_RECORDING_MS });

  // One "what I do" statement, shared with the profile. Seed the box from the
  // profile's positioning (what they set in Settings); fall back to the last read.
  // Seed once so we never stomp what they're actively typing.
  useEffect(() => {
    if (seeded.current || !userId) return;
    const pos = profile?.positioning?.trim();
    if (pos) { setText(pos); seeded.current = true; return; }
    getReadOffer(userId).then((o) => { if (o && !seeded.current) { setText(o); seeded.current = true; } }).catch(() => {});
  }, [userId, profile?.positioning]);

  const run = useCallback(async (raw?: string) => {
    const t = (raw ?? text).trim();
    if (!t || busy) return;
    haptics.tap();
    setBusy(true); setErr(null);
    try {
      const res = await runBoxQuery(t);
      setIntent(res.intent);
      let people: DisplayPerson[];
      if (res.intent === 'working_on') {
        // Same statement is "how they position themselves" in Settings; keep it in
        // sync so the ranking and the profile share one brain. Fire-and-forget.
        updateProfile({ positioning: t }).catch(() => {});
        people = (res.working ?? []).map((p) => ({
          id: p.id, name: p.name, title: p.title, company: p.company, why: p.why, role: p.role,
        }));
      } else {
        people = (res.found ?? []).map((p) => ({
          id: p.id, name: p.name, title: p.title, company: p.company, why: p.why,
          degree: p.degree, matchedOn: p.matched_on,
        }));
      }
      setResults(people);
      if (people.length) {
        const { data } = await supabase
          .from('circle_person')
          .select('id, display_name, primary_email, primary_phone, linkedin_url, handles')
          .in('id', people.map((p) => p.id));
        const map = new Map<string, ContactablePerson>();
        for (const row of (data ?? []) as ContactablePerson[]) map.set(row.id, row);
        setContacts(map);
      }
    } catch {
      setErr('Could not read that just now - give it another try in a moment.');
    } finally {
      setBusy(false);
    }
  }, [text, busy, updateProfile]);

  // Voice: record -> transcribe -> drop into the box -> run. Reset the recorder
  // after we've consumed the blob so a second take works and this effect can't loop.
  useEffect(() => {
    if (!audioBlob) return;
    let cancelled = false;
    (async () => {
      setTranscribing(true); setErr(null);
      try {
        const base64 = await blobToBase64(audioBlob);
        const { data, error } = await supabase.functions.invoke('transcribe', { body: { audio: base64, format: 'webm' } });
        if (error) throw new Error(error.message || 'Transcription failed');
        const tr = (data as { transcript?: string } | null)?.transcript?.trim() ?? '';
        if (cancelled) return;
        if (!tr) { setErr('Nothing came through - try again?'); return; }
        setText(tr);
        void run(tr);
      } catch {
        if (!cancelled) setErr('Could not hear that clearly - try again, or type it.');
      } finally {
        if (!cancelled) { setTranscribing(false); resetRecording(); }
      }
    })();
    return () => { cancelled = true; };
  }, [audioBlob]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (recError) setErr(recError); }, [recError]);

  const toggleMic = () => {
    if (isRecording) { haptics.tap(); stopRecording(); }
    else { haptics.medium(); setErr(null); void startRecording(); }
  };

  // Spend credits to run the max-effort enrichment on one person, then re-rank with
  // the richer profile. Honest about every outcome, and never silent about cost.
  const handleDig = useCallback(async (id: string) => {
    setDigging((prev) => new Set(prev).add(id));
    try {
      const res = await digDeeper(id);
      if (res.status === 'done') { toast.success('Found more - re-ranking.'); void run(); }
      else if (res.status === 'insufficient') { toast('Not enough credits to dig deeper.'); setBuyOpen(true); }
      else if (res.status === 'no_keys') { toast('Deep search isn’t switched on yet.'); }
      else { toast('Couldn’t find more on them - you weren’t charged.'); }
    } catch {
      toast('Something went wrong - you weren’t charged.');
    } finally {
      setDigging((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [digDeeper, run]);

  const micBusy = transcribing;

  return (
    <div>
      <div className="clabel">{BOX.label}</div>
      <div className="woin">
        <Sparkles size={16} style={{ color: 'var(--thx-accent)', flex: '0 0 auto' }} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void run(); } }}
          placeholder={BOX.placeholder}
          aria-label={BOX.label}
        />
        <button
          className={cn('womic', isRecording && 'rec')}
          onClick={toggleMic}
          disabled={busy || micBusy}
          aria-label={isRecording ? 'Stop recording' : BOX.voiceHint}
          title={isRecording ? 'Stop' : BOX.voiceHint}
        >
          {micBusy ? <Loader2 size={16} style={{ animation: 'thxspin 0.8s linear infinite' }} />
            : isRecording ? <Square size={14} strokeWidth={2.5} />
            : <Mic size={16} />}
        </button>
        <button className="wosend" onClick={() => void run()} disabled={busy || micBusy || !text.trim()} aria-label="Surface my people">
          {busy ? <Loader2 size={16} style={{ animation: 'thxspin 0.8s linear infinite' }} /> : <ArrowRight size={16} />}
        </button>
      </div>

      {isRecording && <p className="sub" style={{ marginTop: 8 }}>Listening… tap the square to stop.</p>}
      {err && <p className="cerr" style={{ marginTop: 8 }}>{err}</p>}

      {results !== null && !busy && (
        results.length === 0 ? (
          <p className="sub" style={{ marginTop: 10 }}>
            {intent === 'find_people'
              ? BOX.foundEmpty
              : "No one jumps out yet - add a few more people, or tell me a bit more about what you're working on."}
          </p>
        ) : (
          <div style={{ marginTop: 4 }}>
            {intent === 'find_people' && <div className="clabel" style={{ marginTop: 12 }}>{BOX.foundLabel}</div>}
            {results.map((p) => {
              const contact = contacts.get(p.id);
              return (
                <div className="crow" key={p.id}>
                  <div className="crowbtn" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                    <div className="cav">{initials(p.name)}</div>
                    <div className="cmeta">
                      <div className="cname" style={{ overflow: 'visible' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                        {p.role && <span className={cn('rolebadge', p.role === 'RISK' && 'risk')}>{ROLE_LABEL[p.role] ?? p.role}</span>}
                        {p.degree === 'second' && <span className="rolebadge inferred">Inferred</span>}
                      </div>
                      {subtitle(p) && <div className="csub">{subtitle(p)}</div>}
                      <div className="cwhy">{p.why}</div>
                      {p.matchedOn && (
                        <div className="cmatch"><Link2 size={10} /> {p.degree === 'second' ? 'Route via' : 'Matched on'} {p.matchedOn}</div>
                      )}
                    </div>
                  </div>
                  {(contact || intent === 'find_people') && (
                    <div style={{ padding: '0 14px 12px 64px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {contact && <ContactButton person={contact} raws={[]} />}
                      {intent === 'find_people' && (
                        <button className="ghostbtn" disabled={digging.has(p.id)} onClick={() => void handleDig(p.id)}>
                          {digging.has(p.id)
                            ? <><Loader2 size={12} style={{ animation: 'thxspin 0.8s linear infinite' }} /> Digging…</>
                            : <><Sparkles size={12} /> Dig deeper</>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {intent === 'find_people' && (
              <p className="sub" style={{ marginTop: 10, fontSize: 11.5 }}>
                Dig deeper runs a full web search on someone - {DEEP_ENRICH_CREDITS} credits each.{' '}
                <button
                  onClick={() => setBuyOpen(true)}
                  style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--thx-accent)', font: 'inherit' }}
                >
                  {balance ?? '-'} credits · Buy more
                </button>
              </p>
            )}
          </div>
        )
      )}

      <BuyCreditsSheet open={buyOpen} onOpenChange={setBuyOpen} />
    </div>
  );
}
