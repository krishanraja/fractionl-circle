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
}

export const CirclePeopleList = ({ totalPeople, circleLoading, onQuickAdd }: CirclePeopleListProps) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Only push the search down to the server when the user has more people
  // than we fetch in one page; otherwise filter client-side for snappy feel.
  const useServerSearch = totalPeople > SERVER_SEARCH_THRESHOLD;
  const serverQuery = useServerSearch ? debouncedQuery : '';

  const { people, rawsByPerson, loading, error, truncated } = useCirclePeople(serverQuery);

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
      <section className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-3 flex-1">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                Start with one person you trust.
              </p>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                Snap a business card, paste a LinkedIn URL or Instagram handle, or just say a name.
                We'll figure out the rest.
              </p>
            </div>
            {onQuickAdd && (
              <button
                onClick={onQuickAdd}
                className={cn(
                  'inline-flex items-center gap-1.5 h-11 px-4 rounded-full',
                  'bg-primary text-primary-foreground text-sm font-medium',
                  'shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-shadow'
                )}
              >
                <Camera className="w-4 h-4" strokeWidth={2.4} />
                Add your first person
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 backdrop-blur',
          'px-3 h-11 mb-3'
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
        <p className="text-xs text-destructive mb-3">Could not load contacts: {error}</p>
      )}

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

      {truncated && (
        <p className="mt-3 text-[11px] text-foreground-muted text-center">
          Showing {people.length} of {totalPeople.toLocaleString()} — refine your
          search to find a specific person.
        </p>
      )}
    </section>
  );
};
