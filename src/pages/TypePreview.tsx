import { useEffect, useState } from 'react';

/**
 * TEMPORARY font-selection scaffold. Reachable at /type-preview (no auth).
 * Renders the app's real headers in four commercial-free candidate display
 * faces so Krish can pick the replacement for Gobold from the real thing.
 *
 * This file + its route are throwaway — delete both once a winner is chosen
 * and wired into index.css (--font-display) per the plan's Phase B.
 */

// Each candidate: a CSS font stack + the <link> hrefs that load it. Space
// Grotesk / Archivo (expanded via wdth axis) / Unbounded come from Google
// Fonts; Clash Display from Fontshare. All four are free for commercial use.
const FONT_LINKS = [
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,500;125,700&display=swap',
  'https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&display=swap',
  'https://api.fontshare.com/v2/css?f[]=clash-display@500,600&display=swap',
];

interface Candidate {
  key: string;
  name: string;
  note: string;
  license: string;
  family: string;
  stretch?: string;
  weight: number;
}

const CANDIDATES: Candidate[] = [
  {
    key: 'space-grotesk',
    name: 'Space Grotesk',
    note: 'Squared technical grotesk — professional but unmistakably its own. My top pick.',
    license: 'SIL OFL · free commercial',
    family: "'Space Grotesk', sans-serif",
    weight: 700,
  },
  {
    key: 'archivo-expanded',
    name: 'Archivo Expanded',
    note: 'The widest / most literally "square" option. Reads like a confident wordmark.',
    license: 'SIL OFL · free commercial',
    family: "'Archivo', sans-serif",
    stretch: '125%',
    weight: 700,
  },
  {
    key: 'unbounded',
    name: 'Unbounded',
    note: 'Geometric and very square — the most distinctive/characterful of the four.',
    license: 'SIL OFL · free commercial',
    family: "'Unbounded', sans-serif",
    weight: 700,
  },
  {
    key: 'clash-display',
    name: 'Clash Display',
    note: 'Modern display face with a touch more personality; slightly squared.',
    license: 'Fontshare · free commercial',
    family: "'Clash Display', sans-serif",
    weight: 600,
  },
];

// The real header strings pulled from the app, so the choice is judged in context.
const SHORT_HEADERS = ['STREAMS', 'YOUR CIRCLE', 'ASK', 'TODAY'];
const NUMERAL = 'EARNED $82,500';
const SENTENCE = "Let's line up your next move.";

const TypePreview = () => {
  const [tracking, setTracking] = useState(0.06);
  const [uppercase, setUppercase] = useState(true);

  // Load the candidate webfonts only on this throwaway screen.
  useEffect(() => {
    const links = FONT_LINKS.map((href) => {
      const el = document.createElement('link');
      el.rel = 'stylesheet';
      el.href = href;
      document.head.appendChild(el);
      return el;
    });
    return () => links.forEach((el) => el.remove());
  }, []);

  const transform = uppercase ? 'uppercase' : 'none';

  return (
    <div style={{ minHeight: '100vh', background: '#f7f2ea', color: '#1f1812', padding: '32px 20px 96px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <header style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a8f80', margin: 0 }}>
            Fractionl Circle · font selection
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '8px 0 6px' }}>Pick the new header face</h1>
          <p style={{ fontSize: 14, color: '#6b6155', margin: 0, lineHeight: 1.6 }}>
            Each candidate below renders the app's real headers. Reply with the name you want and
            I'll self-host it and wire it into <code>--font-display</code>. This screen is temporary.
          </p>
        </header>

        {/* Controls */}
        <div
          style={{
            display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap',
            padding: '14px 16px', borderRadius: 14, background: '#fffdf9',
            border: '1px solid #e7ddcd', marginBottom: 28,
          }}
        >
          <label style={{ fontSize: 13, color: '#6b6155', display: 'flex', alignItems: 'center', gap: 8 }}>
            Letter-spacing: <strong style={{ color: '#1f1812' }}>{tracking.toFixed(3)}em</strong>
            <input
              type="range" min={-0.02} max={0.16} step={0.005} value={tracking}
              onChange={(e) => setTracking(parseFloat(e.target.value))}
              style={{ width: 180 }}
            />
          </label>
          <label style={{ fontSize: 13, color: '#6b6155', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
            ALL CAPS
          </label>
        </div>

        {CANDIDATES.map((c) => (
          <section
            key={c.key}
            style={{
              marginBottom: 16, padding: '22px 22px 26px', borderRadius: 18,
              background: '#fffdf9', border: '1px solid #e7ddcd',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{c.name}</h2>
                <p style={{ fontSize: 12.5, color: '#6b6155', margin: '3px 0 0', lineHeight: 1.5 }}>{c.note}</p>
              </div>
              <span style={{ fontSize: 11, color: '#9a8f80', whiteSpace: 'nowrap' }}>{c.license}</span>
            </div>

            <div
              style={{
                fontFamily: c.family,
                fontStretch: c.stretch,
                fontWeight: c.weight,
                textTransform: transform,
                letterSpacing: `${tracking}em`,
                lineHeight: 1.06,
                color: '#1f1812',
              }}
            >
              {SHORT_HEADERS.map((h) => (
                <div key={h} style={{ fontSize: 40, marginBottom: 6 }}>{h}</div>
              ))}
              <div style={{ fontSize: 40, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>{NUMERAL}</div>
              <div style={{ fontSize: 30, marginTop: 14 }}>{SENTENCE}</div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default TypePreview;
