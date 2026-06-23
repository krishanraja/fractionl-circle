// The free hero: "drop a contact" + your circle. The daily habit lives here —
// capture anyone in seconds (screenshot / paste / voice / type) and they land in
// the list below. Fills the parent's bounded height; only the list scrolls.
import { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AddToCircleSheet } from '@/components/circle/AddToCircleSheet';
import { CirclePeopleList } from '@/components/circle/CirclePeopleList';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

export default function CircleHome() {
  const { user } = useAuth();
  const userId = user?.id;
  const [addOpen, setAddOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [countLoading, setCountLoading] = useState(true);
  const [reloadSignal, setReloadSignal] = useState(0);

  // Cheap head-count for the unfiltered circle size — drives the empty state and
  // the server-vs-client search switch in CirclePeopleList.
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
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 px-5 pt-5 pb-3 frame-safe-top">
        <h1 className="text-title-1 text-foreground">Your circle</h1>
        <p className="mt-1 text-sm text-foreground-secondary leading-relaxed">
          Drop in anyone you meet. We'll remember who they are and surface them when they matter.
        </p>
        <button
          onClick={() => { haptics.tap(); setAddOpen(true); }}
          className={cn(
            'mt-4 w-full inline-flex items-center justify-center gap-2 h-12 rounded-full',
            'bg-primary text-primary-foreground text-[15px] font-semibold',
            'shadow-md shadow-primary/25 active:scale-[0.98] transition-all duration-100'
          )}
        >
          <UserPlus className="w-5 h-5" strokeWidth={2.4} />
          Drop a contact
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-5 pb-3">
        <CirclePeopleList
          totalPeople={total}
          circleLoading={countLoading}
          onQuickAdd={() => setAddOpen(true)}
          reloadSignal={reloadSignal}
          framed
        />
      </div>

      <AddToCircleSheet open={addOpen} onOpenChange={setAddOpen} onAdded={handleAdded} />
    </div>
  );
}
