import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, UserPlus } from 'lucide-react';
import { useCirclePeople } from '@/hooks/useCirclePeople';
import { CircleListRow } from '@/components/circle/CircleListRow';

const SERVER_SEARCH_THRESHOLD = 500;
const DEBOUNCE_MS = 250;

interface CirclePeopleListProps {
  totalPeople: number;
  circleLoading: boolean;
  onQuickAdd?: () => void;
  /** Bump to force a re-fetch after a contact is added elsewhere. */
  reloadSignal?: number;
}

export const CirclePeopleList = ({ totalPeople, circleLoading, onQuickAdd, reloadSignal }: CirclePeopleListProps) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const useServerSearch = totalPeople > SERVER_SEARCH_THRESHOLD;
  const serverQuery = useServerSearch ? debouncedQuery : '';

  const { people, rawsByPerson, loading, error, truncated, refresh } = useCirclePeople(serverQuery);

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
    return people.filter((p) =>
      p.display_name.toLowerCase().includes(q) ||
      (p.company?.toLowerCase().includes(q) ?? false) ||
      (p.title?.toLowerCase().includes(q) ?? false),
    );
  }, [people, debouncedQuery, useServerSearch]);

  // Empty circle — the warm first-run prompt.
  if (!circleLoading && totalPeople === 0) {
    return (
      <section className="emptywrap">
        <div className="hticon" style={{ width: 52, height: 52, borderRadius: 14 }}>
          <UserPlus size={24} strokeWidth={1.7} />
        </div>
        <div className="h" style={{ marginTop: 16 }}>Start with one person you trust.</div>
        <div className="sub" style={{ maxWidth: 320 }}>Snap a business card, paste a LinkedIn URL, or just say a name. We'll figure out the rest.</div>
        {onQuickAdd && (
          <button className="cta" style={{ marginTop: 18, maxWidth: 280 }} onClick={onQuickAdd}>
            <span className="ctaicon"><UserPlus size={18} strokeWidth={2.2} /> Add your first person</span>
            <span className="mono">→</span>
          </button>
        )}
      </section>
    );
  }

  return (
    <section>
      <div className="clabel">Your people{totalPeople > 0 ? ` · ${totalPeople}` : ''}</div>
      <div className="csearch">
        <Search size={16} style={{ color: 'var(--thx-lo)', flex: '0 0 auto' }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, company, or title"
          aria-label="Search your Circle"
        />
        {loading && query.length > 0 && <Loader2 size={14} className="mono" style={{ color: 'var(--thx-lo)', animation: 'thxspin 0.8s linear infinite' }} />}
      </div>

      {error && <p className="cerr" style={{ marginTop: 10 }}>Could not load contacts: {error}</p>}

      {loading && people.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
          <Loader2 size={20} style={{ color: 'var(--thx-accent)', animation: 'thxspin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="sub" style={{ textAlign: 'center', padding: '20px 0' }}>
          {debouncedQuery ? `No matches for "${debouncedQuery}".` : 'No people to show.'}
        </p>
      ) : (
        <div>
          {filtered.map((p) => (
            <CircleListRow key={p.id} person={p} raws={rawsByPerson.get(p.id) ?? []} />
          ))}
        </div>
      )}

      {truncated && (
        <p className="ssrc" style={{ textAlign: 'center', marginTop: 12 }}>
          Showing {people.length} of {totalPeople.toLocaleString()} — refine your search.
        </p>
      )}
    </section>
  );
};
