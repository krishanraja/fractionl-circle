import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Keyboard, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/constants/animation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

interface DayGroup {
  date: string;
  label: string;
  entries: ActivityLog[];
}

const activityTypeLabel: Record<string, string> = {
  meeting: 'Meeting',
  call: 'Call',
  work: 'Deep Work',
  email: 'Email',
  admin: 'Admin',
  networking: 'Networking',
  other: 'Activity',
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const groupByDay = (logs: ActivityLog[]): DayGroup[] => {
  const groups: Record<string, ActivityLog[]> = {};
  logs.forEach(log => {
    const day = new Date(log.logged_at).toDateString();
    if (!groups[day]) groups[day] = [];
    groups[day].push(log);
  });

  return Object.entries(groups).map(([date, entries]) => ({
    date,
    label: formatDate(entries[0].logged_at),
    entries,
  }));
};

export const HistoryScreen = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const { data, error: fetchError } = await supabase
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
          .limit(100);

        if (fetchError) throw fetchError;

        setLogs((data || []).map((log: any) => ({
          ...log,
          client: log.clients || null,
        })));
      } catch (err) {
        console.error('History fetch error:', err);
        setError('Failed to load activity history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();

    // Real-time subscription
    const channel = supabase
      .channel('history-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchLogs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const dayGroups = groupByDay(logs);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 pb-28">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <p className="text-foreground-secondary">{error}</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] gap-4 p-4 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-16 h-16 rounded-full bg-primary-muted flex items-center justify-center">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-title-2 text-foreground">No activity yet</h2>
          <p className="text-body text-foreground-secondary max-w-xs">
            Log your first activity using voice or text to see your history here
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-6 p-4 pb-28"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {dayGroups.map((group) => (
        <motion.div key={group.date} variants={staggerItem} className="space-y-2">
          {/* Day header */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-caption-bold text-foreground-secondary uppercase tracking-wider">
              {group.label}
            </h2>
            <span className="text-caption text-foreground-muted">
              {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {/* Activity entries */}
          {group.entries.map((entry) => (
            <Card key={entry.id} className="card-interactive">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Client colour dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: entry.client?.color || '#8B5CF6' }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-body-bold text-foreground leading-snug">
                        {entry.summary}
                      </p>
                      {/* Voice/text indicator */}
                      <div className="flex-shrink-0 mt-0.5">
                        {entry.created_via_voice ? (
                          <Mic className="w-3.5 h-3.5 text-foreground-muted" />
                        ) : (
                          <Keyboard className="w-3.5 h-3.5 text-foreground-muted" />
                        )}
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {entry.client && (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${entry.client.color || '#8B5CF6'}20`,
                            color: entry.client.color || '#8B5CF6',
                          }}
                        >
                          {entry.client.name}
                        </span>
                      )}
                      <span className="text-caption text-foreground-secondary">
                        {activityTypeLabel[entry.activity_type] || 'Activity'}
                      </span>
                      {entry.duration_minutes && (
                        <span className="text-caption text-foreground-secondary">
                          · {entry.duration_minutes >= 60
                            ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60 > 0 ? `${entry.duration_minutes % 60}m` : ''}`
                            : `${entry.duration_minutes}m`}
                        </span>
                      )}
                      {entry.revenue && entry.revenue > 0 && (
                        <span className="text-caption text-success font-medium">
                          · ${entry.revenue.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      ))}
    </motion.div>
  );
};
