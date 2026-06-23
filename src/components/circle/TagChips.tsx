// The three-bucket intent chips shown in the add-contact confirm step. Presets
// are always available; AI suggestions (from suggest-tags) are pre-highlighted
// with a sparkle but never auto-selected. Selection is stored as namespaced
// slugs on the parent's tags array.
import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TAG_BUCKETS, buildTag, prettifyTag, type TagBucket } from '@/lib/contactTags';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

interface TagContext {
  name?: string | null;
  title?: string | null;
  company?: string | null;
  notes?: string | null;
}

interface TagChipsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  context: TagContext;
}

type SuggestMap = Record<TagBucket, Set<string>>;

const emptySuggest = (): SuggestMap => ({ met: new Set(), brings: new Set(), work: new Set() });

export const TagChips = ({ tags, onChange, context }: TagChipsProps) => {
  const [suggested, setSuggested] = useState<SuggestMap>(emptySuggest);
  // Free (non-preset) slugs the AI proposed, surfaced as extra chips per bucket.
  const [extras, setExtras] = useState<Record<TagBucket, string[]>>({ met: [], brings: [], work: [] });
  const requestedFor = useRef<string>('');

  const selected = new Set(tags);

  const toggle = (bucket: TagBucket, slug: string) => {
    const tag = buildTag(bucket, slug);
    haptics.tap();
    if (selected.has(tag)) onChange(tags.filter((t) => t !== tag));
    else onChange([...tags, tag]);
  };

  // Ask for AI suggestions once we have something to go on. Keyed on the contact
  // signature so we don't refetch on every keystroke, only when it meaningfully
  // changes. Fire-and-forget; failures leave the presets intact.
  useEffect(() => {
    const sig = [context.name, context.title, context.company, context.notes]
      .map((s) => (s ?? '').trim()).join('|');
    if (sig.replace(/\|/g, '').length < 2) return;
    if (requestedFor.current === sig) return;
    requestedFor.current = sig;

    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('suggest-tags', {
          body: { name: context.name, title: context.title, company: context.company, notes: context.notes },
        });
        if (cancelled || !data) return;
        const next = emptySuggest();
        const nextExtras: Record<TagBucket, string[]> = { met: [], brings: [], work: [] };
        for (const b of TAG_BUCKETS) {
          const slugs: string[] = Array.isArray((data as Record<string, unknown>)[b.key])
            ? ((data as Record<string, string[]>)[b.key])
            : [];
          const presetSlugs = new Set(b.presets.map((p) => p.slug));
          for (const slug of slugs) {
            next[b.key].add(slug);
            if (!presetSlugs.has(slug)) nextExtras[b.key].push(slug);
          }
        }
        setSuggested(next);
        setExtras(nextExtras);
      } catch { /* presets stand on their own */ }
    }, 400);

    return () => { cancelled = true; window.clearTimeout(id); };
  }, [context.name, context.title, context.company, context.notes]);

  return (
    <div className="space-y-3">
      {TAG_BUCKETS.map((b) => {
        const options = [...b.presets.map((p) => p.slug), ...extras[b.key]];
        return (
          <div key={b.key}>
            <p className="text-xs font-medium text-foreground-muted mb-1.5">{b.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {options.map((slug) => {
                const tag = buildTag(b.key, slug);
                const isSel = selected.has(tag);
                const isSug = suggested[b.key].has(slug);
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggle(b.key, slug)}
                    aria-pressed={isSel}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 h-7 text-xs font-medium transition-colors',
                      isSel
                        ? 'bg-primary text-primary-foreground'
                        : isSug
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/40'
                          : 'bg-surface-muted/70 text-foreground-secondary hover:bg-surface-muted'
                    )}
                  >
                    {isSug && !isSel && <Sparkles className="w-3 h-3" />}
                    {prettifyTag(tag)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
