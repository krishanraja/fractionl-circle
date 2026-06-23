// The authed app shell. Owns the locked, zero-scroll app frame and switches
// between two surfaces with an in-memory tab (no URL routes, so useAppFrame
// stays mounted once and the no-scroll guarantee holds):
//   • Circle  — the free hero: drop a contact + your circle (the daily habit).
//   • Deep dive — the Pro thesis tool (today's ThesisApp), gated for free users.
// The thesis flow renders its own full-height .thxframe; inside the tab body we
// scope it back to 100% so the bottom tab bar keeps its space.
import { useState } from 'react';
import { Users, Compass, Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { getPriceId } from '@/lib/tiers';
import { useAppFrame } from '@/hooks/useAppFrame';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';
import CircleHome from './CircleHome';
import ThesisApp from './ThesisApp';

type Tab = 'circle' | 'thesis';

function DeepDiveGate({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center px-8 text-center bg-background">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Compass className="w-7 h-7 text-primary" strokeWidth={1.7} />
      </div>
      <h2 className="text-title-2 text-foreground mb-2 max-w-sm">Pressure-test your direction.</h2>
      <p className="text-sm text-foreground-secondary leading-relaxed max-w-sm mb-6">
        The deep dive checks your idea against the real market and maps your next moves.
        It's part of Pro.
      </p>
      <button
        onClick={onUpgrade}
        className={cn(
          'inline-flex items-center gap-2 h-12 px-6 rounded-full',
          'bg-primary text-primary-foreground text-[15px] font-semibold',
          'shadow-md shadow-primary/25 active:scale-[0.97] transition-all duration-100'
        )}
      >
        Unlock the deep dive
      </button>
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
    <div className="app-frame flex flex-col bg-background">
      <style>{`.thesis-tab-host .thx.thxframe{height:100%;}`}</style>

      <div className="min-h-0 flex-1">
        {tab === 'circle' ? (
          <CircleHome />
        ) : isProOrAbove ? (
          <div className="thesis-tab-host h-full">
            <ThesisApp />
          </div>
        ) : (
          <DeepDiveGate onUpgrade={onUpgrade} />
        )}
      </div>

      <nav className="shrink-0 flex items-stretch border-t border-border/60 bg-card/80 backdrop-blur frame-safe-bottom">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { if (!active) haptics.tap(); setTab(t.id); }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors',
                active ? 'text-primary' : 'text-foreground-muted hover:text-foreground-secondary'
              )}
            >
              <span className="relative">
                <Icon className="w-5 h-5" strokeWidth={2.1} />
                {t.locked && (
                  <span className="absolute -right-2 -top-1 w-3.5 h-3.5 rounded-full bg-card flex items-center justify-center">
                    <Lock className="w-2.5 h-2.5 text-foreground-muted" strokeWidth={2.5} />
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium leading-none">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
