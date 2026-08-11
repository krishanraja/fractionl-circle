import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  ChevronRight,
  CircleUserRound,
  Compass,
  Lightbulb,
  Loader2,
  Plus,
  Settings,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AddToCircleSheet } from '@/components/circle/AddToCircleSheet';
import { AddSourceSheet } from '@/components/circle/AddSourceSheet';
import { CirclePeopleList } from '@/components/circle/CirclePeopleList';
import { CircleBrand } from '@/components/circle/CircleBrand';
import { ProfileSettingsSheet } from '@/components/profile/ProfileSettingsSheet';
import { haptics } from '@/utils/haptics';
import { cn } from '@/lib/utils';
import { clearPendingClue, readPendingClue } from '@/lib/pendingClue';
import WorkingOnInput from './WorkingOnInput';
import WarmReachDrawer from './WarmReachDrawer';
import { circleCss } from './circleChrome';
import { chromeCss, Loader } from './thesisChrome';
import { thesisCss } from './thesisViews';
import {
  getGoingQuietCount,
  getRecentRuns,
  getUnrunAnswerCount,
  type RecentRun,
} from './thesisData';
import './circle-system.css';
import './circle-workspace.css';

const ThesisApp = lazy(() => import('./ThesisApp'));

type Tab = 'people' | 'ideas' | 'you';
type IdeaFlow = { kind: 'new' } | { kind: 'existing'; id: string } | null;

const NAV: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'people', label: 'People', icon: Users },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'you', label: 'You', icon: CircleUserRound },
];

function PeopleView({ onAdd, onImport, onOpenIdeas }: {
  onAdd: () => void;
  onImport: () => void;
  onOpenIdeas: () => void;
}) {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reloadSignal, setReloadSignal] = useState(0);

  const loadCount = useCallback(async () => {
    if (!user?.id) { setTotal(0); setLoading(false); return; }
    setLoading(true);
    const { count } = await supabase
      .from('circle_person')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    setTotal(count ?? 0);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void loadCount(); }, [loadCount]);

  useEffect(() => {
    const refresh = () => { setReloadSignal((n) => n + 1); void loadCount(); };
    window.addEventListener('circle:people-changed', refresh);
    return () => window.removeEventListener('circle:people-changed', refresh);
  }, [loadCount]);

  return (
    <div className="workspace-page workspace-people">
      <section className="workspace-intro">
        <p className="workspace-kicker">Your network, ready when you need it</p>
        <h1>Who could help right now?</h1>
        <p>Ask in your own words. Circle reads what you know and brings the right people forward.</p>
      </section>

      <section className="workspace-command thx" aria-label="Find the right person">
        <style>{circleCss}</style>
        <WorkingOnInput />
      </section>

      <section className="workspace-quick-actions" aria-label="Add people">
        <button className="workspace-action-card" onClick={onAdd}>
          <span className="workspace-action-icon"><Plus /></span>
          <span><strong>Add one person</strong><small>Name, photo, link, or voice</small></span>
          <ChevronRight />
        </button>
        <button className="workspace-action-card" onClick={onImport}>
          <span className="workspace-action-icon"><Upload /></span>
          <span><strong>Bring in contacts</strong><small>LinkedIn, Google, Microsoft, or a file</small></span>
          <ChevronRight />
        </button>
        <button className="workspace-action-card workspace-action-card--signal" onClick={onOpenIdeas}>
          <span className="workspace-action-icon"><Compass /></span>
          <span><strong>Test a business idea</strong><small>Find the people worth speaking to</small></span>
          <ChevronRight />
        </button>
      </section>

      <section className="workspace-section thx">
        <style>{circleCss}</style>
        <div className="workspace-section-heading">
          <div>
            <p className="workspace-kicker">Everyone you know</p>
            <h2>Your people</h2>
          </div>
          <button className="workspace-text-button" onClick={onAdd}><Plus /> Add someone</button>
        </div>
        <CirclePeopleList
          totalPeople={total}
          circleLoading={loading}
          onQuickAdd={onAdd}
          reloadSignal={reloadSignal}
        />
      </section>
    </div>
  );
}

function IdeasHome({ onOpen }: { onOpen: (flow: Exclude<IdeaFlow, null>) => void }) {
  const { user } = useAuth();
  const [runs, setRuns] = useState<RecentRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    getRecentRuns(user.id, 12).then(setRuns).catch(() => setRuns([])).finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <div className="workspace-page workspace-ideas">
      <section className="workspace-intro workspace-intro--ideas">
        <div>
          <p className="workspace-kicker">Turn a hunch into a next step</p>
          <h1>Ideas</h1>
          <p>Talk through an idea. Circle checks it, remembers your thinking, and finds the people who can help.</p>
        </div>
        <button className="workspace-primary" onClick={() => onOpen({ kind: 'new' })}>
          <Sparkles /> Start a new idea
        </button>
      </section>

      <section className="workspace-idea-prompt">
        <div className="workspace-orbit" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <p className="workspace-kicker">Start anywhere</p>
          <h2>Say what you are thinking.</h2>
          <p>You do not need a pitch. A rough thought is enough.</p>
        </div>
        <button onClick={() => onOpen({ kind: 'new' })}>Talk it through <ChevronRight /></button>
      </section>

      <section className="workspace-section">
        <div className="workspace-section-heading">
          <div>
            <p className="workspace-kicker">Pick up where you left off</p>
            <h2>Your recent ideas</h2>
          </div>
        </div>
        {loading ? (
          <div className="workspace-loading"><Loader2 className="workspace-spin" /> Loading your ideas</div>
        ) : runs.length === 0 ? (
          <div className="workspace-empty">
            <Lightbulb />
            <h3>No ideas here yet.</h3>
            <p>Start with one sentence. Circle will help shape the rest.</p>
            <button className="workspace-primary" onClick={() => onOpen({ kind: 'new' })}>Start your first idea</button>
          </div>
        ) : (
          <div className="workspace-idea-grid">
            {runs.map((run) => (
              <button key={run.id} className="workspace-idea-card" onClick={() => onOpen({ kind: 'existing', id: run.id })}>
                <span className="workspace-idea-date">{new Date(run.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                <strong>{run.thesis || 'Untitled idea'}</strong>
                <span>{run.read || 'Open your idea'}</span>
                <ChevronRight />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function YouView({ onSettings, onImport }: { onSettings: () => void; onImport: () => void }) {
  const { user } = useAuth();
  const { profile, preferences, loading } = useUserProfile();
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
  const initials = useMemo(() => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(), [name]);

  return (
    <div className="workspace-page workspace-you">
      <section className="workspace-intro">
        <p className="workspace-kicker">What Circle knows about you</p>
        <h1>You</h1>
        <p>Keep this current so the people and ideas Circle surfaces feel like they were chosen for you.</p>
      </section>

      <section className="workspace-profile-card">
        <div className="workspace-avatar">{initials}</div>
        <div>
          <h2>{loading && !profile ? 'Loading your profile…' : name}</h2>
          <p>{profile?.positioning || 'Tell Circle what you do and who you help.'}</p>
          <small>{profile?.email || user?.email}</small>
        </div>
        <button className="workspace-text-button" onClick={onSettings}><Settings /> Edit profile</button>
      </section>

      <section className="workspace-settings-grid">
        <button className="workspace-settings-card" onClick={onImport}>
          <Upload />
          <span><strong>Connected contacts</strong><small>Google, Microsoft, LinkedIn, and files</small></span>
          <ChevronRight />
        </button>
        <button className="workspace-settings-card" onClick={onSettings}>
          <Bell />
          <span><strong>Reminders</strong><small>{preferences?.goal_reminders === false ? 'Off' : 'On when something is worth your attention'}</small></span>
          <ChevronRight />
        </button>
        <button className="workspace-settings-card" onClick={onSettings}>
          <Settings />
          <span><strong>Settings and privacy</strong><small>Appearance, AI, notifications, account, and data</small></span>
          <ChevronRight />
        </button>
      </section>
    </div>
  );
}

export default function CircleWorkspace() {
  const { user } = useAuth();
  const { preferences } = useUserProfile();
  const [tab, setTab] = useState<Tab>('people');
  const [ideaFlow, setIdeaFlow] = useState<IdeaFlow>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [warmOpen, setWarmOpen] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const [pendingPerson, setPendingPerson] = useState(readPendingClue);

  useEffect(() => {
    if (pendingPerson.trim()) setAddOpen(true);
  }, [pendingPerson]);

  useEffect(() => {
    if (!user?.id || preferences?.goal_reminders === false) { setWaiting(0); return; }
    Promise.all([
      getGoingQuietCount(user.id).catch(() => 0),
      getUnrunAnswerCount(user.id).catch(() => 0),
    ]).then(([quiet, answers]) => setWaiting(quiet + answers));
  }, [user?.id, preferences?.goal_reminders]);

  const openTab = (next: Tab) => {
    haptics.tap();
    setTab(next);
    if (next !== 'ideas') setIdeaFlow(null);
  };

  const handlePeopleChanged = () => {
    if (pendingPerson) {
      clearPendingClue();
      setPendingPerson('');
    }
    window.dispatchEvent(new Event('circle:people-changed'));
  };
  const css = thesisCss + chromeCss + circleCss;

  return (
    <div className="circle-system circle-workspace">
      <style>{css}</style>
      <aside className="workspace-rail">
        <CircleBrand />
        <nav aria-label="Main navigation">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} className={cn('workspace-nav-item', tab === id && 'is-active')} onClick={() => openTab(id)} aria-current={tab === id ? 'page' : undefined}>
              <Icon /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="workspace-rail-bottom">
          <button className="workspace-quiet-button" onClick={() => setWarmOpen(true)}>
            <Bell /> <span>Worth your attention</span>{waiting > 0 && <b>{waiting > 9 ? '9+' : waiting}</b>}
          </button>
          <button className="workspace-user-button" onClick={() => openTab('you')}>
            <span>{String(user?.email || 'U')[0].toUpperCase()}</span>
            <small>{user?.email}</small>
          </button>
        </div>
      </aside>

      <header className="workspace-mobile-header">
        <CircleBrand />
        <div>
          <button onClick={() => setWarmOpen(true)} aria-label={waiting ? `${waiting} things worth your attention` : 'Things worth your attention'}><Bell />{waiting > 0 && <b>{waiting > 9 ? '9+' : waiting}</b>}</button>
          <button onClick={() => setAddOpen(true)} aria-label="Add someone"><Plus /></button>
        </div>
      </header>

      <main className={cn('workspace-main', tab === 'ideas' && ideaFlow && 'workspace-main--flow')}>
        {tab === 'people' && <PeopleView onAdd={() => setAddOpen(true)} onImport={() => setSourceOpen(true)} onOpenIdeas={() => openTab('ideas')} />}
        {tab === 'ideas' && !ideaFlow && <IdeasHome onOpen={setIdeaFlow} />}
        {tab === 'ideas' && ideaFlow && (
          <div className="workspace-idea-flow">
            <button className="workspace-flow-back" onClick={() => setIdeaFlow(null)}>← All ideas</button>
            <Suspense fallback={<div className="workspace-loading"><Loader /></div>}>
              <ThesisApp
                key={ideaFlow.kind === 'new' ? 'new' : ideaFlow.id}
                startFresh={ideaFlow.kind === 'new'}
                initialRunId={ideaFlow.kind === 'existing' ? ideaFlow.id : undefined}
              />
            </Suspense>
          </div>
        )}
        {tab === 'you' && <YouView onSettings={() => setSettingsOpen(true)} onImport={() => setSourceOpen(true)} />}
      </main>

      <button className="workspace-floating-add" onClick={() => setAddOpen(true)}><Plus /> <span>Add someone</span></button>

      <nav className="workspace-mobile-nav" aria-label="Main navigation">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} className={cn(tab === id && 'is-active')} onClick={() => openTab(id)} aria-current={tab === id ? 'page' : undefined}>
            <Icon /><span>{label}</span>
          </button>
        ))}
      </nav>

      <AddToCircleSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={handlePeopleChanged}
        onConnectSourceClick={() => { setAddOpen(false); setSourceOpen(true); }}
        initialText={pendingPerson || undefined}
      />
      <AddSourceSheet open={sourceOpen} onOpenChange={setSourceOpen} onIngested={handlePeopleChanged} />
      <ProfileSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <WarmReachDrawer open={warmOpen} onOpenChange={setWarmOpen} onOpenPlan={() => openTab('ideas')} />
    </div>
  );
}
