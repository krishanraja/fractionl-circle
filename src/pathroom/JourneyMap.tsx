// The living journey map (live). Replaces the static circle name-card list and the two
// duplicate "build your circle" CTAs. The deconstructed steps become a timeline; the circle
// is woven in (the warm move shows real faces and lights up as people are added); exactly
// one primary action per state; a weak read does not pretend, it pivots to sharpening.
// Renders as content inside ThesisApp's .thx .wrap (EmberNav is rendered above it).
import { C } from './tokens';
import type { Scorecard } from './thesisViews';
import type { CircleP } from './thesisData';

function initials(name: string) {
  return (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// Honest weak-read heuristic: nothing strong on the opportunity side and at least two weak.
function isWeak(data: Scorecard): boolean {
  const opp = data.opportunity || [];
  const strong = opp.filter((r) => r.band === 'strong').length;
  const weak = opp.filter((r) => r.band === 'weak').length;
  return opp.length > 0 && strong === 0 && weak >= 2;
}

export default function JourneyMap({ data, circle, progress, onAddPeople, onMarkDone, onSharpen, onValidateAnother }: {
  data: Scorecard;
  circle: CircleP[];
  progress: number[];
  onAddPeople: () => void;
  onMarkDone: (index: number) => void;
  onSharpen: () => void;
  onValidateAnother: () => void;
}) {
  if (isWeak(data)) {
    return (
      <>
        <div className="ovl">Your read</div>
        <div className="h" style={{ marginTop: 10 }}>This one is too thin to map yet.</div>
        <div className="sub">The thesis is too broad for the market to answer clearly, so a path would be guesswork. Sharpen who it is for and why you, and the map writes itself.</div>
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="grp">What is missing</div>
          <div style={{ fontSize: 13, color: C.mid, marginTop: 8, lineHeight: 1.5 }}>A specific buyer, and the one reason they pick you over the crowded field.</div>
        </div>
        <button className="cta" style={{ marginTop: 18 }} onClick={onSharpen}><span>Sharpen your thesis</span><span className="mono">→</span></button>
      </>
    );
  }

  const steps = data.steps || [];
  const doneSet = new Set(progress);
  const currentIdx = steps.findIndex((_, i) => !doneSet.has(i));
  const warmIdx = steps.findIndex((s) => s.big);
  const circleN = circle.length;
  const faces = circle.slice(0, 4);
  const allDone = currentIdx === -1;
  const current = allDone ? steps.length : currentIdx;
  const warmBlockedNow = current === warmIdx && circleN === 0;

  return (
    <>
      <div className="ovl">Your path</div>
      <div className="h" style={{ marginTop: 10 }}>From where you are to your first retained client.</div>
      {data.from || data.to ? (
        <div className="ft" style={{ margin: '14px 0 20px' }}>
          <div className="ftcol"><div className="ftk">Where you are</div><div className="ftv">{data.from || 'Where you are now.'}</div></div>
          <div className="ftcol"><div className="ftk">Where you are going</div><div className="ftv">{data.to || 'Your goal.'}</div></div>
        </div>
      ) : null}

      <div>
        {steps.map((s, i) => {
          const state = doneSet.has(i) ? 'done' : i === current ? 'current' : 'upcoming';
          const locked = s.big && circleN === 0 && state !== 'done';
          return (
            <div key={i} className={'jstep' + (locked ? ' dim' : '')}>
              <div className="jrail" />
              <div className={'jnode ' + (state === 'done' ? 'done' : locked ? 'locked' : state === 'current' ? 'current' : '')}>{state === 'done' ? '✓' : i + 1}</div>
              <div className="jbody">
                <div className="jtitle">{s.title}{s.tag && state === 'current' ? <span className="jtag">{s.tag}</span> : null}{s.big ? <span className="jtag">the big one</span> : null}</div>
                <div className="jwhy">{s.why}</div>
                {s.big ? (
                  circleN > 0 ? (
                    <div className="faces">
                      {faces.map((p, k) => <span key={k} className="face">{initials(p.name)}</span>)}
                      <span className="facemore">touches {s.touches || Math.min(circleN, 3)}{circleN > 4 ? ` of ${circleN.toLocaleString()}` : ''} in your circle</span>
                    </div>
                  ) : (
                    <div className="litprompt"><span className="litdot" /><span style={{ fontSize: 12, color: C.mid }}>Not lit yet. Add people and this move comes alive.</span></div>
                  )
                ) : null}
                {state !== 'upcoming' && !locked ? <div className="jval">✓ validated</div> : null}
              </div>
            </div>
          );
        })}
      </div>

      {allDone ? (
        <div className="panel" style={{ marginTop: 6, textAlign: 'center', padding: 20 }}>
          <div className="grp" style={{ color: C.good }}>Milestone</div>
          <div style={{ fontSize: 15, color: C.hi, marginTop: 8 }}>You are at your first retained client.</div>
          <div className="sub" style={{ marginTop: 6 }}>Now we run the warm moves again, to three.</div>
        </div>
      ) : warmBlockedNow ? (
        <button className="cta" onClick={onAddPeople}><span>Add people to light up your warm reach</span><span className="mono">→</span></button>
      ) : (
        <button className="cta" onClick={() => onMarkDone(current)}><span>{progress.length === 0 ? 'Start with move one' : 'Mark this move done'}</span><span className="mono">→</span></button>
      )}

      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <button className="secondary" onClick={onValidateAnother}>+ validate another thesis</button>
      </div>
    </>
  );
}
