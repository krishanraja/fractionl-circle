import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Keyboard, Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { staggerItem } from '@/constants/animation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { haptics } from '@/utils/haptics';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  summary: string;
  activity_type: string;
  duration_minutes: number | null;
  revenue: number | null;
  created_via_voice: boolean | null;
  logged_at: string;
  client: { name: string; color: string | null } | null;
}

const activityTypeLabel: Record<string, string> = {
  meeting: 'Meeting',
  call: 'Call',
  work: 'Deep Work',
  email: 'Email',
  admin: 'Admin',
  networking: 'Circle',
  other: 'Activity',
};

const formatRelativeDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface RecentActivityProps {
  className?: string;
  /** Filter to only show activities for contacts (circle activity type) */
  contactsOnly?: boolean;
  /** Max items to show initially */
  initialCount?: number;
}

export const RecentActivity = ({ className, contactsOnly = false, initialCount = 5 }: RecentActivityProps) => {
  const { user } = useAuth();
  const { getLimit } = useSubscription();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const historyDays = getLimit('history_days');

  useEffect(() => {
    if (!user?.id) return;

    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('activity_logs')
          .select(`
            id,
            summary,
            activity_type,
            duration_minutes,
            revenue,
            created_via_voice,
            logged_at,
            clients (
              name,
              color
            )
          `)
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(20);

        if (historyDays !== Infinity) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - historyDays);
          query = query.gte('logged_at', cutoff.toISOString());
        }

        if (contactsOnly) {
          query = query.eq('activity_type', 'networking');
        }

        const { data, error } = await query;
        if (error) throw error;

        setLogs((data || []).map((log: any) => ({
          ...log,
          client: log.clients || null,
        })));
      } catch (err) {
        console.error('RecentActivity fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();

    const channel = supabase
      .channel(`recent-activity-${contactsOnly ? 'contacts' : 'customers'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchLogs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, historyDays, contactsOnly]);

  const handleDelete = async (id: string) => {
    haptics.medium();
    try {
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;
      setLogs(prev => prev.filter(l => l.id !== id));
      toast.success('Activity deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const displayLogs = expanded ? logs : logs.slice(0, initialCount);

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Clock className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
        <p className="text-caption text-foreground-secondary">
          {contactsOnly ? 'No circle activity yet' : 'No recent activity'}
        </p>
      </div>
    );
  }

  return (
    <motion.div variants={staggerItem} className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-caption-bold text-foreground-secondary uppercase tracking-wider">
          Recent Activity
        </h3>
        {logs.length > initialCount && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-caption text-primary"
          >
            {expanded ? (
              <>Show less <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Show all ({logs.length}) <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}
      </div>

      {displayLogs.map((entry) => (
        <SwipeableRow
          key={entry.id}
          rightActions={[
            {
              label: 'Delete',
              icon: <Trash2 className="w-4 h-4" />,
              color: '#ef4444',
              onClick: () => handleDelete(entry.id),
            },
          ]}
        >
          <Card className="border shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div
                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: entry.client?.color || 'hsl(var(--primary))' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground leading-snug truncate">
                      {entry.summary}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] text-foreground-muted">
                        {formatRelativeDate(entry.logged_at)}
                      </span>
                      {entry.created_via_voice ? (
                        <Mic className="w-3 h-3 text-foreground-muted" />
                      ) : (
                        <Keyboard className="w-3 h-3 text-foreground-muted" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {entry.client && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${entry.client.color || 'hsl(var(--primary))'}15`,
                          color: entry.client.color || 'hsl(var(--primary))',
                        }}
                      >
                        {entry.client.name}
                      </span>
                    )}
                    <span className="text-[11px] text-foreground-secondary">
                      {activityTypeLabel[entry.activity_type] || 'Activity'}
                    </span>
                    {entry.revenue && entry.revenue > 0 && (
                      <span className="text-[11px] text-success font-medium">
                        ${entry.revenue.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </SwipeableRow>
      ))}
    </motion.div>
  );
};
