// Client glue for the surfacing loop. Both edge functions already exist and are
// auth'd + rate-limited; this just wires them to the Circle hero:
//   setReadFromText  -> extract-read   (free text -> structured the_read)
//   rankInnerCircle  -> rank-inner-circle (the_read + circle -> who matters now)
import { supabase } from '@/integrations/supabase/client';

export type InnerRole = 'PROOF' | 'UNLOCK' | 'MULTIPLIER' | 'RISK' | 'MIRROR';

export interface RankedPerson {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  role: InnerRole | string;
  why: string;
}

// Update the_read from the user's own words ("what are you working on right now?").
export async function setReadFromText(text: string): Promise<void> {
  const { error } = await supabase.functions.invoke('extract-read', { body: { text } });
  if (error) throw error;
}

// Re-rank the user's real network for their current direction. Returns [] when
// the read is thin or the circle is empty - an encouraging empty state, not an error.
export async function rankInnerCircle(): Promise<RankedPerson[]> {
  const { data, error } = await supabase.functions.invoke('rank-inner-circle');
  if (error) throw error;
  const people = (data as { people?: unknown })?.people;
  return Array.isArray(people) ? (people as RankedPerson[]) : [];
}

// One cited fact behind a match, so the UI can show honest provenance.
export interface MatchEvidence {
  claim: string;
  source: string; // title | company | tags | note | summary | experience | education | skills
}

// A person surfaced by a people-search (find_people intent). Unlike RankedPerson
// there is no inner-circle role; instead we carry the degree of the match, the real
// fact that matched (matched_on), the cited evidence, and how sure we are
// (confidence 0..1). "second" degree = an evidence-backed route to the target
// (INFERRED), never an invented relationship.
export interface NetworkMatch {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  why: string;
  degree: 'first' | 'second';
  matched_on: string | null;
  confidence: number | null;
  evidence: MatchEvidence[];
}

export type BoxIntent = 'working_on' | 'find_people';

// Search the WHOLE network for people who fit a "who can help with X" query.
// v1 matches over data already connected (title/company/tags/note/dossier); no new
// enrichment. Returns [] on a thin/ungrounded result - an honest empty state.
export async function searchNetwork(query: string): Promise<NetworkMatch[]> {
  const { data, error } = await supabase.functions.invoke('search-network', { body: { query } });
  if (error) throw error;
  const people = (data as { people?: unknown })?.people;
  return Array.isArray(people) ? (people as NetworkMatch[]) : [];
}

// Route one box submission. The edge function first classifies the query: if the
// user is describing THEIR OWN direction we fall back to the existing read+rank
// loop; if they're looking for someone we return network matches. The single
// server round trip owns the classification so the client never has to guess.
export interface BoxResult {
  intent: BoxIntent;
  working?: RankedPerson[];
  found?: NetworkMatch[];
  // Set when the whole-network find path is Pro-gated for this (free) user.
  upgrade?: boolean;
}

// Exact-name lookup stays available even when semantic whole-network search is
// plan-gated. This is the basic promise of saving someone: if the user names
// that person, Circle can bring them back without an LLM or paid search.
async function findSavedPersonByExactName(query: string): Promise<NetworkMatch[]> {
  const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!normalizedQuery) return [];

  const { data, error } = await supabase
    .from('circle_person')
    .select('id, display_name, title, company')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  const exact = (data ?? [])
    .filter((person) => {
      const name = person.display_name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      return name.length >= 3 && (` ${normalizedQuery} `).includes(` ${name} `);
    })
    .sort((a, b) => b.display_name.length - a.display_name.length)
    .slice(0, 1);

  return exact.map((person) => ({
    id: person.id,
    name: person.display_name,
    title: person.title,
    company: person.company,
    why: `You saved ${person.display_name} in Circle.`,
    degree: 'first' as const,
    matched_on: 'saved name',
    confidence: 1,
    evidence: [],
  }));
}

const LOCAL_SEARCH_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'who', 'find', 'someone',
  'person', 'help', 'could', 'would', 'about', 'testing', 'test', 'idea', 'tool', 'teams',
  'team', 'build', 'building', 'want', 'need', 'have', 'work', 'working',
]);

async function findSavedPeopleByKeywords(query: string): Promise<NetworkMatch[]> {
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !LOCAL_SEARCH_STOPWORDS.has(token));
  if (!tokens.length) return [];

  const { data, error } = await supabase
    .from('circle_person')
    .select('id, display_name, title, company, tags, note, dossier')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  return (data ?? [])
    .map((person) => {
      const detail = [
        person.display_name,
        person.title,
        person.company,
        ...(person.tags ?? []),
        person.note,
        person.dossier ? JSON.stringify(person.dossier).slice(0, 4_000) : null,
      ].filter(Boolean).join(' ').toLowerCase();
      const matched = tokens.filter((token) => detail.includes(token));
      return { person, matched };
    })
    .filter(({ matched }) => matched.length > 0)
    .sort((a, b) => b.matched.length - a.matched.length)
    .slice(0, 6)
    .map(({ person, matched }) => ({
      id: person.id,
      name: person.display_name,
      title: person.title,
      company: person.company,
      why: `Your saved details connect ${person.display_name} to ${matched.slice(0, 2).join(' and ')}.`,
      degree: 'first' as const,
      matched_on: matched.slice(0, 2).join(', '),
      confidence: Math.min(0.82, 0.56 + (matched.length * 0.08)),
      evidence: [],
    }));
}

function isClearlyWorkingOn(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[’']/g, "'");
  const asksToFind = /\b(who|find|someone|person|intro|introduction|looking for|know anyone)\b/.test(normalized);
  if (asksToFind) return false;
  const ownsDirection = /\b(i am|i'm|i want|i need|my|we are|we're|our|working on)\b/.test(normalized);
  const ideaLanguage = /\b(test|testing|validate|validating|build|building|launch|launching|idea|offer|service|product|tool|business|pricing)\b/.test(normalized);
  return ownsDirection && ideaLanguage;
}

export async function runBoxQuery(text: string): Promise<BoxResult> {
  // Resolve a directly named saved person locally first. It is faster, works
  // offline from the LLM search path, and keeps a basic saved-contact lookup
  // available regardless of plan or provider health.
  const exact = await findSavedPersonByExactName(text);
  if (exact.length) return { intent: 'find_people', found: exact };

  if (isClearlyWorkingOn(text)) {
    try {
      await setReadFromText(text);
      const ranked = await rankInnerCircle();
      if (ranked.length) return { intent: 'working_on', working: ranked };
    } catch {
      // Provider or function failure falls through to a transparent local rank.
    }
    const local = await findSavedPeopleByKeywords(text);
    return {
      intent: 'working_on',
      working: local.map((person) => ({
        id: person.id,
        name: person.name,
        title: person.title,
        company: person.company,
        role: 'PROOF',
        why: person.why,
      })),
    };
  }

  const { data, error } = await supabase.functions.invoke('search-network', { body: { query: text } });
  if (error) {
    // Full-network search is Pro. The server replies 402 with code
    // 'upgrade_required'; supabase-js surfaces that as an invoke error whose body
    // is on error.context. Detect it and let the box render an upgrade prompt
    // instead of throwing or mis-routing to the working_on path.
    try {
      const context = (error as { context?: { status?: number; clone?: () => { json?: () => Promise<{ code?: string }> }; json?: () => Promise<{ code?: string }> } }).context;
      if (context?.status === 402) {
        return { intent: 'find_people', found: [], upgrade: true };
      }
      const body = await (context?.clone?.().json?.() ?? context?.json?.());
      if (body?.code === 'upgrade_required') {
        return { intent: 'find_people', found: [], upgrade: true };
      }
    } catch { /* fall through to local recovery */ }
    const local = await findSavedPeopleByKeywords(text);
    if (local.length) return { intent: 'find_people', found: local };
    throw error;
  }
  const intent = (data as { intent?: string } | null)?.intent;
  if (intent === 'find_people') {
    const people = (data as { people?: unknown })?.people;
    return { intent: 'find_people', found: Array.isArray(people) ? (people as NetworkMatch[]) : [] };
  }
  // working_on: the query is about the user's own direction - read it and rank the
  // inner circle, exactly as the box did before.
  await setReadFromText(text);
  const working = await rankInnerCircle();
  return { intent: 'working_on', working };
}

// The last thing they told us they were working on, to prefill the input.
export async function getReadOffer(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('the_read')
    .select('offer_one_liner')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as { offer_one_liner: string | null } | null)?.offer_one_liner ?? null;
}
