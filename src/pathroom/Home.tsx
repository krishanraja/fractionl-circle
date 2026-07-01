// The command-center Home for your one venture: a living ember orb (charge) + strength
// score, and the permanent icon'd sections you navigate (Where you are / Your next
// customer / Your network). One evolving thesis you deepen daily. The market pulse and
// the make-it-stronger coach now live behind the nav Pulse indicator (EmberNav →
// PulseDrawer), keeping this body a clean, no-scroll set of actions. Renders inside
// .thxbody. Two regions on desktop, stacked on mobile.
import { Compass, Target, Users } from 'lucide-react';
import { C } from './tokens';
import type { Scorecard } from './thesisViews';
import type { CircleP } from './thesisData';
import { holdingBack, type Sharpness } from './sharpness';

export default function Home({ data, stepProgress, circle, fuel, sharp, onStrengthen, onOpenRead, onOpenPath, onOpenCircle }: {
  data: Scorecard;
  stepProgress: number[];
  circle: CircleP[];
  fuel: number;
  sharp: Sharpness;
  onStrengthen: () => void;
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
              style={{ transition: 'stroke-dashoffset .8s ease', filter: 'var(--thx-glow-ring)' }} />
          </svg>
          <img src="/brand/fractionl-icon.png" alt="" className="vorbcore" />
        </div>
        <div className="vorbcap">
          <div className="scorewrap" style={{ justifyContent: 'center' }}>
            <span className="scorenum">{sharp.score}</span>
            <span className="scoremax">/100 strength</span>
            {sharp.provisional > 0 ? <span className="scorepend">+{sharp.provisional} pending</span> : null}
          </div>
          <div className="scorehold">{holdingBack(sharp)}</div>
          <button className="strengthencta" onClick={onStrengthen}>
            Make it stronger <span className="mono">→</span>
          </button>
        </div>
      </div>

      <div className="vpanels">
        {section(<Compass size={18} />, 'Where you are', opp.length ? `${oppStrong} of ${opp.length} signals strong${oppRisk ? ', crowding flagged' : ''}` : 'where you stand', onOpenRead)}
        {section(<Target size={18} />, 'Your next customer', nextStep ? `Next: ${nextStep.title}` : (steps.length ? `${done} of ${steps.length} moves done` : 'the path to your first client'), onOpenPath)}
        {section(<Users size={18} />, 'Your network', n ? `${n} ${n === 1 ? 'person' : 'people'} for warm reach` : 'add people for warm reach', onOpenCircle)}
      </div>
    </div>
  );
}
