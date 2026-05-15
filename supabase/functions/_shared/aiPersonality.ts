// Loads user AI preferences and augments system prompts.

// deno-lint-ignore-file no-explicit-any

export type AiPersonality = 'professional' | 'friendly' | 'concise' | 'detailed';

export interface UserAiPreferences {
  ai_personality: AiPersonality | null;
  ai_proactive_suggestions: boolean | null;
  ai_auto_insights: boolean | null;
  email_notifications: boolean | null;
  weekly_summary: boolean | null;
  daily_digest: boolean | null;
}

export async function loadUserAiPreferences(
  supabase: any,
  userId: string,
): Promise<UserAiPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('ai_personality, ai_proactive_suggestions, ai_auto_insights, email_notifications, weekly_summary, daily_digest')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('loadUserAiPreferences:', error.message);
    return null;
  }
  return data as UserAiPreferences | null;
}

export function personalitySystemSuffix(personality: string | null | undefined): string {
  switch (personality) {
    case 'friendly':
      return '\n\nTone: warm and conversational while staying professional.';
    case 'concise':
      return '\n\nTone: extremely concise. Short sentences. No filler.';
    case 'detailed':
      return '\n\nTone: thorough and specific; add useful context where it helps.';
    default:
      return '\n\nTone: professional, direct, and respectful.';
  }
}

export function withPersonality(baseSystem: string, prefs: UserAiPreferences | null): string {
  return baseSystem + personalitySystemSuffix(prefs?.ai_personality);
}
