import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Client access to the prepaid credit balance + the two actions that move it:
//   • buyCredits  - open Stripe checkout for a one-time pack (mode: 'credits').
//   • digDeeper   - spend credits on the max-effort enrichment of one person.
// The balance is read-only here (RLS); all writes happen server-side via the
// service-role RPCs, so this hook can trust whatever the DB / edge functions report.

export type DigStatus = 'done' | 'insufficient' | 'failed' | 'no_keys';
export interface DigResult {
  status: DigStatus;
  balance?: number;
  needed?: number;
  reason?: string;
}

export function useCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) { setBalance(null); return; }
    // credit_balance isn't in the generated types yet (new table) - cast the
    // relation name, same as other post-schema queries in this codebase.
    const { data } = await supabase
      .from('credit_balance' as never)
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();
    setBalance((data as { balance: number } | null)?.balance ?? 0);
  }, [user?.id]);

  useEffect(() => {
    void refresh();
    if (!user?.id) return;
    const channel = supabase
      .channel('credit-balance-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'credit_balance', filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const b = (payload.new as { balance?: number } | null)?.balance;
        if (typeof b === 'number') setBalance(b);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refresh]);

  const buyCredits = useCallback(async (priceId: string) => {
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: { price_id: priceId, mode: 'credits' },
    });
    if (error) throw error;
    if (!(data as { url?: string })?.url) throw new Error('No checkout URL returned');
    window.location.href = (data as { url: string }).url;
  }, []);

  const digDeeper = useCallback(async (personId: string): Promise<DigResult> => {
    const { data, error } = await supabase.functions.invoke('enrich-max', { body: { person_id: personId } });
    if (error) throw error;
    const result = data as DigResult;
    if (typeof result?.balance === 'number') setBalance(result.balance);
    return result;
  }, []);

  return { balance, refresh, buyCredits, digDeeper };
}
