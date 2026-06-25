// The authed app shell, in the ember (.thx) design system so both tabs read as
// one app. Owns the locked, zero-scroll frame and injects the shared ember CSS
// once. Switches between:
//   • Circle  — the free hero: drop a contact + your circle (the daily habit).
//   • Deep dive — the thesis tool (ThesisApp). Reachable by everyone: free users
//     get one full pass; ThesisApp owns the Pro gating internally.
import { useEffect, useState } from 'react';
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

// Opt-in viewport readout (append ?debug to the URL). Surfaces the real numbers
// from a device when the bottom tab bar still misbehaves, so we stop guessing:
// innerHeight, visualViewport, a live 100dvh probe, and whether the tab bar's
// bottom edge actually lands on screen.
function FrameDebug() {
  const [info, setInfo] = useState('measuring…');
  useEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:-9999px;height:100dvh;width:1px;pointer-events:none;';
    document.body.appendChild(probe);
    const read = () => {
      const vv = window.visualViewport;
      const dvh = Math.round(probe.getBoundingClientRect().height);
      const tab = document.querySelector('.tabbar') as HTMLElement | null;
      const tabBottom = tab ? Math.round(tab.getBoundingClientRect().bottom) : -1;
      const onscreen = tab && tabBottom <= window.innerHeight + 1;
      setInfo(
        `inner=${window.innerHeight} vv=${vv ? Math.round(vv.height) : '—'} dvh=${dvh} ` +
        `clientH=${document.documentElement.clientHeight} vvTop=${vv ? Math.round(vv.offsetTop) : '—'} ` +
        `tabBottom=${tabBottom} → ${tab ? (onscreen ? 'ON-SCREEN' : 'OFF-SCREEN') : 'NO TABBAR'}`
      );
    };
    read();
    const iv = window.setInterval(read, 400);
    window.addEventListener('resize', read);
    window.visualViewport?.addEventListener('resize', read);
    window.visualViewport?.addEventListener('scroll', read);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('resize', read);
      window.visualViewport?.removeEventListener('resize', read);
      window.visualViewport?.removeEventListener('scroll', read);
      probe.remove();
    };
  }, []);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', color: '#5f5', font: '10px/1.45 monospace', padding: '4px 6px', whiteSpace: 'pre-wrap' }}>
      {info}
    </div>
  );
}

export default function CircleApp() {
  useAppFrame(); // lock the page once, for the whole shell
  const [tab, setTab] = useState<Tab>('circle');
  const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'circle', label: 'Circle', icon: Users },
    { id: 'thesis', label: 'Deep dive', icon: Compass },
  ];

  return (
    <div className="thx app-frame" style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{thesisCss + chromeCss + circleCss + '.thesis-tab-host .thx.thxframe{height:100%;}'}</style>
      {debug && <FrameDebug />}

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
