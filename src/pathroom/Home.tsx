// The home hub for your one venture. Not a list of validations: a single thesis you deepen
// every day. Permanent, icon'd sections that read as the app's core areas, renamed in plain
// language (Where you are / Your next customer / Your network), plus a prominent daily
// "deepen your thesis" action. Renders body only inside ThesisApp's .thxbody.
import { Compass, Target, Users, Plus } from 'lucide-react';
import { C } from './tokens';
import type { Scorecard } from './thesisViews';
import type { CircleP } from './thesisData';

export default function Home({ data, thesis, stepProgress, circle, onOpenRead, onOpenPath, onOpenCircle, onDeepen }: {
  data: Scorecard;
  thesis: string;
  stepProgress: number[];
  circle: CircleP[];
  onOpenRead: () => void;
  onOpenPath: () => void;
  onOpenCircle: () => void;
  onDeepen: () => void;
}) {
  const opp = data.opportunity || [];
  const steps = data.steps || [];
  const oppStrong = opp.filter((r) => r.band === 'strong').length;
  const oppRisk = opp.some((r) => r.band === 'risk');
  const done = stepProgress.length;
  const n = circle.length;
  const nextStep = steps.find((_, i) => !stepProgress.includes(i));

  const section = (icon: React.ReactNode, k: string, v: string, onClick: () => void) => (
    <button className="hometile" onClick={onClick}>
      <span className="hticon">{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}><span className="htk">{k}</span><div className="htv">{v}</div></span>
      <span className="htarrow">→</span>
    </button>
  );

  return (
    <>
      <div className="ovl">Your venture</div>
      <div className="h" style={{ marginTop: 8, fontSize: 18, lineHeight: 1.32, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{data.read}</div>
      {thesis ? <div className="sub" style={{ marginTop: 6 }}>{thesis}</div> : null}

      {/* the daily habit: deepen the one thesis */}
      <button className="hometile deepen" onClick={onDeepen} style={{ marginTop: 16 }}>
        <span className="hticon" style={{ background: 'rgba(224,162,60,0.16)' }}><Plus size={18} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="htk">Deepen your thesis</span>
          <div className="htv">Add a signal today. The more you feed it, the sharper it gets.</div>
        </span>
        <span className="htarrow" style={{ color: C.accent }}>→</span>
      </button>

      <div style={{ marginTop: 14 }}>
        {section(<Compass size={18} />, 'Where you are', opp.length ? `${oppStrong} of ${opp.length} signals strong${oppRisk ? ', crowding flagged' : ''}` : 'your honest read', onOpenRead)}
        {section(<Target size={18} />, 'Your next customer', nextStep ? `Next: ${nextStep.title}` : (steps.length ? `${done} of ${steps.length} moves done` : 'the path to your first client'), onOpenPath)}
        {section(<Users size={18} />, 'Your network', n ? `${n} ${n === 1 ? 'person' : 'people'} for warm reach` : 'add people for warm reach', onOpenCircle)}
      </div>
    </>
  );
}
