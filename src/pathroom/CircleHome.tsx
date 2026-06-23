// The free hero, in the ember (.thx) system: brand bar + "drop a contact" +
// "what are you working on" + your circle. One scrolling body (.thxbody).
import { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AddToCircleSheet } from '@/components/circle/AddToCircleSheet';
import { CirclePeopleList } from '@/components/circle/CirclePeopleList';
import WorkingOnInput from './WorkingOnInput';
import { BrandBar } from './circleChrome';

export default function CircleHome() {
  const { user } = useAuth();
  const userId = user?.id;
  const [addOpen, setAddOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [countLoading, setCountLoading] = useState(true);
  const [reloadSignal, setReloadSignal] = useState(0);

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

  useEffect(() => { void loadCount(); }, [loadCount]);

  const handleAdded = useCallback(() => {
    setReloadSignal((n) => n + 1);
    void loadCount();
  }, [loadCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <BrandBar />
      <div className="thxbody">
        <div className="wrap">
          <div className="ovl">Your circle</div>
          <div className="h" style={{ marginTop: 8 }}>Warm up your circle</div>
          <div className="sub">Drop in anyone you meet. We'll remember who they are and surface them when they matter.</div>

          <button className="cta" style={{ marginTop: 16 }} onClick={() => setAddOpen(true)}>
            <span className="ctaicon"><UserPlus size={18} strokeWidth={2.2} /> Drop a contact</span>
            <span className="mono">→</span>
          </button>

          <div style={{ marginTop: 16 }}>
            <WorkingOnInput />
          </div>

          <div style={{ marginTop: 18 }}>
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
    </div>
  );
}
