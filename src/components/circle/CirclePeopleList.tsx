import { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, Loader2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCirclePeople } from '@/hooks/useCirclePeople';
import { CircleListRow } from '@/components/circle/CircleListRow';

const SERVER_SEARCH_THRESHOLD = 500;
const DEBOUNCE_MS = 250;

interface CirclePeopleListProps {
  totalPeople: number;
  circleLoading: boolean;
  onQuickAdd?: () => void;
  /** Framed mode: fill the parent's bounded height with a pinned search bar and
   *  a single internally-scrolling list, so the page itself never scrolls. */
  framed?: boolean;
  /** Bump this to force a re-fetch of the list (e.g. after a new contact is
   *  added elsewhere on the screen). */
  reloadSignal?: number;
}

export const CirclePeopleList = ({ totalPeople, circleLoading, onQuickAdd, framed = false, reloadSignal }: CirclePeopleListProps) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Only push the search down to the server when the user has more people
  // than we fetch in one page; otherwise filter client-side for snappy feel.
  const useServerSearch = totalPeople > SERVER_SEARCH_THRESHOLD;
  const serverQuery = useServerSearch ? debouncedQuery : '';

  const { people, rawsByPerson, loading, error, truncated, refresh } = useCirclePeople(serverQuery);

  // Parent signalled new data landed (a contact was just added) — re-pull.
  useEffect(() => {
    if (reloadSignal === undefined) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadSignal]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  const filtered = useMemo(() => {
    if (useServerSearch) return people;
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => {
      return (
        p.display_name.toLowerCase().includes(q) ||
        (p.company?.toLowerCase().includes(q) ?? false) ||
        (p.title?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [people, debouncedQuery, useServerSearch]);

  if (!circleLoading && totalPeople === 0) {
    return (
      <section className={cn(
        'flex flex-col items-center text-center px-6',
        framed ? 'h-full justify-center' : 'py-12 mb-6'
      )}>
        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
          <Sparkles className="w-8 h-8 text-primary" strokeWidth={1.6} />
        </div>
        <h2 className="text-title-2 text-foreground mb-2 max-w-sm">
          Start with one person you trust.
        </h2>
        <p className="text-sm text-foreground-secondary leading-relaxed max-w-sm mb-6">
          Snap a business card, paste a LinkedIn URL or Instagram handle, or just say a name.
          We'll figure out the rest.
        </p>
        {onQuickAdd && (
          <button
            onClick={onQuickAdd}
            className={cn(
              'inline-flex items-center gap-2 h-12 px-6 rounded-full',
              'bg-primary text-primary-foreground text-[15px] font-semibold',
              'shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35',
              'active:scale-[0.97] transition-all duration-100'
            )}
          >
            <Camera className="w-4 h-4" strokeWidth={2.4} />
            Add your first person
          </button>
        )}
      </section>
    );
  }

  return (
    <section className={cn(framed ? 'flex min-h-0 flex-1 flex-col' : 'mb-6')}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 backdrop-blur',
          'px-3 h-11 mb-3',
          framed && 'shrink-0'
        )}
      >
        <Search className="w-4 h-4 text-foreground-muted shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, company, or title"
          className="flex-1 bg-transparent text-base text-foreground placeholder:text-foreground-muted outline-none"
          aria-label="Search your Circle"
        />
        {loading && query.length > 0 && (
          <Loader2 className="w-3.5 h-3.5 text-foreground-muted animate-spin shrink-0" />
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive mb-3 shrink-0">Could not load contacts: {error}</p>
      )}

      <div className={cn(framed && 'fit-scroll min-h-0 flex-1')}>
        {loading && people.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-foreground-secondary py-6 text-center">
            {debouncedQuery
              ? `No matches for "${debouncedQuery}".`
              : 'No people to show.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <CircleListRow
                key={p.id}
                person={p}
                raws={rawsByPerson.get(p.id) ?? []}
              />
            ))}
          </div>
        )}
      </div>

      {truncated && (
        <p className={cn('mt-3 text-[11px] text-foreground-muted text-center', framed && 'shrink-0')}>
          Showing {people.length} of {totalPeople.toLocaleString()} — refine your
          search to find a specific person.
        </p>
      )}
    </section>
  );
};
