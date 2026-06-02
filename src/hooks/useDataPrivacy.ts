import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type DataRequestType = 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection' | 'opt_out';

export interface DataSubjectRequest {
  id: string;
  request_type: DataRequestType;
  status: string;
  description: string | null;
  requested_at: string;
  completed_at: string | null;
  deadline_at: string;
}

export function useDataPrivacy() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<DataSubjectRequest[]>([]);

  // Fetch user's data subject requests
  const fetchRequests = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('data_subject_requests' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as unknown as DataSubjectRequest[]);
    } catch (err) {
      console.error('Failed to fetch data requests:', err);
    }
  }, [user]);

  // Export all user data (GDPR Art.20)
  const exportData = useCallback(async (): Promise<Record<string, unknown> | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('export_user_data' as any, {
        target_user_id: user.id,
      });

      if (error) throw error;

      // Also create a DSR record
      await supabase.from('data_subject_requests' as any).insert({
        user_id: user.id,
        request_type: 'portability',
        status: 'completed',
        description: 'User-initiated data export',
        completed_at: new Date().toISOString(),
      });

      return data as Record<string, unknown>;
    } catch (err) {
      console.error('Data export failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Download exported data as JSON file
  const downloadData = useCallback(async () => {
    const data = await exportData();
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fractionl-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportData]);

  // Request data erasure (GDPR Art.17)
  const requestErasure = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      // Server-side erasure: wipes every owned row across the full data surface
      // AND removes the auth identity. The client RPC alone could do neither
      // completely. Identity is taken from the verified JWT, not the body.
      const { error } = await supabase.functions.invoke('delete-account', { body: {} });
      if (error) throw error;

      // Identity is gone; clear the local session.
      await signOut();
      return true;
    } catch (err) {
      console.error('Data erasure failed:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, signOut]);

  // Submit a generic data subject request
  const submitRequest = useCallback(async (
    type: DataRequestType,
    description?: string
  ): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('data_subject_requests' as any)
        .insert({
          user_id: user.id,
          request_type: type,
          status: 'pending',
          description: description || null,
        });

      if (error) throw error;
      await fetchRequests();
      return true;
    } catch (err) {
      console.error('Failed to submit request:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchRequests]);

  return {
    loading,
    requests,
    fetchRequests,
    exportData,
    downloadData,
    requestErasure,
    submitRequest,
  };
}
