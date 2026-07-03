// The market pulse, redesigned as a segmented, no-scroll drawer for mobile. One screen,
// one job: a segmented control splits the two intents so neither is crushed -
//   Market - the metric rail: a big value + a colour-coded 30-day arrow down the left,
//            the strategic "what this means for you" read on the right.
//   Trends - the role-tailored moves you can attach to, stacked so all are visible at
//            once, sharing the height equally, no scroll and no swipe.
// Everything is grounded in Pulse data; the reads and trends are synthesised server-side.
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { MarketPulse } from './thesisData';
import { C } from './tokens';
import { marketVerdict, roleVerdict, shortDate, trendBadge } from './pulseLanguage';

// The colour-coded 30-day arrow. Direction follows the data; colour follows whether
// that move is GOOD for the operator (competition rising is not).
function Arrow({ delta, suffix, positiveWhenUp }: { delta: number | null; suffix?: string; positiveWhenUp?: boolean }) {
  if (delta == null) return null;
  const flat = Math.abs(delta) < 0.5;
  const tone = flat ? 'flat' : ((delta > 0) === (positiveWhenUp !== false) ? 'up' : 'dn');
  const glyph = flat ? '•' : delta > 0 ? '▲' : '▼';
  return <span className={'vpmarrow ' + tone}>{glyph} {Math.abs(delta)}{suffix || ''}</span>;
}

// The stunning loading moment: a heartbeat pulse tracing across the market, over a
// shimmer skeleton in the shape of the metric rail, so the real content settles in.
const WAVE = 'M0 17 H62 l7 0 6 -12 8 24 7 -12 H150 l6 0 6 -7 6 14 6 -7 H240';
function PulseLoading() {
  return (
    <div className="vploading">
      <svg className="vpwave" viewBox="0 0 240 34" preserveAspectRatio="none" aria-hidden="true">
        <path className="vpwave-base" d={WAVE} />
        <path className="vpwave-run" d={WAVE} />
      </svg>
      <div className="vploadlabel">Reading the market…</div>
      <div className="vpmetrics">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="vpmetric">
            <div className="vpmval"><span className="vpskel vpskel-num" /><span className="vpskel vpskel-arr" /></div>
            <div className="vpmtext"><span className="vpskel vpskel-label" /><span className="vpskel vpskel-line" /><span className="vpskel vpskel-line short" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ThemeT = NonNullable<MarketPulse['themes']>[number];

// Depth on demand: the stacked cards stay glanceable (clamped previews), and
// tapping one opens this bottom sheet with the FULL trend - title, summary and
// your angle, unclamped. Same hand-rolled pattern as Home's DecisionSheet:
// fixed inset, z-1000 (above the Radix drawer's z-50), backdrop tap closes.
// Rendered INSIDE SheetContent so backdrop taps never count as "outside" and
// dismiss the whole drawer.
function TrendSheet({ t, onClose }: { t: ThemeT; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, maxHeight: '72dvh', overflowY: 'auto', background: C.bg, borderTop: `1px solid ${C.line2}`, borderRadius: '14px 14px 0 0', padding: '18px 20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ovl" style={{ flex: 1 }}>This week's trend</span>
          <button className="mono" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 0, color: C.lo, fontSize: 14, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: C.hi, lineHeight: 1.3 }}>{t.label}</div>
          {t.breakout ? <span className="vptrendbadge hot" style={{ flex: '0 0 auto', marginTop: 2 }}>{trendBadge(true)}</span> : null}
        </div>
        {t.summary ? (
          <div style={{ fontSize: 13.5, color: C.mid, lineHeight: 1.55, marginTop: 10 }}>{t.summary}</div>
        ) : null}
        {t.angle ? (
          <div className="vptrendangle" style={{ marginTop: 14, padding: '10px 12px' }}>
            {/* same box as the card's angle, but the copy is unclamped */}
            <div style={{ fontSize: 12.5, color: C.hi, lineHeight: 1.5 }}>
              <span className="vptrendanglek">Your angle</span>{t.angle}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface PulseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  market: MarketPulse | null;
  loading?: boolean;
}

export default function PulseDrawer({ open, onOpenChange, market, loading }: PulseDrawerProps) {
  const hasData = !!(market && (market.market || market.role || (market.metrics && market.metrics.length)));
  const metrics = market?.metrics ?? null;
  const themes = market?.themes ?? (market?.rising ? [{ label: market.rising, summary: null, breakout: false, angle: null }] : null);
  const asOf = shortDate(market?.asOf);
  const next = shortDate(market?.nextUpdate);

  // Fallback verdicts (older payloads without a metric rail).
  const verdict = marketVerdict(market?.market ?? null);
  const rv = roleVerdict(market?.role ?? null);

  const [seg, setSeg] = useState<'market' | 'trends'>('market');
  // The trend opened for its full read; resets for free when Radix unmounts the drawer.
  const [openTheme, setOpenTheme] = useState<ThemeT | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="thx w-full sm:max-w-md p-0 overflow-hidden flex flex-col"
        style={{ background: 'var(--thx-bg)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => { if (openTheme) { e.preventDefault(); setOpenTheme(null); } }}
      >
        <SheetTitle className="sr-only">The market this week</SheetTitle>
        <SheetDescription className="sr-only">
          Plain-English metrics on the fractional market and the trends you can attach to, from Pulse.
        </SheetDescription>

        <div className="vpulsewrap">
          <div className="vpulsehead">
            <span className="vmkttitle">This week · via pulse</span>
          </div>

          {loading && !hasData ? (
            <PulseLoading />
          ) : hasData ? (
            <>
              {/* Segmented control: two intents, each its own calm no-scroll screen. */}
              <div className="vpseg" role="tablist">
                <button role="tab" aria-selected={seg === 'market'} className={seg === 'market' ? 'on' : ''} onClick={() => setSeg('market')}>Market</button>
                <button role="tab" aria-selected={seg === 'trends'} className={seg === 'trends' ? 'on' : ''} onClick={() => setSeg('trends')}>Trends</button>
              </div>

              <div className="vpview" key={seg}>
                {seg === 'market' ? (
                  metrics && metrics.length ? (
                    <div className="vpmetrics">
                      {metrics.map((m) => (
                        <div key={m.key} className="vpmetric">
                          <div className="vpmval">
                            <span className="vpmnum">{m.value}</span>
                            <Arrow delta={m.delta} suffix={m.deltaSuffix} positiveWhenUp={m.positiveWhenUp} />
                          </div>
                          <div className="vpmtext">
                            <div className="vpmlabel">{m.label}</div>
                            <div className="vpminsight">{m.insight}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // graceful fallback for payloads without a metric rail
                    <div style={{ marginTop: 4 }}>
                      {verdict ? (
                        <div className="vpulsecard" style={{ marginTop: 8 }}>
                          <div className="vpverdict"><span className="vpdot" style={{ background: C.cool }} /><span className="vpverdicttext">{verdict.sentence}</span></div>
                          <div className="vpfollow">{verdict.followLine}</div>
                        </div>
                      ) : null}
                      {rv ? (
                        <div className="vpulsecard" style={{ marginTop: 10 }}>
                          <div className="vprole">{rv.sentence}</div>
                          <div className="vpmeaning">{rv.meaning}</div>
                        </div>
                      ) : null}
                    </div>
                  )
                ) : themes && themes.length ? (
                  // All trends stacked, sharing the height equally, no scroll and no
                  // swipe. The clamps are a PREVIEW: tap a card for the full read.
                  <>
                    <div className="vpstack">
                      {themes.map((t, i) => (
                        <div key={i} className="vptcard">
                          <button className="vptcardin" onClick={() => setOpenTheme(t)} aria-label={`Read the full trend: ${t.label}`}>
                            <div className="vptcardhead">
                              <div className="vptcardtitle">{t.label}</div>
                              {t.breakout ? <span className="vptrendbadge hot">{trendBadge(true)}</span> : null}
                            </div>
                            {t.summary ? <div className="vptcardsum">{t.summary}</div> : null}
                            {t.angle ? (
                              <div className="vptrendangle">
                                <div className="vptrendanglec"><span className="vptrendanglek">Your angle</span>{t.angle}</div>
                              </div>
                            ) : null}
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="navhint" style={{ flex: '0 0 auto', marginTop: 8, textAlign: 'center' }}>tap a card for the full read</div>
                  </>
                ) : (
                  <div className="sub" style={{ marginTop: 14 }}>No standout trends this week - check back after the next refresh.</div>
                )}
              </div>

              <div className="navhint vpulsefoot">
                {asOf ? `Updated ${asOf}` : null}{asOf && next ? ' · ' : ''}{next ? `next check ${next}` : null}
              </div>

              {openTheme ? <TrendSheet t={openTheme} onClose={() => setOpenTheme(null)} /> : null}
            </>
          ) : (
            <div className="sub" style={{ marginTop: 14 }}>
              The market read loads with your plan - run or re-read your plan and it'll show up here.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
