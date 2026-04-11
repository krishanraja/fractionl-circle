import { useMemo } from 'react';
import { useTalentContacts, type TalentContactWithSkills } from './useTalentContacts';

export interface CircleInsights {
  /** Contacts with last interaction > 14 days ago, sorted by staleness */
  staleContacts: TalentContactWithSkills[];
  /** Contacts created in the last 7 days */
  recentlyAdded: TalentContactWithSkills[];
  /** Count of contacts with availability_status === 'available' */
  availableCount: number;
  /** 0-100 score based on overall network interaction recency */
  networkHealthScore: number;
  /** 'warm' | 'cool' | 'cold' based on health score */
  networkHealthStatus: 'warm' | 'cool' | 'cold';
  /** Color string for the health status */
  networkHealthColor: string;
  /** Contacts needing follow-up (last interaction > 7 days ago) */
  followUpsDue: TalentContactWithSkills[];
  /** The single most important contact to reach out to */
  topSuggestion: TalentContactWithSkills | null;
  /** Total contacts count */
  totalContacts: number;
  /** New contacts this month */
  newThisMonth: number;
  /** Loading state */
  loading: boolean;
}

const DAY_MS = 86400000;

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS);
}

function contactWarmthScore(contact: TalentContactWithSkills): number {
  let score = 100;
  const days = daysSince(contact.last_interaction_date);

  if (days === Infinity) {
    score -= 50;
  } else if (days > 30) {
    score -= 45;
  } else if (days > 21) {
    score -= 35;
  } else if (days > 14) {
    score -= 25;
  } else if (days > 7) {
    score -= 12;
  } else if (days > 3) {
    score -= 5;
  }

  // Bonus for having contact info (means easier to reach out)
  if (contact.email) score += 3;
  if (contact.phone) score += 3;
  if (contact.linkedin_url) score += 2;

  // Bonus for being vetted
  if (contact.vetted) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function useCircleInsights(): CircleInsights {
  const { contacts, loading } = useTalentContacts();

  return useMemo(() => {
    if (loading || contacts.length === 0) {
      return {
        staleContacts: [],
        recentlyAdded: [],
        availableCount: 0,
        networkHealthScore: 0,
        networkHealthStatus: 'cold' as const,
        networkHealthColor: '#6B7280',
        followUpsDue: [],
        topSuggestion: null,
        totalContacts: contacts.length,
        newThisMonth: 0,
        loading,
      };
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * DAY_MS;
    const fourteenDaysAgo = now - 14 * DAY_MS;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Stale contacts (>14 days since interaction)
    const staleContacts = contacts
      .filter(c => {
        const d = daysSince(c.last_interaction_date);
        return d > 14;
      })
      .sort((a, b) => daysSince(b.last_interaction_date) - daysSince(a.last_interaction_date));

    // Recently added
    const recentlyAdded = contacts.filter(c =>
      new Date(c.created_at).getTime() > sevenDaysAgo
    );

    // Available count
    const availableCount = contacts.filter(c =>
      c.availability_status === 'available'
    ).length;

    // Follow-ups due (>7 days)
    const followUpsDue = contacts
      .filter(c => {
        const d = daysSince(c.last_interaction_date);
        return d > 7;
      })
      .sort((a, b) => daysSince(b.last_interaction_date) - daysSince(a.last_interaction_date));

    // New this month
    const newThisMonth = contacts.filter(c =>
      new Date(c.created_at).getTime() >= monthStart.getTime()
    ).length;

    // Network health score (average warmth across all contacts)
    const totalWarmth = contacts.reduce((sum, c) => sum + contactWarmthScore(c), 0);
    const networkHealthScore = Math.round(totalWarmth / contacts.length);

    let networkHealthStatus: 'warm' | 'cool' | 'cold';
    let networkHealthColor: string;
    if (networkHealthScore >= 65) {
      networkHealthStatus = 'warm';
      networkHealthColor = '#22c55e';
    } else if (networkHealthScore >= 35) {
      networkHealthStatus = 'cool';
      networkHealthColor = '#f59e0b';
    } else {
      networkHealthStatus = 'cold';
      networkHealthColor = '#ef4444';
    }

    // Top suggestion: most stale contact that has contact info to reach out
    const topSuggestion = staleContacts.find(c =>
      c.email || c.phone || c.linkedin_url
    ) || staleContacts[0] || null;

    return {
      staleContacts,
      recentlyAdded,
      availableCount,
      networkHealthScore,
      networkHealthStatus,
      networkHealthColor,
      followUpsDue,
      topSuggestion,
      totalContacts: contacts.length,
      newThisMonth,
      loading,
    };
  }, [contacts, loading]);
}
