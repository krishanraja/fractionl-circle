/**
 * Relationship health scoring for client cards.
 * Returns a score from 0-100 and a status color.
 */

interface ActivitySummary {
  last_activity_date: string | null;
  activity_count: number;
  activity_types?: string[];
  monthly_revenue?: number;
  avg_weekly_activities?: number;
}

export type HealthStatus = 'healthy' | 'attention' | 'at_risk';

interface HealthResult {
  score: number;
  status: HealthStatus;
  color: string;
  label: string;
  reason: string;
}

export function calculateRelationshipHealth(client: ActivitySummary): HealthResult {
  let score = 100;
  let reason = 'Strong engagement';

  // Recency factor (most important - 40% weight)
  if (!client.last_activity_date) {
    score -= 40;
    reason = 'No activity recorded';
  } else {
    const daysSince = Math.floor((Date.now() - new Date(client.last_activity_date).getTime()) / 86400000);
    if (daysSince > 21) {
      score -= 40;
      reason = `No activity in ${daysSince} days`;
    } else if (daysSince > 14) {
      score -= 30;
      reason = `Last activity ${daysSince} days ago`;
    } else if (daysSince > 7) {
      score -= 15;
      reason = `Last activity ${daysSince} days ago`;
    } else if (daysSince > 3) {
      score -= 5;
    }
  }

  // Frequency factor (25% weight)
  if (client.activity_count === 0) {
    score -= 25;
  } else if (client.activity_count < 2) {
    score -= 15;
  } else if (client.activity_count < 4) {
    score -= 5;
  }

  // Activity diversity factor (20% weight)
  const uniqueTypes = new Set(client.activity_types || []).size;
  if (uniqueTypes === 0) {
    score -= 20;
  } else if (uniqueTypes === 1) {
    score -= 10;
  } else if (uniqueTypes === 2) {
    score -= 5;
  }
  // 3+ types = full marks

  // Revenue factor (15% weight)
  if (client.monthly_revenue !== undefined) {
    if (client.monthly_revenue === 0) {
      score -= 10;
    }
    // Having revenue is a positive signal
  }

  score = Math.max(0, Math.min(100, score));

  if (score >= 70) {
    return { score, status: 'healthy', color: '#22c55e', label: 'Healthy', reason };
  } else if (score >= 40) {
    return { score, status: 'attention', color: '#f59e0b', label: 'Needs Attention', reason };
  } else {
    return { score, status: 'at_risk', color: '#ef4444', label: 'At Risk', reason };
  }
}

/**
 * Generate sparkline data from activity dates
 */
export function generateSparklineData(
  activityDates: string[],
  days: number = 30
): number[] {
  const now = new Date();
  const data: number[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const count = activityDates.filter(d => d.startsWith(dateStr)).length;
    data.push(count);
  }

  return data;
}
