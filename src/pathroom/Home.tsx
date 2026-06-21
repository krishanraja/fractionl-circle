// The home hub (dashboard). Where a returning user lands and where you step back to from
// anywhere (tap the wordmark). Your thesis, your read at a glance, your path progress, and
// your circle, each a tile that opens the full surface; starting a new validation is the
// pinned action in the footer (rendered by ThesisApp). Renders body only inside .thxbody.
import { C } from './tokens';
import type { Scorecard } from './thesisViews';
import type { CircleP } from './thesisData';

export default function Home({ data, thesis, stepProgress, circle, onOpenRead, onOpenPath, onOpenCircle }: {
  data: Scorecard;
  thesis: string;
  stepProgress: number[];
  circle: CircleP[];
  onOpenRead: () => void;
  onOpenPath: () => void;
  onOpenCircle: () => void;
}) {
  const opp = data.opportunity || [];
  const ability = data.ability || [];
  const steps = data.steps || [];
  const oppStrong = opp.filter((r) => r.band === 'strong').length;
  const oppRisk = opp.some((r) => r.band === 'risk');
  const abStrong = ability.filter((r) => r.band === 'strong').length;
  const done = stepProgress.length;
  const n = circle.length;

  const tile = (k: string, v: string, onClick: () => void) => (
    <button className="hometile" onClick={onClick}>
      <span style={{ flex: 1 }}><span className="htk">{k}</span><div className="htv">{v}</div></span>
      <span className="htarrow">→</span>
    </button>
  );

  return (
    <>
      <div className="ovl">Your dashboard</div>
      <div className="h" style={{ marginTop: 8, fontSize: 19, lineHeight: 1.32, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{data.read}</div>
      {thesis ? <div className="sub" style={{ marginTop: 8 }}>{thesis}</div> : null}

      <div style={{ marginTop: 14 }}>
        {tile('Your read', opp.length ? `${oppStrong} of ${opp.length} opportunity signals strong${oppRisk ? ', crowding flagged' : ''}` : 'the honest scorecard', onOpenRead)}
        {tile('Your path', steps.length ? `${done} of ${steps.length} moves done` : 'the path to your first client', onOpenPath)}
        {tile('Your circle', n ? `${n} ${n === 1 ? 'person' : 'people'} for warm reach` : 'add people for warm reach', onOpenCircle)}
      </div>
    </>
  );
}
