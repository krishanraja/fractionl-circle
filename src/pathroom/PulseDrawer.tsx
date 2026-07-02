// The market pulse, in plain English for a time-poor, non-technical fractional
// operator. It answers three questions fast, leading with meaning not metrics:
//   A. Is your finger on the pulse? — a plain verdict on the whole fractional market.
//   B. Are you doing the right thing? — a plain read on demand for THEIR role.
//   C. What can you attach to? — the rising trends, expandable, each with "your angle".
// The exact figures (score/100, demand·supply·culture bars, rank, %) still exist,
// tucked behind an optional "see the numbers" toggle — honest, but never in the way.
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
import { marketVerdict, roleVerdict, shortDate, trendBadge, type Sentiment } from './pulseLanguage';

function Delta({ v, suffix = '' }: { v: number | null; suffix?: string }) {
  if (v == null) return null;
  const flat = v === 0, up = v > 0;
  return <span className={'vdelta ' + (flat ? 'vflat' : up ? 'vup' : 'vdn')}>{flat ? '•' : up ? '▲' : '▼'} {Math.abs(v)}{suffix}</span>;
}

// A labelled 0-100 component meter — only shown inside the tucked-away numbers block.
function Meter({ label, v }: { label: string; v: number | null }) {
  const pct = v == null ? 0 : Math.max(0, Math.min(100, v));
  return (
    <div className="vmktmeter">
      <span className="vmktmeterk">{label}</span>
      <span className="vmktmetertrack"><span className="vmktmeterfill" style={{ width: `${pct}%` }} /></span>
      <span className="vmktmeterv">{v == null ? '—' : v}</span>
    </div>
  );
}

const DOT: Record<Sentiment, string> = { good: C.good, steady: C.cool, soft: C.gold };

interface PulseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  market: MarketPulse | null;
}

export default function PulseDrawer({ open, onOpenChange, market }: PulseDrawerProps) {
  const hasData = !!(market && (market.market || market.role));
  const m = market?.market ?? null;
  const role = market?.role ?? null;
  const comp = m?.components ?? null;
  const themes = market?.themes ?? (market?.rising ? [{ label: market.rising, summary: null, breakout: false, angle: null }] : null);

  const verdict = marketVerdict(m);
  const rv = roleVerdict(role);
  const asOf = shortDate(market?.asOf);
  const next = shortDate(market?.nextUpdate);

  // Accordion: one trend open at a time (the first by default). Numbers stay hidden.
  const [openIdx, setOpenIdx] = useState(0);
  const [showNumbers, setShowNumbers] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="thx w-full sm:max-w-md p-0 overflow-hidden flex flex-col"
        style={{ background: 'var(--thx-bg)' }}
        // Don't yank focus onto the first trend on open (its focus ring gets clipped
        // by the scroll region and reads as a stray line); keyboard users can still Tab in.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">The market this week</SheetTitle>
        <SheetDescription className="sr-only">
          A plain-English read on the fractional market and demand for your role, from Pulse.
        </SheetDescription>

        <div className="vpulsewrap">
          <div className="vpulsehead">
            <span className="vmkttitle">The market · this week</span>
            <span className="navhint" style={{ color: C.lo, marginTop: 4, display: 'block' }}>via pulse</span>
          </div>

          {hasData ? (
            <>
              {/* A. Finger on the pulse — the whole fractional market, in one sentence. */}
              {verdict ? (
                <div className="vpulsecard vpulsecard-fixed" style={{ marginTop: 12 }}>
                  <div className="vpverdict">
                    <span className="vpdot" style={{ background: DOT[verdict.sentiment] }} />
                    <span className="vpverdicttext">{verdict.sentence}</span>
                  </div>
                  <div className="vpfollow">{verdict.followLine}</div>
                </div>
              ) : null}

              {/* B. Are you doing the right thing — demand for their role, in plain words. */}
              {rv ? (
                <div className="vpulsecard vpulsecard-fixed" style={{ marginTop: 10 }}>
                  <div className="vprole">{rv.sentence}</div>
                  <div className="vpmeaning">{rv.meaning}</div>
                </div>
              ) : (
                <div className="vpulsecard vpulsecard-fixed" style={{ marginTop: 10 }}>
                  <div className="vprole">We can't tell which role you offer yet.</div>
                  <div className="vpmeaning">Name it in your plan (CMO, CFO, CTO…) and this tailors to demand for what you do.</div>
                </div>
              )}

              {/* C. Trends you can attach to — an accordion, full text on tap, no truncation. */}
              {themes && themes.length ? (
                <div className="vpulsecard vpulserising" style={{ marginTop: 10 }}>
                  <span className="navhint" style={{ color: C.cool }}>Trends you can attach to</span>
                  <div className="vpulsethemes">
                    {themes.map((t, i) => {
                      const isOpen = openIdx === i;
                      return (
                        <div key={i} className={'vptrend' + (isOpen ? ' open' : '')}>
                          <button className="vptrendhead" onClick={() => setOpenIdx(isOpen ? -1 : i)} aria-expanded={isOpen}>
                            <span className="vptrendlabel">{t.label}</span>
                            <span className={'vptrendbadge' + (t.breakout ? ' hot' : '')}>{trendBadge(t.breakout)}</span>
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

              {/* Optional: the exact figures, for anyone who wants them. Hidden by default. */}
              <button className="vpnumbtn" onClick={() => setShowNumbers((s) => !s)}>
                {showNumbers ? 'Hide the numbers' : 'See the numbers'} <span className="mono">{showNumbers ? '▴' : '▾'}</span>
              </button>
              {showNumbers ? (
                <div className="vpnumbers">
                  {m ? (
                    <div className="vpnumrow">
                      <span className="vpnumk">Market</span>
                      <span className="vpnumv">{m.score}/100 · {m.label}</span>
                      <Delta v={m.delta} />
                    </div>
                  ) : null}
                  {comp ? (
                    <div className="vmktmeters" style={{ marginTop: 8 }}>
                      <Meter label="Demand" v={comp.demand} />
                      <Meter label="Supply" v={comp.supply} />
                      <Meter label="Culture" v={comp.culture} />
                    </div>
                  ) : null}
                  {role ? (
                    <div className="vpnumrow" style={{ marginTop: 8 }}>
                      <span className="vpnumk">{role.label}</span>
                      <span className="vpnumv">{role.demand != null ? `${role.demand}/100` : '—'}{role.rank != null && role.total != null ? ` · #${role.rank} of ${role.total}` : ''}</span>
                      <Delta v={role.deltaPct} suffix="%" />
                    </div>
                  ) : null}
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
