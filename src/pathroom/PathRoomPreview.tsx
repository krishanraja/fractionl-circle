// Interactive preview gallery for The Path Room. Public, unlinked, no auth, no data:
// renders the REAL presentational components with fixtures so every surface can be
// reviewed across segment (New / Seasoned / Lifestyle), tier (Free / Pro), view, and
// device frame (Mobile / Desktop). This is the "see it on all devices first" surface.
import { useState } from 'react';
import { C, MONO, FONT } from './tokens';
import { css, PathScreen, DesktopHome, DecisionRoom, Ledger, Onboarding } from './PathRoomApp';
import { previewSession, PREVIEW_SEGMENTS, PREVIEW_RANKED, PREVIEW_LEDGER, PREVIEW_BRIEF } from './previewFixtures';

const VIEWS: Array<[string, string]> = [['onboard', 'Onboarding'], ['path', 'Path'], ['decision', 'Decision'], ['ledger', 'Ledger']];

function Group({ label, opts, val, set }: { label: string; opts: Array<[string, string]>; val: string; set: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 9 }}>{label}</span>
      {opts.map(([v, l]) => (
        <button key={v} onClick={() => set(v)} style={{
          padding: '5px 9px', borderRadius: 5, cursor: 'pointer', fontFamily: MONO, fontSize: 10.5,
          border: `1px solid ${val === v ? C.accentEdge : '#262626'}`, background: val === v ? C.accentDim : 'transparent', color: val === v ? C.accent : '#999',
        }}>{l}</button>
      ))}
    </div>
  );
}

export default function PathRoomPreview() {
  const [seg, setSeg] = useState('new');
  const [tier, setTier] = useState('pro');
  const [view, setView] = useState('path');
  const [device, setDevice] = useState('mobile');

  const s = previewSession(seg);
  const locked = tier === 'free';
  const isDesktop = device === 'desktop';
  const width = isDesktop ? 1180 : 390;

  return (
    <div style={{ minHeight: '100vh', background: '#050506', padding: '14px 14px 60px', fontFamily: FONT }}>
      <style>{css}</style>
      <div style={{ maxWidth: 1180, margin: '0 auto 14px' }}>
        <div style={{ color: C.hi, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>The Path Room · interactive preview</div>
        <div style={{ color: '#6a6a6a', fontSize: 11.5, marginTop: 3, fontFamily: MONO }}>Fixtures, not your data. Open on a phone for the true mobile feel; toggle Desktop for the command-centre.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 14 }}>
          <Group label="Segment" opts={PREVIEW_SEGMENTS} val={seg} set={setSeg} />
          <Group label="Tier" opts={[['free', 'Free'], ['pro', 'Pro']]} val={tier} set={setTier} />
          <Group label="View" opts={VIEWS} val={view} set={setView} />
          <Group label="Device" opts={[['mobile', 'Mobile'], ['desktop', 'Desktop']]} val={device} set={setDevice} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div className="prr" style={{ width, margin: '0 auto', border: '1px solid #1e1e20', borderRadius: isDesktop ? 12 : 26, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          {view === 'onboard' ? <Onboarding onDone={() => setView('path')} onDescribe={async () => { setView('path'); }} /> : null}
          {view === 'path' ? (isDesktop
            ? <DesktopHome s={s} circle={[]} ranked={PREVIEW_RANKED} ledger={PREVIEW_LEDGER} onOpenFork={() => setView('decision')} locked={locked} onUnlock={() => setTier('pro')} />
            : <PathScreen s={s} circle={[]} ranked={PREVIEW_RANKED} ledgerCount={PREVIEW_LEDGER.length} onOpenFork={() => setView('decision')} locked={locked} onUnlock={() => setTier('pro')} />) : null}
          {view === 'decision' ? <DecisionRoom s={s} busy={false} onCommit={() => setView('ledger')} onBack={() => setView('path')} isDesktop={isDesktop} briefOverride={locked ? null : PREVIEW_BRIEF} /> : null}
          {view === 'ledger' ? <Ledger entries={PREVIEW_LEDGER} /> : null}
        </div>
      </div>
    </div>
  );
}
