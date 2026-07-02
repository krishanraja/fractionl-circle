// The market pulse, moved out of the Plan home body and into a nav-triggered drawer
// (opened from the Pulse indicator in EmberNav). Shows the full "this week" read from
// fractionl-pulse: the Fractional Working Index score with its demand/supply/culture
// breakdown, the user's role demand + rank + this-week read, and the rising themes.
// Personalisation is role-grained (Pulse doesn't go finer than role), so we're honest
// when we can't map a role. Renders a plain empty state when market data isn't in yet.
//
// The drawer is a fixed, full-height flex column that NEVER scrolls (overflow:hidden):
// header + market card + role card are fixed, the rising-themes region flexes and
// clips, and the "as of" line is pinned — so the content can't force a scroll on any
// device.
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { MarketPulse } from './thesisData';
import { C } from './tokens';

function Delta({ v, suffix = '' }: { v: number | null; suffix?: string }) {
  if (v == null) return null;
  const flat = v === 0, up = v > 0;
  return <span className={'vdelta ' + (flat ? 'vflat' : up ? 'vup' : 'vdn')}>{flat ? '•' : up ? '▲' : '▼'} {Math.abs(v)}{suffix}</span>;
}

// A labelled 0-100 component meter (demand / supply / culture).
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
  const themes = market?.themes ?? (market?.rising ? [{ label: market.rising, summary: null, breakout: false }] : null);
  // ISO -> plain date for "refreshes {date}"
  const nextUpdate = market?.nextUpdate ? market.nextUpdate.slice(0, 10) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="thx w-full sm:max-w-md p-0 overflow-hidden flex flex-col"
        style={{ background: 'var(--thx-bg)' }}
      >
        <SheetTitle className="sr-only">The market this week</SheetTitle>
        <SheetDescription className="sr-only">
          Live market movement for your role and the fractional economy, from Pulse.
        </SheetDescription>

        <div className="vpulsewrap">
          {/* Header sits on its own lines with a right gutter, so the Sheet's
              built-in close button never overlaps the "via pulse" caption. */}
          <div className="vpulsehead">
            <span className="vmkttitle">The market · this week</span>
            <span className="navhint" style={{ color: C.lo, marginTop: 4, display: 'block' }}>via pulse</span>
          </div>

          {hasData ? (
            <>
              {/* Headline: the Fractional Working Index score + 30-day move + band legend. */}
              {m ? (
                <div className="vpulsecard vpulsecard-fixed" style={{ marginTop: 12 }}>
                  <span className="navhint" style={{ color: C.cool }}>Fractional market</span>
                  <div className="vpulsescorewrap">
                    <span className="vpulsescore">{m.score}</span>
                    <span className="vpulsescoremax">/100</span>
                    <span className="vpulseband">{m.emoji ? m.emoji + ' ' : ''}{m.label}</span>
                    <span style={{ flex: 1 }} />
                    <Delta v={m.delta} />
                  </div>
                  {m.scale ? <div className="vpulsescale">{m.scale} · 30-day move</div> : <div className="vpulsescale">30-day move</div>}
                  {comp ? (
                    <div className="vmktmeters">
                      <Meter label="Demand" v={comp.demand} />
                      <Meter label="Supply" v={comp.supply} />
                      <Meter label="Culture" v={comp.culture} />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* The user's role — the personalised core. */}
              {role ? (
                <div className="vpulsecard vpulsecard-fixed" style={{ marginTop: 10 }}>
                  <span className="navhint" style={{ color: C.accent }}>Demand for fractional {role.label}s</span>
                  <div className="vmktrow" style={{ marginTop: 7 }}>
                    <span className="vmktname">{role.band ?? 'Demand'}{role.demand != null ? ` · ${role.demand}/100` : ''}</span>
                    <Delta v={role.deltaPct} suffix="%" />
                  </div>
                  {role.rank != null && role.total != null ? (
                    <div className="vpulsemeta">#{role.rank} of {role.total} tracked roles by demand</div>
                  ) : null}
                  {role.insight ? <div className="vpulseinsight">{role.insight}</div> : null}
                </div>
              ) : (
                <div className="vpulsecard vpulsecard-fixed" style={{ marginTop: 10 }}>
                  <span className="navhint" style={{ color: C.lo }}>Your role</span>
                  <div className="sub" style={{ marginTop: 6 }}>
                    Name the exec role you offer (CMO, CFO, CTO…) in your plan and this tailors to your role's demand.
                  </div>
                </div>
              )}

              {/* Rising themes — role-matched first. This is the flexible region: it
                  shrinks and clips so the drawer never scrolls on any device. */}
              {themes && themes.length ? (
                <div className="vpulsecard vpulserising" style={{ marginTop: 10 }}>
                  <span className="navhint" style={{ color: C.cool }}>Rising {role ? `for ${role.label}s` : 'this week'}</span>
                  <div className="vpulsethemes">
                    {themes.map((t, i) => (
                      <div key={i} className="vpulsetheme">
                        <div className="vpulsethemehead">
                          <span className="vpulsethemelabel">{t.label}</span>
                          {t.breakout ? <span className="vpulsebreak">breakout</span> : null}
                        </div>
                        {t.summary ? <div className="vpulsethemesum">{t.summary}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="navhint vpulsefoot">
                {market?.asOf ? `as of ${market.asOf}` : null}{market?.asOf && nextUpdate ? ' · ' : ''}{nextUpdate ? `refreshes ${nextUpdate}` : null}
              </div>
            </>
          ) : (
            <div className="sub" style={{ marginTop: 14 }}>
              Market data loads with your read — run or re-read your plan and it'll show up here.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
