// The deterministic decision-shaped questions per read dimension, plus the
// red-team question for the strong-across-the-board state. Shared by
// next-question (the live coach's LLM fallback) and the weekly chief-of-staff
// brief (which includes one question per week without spending an LLM call).

export interface CoachQuestion { topic: string; question: string; options: string[] }

// The canonical name for the differentiation dimension. Renamed from the older
// "Your edge" (which read as jargon). Old runs stored "Your edge" in
// thesis_runs.result / thesis_answers.dimension; normalizeDimension() maps that
// legacy string onto the new canonical so every lookup, prompt and render agrees
// regardless of when the run was created. The client renders the same via
// src/pathroom/copy.ts dimLabel().
export const EDGE_LABEL = 'What makes you different';

export function normalizeDimension(label: string | null | undefined): string {
  if (!label) return EDGE_LABEL;
  return label === 'Your edge' ? EDGE_LABEL : label;
}

export const FALLBACK: Record<string, CoachQuestion> = {
  'Demand': { topic: 'Demand', question: 'Who, specifically, has this problem badly enough to pay this month?', options: ['Seed founders with no senior hire yet', 'Series A teams scaling too fast', 'PE-backed ops under margin pressure'] },
  'Burning need': { topic: 'The pain', question: 'What breaks for them if they do nothing for 90 days?', options: ['They miss their next raise', 'They burn cash on the wrong hires', 'They stall and a competitor passes them'] },
  'Crowding': { topic: 'Your wedge', question: 'In one line, what do you do that the crowded field does not?', options: ['I go deeper in one niche', 'I ship faster / hands-on', 'I bring a network they cannot'] },
  [EDGE_LABEL]: { topic: EDGE_LABEL, question: 'What is the unfair advantage only you bring to this?', options: ['A track record in this exact niche', 'A warm network of buyers', 'A method I have proven before'] },
  'Fit to you': { topic: 'Your fit', question: 'What in your background makes you the obvious choice here?', options: ['Years doing exactly this in-house', 'A flagship result I can name', 'Deep relationships in the space'] },
  'Warm reach': { topic: 'Warm reach', question: 'Who in your network is closest to a buyer for this?', options: ['A former colleague now a founder', 'An investor who sees deal flow', 'A peer who refers work'] },
  'Credibility': { topic: 'Proof', question: 'What proof would make a skeptical buyer believe you fast?', options: ['A named case study', 'A strong referral', 'A sharp point of view published'] },
};

// The sparring partner's deterministic question for when nothing is weak.
export const REDTEAM_FALLBACK: CoachQuestion = {
  topic: 'Red team',
  question: 'A sceptical buyer says someone cheaper already does this. What is your one-line answer?',
  options: ['My niche depth makes me the safer choice', 'I sell a fixed outcome, not hours', 'I arrive trusted through warm intros'],
};

export function questionForDimension(label: string | null): CoachQuestion {
  const l = normalizeDimension(label);
  return FALLBACK[l] ?? FALLBACK[EDGE_LABEL];
}
