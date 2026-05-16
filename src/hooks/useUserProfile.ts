import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { applyUserPreferences } from '@/lib/applyUserPreferences';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  business_type: string | null;
  industry: string | null;
  years_experience: number | null;
  revenue_range: string | null;
  target_market: string | null;
  service_types: string[] | null;
  role: string | null;
  client_stages: string[];
  client_verticals: string[];
  positioning: string | null;
  timezone: string;
  currency: string;
  fiscal_year_start: number;
  onboarding_completed: boolean;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  last_active_at: string;
  total_sessions: number;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  accent_color: string;
  compact_mode: boolean;
  animations_enabled: boolean;
  default_view: string;
  sidebar_collapsed: boolean;
  favorite_metrics: string[] | null;
  hidden_sections: string[] | null;
  widget_order: any[];
  email_notifications: boolean;
  browser_notifications: boolean;
  daily_digest: boolean;
  weekly_summary: boolean;
  goal_reminders: boolean;
  ai_personality: string;
  ai_proactive_suggestions: boolean;
  ai_auto_insights: boolean;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile and preferences
  const fetchUserData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch both in parallel
      const [profileResult, preferencesResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      if (profileResult.error && profileResult.error.code !== 'PGRST116') {
        throw profileResult.error;
      }
      
      if (preferencesResult.error && preferencesResult.error.code !== 'PGRST116') {
        throw preferencesResult.error;
      }

      // If no profile exists, create one
      if (!profileResult.data) {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({ id: user.id, email: user.email })
          .select()
          .single();
        
        if (createError) throw createError;
        setProfile(newProfile as UserProfile);
      } else {
        setProfile(profileResult.data as UserProfile);
      }

      // If no preferences exist, create them
      let resolvedPrefs: UserPreferences | null = null;
      if (!preferencesResult.data) {
        const { data: newPrefs, error: createError } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (createError) throw createError;
        resolvedPrefs = newPrefs as UserPreferences;
        setPreferences(resolvedPrefs);
      } else {
        resolvedPrefs = preferencesResult.data as UserPreferences;
        setPreferences(resolvedPrefs);
      }

      if (resolvedPrefs) applyUserPreferences(resolvedPrefs);

      // Update last active
      await supabase
        .from('user_profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id);

    } catch (err: any) {
      console.error('Error fetching user data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
      return data;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
      throw err;
    }
  }, [user?.id]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      const next = data as UserPreferences;
      setPreferences(next);
      applyUserPreferences(next);
      return next;
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      toast.error('Failed to update preferences');
      throw err;
    }
  }, [user?.id]);

  // Complete onboarding step
  const completeOnboardingStep = useCallback(async (step: number) => {
    if (!user?.id) return;

    const updates: Partial<UserProfile> = {
      onboarding_step: step
    };

    // If this is the final step, mark onboarding complete
    if (step >= 4) {
      updates.onboarding_completed = true;
      updates.onboarding_completed_at = new Date().toISOString();
    }

    return updateProfile(updates);
  }, [user?.id, updateProfile]);

  return {
    profile,
    preferences,
    loading,
    error,
    updateProfile,
    updatePreferences,
    completeOnboardingStep,
    refetch: fetchUserData,
    needsOnboarding: profile && !profile.onboarding_completed
  };
};
