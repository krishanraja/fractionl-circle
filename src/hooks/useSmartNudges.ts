import { useState, useEffect, useCallback } from 'react';
import { usePortfolioDashboard } from '@/hooks/usePortfolioDashboard';
import type { Nudge } from '@/components/ai/SmartNudge';

const DISMISSED_KEY = 'circle_dismissed_nudges';

export function useSmartNudges() {
  const { clients, pipeline, revenue } = usePortfolioDashboard();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const dismiss = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Generate nudges from current data
  const nudges: Nudge[] = [];

  // Client staleness nudges
  clients.forEach(client => {
    if (!client.last_activity_date) return;
    const daysSince = Math.floor((Date.now() - new Date(client.last_activity_date).getTime()) / 86400000);
    const nudgeId = `stale_${client.id}_${Math.floor(daysSince / 7)}`;

    if (daysSince >= 14 && !dismissedIds.has(nudgeId)) {
      nudges.push({
        id: nudgeId,
        type: 'client_stale',
        priority: daysSince >= 21 ? 'high' : 'medium',
        message: `You haven't logged activity with ${client.name} in ${daysSince} days. Time to check in?`,
      });
    }
  });

  // Revenue momentum nudge
  if (revenue.target > 0) {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expectedPacing = (dayOfMonth / daysInMonth) * 100;
    const actualPacing = (revenue.current / revenue.target) * 100;

    if (actualPacing > expectedPacing + 10) {
      const nudgeId = `momentum_ahead_${now.toISOString().slice(0, 7)}`;
      if (!dismissedIds.has(nudgeId)) {
        nudges.push({
          id: nudgeId,
          type: 'revenue_momentum',
          priority: 'low',
          message: `You're ahead of pace at ${actualPacing.toFixed(0)}% of your revenue goal. Great momentum!`,
        });
      }
    } else if (actualPacing < expectedPacing - 15) {
      const nudgeId = `momentum_behind_${now.toISOString().slice(0, 7)}`;
      if (!dismissedIds.has(nudgeId)) {
        nudges.push({
          id: nudgeId,
          type: 'revenue_momentum',
          priority: 'high',
          message: `Revenue is at ${actualPacing.toFixed(0)}% of goal, ${(expectedPacing - actualPacing).toFixed(0)}% behind pace. Focus on closing pipeline.`,
        });
      }
    }
  }

  // Pipeline nudges
  // Note: pipeline data from usePortfolioDashboard gives us active count and total value
  if (pipeline.active === 0 && clients.length > 0) {
    const nudgeId = 'no_pipeline';
    if (!dismissedIds.has(nudgeId)) {
      nudges.push({
        id: nudgeId,
        type: 'pipeline_stuck',
        priority: 'medium',
        message: 'Your pipeline is empty. Add opportunities to track your business development.',
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  nudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return { nudges: nudges.slice(0, 5), dismiss };
}
