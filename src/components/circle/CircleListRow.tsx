import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ContactButton } from '@/components/circle/ContactButton';
import { PickProfileSheet } from '@/components/circle/PickProfileSheet';
import { prettifyTag, tagBucket } from '@/lib/contactTags';
import { enrichLinkedin, dossierSummary, type ProfileCandidate } from '@/lib/enrich';
import { haptics } from '@/utils/haptics';
import type { ContactableRaw } from '@/lib/primaryContact';
import type { CirclePerson } from '@/hooks/useCirclePeople';

interface CircleListRowProps {
  person: CirclePerson;
  raws: ContactableRaw[];
}

const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const subtitle = (p: CirclePerson): string => {
  const parts = [p.title, p.company].filter(Boolean) as string[];
  if (parts.length > 0) return parts.join(' · ');
  return p.primary_email ?? p.linkedin_url ?? p.primary_phone ?? '';
};

export const CircleListRow = ({ person, raws }: CircleListRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const detail = subtitle(person);

  const [enriching, setEnriching] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ProfileCandidate[] | null>(null);

  const runEnrich = async (linkedinUrl?: string) => {
    if (enriching) return;
    haptics.tap();
    setEnriching(true);
    try {
      const res = await enrichLinkedin(person.id, linkedinUrl);
      if (res.status === 'done') {
        setSummary(dossierSummary(res.dossier) ?? res.note ?? 'More details added.');
        toast.success('More details added');
      } else if (res.status === 'needs_disambiguation') {
        setCandidates(res.candidates);
      } else if (res.status === 'no_keys') {
        toast('More details are not available yet', { description: 'Connect a source to look for more information.' });
      } else if (res.status === 'limit') {
        toast('You have used your free searches this month', {
          description: `Upgrade to Pro for unlimited searches (${res.limit} a month on Free).`,
        });
      } else {
        toast.error('Could not find more details');
      }
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="crow">
      <button className="crowbtn" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <div className="cav">{initials(person.display_name)}</div>
        <div className="cmeta">
          <div className="cname">{person.display_name}</div>
          {detail && <div className="csub">{detail}</div>}
        </div>
        <ChevronDown size={16} className={cn('cchev', expanded && 'open')} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="cbody">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <ContactButton
                  person={{
                    id: person.id,
                    display_name: person.display_name,
                    primary_email: person.primary_email,
                    primary_phone: person.primary_phone,
                    linkedin_url: person.linkedin_url,
                    handles: person.handles,
                  }}
                  raws={raws}
                />
                <button className="ghostbtn" onClick={() => runEnrich()} disabled={enriching}>
                  {enriching
                    ? <Loader2 size={13} style={{ animation: 'thxspin 0.8s linear infinite' }} />
                    : <Sparkles size={13} />}
                  {enriching ? 'Looking…' : 'Find more details'}
                </button>
              </div>

              {summary && <div className="cwhy">{summary}</div>}

              {person.tags && person.tags.length > 0 && (
                <div className="tagrow">
                  {person.tags.map((tag) => (
                    <span key={tag} className={cn('tag', tagBucket(tag) ?? undefined)}>{prettifyTag(tag)}</span>
                  ))}
                </div>
              )}

              {person.last_interaction_at && (
                <div className="ssrc">Last interaction {new Date(person.last_interaction_at).toLocaleDateString()}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {candidates && (
        <PickProfileSheet
          open={candidates !== null}
          onOpenChange={(o) => { if (!o) setCandidates(null); }}
          personId={person.id}
          personName={person.display_name}
          candidates={candidates}
          onResolved={(res) => {
            if (res.status === 'done') {
              setSummary(dossierSummary(res.dossier) ?? res.note ?? 'More details added.');
              toast.success('More details added');
            } else if (res.status === 'failed') {
              toast.error('Could not find more details');
            }
            setCandidates(null);
          }}
        />
      )}
    </div>
  );
};
