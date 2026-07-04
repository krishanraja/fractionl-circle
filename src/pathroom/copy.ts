// Single source of truth for the app's plain-language vocabulary.
//
// We deliberately retired the earlier, more academic framing ("thesis",
// "deep dive", "validate", "sharpen", "the read") for words a busy operator
// actually uses. Keep ALL user-facing naming of these core concepts here so
// the voice stays consistent and never drifts back. Code symbols (files,
// types) may still say "thesis" internally - only what the user reads changes.
//
//   old                     ->  new (what the user sees)
//   "Deep dive" tab         ->  "Plan"
//   "thesis"                ->  "your idea" / "what you want to offer"
//   "validate / run it"     ->  "see how it lands"
//   "the read" / scorecard  ->  "Value Prop"      (was "where you stand")
//   "your path" / journey   ->  "Next Action"     (was "your path")
//   "your edge" (dimension) ->  "What makes you different"
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
  /** Rerunning with banked answers waiting. Callers append " (+N)". */
  rerunAgain: 'See how it lands again',

  /** Fork 1 - the result of a run: understand + strengthen the opportunity. */
  result: 'value prop',
  resultTitle: 'Value Prop',
  openResult: 'See your value prop',
  fork1Sub: 'Is it a real opportunity? Strengthen what makes you different.',

  /** Fork 2 - the action: the next step toward the goal. */
  path: 'next action',
  pathTitle: 'Next Action',
  openPath: 'See your next action',
  fork2Sub: 'The next step toward your first retained client.',

  /** Deepening an existing idea. */
  strengthen: 'Make it stronger',
  strengthenLower: 'make it stronger',

  /** The charge/fuel metaphor (the brand mark brightens as inputs go in). */
  charge: "What's powering this",
} as const;

// Plain-English display labels for the server-generated scorecard dimensions.
// The canonical keys stay stable everywhere it matters - they're stored in the DB
// and pinned by the edge functions and tests - so only what the user READS changes.
// One place for the vocabulary; apply dimLabel() at every render site.
export const DIMENSION_LABEL: Record<string, string> = {
  'Your edge': 'What makes you different',
};
export const dimLabel = (label: string): string => DIMENSION_LABEL[label] ?? label;

// The one box at the top of Circle. It does double duty: say what you're working
// on (and we surface your inner circle for it), or name who - or the kind of
// person - you're looking for (and we search your whole network for a real fit).
export const BOX = {
  label: 'What are you working on - or who are you looking for?',
  // Invite meaning-based search, not just a literal name filter (the semantic engine
  // reaches "Partner at Sequoia" from "a venture fund" by meaning).
  placeholder: 'A goal, or who you need - try "a VC who could intro me to founders"',
  voiceHint: 'Tap to talk',
  /** Heading above results when the box was read as a people-search. */
  foundLabel: 'Who can help',
  /** Honest empty state for a people-search that found no grounded fit. */
  foundEmpty:
    "No one in your circle fits that yet - add a few more people or connect a source, and I'll keep looking.",
} as const;

// Warm, shared microcopy used across the onboarding + return surfaces.
export const COPY = {
  signinTitle: 'Your plan, grounded in your world.',
  signinSub:
    'Sign in to turn what you know - your people, your taste, your goal - into a plan for your next clients.',
} as const;
