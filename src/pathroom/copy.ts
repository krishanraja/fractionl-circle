// Single source of truth for the app's plain-language vocabulary.
//
// We deliberately retired the earlier, more academic framing ("thesis",
// "deep dive", "validate", "sharpen", "the read") for words a busy operator
// actually uses. Keep ALL user-facing naming of these core concepts here so
// the voice stays consistent and never drifts back. Code symbols (files,
// types) may still say "thesis" internally — only what the user reads changes.
//
//   old                     ->  new (what the user sees)
//   "Deep dive" tab         ->  "Plan"
//   "thesis"                ->  "your idea" / "what you want to offer"
//   "validate / run it"     ->  "see how it lands"
//   "the read" / scorecard  ->  "where you stand"
//   "sharpen"               ->  "make it stronger"

export const PLAN = {
  /** The second tab + the overall surface. */
  tab: 'Plan',

  /** The thing the user is testing, as a noun. */
  idea: 'your idea',
  ideaFull: 'what you want to offer',

  /** The action that produces the first result. */
  run: 'See how it lands',
  runShort: 'See how it lands',
  running: 'Reading the market…',
  rerun: 'See how it lands now',

  /** The result of a run. */
  result: 'where you stand',
  resultTitle: 'Where you stand',
  openResult: 'See where you stand',

  /** Deepening an existing idea. */
  strengthen: 'Make it stronger',
  strengthenLower: 'make it stronger',

  /** The charge/fuel metaphor (the brand mark brightens as inputs go in). */
  charge: "What's powering this",
} as const;

// The one box at the top of Circle. It does double duty: say what you're working
// on (and we surface your inner circle for it), or name who — or the kind of
// person — you're looking for (and we search your whole network for a real fit).
export const BOX = {
  label: 'What are you working on — or who are you looking for?',
  placeholder: 'A goal, or the kind of person you need…',
  voiceHint: 'Tap to talk',
  /** Heading above results when the box was read as a people-search. */
  foundLabel: 'Who can help',
  /** Honest empty state for a people-search that found no grounded fit. */
  foundEmpty:
    "No one in your circle fits that yet — add a few more people or connect a source, and I'll keep looking.",
} as const;

// Warm, shared microcopy used across the onboarding + return surfaces.
export const COPY = {
  signinTitle: 'Your plan, grounded in your world.',
  signinSub:
    'Sign in to turn what you know — your people, your taste, your goal — into a plan for your next clients.',
} as const;
