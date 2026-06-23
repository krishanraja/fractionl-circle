// Zone B of the Circle hero, ember system: "what are you working on right now?"
// -> the few people in your circle who matter most, each with a role + why and
// one-tap warm reach.
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ContactButton } from '@/components/circle/ContactButton';
import { setReadFromText, rankInnerCircle, getReadOffer, type RankedPerson } from '@/lib/theRead';
import type { ContactablePerson } from '@/lib/primaryContact';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

const ROLE_LABEL: Record<string, string> = {
  PROOF: 'Proof', UNLOCK: 'Unlock', MULTIPLIER: 'Multiplier', RISK: 'Risk', MIRROR: 'Mirror',
};

const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const subtitle = (p: RankedPerson) => [p.title, p.company].filter(Boolean).join(' · ');

export default function WorkingOnInput() {
  const { user } = useAuth();
  const userId = user?.id;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ranked, setRanked] = useState<RankedPerson[] | null>(null);
  const [contacts, setContacts] = useState<Map<string, ContactablePerson>>(new Map());

  useEffect(() => {
    if (!userId) return;
    getReadOffer(userId).then((o) => { if (o) setText(o); }).catch(() => {});
  }, [userId]);

  const run = useCallback(async () => {
    const t = text.trim();
    if (!t || busy) return;
    haptics.tap();
    setBusy(true); setErr(null);
    try {
      await setReadFromText(t);
      const people = await rankInnerCircle();
      setRanked(people);
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
      setErr('Could not read that just now — give it another try in a moment.');
    } finally {
      setBusy(false);
    }
  }, [text, busy]);

  return (
    <div>
      <div className="clabel">What are you working on?</div>
      <div className="woin">
        <Sparkles size={16} style={{ color: 'var(--thx-accent)', flex: '0 0 auto' }} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void run(); } }}
          placeholder="What are you working on right now?"
          aria-label="What are you working on right now?"
        />
        <button className="wosend" onClick={() => void run()} disabled={busy || !text.trim()} aria-label="Surface my people">
          {busy ? <Loader2 size={16} style={{ animation: 'thxspin 0.8s linear infinite' }} /> : <ArrowRight size={16} />}
        </button>
      </div>

      {err && <p className="cerr" style={{ marginTop: 8 }}>{err}</p>}

      {ranked !== null && !busy && (
        ranked.length === 0 ? (
          <p className="sub">No one jumps out yet — add a few more people, or tell me a bit more about what you're working on.</p>
        ) : (
          <div style={{ marginTop: 4 }}>
            {ranked.map((p) => {
              const contact = contacts.get(p.id);
              return (
                <div className="crow" key={p.id}>
                  <div className="crowbtn" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                    <div className="cav">{initials(p.name)}</div>
                    <div className="cmeta">
                      <div className="cname" style={{ overflow: 'visible' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                        <span className={cn('rolebadge', p.role === 'RISK' && 'risk')}>{ROLE_LABEL[p.role] ?? p.role}</span>
                      </div>
                      {subtitle(p) && <div className="csub">{subtitle(p)}</div>}
                      <div className="cwhy">{p.why}</div>
                    </div>
                  </div>
                  {contact && (
                    <div style={{ padding: '0 14px 12px 64px' }}>
                      <ContactButton person={contact} raws={[]} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
