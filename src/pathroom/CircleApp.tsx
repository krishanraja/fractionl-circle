// The authed app shell, in the ember (.thx) design system so both tabs read as
// one app. Owns the locked, zero-scroll frame and injects the shared ember CSS
// once. Switches between:
//   • Circle  — the free hero: drop a contact + your circle (the daily habit).
//   • Deep dive — the thesis tool (ThesisApp). Reachable by everyone: free users
//     get one full pass; ThesisApp owns the Pro gating internally.
import { useState } from 'react';
import { Users, Compass } from 'lucide-react';
import { useAppFrame } from '@/hooks/useAppFrame';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';
import { thesisCss } from './thesisViews';
import { chromeCss } from './thesisChrome';
import { circleCss } from './circleChrome';
import CircleHome from './CircleHome';
import ThesisApp from './ThesisApp';

type Tab = 'circle' | 'thesis';

export default function CircleApp() {
  useAppFrame(); // lock the page once, for the whole shell
  const [tab, setTab] = useState<Tab>('circle');

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'circle', label: 'Circle', icon: Users },
    { id: 'thesis', label: 'Deep dive', icon: Compass },
  ];

  return (
    <div className="thx app-frame" style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{thesisCss + chromeCss + circleCss + '.thesis-tab-host .thx.thxframe{height:100%;}'}</style>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'circle' ? (
          <CircleHome />
        ) : (
          <div className="thesis-tab-host" style={{ height: '100%' }}>
            <ThesisApp />
          </div>
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
            </button>
          );
        })}
      </nav>
    </div>
  );
}
