// The command-center Home for your one venture, laser-focused: a living, TAPPABLE
// ember orb (tap it to open your Value Prop), the strength score, and the Plan
// tab's two clear forks - Value Prop (understand + strengthen the opportunity) and
// Next Action (take the next step) - with a quiet "Your decisions" memory link
// beneath. The ONE orange action lives in the frame's pinned footer, picked
// contextually by primaryAction.ts. People are owned by the Circle tab.
// Renders inside .thxbody.
import { useState } from 'react';
import { C } from './tokens';
import { PLAN } from './copy';
import type { DecisionEntry } from './thesisData';
import { holdingBack, type Sharpness } from './sharpness';

// The visible decision log: institutional memory the user can see. Each entry is a
// decision banked with the coach; "in your read" means a read has folded it in and
// every future read builds on it. One-tap outcome marks feed that memory back.
function DecisionSheet({ decisions, onMarkOutcome, onClose }: {
  decisions: DecisionEntry[];
  onMarkOutcome: (id: string, outcome: 'worked' | 'didnt_work' | null) => void;
  onClose: () => void;
}) {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const chip = (d: DecisionEntry, val: 'worked' | 'didnt_work', label: string) => {
    const on = d.outcome === val;
    return (
      <button
        onClick={() => onMarkOutcome(d.id, on ? null : val)}
        className="mono"
        style={{
          fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          padding: '2px 7px', borderRadius: 4, border: `1px solid ${on ? C.accentEdge : C.line2}`,
          color: on ? C.accent : C.lo, background: on ? C.accentDim : 'none',
        }}
      >{label}</button>
    );
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, maxHeight: '72dvh', overflowY: 'auto', background: C.bg, borderTop: `1px solid ${C.line2}`, borderRadius: '14px 14px 0 0', padding: '18px 20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ovl" style={{ flex: 1 }}>Your decisions</span>
          <button className="mono" onClick={onClose} style={{ background: 'none', border: 0, color: C.lo, fontSize: 14, cursor: 'pointer' }}>×</button>
        </div>
        <div className="sub" style={{ marginTop: 6 }}>Every decision you bank becomes part of your plan's memory. Your next read builds on these, it never re-asks them.</div>
        {decisions.map((d) => (
          <div key={d.id} style={{ borderTop: `1px solid ${C.line}`, padding: '11px 0', marginTop: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.hi, lineHeight: 1.35 }}>{d.answer}</div>
            {d.question ? <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.4, marginTop: 4 }}>{d.question}</div> : null}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
              <span className="mono" style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.lo }}>
                {fmt(d.created_at)}{d.dimension ? ` · ${d.dimension}` : ''}
              </span>
              <span className="mono" style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: d.applied_at ? C.good : C.accent }}>
                {d.applied_at ? 'in your read' : 'banked, folds into your next read'}
              </span>
              <span style={{ flex: 1 }} />
              {chip(d, 'worked', 'worked')}
              {chip(d, 'didnt_work', "didn't")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home({ fuel, sharp, decisions, onMarkOutcome, onOpenRead, onOpenPath }: {
  fuel: number;
  sharp: Sharpness;
  decisions: DecisionEntry[];
  onMarkOutcome: (id: string, outcome: 'worked' | 'didnt_work' | null) => void;
  onOpenRead: () => void;
  onOpenPath: () => void;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const r = 44, circ = 2 * Math.PI * r;

  return (
    <div className="vhome">
      <div className="vhero">
        <div className="ovl" style={{ textAlign: 'center', marginBottom: 8 }}>Your venture</div>
        <button className="vorbbtn" onClick={onOpenRead} aria-label={PLAN.openResult}>
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
          </div>
        </button>
      </div>

      {/* The Plan tab is two clear forks: understand + strengthen the opportunity
          (Value Prop), or take the next step (Next Action). Each is one tappable
          row with a plain-English one-liner - not a scatter of tiny links. */}
      <div className="forks">
        <button className="forkrow" onClick={onOpenRead}>
          <span className="forkrow-t">
            <span className="forkrow-title">{PLAN.resultTitle}</span>
            <span className="forkrow-sub">{PLAN.fork1Sub}</span>
          </span>
          <span className="htarrow">→</span>
        </button>
        <button className="forkrow" onClick={onOpenPath}>
          <span className="forkrow-t">
            <span className="forkrow-title">{PLAN.pathTitle}</span>
            <span className="forkrow-sub">{PLAN.fork2Sub}</span>
          </span>
          <span className="htarrow">→</span>
        </button>
      </div>

      {decisions.length > 0 ? (
        <div className="homelinks">
          <button className="homelink" onClick={() => setLogOpen(true)}>Your decisions</button>
        </div>
      ) : null}

      {logOpen ? <DecisionSheet decisions={decisions} onMarkOutcome={onMarkOutcome} onClose={() => setLogOpen(false)} /> : null}
    </div>
  );
}
