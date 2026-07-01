// The market pulse, moved out of the Plan home body and into a nav-triggered drawer
// (opened from the Pulse indicator in EmberNav). Shows the full "this week" read from
// fractionl-pulse — role demand, the fractional market score, the rising topic — then a
// wide button that nudges the user to strengthen their idea (the make-it-stronger flow).
// Honest: renders a plain empty state when the market data isn't in yet.
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

interface PulseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  market: MarketPulse | null;
}

export default function PulseDrawer({ open, onOpenChange, market }: PulseDrawerProps) {
  const hasData = !!(market && (market.market || market.role));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="thx w-full sm:max-w-md p-0 overflow-y-auto"
        style={{ background: 'var(--thx-bg)' }}
      >
        <SheetTitle className="sr-only">The market this week</SheetTitle>
        <SheetDescription className="sr-only">
          Live market movement for your role and the fractional economy, from Pulse.
        </SheetDescription>

        <div className="wrap" style={{ padding: '20px 18px calc(24px + env(safe-area-inset-bottom))' }}>
          <div className="vmkthead">
            <span className="vmkttitle">The market · this week</span>
            <span className="navhint" style={{ color: C.lo }}>via pulse</span>
          </div>

          {hasData ? (
            <div style={{ marginTop: 12 }}>
              {market!.role && (market!.role.demand != null || market!.role.deltaPct != null) ? (
                <div className="vmktrow">
                  <span className="vmktname">{market!.role.label} demand</span>
                  {market!.role.band ? <span className="vmktval">{market!.role.band}{market!.role.demand != null ? ' ' + market!.role.demand : ''}</span> : null}
                  <Delta v={market!.role.deltaPct} suffix="%" />
                </div>
              ) : null}
              {market!.market ? (
                <div className="vmktrow">
                  <span className="vmktname">Fractional market</span>
                  <span className="vmktval">{market!.market.label} {market!.market.score}</span>
                  <Delta v={market!.market.delta} />
                </div>
              ) : null}
              {market!.rising ? <div className="vmktchip">Rising: {market!.rising}</div> : null}
              {market!.asOf ? <div className="navhint" style={{ marginTop: 12, color: C.lo }}>as of {market!.asOf}</div> : null}
            </div>
          ) : (
            <div className="sub" style={{ marginTop: 12 }}>
              Market data loads with your read — run or re-read your plan and it'll show up here.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
