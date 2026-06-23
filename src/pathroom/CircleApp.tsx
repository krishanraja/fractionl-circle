// The authed app shell, in the ember (.thx) design system so both tabs read as
// one app. Owns the locked, zero-scroll frame and injects the shared ember CSS
// once. Switches between:
//   • Circle  — the free hero: drop a contact + your circle (the daily habit).
//   • Deep dive — the Pro thesis tool (ThesisApp), gated for free users.
import { useState } from 'react';
import { Users, Compass, Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { getPriceId } from '@/lib/tiers';
import { useAppFrame } from '@/hooks/useAppFrame';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';
import { thesisCss } from './thesisViews';
import { chromeCss } from './thesisChrome';
import { circleCss } from './circleChrome';
import CircleHome from './CircleHome';
import ThesisApp from './ThesisApp';

type Tab = 'circle' | 'thesis';

function DeepDiveGate({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="thxbody">
      <div className="wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '100%' }}>
        <div className="ovl">Pro</div>
        <div className="h" style={{ marginTop: 10 }}>Pressure-test your direction.</div>
        <div className="sub" style={{ maxWidth: 320 }}>The deep dive checks your idea against the real market and maps your next moves. It's part of Pro.</div>
        <button className="cta" style={{ marginTop: 20, maxWidth: 300 }} onClick={onUpgrade}>
          <span>Unlock the deep dive</span><span className="mono">→</span>
        </button>
      </div>
    </div>
  );
}

export default function CircleApp() {
  useAppFrame(); // lock the page once, for the whole shell
  const { isProOrAbove, openCheckout } = useSubscription();
  const [tab, setTab] = useState<Tab>('circle');

  const onUpgrade = async () => {
    const pid = getPriceId('pro');
    if (pid) await openCheckout(pid);
  };

  const tabs: { id: Tab; label: string; icon: typeof Users; locked?: boolean }[] = [
    { id: 'circle', label: 'Circle', icon: Users },
    { id: 'thesis', label: 'Deep dive', icon: Compass, locked: !isProOrAbove },
  ];

  return (
    <div className="thx app-frame" style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{thesisCss + chromeCss + circleCss + '.thesis-tab-host .thx.thxframe{height:100%;}'}</style>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'circle' ? (
          <CircleHome />
        ) : isProOrAbove ? (
          <div className="thesis-tab-host" style={{ height: '100%' }}>
            <ThesisApp />
          </div>
        ) : (
          <DeepDiveGate onUpgrade={onUpgrade} />
        )}
      </div>

      <nav className="tabbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              className={cn('tabbtn', active && 'on')}
              onClick={() => { if (!active) haptics.tap(); setTab(t.id); }}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={2} />
              <span className="tablabel">{t.label}</span>
              {t.locked && <Lock className="tablock" size={10} strokeWidth={2.5} />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
