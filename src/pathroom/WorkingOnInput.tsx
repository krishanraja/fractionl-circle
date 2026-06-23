// Zone B of the Circle hero: "what are you working on right now?" -> the few
// people in your circle who matter most for that, each with a role + one-line
// why, and one-tap warm reach. Wraps extract-read -> rank-inner-circle.
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

  // Prefill with what they last told us, so the loop feels continuous.
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
    <div className="space-y-3">
      <div
        className={cn(
          'flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 backdrop-blur',
          'px-3.5 h-12 focus-within:border-primary/50 transition-colors'
        )}
      >
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void run(); } }}
          placeholder="What are you working on right now?"
          aria-label="What are you working on right now?"
          className="flex-1 min-w-0 bg-transparent text-[15px] text-foreground placeholder:text-foreground-muted outline-none"
        />
        <button
          onClick={() => void run()}
          disabled={busy || !text.trim()}
          aria-label="Surface my people"
          className={cn(
            'shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors',
            text.trim() && !busy
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface-muted text-foreground-muted'
          )}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      {err && <p className="text-xs text-destructive px-1">{err}</p>}

      {ranked !== null && !busy && (
        ranked.length === 0 ? (
          <p className="text-[13px] text-foreground-secondary px-1 leading-relaxed">
            No one jumps out yet — add a few more people, or tell me a bit more about what you're working on.
          </p>
        ) : (
          <div className="max-h-[34vh] fit-scroll space-y-2 pr-0.5">
            {ranked.map((p) => {
              const contact = contacts.get(p.id);
              return (
                <div key={p.id} className="rounded-2xl bg-card/70 backdrop-blur p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/12 text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                      {initials(p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-foreground truncate">{p.name}</p>
                        <span className={cn(
                          'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                          p.role === 'RISK' ? 'bg-destructive/12 text-destructive' : 'bg-primary/12 text-primary'
                        )}>
                          {ROLE_LABEL[p.role] ?? p.role}
                        </span>
                      </div>
                      {subtitle(p) && (
                        <p className="text-[12px] text-foreground-secondary truncate mt-0.5">{subtitle(p)}</p>
                      )}
                      <p className="text-[12.5px] text-foreground-secondary leading-snug mt-1">{p.why}</p>
                    </div>
                  </div>
                  {contact && (
                    <div className="mt-2 pl-12">
                      <ContactButton person={contact} raws={[]} size="sm" />
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
