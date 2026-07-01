// The free hero, in the ember (.thx) system. The most important action — dropping
// a contact — is pinned in the nav; warm reach lives behind the nav bell. The body
// leads with the one box you can work from (what you're working on, or who you're
// looking for), then your circle.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AddToCircleSheet } from '@/components/circle/AddToCircleSheet';
import { CirclePeopleList } from '@/components/circle/CirclePeopleList';
import WorkingOnInput from './WorkingOnInput';
import { BrandBar } from './circleChrome';
import WarmReachDrawer from './WarmReachDrawer';
import { getGoingQuietCount, getUnrunAnswerCount } from './thesisData';

export default function CircleHome({ onOpenPlan }: { onOpenPlan?: () => void }) {
  const { user } = useAuth();
  const userId = user?.id;
  const { preferences } = useUserProfile();
  const [addOpen, setAddOpen] = useState(false);
  const [warmOpen, setWarmOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [countLoading, setCountLoading] = useState(true);
  const [reloadSignal, setReloadSignal] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

  const loadCount = useCallback(async () => {
    if (!userId) { setTotal(0); setCountLoading(false); return; }
    setCountLoading(true);
    const { count } = await supabase
      .from('circle_person')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    setTotal(count ?? 0);
    setCountLoading(false);
  }, [userId]);

  // The bell badge = people going quiet + decisions banked. Respect the opt-out
  // (default on): only an explicit false silences the nudge — the same rule the old
  // "Since you were away" card used.
  const loadNotif = useCallback(async () => {
    if (!userId || preferences?.goal_reminders === false) { setNotifCount(0); return; }
    const [quiet, banked] = await Promise.all([
      getGoingQuietCount(userId).catch(() => 0),
      getUnrunAnswerCount(userId).catch(() => 0),
    ]);
    setNotifCount(quiet + banked);
  }, [userId, preferences?.goal_reminders]);

  useEffect(() => { void loadCount(); }, [loadCount]);
  useEffect(() => { void loadNotif(); }, [loadNotif]);

  const handleAdded = useCallback(() => {
    setReloadSignal((n) => n + 1);
    void loadCount();
  }, [loadCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <BrandBar
        onDropContact={() => setAddOpen(true)}
        onOpenWarmReach={onOpenPlan ? () => setWarmOpen(true) : undefined}
        notifCount={notifCount}
      />
      <div className="thxbody">
        <div className="wrap">
          <WorkingOnInput />

          <div className="ovl" style={{ marginTop: 28 }}>Your circle</div>
          <div className="h" style={{ marginTop: 10 }}>Warm up your circle</div>
          <div className="sub">Drop in anyone you meet. We'll remember who they are and surface them when they matter.</div>

          <div style={{ marginTop: 24 }}>
            <CirclePeopleList
              totalPeople={total}
              circleLoading={countLoading}
              onQuickAdd={() => setAddOpen(true)}
              reloadSignal={reloadSignal}
            />
          </div>
        </div>
      </div>

      <AddToCircleSheet open={addOpen} onOpenChange={setAddOpen} onAdded={handleAdded} />
      {onOpenPlan && (
        <WarmReachDrawer open={warmOpen} onOpenChange={setWarmOpen} onOpenPlan={onOpenPlan} />
      )}
    </div>
  );
}
