import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContactButton } from '@/components/circle/ContactButton';
import { prettifyTag, tagBucket } from '@/lib/contactTags';
import type { ContactableRaw } from '@/lib/primaryContact';
import type { CirclePerson } from '@/hooks/useCirclePeople';

interface CircleListRowProps {
  person: CirclePerson;
  raws: ContactableRaw[];
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const subtitle = (p: CirclePerson): string => {
  const parts = [p.title, p.company].filter(Boolean) as string[];
  if (parts.length > 0) return parts.join(' · ');
  return p.primary_email ?? p.linkedin_url ?? p.primary_phone ?? '';
};

export const CircleListRow = ({ person, raws }: CircleListRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const detail = subtitle(person);

  return (
    <motion.div
      layout
      className="rounded-2xl bg-card/70 backdrop-blur hover:bg-card transition-colors"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-surface-muted/50 transition-colors rounded-2xl"
      >
        <div className="w-10 h-10 rounded-full bg-primary/12 text-primary font-semibold text-sm flex items-center justify-center shrink-0">
          {initials(person.display_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-foreground truncate">
            {person.display_name}
          </p>
          {detail && (
            <p className="text-[13px] text-foreground-secondary truncate mt-0.5">{detail}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-foreground-muted shrink-0 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 space-y-2">
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
                size="sm"
              />

              {person.tags && person.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {person.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                        tagBucket(tag) === 'brings'
                          ? 'bg-success/10 text-success'
                          : tagBucket(tag) === 'work'
                            ? 'bg-accent/15 text-accent-foreground'
                            : 'bg-primary/10 text-primary'
                      )}
                    >
                      {prettifyTag(tag)}
                    </span>
                  ))}
                </div>
              )}

              {person.last_interaction_at && (
                <p className="text-[11px] text-foreground-muted">
                  Last interaction{' '}
                  {new Date(person.last_interaction_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
