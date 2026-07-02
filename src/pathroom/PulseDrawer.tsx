// The market pulse, for a time-poor fractional operator. Leads with a rail of
// eye-catching metrics — a big value + a colour-coded 30-day arrow down the left,
// the strategic "what this means for you" read on the right — then the specific,
// role-tailored trends they can attach to. Everything is grounded in Pulse data;
// the strategic reads and trends are synthesised server-side (market-pulse edge fn).
//
// The drawer chrome is a fixed, full-height flex column that doesn't scroll; only the
// trends list scrolls internally, and only when an expanded insight is long.
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

interface PulseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  market: MarketPulse | null;
}

export default function PulseDrawer({ open, onOpenChange, market }: PulseDrawerProps) {
  const hasData = !!(market && (market.market || market.role || (market.metrics && market.metrics.length)));
  const metrics = market?.metrics ?? null;
  const themes = market?.themes ?? (market?.rising ? [{ label: market.rising, summary: null, breakout: false, angle: null }] : null);
  const asOf = shortDate(market?.asOf);
  const next = shortDate(market?.nextUpdate);

  // Fallback verdicts (older payloads without a metric rail).
  const verdict = marketVerdict(market?.market ?? null);
  const rv = roleVerdict(market?.role ?? null);

  const [openIdx, setOpenIdx] = useState(0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="thx w-full sm:max-w-md p-0 overflow-hidden flex flex-col"
        style={{ background: 'var(--thx-bg)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">The market this week</SheetTitle>
        <SheetDescription className="sr-only">
          Plain-English metrics on the fractional market and demand for your role, from Pulse.
        </SheetDescription>

        <div className="vpulsewrap">
          <div className="vpulsehead">
            <span className="vmkttitle">The market · this week</span>
            <span className="navhint" style={{ color: C.lo, marginTop: 4, display: 'block' }}>via pulse</span>
          </div>

          {hasData ? (
            <>
              {/* The metric rail: value + colour-coded 30-day arrow on the left, the
                  strategic read on the right. */}
              {metrics && metrics.length ? (
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
                // graceful fallback for payloads without metrics
                <>
                  {verdict ? (
                    <div className="vpulsecard vpulsecard-fixed" style={{ marginTop: 12 }}>
                      <div className="vpverdict"><span className="vpdot" style={{ background: C.cool }} /><span className="vpverdicttext">{verdict.sentence}</span></div>
                      <div className="vpfollow">{verdict.followLine}</div>
                    </div>
                  ) : null}
                  {rv ? (
                    <div className="vpulsecard vpulsecard-fixed" style={{ marginTop: 10 }}>
                      <div className="vprole">{rv.sentence}</div>
                      <div className="vpmeaning">{rv.meaning}</div>
                    </div>
                  ) : null}
                </>
              )}

              {/* Trends you can attach to — accordion, full text on tap, "your angle". */}
              {themes && themes.length ? (
                <div className="vpulsecard vpulserising" style={{ marginTop: 12 }}>
                  <span className="navhint" style={{ color: C.cool }}>Trends you can attach to</span>
                  <div className="vpulsethemes">
                    {themes.map((t, i) => {
                      const isOpen = openIdx === i;
                      return (
                        <div key={i} className={'vptrend' + (isOpen ? ' open' : '')}>
                          <button className="vptrendhead" onClick={() => setOpenIdx(isOpen ? -1 : i)} aria-expanded={isOpen}>
                            <span className="vptrendlabel">{t.label}</span>
                            {t.breakout ? <span className="vptrendbadge hot">{trendBadge(true)}</span> : null}
                            <span className="vptrendchev">{isOpen ? '▾' : '▸'}</span>
                          </button>
                          {isOpen ? (
                            <div className="vptrendbody">
                              {t.summary ? <div className="vptrendsum">{t.summary}</div> : null}
                              {t.angle ? (
                                <div className="vptrendangle"><span className="vptrendanglek">Your angle</span>{t.angle}</div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="navhint vpulsefoot">
                {asOf ? `Updated ${asOf}` : null}{asOf && next ? ' · ' : ''}{next ? `next check ${next}` : null}
              </div>
            </>
          ) : (
            <div className="sub" style={{ marginTop: 14 }}>
              The market read loads with your plan — run or re-read your plan and it'll show up here.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
