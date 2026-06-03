// Shared "who is this user" envelope. Every AI surface (extract-ideas,
// run-match-engine, generate-sunday-letter) loads this and injects it into the
// system prompt so output is anchored to the specific fractional operator —
// never generic. Wave 1 reads only columns that already exist on user_profiles
// (no migration). Wave 2 will add motivation/journey/offer-maturity behind a
// flag.
//
// NOTE: user_profiles is keyed by `id` (= auth user id), NOT `user_id`.

// deno-lint-ignore-file no-explicit-any

export interface ProfileContext {
  full_name: string | null;
  role: string | null;
  business_type: string | null;
  positioning: string | null;
  client_stages: string[] | null;
  client_verticals: string[] | null;
}

export async function loadProfileContext(
  supabase: any,
  userId: string,
): Promise<ProfileContext | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('full_name, role, business_type, positioning, client_stages, client_verticals')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('loadProfileContext:', error.message);
    return null;
  }
  return (data as ProfileContext | null) ?? null;
}

const ROLE_LABELS: Record<string, string> = {
  cmo: 'CMO', coo: 'COO', cfo: 'CFO', cro: 'CRO', cpo: 'CPO', cto: 'CTO',
  chief_of_staff: 'Chief of Staff', other: 'Senior functional leader',
};

const OVERRIDES: Record<string, string> = {
  saas: 'SaaS', ai_ml: 'AI/ML', dtc: 'DTC / Consumer', dev_tools: 'Dev tools',
  pe_backed: 'PE-backed', series_c_plus: 'Series C+', pre_seed: 'Pre-seed',
  series_a: 'Series A', series_b: 'Series B', edtech: 'EdTech',
  healthtech: 'Healthtech', fintech: 'Fintech', enterprise: 'Enterprise',
  marketplace: 'Marketplaces', climate: 'Climate',
  fractional_executive: 'Fractional executive', consulting_firm: 'Consulting firm',
};

const humanize = (slug: string): string =>
  OVERRIDES[slug] ?? slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Builds the prompt fragment. Returns '' when we know nothing, so callers can
// concatenate unconditionally without leaving an empty header in the prompt.
export function profilePromptBlock(p: ProfileContext | null): string {
  if (!p) return '';
  const lines: string[] = [];
  if (p.role) lines.push(`They are a fractional ${ROLE_LABELS[p.role] ?? humanize(p.role)}.`);
  if (p.business_type) lines.push(`Engagement model: ${humanize(p.business_type)}.`);
  if (p.positioning) lines.push(`How they position themselves: "${p.positioning}".`);
  if (p.client_stages?.length) {
    lines.push(`Company stages they target: ${p.client_stages.map(humanize).join(', ')}.`);
  }
  if (p.client_verticals?.length) {
    lines.push(`Verticals they know best: ${p.client_verticals.map(humanize).join(', ')}.`);
  }
  if (!lines.length) return '';
  return `\n\nABOUT THIS SPECIFIC USER — anchor every suggestion to this; never produce generic, could-be-anyone output:\n- ${lines.join('\n- ')}`;
}
