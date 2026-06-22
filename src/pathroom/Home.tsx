// The command-center Home for your one venture: a living ember orb (charge), the live
// market-movement instrument fed by fractionl-pulse, and the permanent icon'd sections you
// navigate (Where you are / Your next customer / Your network). One evolving thesis you
// deepen daily. Two regions on desktop, stacked on mobile. Renders inside .thxbody.
import { Compass, Target, Users } from 'lucide-react';
import { C } from './tokens';
import type { Scorecard } from './thesisViews';
import type { CircleP, MarketPulse } from './thesisData';

function Delta({ v, suffix = '' }: { v: number | null; suffix?: string }) {
  if (v == null) return null;
  const flat = v === 0, up = v > 0;
  return <span className={'vdelta ' + (flat ? 'vflat' : up ? 'vup' : 'vdn')}>{flat ? '•' : up ? '▲' : '▼'} {Math.abs(v)}{suffix}</span>;
}

export default function Home({ data, thesis, stepProgress, circle, fuel, market, onOpenRead, onOpenPath, onOpenCircle }: {
  data: Scorecard;
  thesis: string;
  stepProgress: number[];
  circle: CircleP[];
  fuel: number;
  market: MarketPulse | null;
  onOpenRead: () => void;
  onOpenPath: () => void;
  onOpenCircle: () => void;
}) {
  const opp = data.opportunity || [];
  const steps = data.steps || [];
  const oppStrong = opp.filter((r) => r.band === 'strong').length;
  const oppRisk = opp.some((r) => r.band === 'risk');
  const done = stepProgress.length;
  const n = circle.length;
  const nextStep = steps.find((_, i) => !stepProgress.includes(i));
  const pct = Math.round(Math.max(0, Math.min(1, fuel)) * 100);
  const r = 44, circ = 2 * Math.PI * r;

  const section = (icon: React.ReactNode, k: string, v: string, onClick: () => void) => (
    <button className="hometile" onClick={onClick}>
      <span className="hticon">{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}><span className="htk">{k}</span><div className="htv">{v}</div></span>
      <span className="htarrow">→</span>
    </button>
  );

  return (
    <div className="vhome">
      <div className="vhero">
        <div className="ovl" style={{ textAlign: 'center', marginBottom: 12 }}>Your venture</div>
        <div className="vorb">
          <div className="vorbglow" />
          <svg className="vorbsvg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke={C.line2} strokeWidth="5" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={C.accent} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.max(0.04, Math.min(1, fuel)))} transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset .8s ease', filter: 'drop-shadow(0 0 5px rgba(224,162,60,0.8))' }} />
          </svg>
          <img src="/brand/fractionl-icon.png" alt="" className="vorbcore" />
        </div>
        <div className="vorbcap">{pct}% charged · brightening</div>
      </div>

      <div className="vpanels">
        {market && (market.market || market.role) ? (
          <div className="vmkt">
            <div className="vmkthead">
              <span className="vmkttitle">The market · this week</span>
              <span className="navhint" style={{ color: C.lo }}>via pulse</span>
            </div>
            {market.role && (market.role.demand != null || market.role.deltaPct != null) ? (
              <div className="vmktrow">
                <span className="vmktname">{market.role.label} demand</span>
                {market.role.band ? <span className="vmktval">{market.role.band}{market.role.demand != null ? ' ' + market.role.demand : ''}</span> : null}
                <Delta v={market.role.deltaPct} suffix="%" />
              </div>
            ) : null}
            {market.market ? (
              <div className="vmktrow">
                <span className="vmktname">Fractional market</span>
                <span className="vmktval">{market.market.label} {market.market.score}</span>
                <Delta v={market.market.delta} />
              </div>
            ) : null}
            {market.rising ? <div className="vmktchip">Rising: {market.rising}</div> : null}
          </div>
        ) : null}

        <div style={{ marginTop: market ? 12 : 0 }}>
          {section(<Compass size={18} />, 'Where you are', opp.length ? `${oppStrong} of ${opp.length} signals strong${oppRisk ? ', crowding flagged' : ''}` : 'your honest read', onOpenRead)}
          {section(<Target size={18} />, 'Your next customer', nextStep ? `Next: ${nextStep.title}` : (steps.length ? `${done} of ${steps.length} moves done` : 'the path to your first client'), onOpenPath)}
          {section(<Users size={18} />, 'Your network', n ? `${n} ${n === 1 ? 'person' : 'people'} for warm reach` : 'add people for warm reach', onOpenCircle)}
        </div>
      </div>
    </div>
  );
}
