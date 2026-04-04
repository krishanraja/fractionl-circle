import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Client {
  id: string;
  name: string;
  color: string | null;
  engagement_type: string | null;
  monthly_revenue_target: number | null;
  hours_weekly: number | null;
  status: string | null;
  notes: string | null;
  last_activity_date: string | null;
  created_at: string;
}

export interface ClientInput {
  name: string;
  color: string;
  engagement_type: 'retainer' | 'project' | 'advisory';
  monthly_revenue_target: number | null;
  hours_weekly: number | null;
  notes: string | null;
}

const CLIENT_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
];

async function fetchClients(userId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export function useClients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: () => fetchClients(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clients', user?.id] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `user_id=eq.${user.id}` }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, invalidate]);

  const addClient = async (input: ClientInput): Promise<Client | null> => {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...input, user_id: user.id, status: 'active' })
      .select()
      .single();
    if (error) { toast.error('Failed to add client'); return null; }
    toast.success(`${input.name} added to your portfolio`);
    invalidate();
    return data;
  };

  const updateClient = async (id: string, updates: Partial<ClientInput>): Promise<boolean> => {
    const { error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Failed to update client'); return false; }
    toast.success('Client updated');
    invalidate();
    return true;
  };

  const archiveClient = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('clients')
      .update({ status: 'completed' })
      .eq('id', id);
    if (error) { toast.error('Failed to archive client'); return false; }
    toast.success('Client archived');
    invalidate();
    return true;
  };

  const getRandomColor = () => CLIENT_COLORS[Math.floor(Math.random() * CLIENT_COLORS.length)];

  return { clients, isLoading, addClient, updateClient, archiveClient, getRandomColor, refetch: invalidate };
}
