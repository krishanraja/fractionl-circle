// The Path Room, P0. Real, data-wired vertical behind VITE_PATH_ROOM_ENABLED:
// onboarding pills write the_read -> PathScreen (computed SessionRead) -> Decision
// Room (branches) -> commit writes decision_ledger + advances the marker -> Ledger.
// Deterministic compute on the corpus seed; no LLM (that is P0.5). Quiet Instrument.
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { C, FONT, MONO } from './tokens';
import { computeSession, NEXT_FORK, forkStageKey, type SessionRead, type Segment, type ForkDomain, type TheRead, type LedgerEntry } from './engine';
import { getRead, upsertRead, getEngineData, getLedger, commitDecision, getInnerCircle, type CirclePerson } from './data';

const css = `
.prr * { box-sizing:border-box; margin:0; padding:0; }
.prr { background:${C.bg}; color:${C.hi}; font-family:${FONT}; -webkit-font-smoothing:antialiased; letter-spacing:-0.01em; min-height:100vh; }
.prr .ovl { font-family:${MONO}; font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:${C.lo}; }
.prr .mono { font-family:${MONO}; font-variant-numeric:tabular-nums; }
.prr .panel { background:${C.panel}; border:1px solid ${C.line}; border-radius:10px; }
.prr .recog { font-size:20px; line-height:1.32; letter-spacing:-0.02em; font-weight:500; }
.prr .recog .em { color:${C.mid}; }
.prr .decTitle { font-size:24px; line-height:1.06; letter-spacing:-0.025em; font-weight:600; }
.prr .gaprow { display:flex; justify-content:space-between; gap:14px; padding:9px 0; align-items:baseline; }
.prr .gaprow + .gaprow { border-top:1px solid ${C.line}; }
.prr .gaplabel { font-size:13px; color:${C.mid}; }
.prr .gapval { font-family:${MONO}; font-size:12.5px; color:${C.hi}; letter-spacing:-0.01em; }
.prr .flag { font-family:${MONO}; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; border-radius:3px; padding:2px 5px; margin-left:8px; }
.prr .flagGen { color:${C.lo}; border:1px solid ${C.line2}; }
.prr .flagRisk { color:${C.risk}; border:1px solid rgba(204,119,119,0.4); }
.prr .cta { display:flex; align-items:center; justify-content:space-between; background:${C.accent}; color:#1A1206; border-radius:6px; padding:13px 16px; font-weight:600; font-size:15px; cursor:pointer; border:0; width:100%; }
.prr .pill { display:inline-flex; border:1px solid ${C.line2}; border-radius:7px; padding:12px 14px; font-size:14px; color:${C.hi}; background:${C.panel}; cursor:pointer; }
.prr .pillSel { border-color:${C.accentEdge}; background:${C.accentDim}; color:${C.accent}; font-weight:600; }
.prr .branch { border:1px solid ${C.line}; border-radius:8px; padding:15px; background:${C.panel}; margin-top:12px; cursor:pointer; }
.prr .branchRec { border-color:${C.accentEdge}; background:${C.panel2}; }
.prr .meta { display:flex; gap:10px; padding:6px 0; font-size:12.5px; }
.prr .metaK { font-family:${MONO}; font-size:9px; letter-spacing:0.12em; text-transform:uppercase; color:${C.lo}; width:70px; flex:0 0 auto; padding-top:2px; }
.prr .metaV { color:${C.mid}; line-height:1.4; }
.prr .band { position:relative; height:30px; margin-top:6px; }
.prr .btrack { position:absolute; top:13px; left:0; right:0; height:3px; background:${C.line}; border-radius:2px; }
.prr .bfill { position:absolute; top:13px; height:3px; background:${C.accentDim}; border-radius:2px; }
.prr .byou { position:absolute; top:8px; width:2px; height:13px; background:${C.hi}; }
.prr .nav { position:fixed; bottom:0; left:0; right:0; display:flex; justify-content:center; gap:8px; padding:12px; background:rgba(10,10,11,0.9); border-top:1px solid ${C.line}; backdrop-filter:blur(8px); }
.prr .navbtn { font-family:${MONO}; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:${C.lo}; background:none; border:0; padding:8px 14px; cursor:pointer; }
.prr .navOn { color:${C.accent}; }
.prr .led { display:flex; gap:14px; padding:14px 0; border-top:1px solid ${C.line}; }
.prr .disc { width:30px; height:30px; border-radius:50%; background:${C.panel3}; border:1px solid ${C.line2}; display:flex; align-items:center; justify-content:center; font-family:${MONO}; font-size:11px; color:${C.mid}; flex:0 0 auto; }
`;

function Gauge({ s }: { s: SessionRead }) {
  const n = s.stages.length, pad = 18, w = 354, step = (w - pad * 2) / (n - 1), x = (i: number) => pad + i * step, RY = 30;
  const land = n - 1 > s.litForkIndex + 1 ? s.litForkIndex + 2 : -1;
  return (
    <svg width={w} height="60" style={{ display: 'block' }}>
      <line x1={x(0)} y1={RY} x2={x(n - 1)} y2={RY} stroke={C.line2} strokeWidth="1" />
      <line x1={x(s.litForkIndex)} y1={RY} x2={x(Math.min(s.litForkIndex + 1, n - 1))} y2={RY} stroke={C.accent} strokeWidth="1.5" opacity="0.85" />
      {s.stages.map((st, i) => <line key={st.key} x1={x(i)} y1={RY - 4} x2={x(i)} y2={RY + 4} stroke={i === s.litForkIndex ? C.accent : C.line2} strokeWidth="1" />)}
      <circle cx={x(s.markerIndex)} cy={RY} r="4.5" fill={C.bg} stroke={C.hi} strokeWidth="1.5" /><circle cx={x(s.markerIndex)} cy={RY} r="1.6" fill={C.hi} />
      <text x={x(s.markerIndex)} y={13} textAnchor="middle" fontFamily={MONO} fontSize="8.5" fill={C.mid}>you</text>
      <text x={x(s.litForkIndex)} y={50} textAnchor={s.litForkIndex === 0 ? 'start' : 'middle'} fontFamily={MONO} fontSize="9" letterSpacing="0.06em" fill={C.accent}>{s.stages[s.litForkIndex]?.label}</text>
      {land > 0 && s.landmine ? <text x={x(land)} y={50} textAnchor="end" fontFamily={MONO} fontSize="9" fill={C.lo}>{s.stages[land]?.label} ahead</text> : null}
    </svg>
  );
}

function PathScreen({ s, circle, ledgerCount, onOpenFork }: { s: SessionRead; circle: CirclePerson[]; ledgerCount: number; onOpenFork: () => void }) {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '24px 18px 90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="ovl">The Path</span><span className="ovl">{s.pathTitle}</span></div>
      <div style={{ margin: '18px 0 4px' }}><Gauge s={s} /></div>
      <p className="recog" style={{ marginTop: 14 }}>{s.recognition.split('.').slice(0, 1).join('.')}.{' '}<span className="em">{s.recognition.split('.').slice(1).join('.').trim()}</span></p>
      <div className="panel" style={{ background: C.panel2, padding: 16, marginTop: 18 }}>
        <div className="ovl" style={{ color: C.accent }}>Decision · {s.litForkLabel}</div>
        <div className="decTitle" style={{ marginTop: 8 }}>{s.litFork === 'icp_positioning' ? 'Narrow your niche.' : s.litFork === 'scaling_leverage' ? 'Break the plateau.' : s.litFork === 'offer_pricing' ? 'Price the offer.' : 'Work your network.'}</div>
        <div style={{ marginTop: 12 }}>
          {s.gap.map((g) => (
            <div className="gaprow" key={g.label}><span className="gaplabel">{g.label}</span>
              <span className="gapval">{g.value}{g.flag ? <span className={'flag ' + (g.flag === 'risk' ? 'flagRisk' : 'flagGen')}>{g.flag}</span> : null}</span></div>
          ))}
        </div>
        {s.benchmarkBand ? (
          <div style={{ marginTop: 12 }}>
            <div className="ovl" style={{ marginBottom: 2 }}>Benchmark</div>
            <div className="band"><div className="btrack" /><div className="bfill" style={{ left: `${s.benchmarkBand.bandStartPct}%`, right: '8%' }} /><div className="byou" style={{ left: `${s.benchmarkBand.youPct}%` }} />
              <span className="mono" style={{ position: 'absolute', top: 0, left: `${s.benchmarkBand.youPct - 4}%`, fontSize: 9, color: C.hi }}>{s.benchmarkBand.youLabel}</span>
              <span className="mono" style={{ position: 'absolute', top: 0, left: `${s.benchmarkBand.bandStartPct + 4}%`, fontSize: 9, color: C.accent }}>{s.benchmarkBand.bandLabel}</span></div>
          </div>
        ) : null}
        <button className="cta" style={{ marginTop: 16 }} onClick={onOpenFork}><span>Open decision</span><span className="mono">→</span></button>
        {!s.cohortHasN ? <div className="mono" style={{ fontSize: 10, color: C.lo, marginTop: 8 }}>benchmark says · cohort builds as you go</div> : null}
      </div>
      {circle.length ? (
        <div style={{ marginTop: 20 }}>
          <div className="ovl">Who this touches</div>
          {circle.slice(0, 2).map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 11, marginTop: 12 }}>
              <div className="disc">{(p.display_name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}</div>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.display_name}</div><div style={{ fontSize: 12, color: C.mid }}>{[p.title, p.company].filter(Boolean).join(' · ')}</div></div>
            </div>
          ))}
        </div>
      ) : null}
      {s.landmine ? <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}` }}><span className="ovl" style={{ color: C.lo }}>Ahead · {s.landmine.name}</span><div style={{ fontSize: 12, color: C.lo, fontStyle: 'italic', marginTop: 4, lineHeight: 1.4 }}>{s.landmine.note}</div></div> : null}
      <div className="mono" style={{ fontSize: 10, color: C.lo, marginTop: 16 }}>ledger · {ledgerCount} decision{ledgerCount === 1 ? '' : 's'}</div>
    </div>
  );
}

function DecisionRoom({ s, busy, onCommit, onBack }: { s: SessionRead; busy: boolean; onCommit: (branchTitle: string) => void; onBack: () => void }) {
  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '20px 18px 90px' }}>
      <button className="navbtn" style={{ paddingLeft: 0 }} onClick={onBack}>‹ the path</button>
      <div className="ovl" style={{ color: C.accent, marginTop: 8 }}>Decision · {s.litForkLabel}</div>
      <div className="decTitle" style={{ marginTop: 8, fontSize: 22 }}>Pick the one you would commit to.</div>
      {s.branches.map((b) => (
        <div key={b.title} className={'branch' + (b.recommended ? ' branchRec' : '')} onClick={() => !busy && onCommit(b.title)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{b.title}</span>
            {b.recommended ? <span className="flag flagGen" style={{ color: C.accent, borderColor: C.accentEdge }}>recommended</span> : null}
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="meta"><span className="metaK">fit</span><span className="metaV">{b.fit}</span></div>
            <div className="meta"><span className="metaK">benchmark</span><span className="metaV">{b.benchmark}</span></div>
            <div className="meta"><span className="metaK">obstacle</span><span className="metaV">{b.obstacle}</span></div>
          </div>
          <div className="mono" style={{ fontSize: 11, color: b.recommended ? C.accent : C.lo, marginTop: 10 }}>{busy ? 'committing...' : 'commit this →'}</div>
        </div>
      ))}
      <div className="mono" style={{ fontSize: 11, color: C.lo, marginTop: 16, lineHeight: 1.5 }}>Deciding advances your marker and writes the ledger. Nothing is sent.</div>
    </div>
  );
}

function Ledger({ entries }: { entries: LedgerEntry[] }) {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 18px 90px' }}>
      <div className="ovl">Your ledger</div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 6 }}>Every decision you committed.</div>
      {entries.length === 0 ? <div className="mono" style={{ fontSize: 12, color: C.lo, marginTop: 18 }}>No decisions yet. Make one on the Path.</div> : null}
      <div style={{ marginTop: 14 }}>
        {entries.map((l) => (
          <div className="led" key={l.id}>
            <span className="mono" style={{ fontSize: 11, color: C.lo, width: 60, flex: '0 0 auto', paddingTop: 2 }}>{new Date(l.committed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{l.decision_one_liner}</div>
              {l.reasoning ? <div style={{ fontSize: 12, color: C.lo, marginTop: 3, lineHeight: 1.4 }}>{l.reasoning}</div> : null}
              {l.outcome ? <div style={{ fontSize: 12.5, color: C.good, marginTop: 5 }}>{l.outcome}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SEG_Q = ['Just left a senior role', 'A few months in, finding my feet', 'Established, scaling a portfolio', 'Still in a role, exploring'];
const FN_Q = ['Marketing', 'Finance', 'Revenue', 'Operations', 'Product', 'People'];

function Onboarding({ onDone }: { onDone: (segment: Segment, fn: string) => void }) {
  const [step, setStep] = useState(0);
  const [seg, setSeg] = useState<string | null>(null);
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '40px 20px' }}>
      <span className="ovl">A couple of quick things</span>
      {step === 0 ? (
        <>
          <div className="decTitle" style={{ marginTop: 14, fontSize: 24 }}>Where are you right now?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 18 }}>
            {SEG_Q.map((q) => <button key={q} className={'pill' + (seg === q ? ' pillSel' : '')} onClick={() => { setSeg(q); setStep(1); }}>{q}</button>)}
          </div>
        </>
      ) : (
        <>
          <div className="decTitle" style={{ marginTop: 14, fontSize: 24 }}>What did you lead?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            {FN_Q.map((f) => <button key={f} className="pill" onClick={() => onDone(seg!.startsWith('Established') ? 'seasoned' : 'new', f.toLowerCase())}>{f}</button>)}
          </div>
        </>
      )}
    </div>
  );
}

export default function PathRoomApp() {
  const { user } = useAuth();
  const userId = user?.id;
  const [phase, setPhase] = useState<'loading' | 'onboarding' | 'home'>('loading');
  const [read, setRead] = useState<TheRead | null>(null);
  const [data, setData] = useState<{ benchmarks: never[]; landmines: never[]; cohort: never[] } | null>(null);
  const [session, setSession] = useState<SessionRead | null>(null);
  const [circle, setCircle] = useState<CirclePerson[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [view, setView] = useState<'path' | 'decision' | 'ledger'>('path');
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!userId) return;
    const [r, d, l, c] = await Promise.all([getRead(userId), getEngineData(), getLedger(userId), getInnerCircle(userId)]);
    setData(d as never); setLedger(l); setCircle(c);
    if (!r || !r.segment) { setPhase('onboarding'); return; }
    setRead(r); setSession(computeSession(r, d)); setPhase('home');
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  if (phase === 'loading') return <div className="prr" style={{ display: 'grid', placeItems: 'center' }}><style>{css}</style><span className="mono" style={{ color: C.lo, fontSize: 12 }}>reading your situation…</span></div>;

  if (phase === 'onboarding') {
    return <div className="prr"><style>{css}</style>
      <Onboarding onDone={async (segment, fn) => {
        if (!userId) return;
        await upsertRead(userId, { segment, function: fn, lit_fork_domain: segment === 'seasoned' ? 'scaling_leverage' : 'icp_positioning' });
        await load();
      }} /></div>;
  }

  const goCommit = async (branchTitle: string) => {
    if (!userId || !session) return;
    setBusy(true);
    await commitDecision(userId, {
      fork_domain: session.litFork as ForkDomain,
      decision_one_liner: `${session.litForkLabel}: ${branchTitle}`,
      chosen_branch: branchTitle,
      reasoning: session.recognition,
      branches_considered: session.branches.map((b) => b.title),
    });
    // Advance: light the next fork (marker moves to it), or step one stage on if last.
    const nextFork = NEXT_FORK[session.segment]?.[session.litFork as ForkDomain];
    if (nextFork) {
      await upsertRead(userId, { lit_fork_domain: nextFork, current_position: forkStageKey(session.segment, nextFork) ?? null });
    } else {
      const next = session.stages[Math.min(session.litForkIndex + 1, session.stages.length - 1)];
      await upsertRead(userId, { current_position: next?.key ?? null });
    }
    await load();
    setView('path'); setBusy(false);
  };

  return (
    <div className="prr"><style>{css}</style>
      {view === 'path' && session ? <PathScreen s={session} circle={circle} ledgerCount={ledger.length} onOpenFork={() => setView('decision')} /> : null}
      {view === 'decision' && session ? <DecisionRoom s={session} busy={busy} onCommit={goCommit} onBack={() => setView('path')} /> : null}
      {view === 'ledger' ? <Ledger entries={ledger} /> : null}
      <div className="nav">
        <button className={'navbtn' + (view === 'path' ? ' navOn' : '')} onClick={() => setView('path')}>Path</button>
        <button className={'navbtn' + (view === 'ledger' ? ' navOn' : '')} onClick={() => setView('ledger')}>Ledger</button>
      </div>
    </div>
  );
}
