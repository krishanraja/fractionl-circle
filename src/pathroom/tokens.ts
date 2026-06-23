// The locked Quiet Instrument register, shared by the real Path Room surfaces.
// Each token is a CSS variable so the whole "Deep dive" chrome follows the app
// theme (light/dark) without touching call sites — the values live in index.css
// under :root (Daylight Desk / cream) and .dark (Walnut Desk). Dark values are
// byte-identical to the original palette, so dark mode is unchanged.
export const C = {
  bg: 'var(--thx-bg)', panel: 'var(--thx-panel)', panel2: 'var(--thx-panel2)', panel3: 'var(--thx-panel3)',
  line: 'var(--thx-line)', line2: 'var(--thx-line2)',
  hi: 'var(--thx-hi)', mid: 'var(--thx-mid)', lo: 'var(--thx-lo)',
  accent: 'var(--thx-accent)', accentDim: 'var(--thx-accent-dim)', accentEdge: 'var(--thx-accent-edge)',
  risk: 'var(--thx-risk)', good: 'var(--thx-good)',
  gold: 'var(--thx-gold)', cool: 'var(--thx-cool)',
};
export const FONT = "'Satoshi', system-ui, -apple-system, sans-serif";
export const MONO = "'SF Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
