// The authed app shell, in the ember (.thx) design system so both tabs read as
// one app. Owns the locked, zero-scroll frame and injects the shared ember CSS
// once. A brand-new user (no plan yet) is held in the warm, gated "Start here"
// onboarding until they've grounded their first plan; everyone else lands in the
// two-tab shell:
//   • Circle — your warm network (the daily habit).
//   • Plan   — read the market against what you want to offer, and your next moves.
import { useEffect, useState } from 'react';
import { Users, Compass } from 'lucide-react';
import { useAppFrame } from '@/hooks/useAppFrame';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';
import { thesisCss } from './thesisViews';
import { chromeCss, Loader } from './thesisChrome';
import { circleCss } from './circleChrome';
import { PLAN } from './copy';
import { getRunCount } from './thesisData';
import CircleHome from './CircleHome';
import ThesisApp from './ThesisApp';
import StartHere from './StartHere';

type Tab = 'circle' | 'thesis';

export default function CircleApp() {
  useAppFrame(); // lock the page once, for the whole shell
  const { user } = useAuth();
  const userId = user?.id;
  const [tab, setTab] = useState<Tab>('circle');
  // null = still resolving; true = brand-new (no plan yet); false = returning.
  const [firstRun, setFirstRun] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) { setFirstRun(null); return; }
    getRunCount(userId).then((n) => setFirstRun(n === 0)).catch(() => setFirstRun(false));
  }, [userId]);

  const css = thesisCss + chromeCss + circleCss + '.thesis-tab-host .thx.thxframe{height:100%;}';

  if (firstRun === null) {
    return (
      <div className="thx app-frame">
        <style>{css}</style>
        <div className="thx thxframe" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader />
        </div>
      </div>
    );
  }

  if (firstRun) {
    return (
      <div className="thx app-frame">
        <style>{css}</style>
        <StartHere onComplete={() => { setFirstRun(false); setTab('thesis'); }} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'circle', label: 'Circle', icon: Users },
    { id: 'thesis', label: PLAN.tab, icon: Compass },
  ];

  return (
    <div className="thx app-frame" style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{css}</style>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'circle' ? (
          <CircleHome onOpenPlan={() => { haptics.tap(); setTab('thesis'); }} />
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
