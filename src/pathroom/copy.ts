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

  /** The two doors on the Plan home. Exactly two intents, never three:
   *  work on the plan (understand + strengthen), or push it forward (act). */
  strengthenTitle: 'Make it stronger',
  strengthenSub: 'See where you stand, then sharpen what makes you different.',
  actionTitle: 'Your next action',
  actionSub: 'The next step toward your first retained client.',
  /** The rerun door label when banked answers are waiting (callers append " (+N)"). */
  lockIn: 'See how it lands again',
  lockInSub: 'Lock in the gains you have already banked.',

  /** The charge/fuel metaphor (the brand mark brightens as inputs go in). */
  charge: "What's powering this",
} as const;

// The personified assistant. Single source of truth for the name so it never drifts
// (used in the UI copy below AND in the edge-function persona line). She is the sharp,
// warm strategy partner the user talks to on the "make it stronger" surface. No magic
// sparkles or icons - the personification is the name and the voice, nothing decorative.
export const ASSISTANT = {
  name: 'Freya',
} as const;

// The four "make it stronger" strengtheners. Each is a clean tappable row that opens the
// same focused overlay; the AI-driven three are voiced as Freya, so it reads like talking
// to someone. `tag` is the small mono label on the right of each row.
export const STRENGTHENERS = {
  admire: {
    title: 'Screenshot a business you admire',
    sub: `${ASSISTANT.name} sharpens what makes you different.`,
    tag: 'difference',
  },
  concern: {
    title: 'Voice a concern',
    sub: `Say a worry. ${ASSISTANT.name} researches it.`,
    tag: 'research',
  },
  idea: {
    title: 'Voice an idea',
    sub: `Say an angle. ${ASSISTANT.name} folds it in.`,
    tag: 'evolve',
  },
  question: {
    title: 'Answer a question',
    sub: `${ASSISTANT.name} asks the one thing that matters.`,
    tag: 'sharpen',
  },
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
  label: 'Tell Circle what you need',
  // Invite meaning-based search, not just a literal name filter (the semantic engine
  // reaches "Partner at Sequoia" from "a venture fund" by meaning).
  placeholder: 'Try “Who knows hospital buyers?” or describe what you are working on',
  voiceHint: 'Tap to talk',
  /** Heading above results when the box was read as a people-search. */
  foundLabel: 'People who could help',
  /** Honest empty state for a people-search that found no grounded fit. */
  foundEmpty:
    "No one fits that yet. Add more people or connect your contacts, and Circle will keep looking.",
} as const;

// Warm, shared microcopy used across the onboarding + return surfaces.
export const COPY = {
  signinTitle: 'Your plan, grounded in your world.',
  signinSub:
    'Sign in to turn what you know - your people, your taste, your goal - into a plan for your next clients.',
} as const;
