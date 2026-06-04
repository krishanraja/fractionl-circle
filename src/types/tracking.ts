// Redesigned data structures for the holistic goal tracking system
import type { LucideIcon } from 'lucide-react';

export interface MonthlyGoals {
  id?: string;
  user_id: string;
  month: string; // YYYY-MM format
  revenue_forecast: number; // Monthly revenue forecast
  cost_budget: number; // Monthly cost budget
  workshops_target: number;
  advisory_target: number;
  lectures_target: number;
  pr_target: number;
  created_at?: string;
  updated_at?: string;
}

export interface MonthlySnapshots {
  id?: string;
  user_id: string;
  month: string; // YYYY-MM format
  site_visits: number;
  social_followers: number;
  created_at?: string;
  updated_at?: string;
}

export interface DailyProgress {
  id?: string;
  user_id: string;
  date: string; // YYYY-MM-DD format
  month: string; // YYYY-MM format
  workshops_progress: number;
  advisory_progress: number;
  lectures_progress: number;
  pr_progress: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RevenueEntry {
  id?: string;
  user_id: string;
  date: string; // YYYY-MM-DD format
  month: string; // YYYY-MM format
  amount: number;
  source: string; // 'workshop' | 'advisory' | 'lecture' | 'other'
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SpreadsheetSync {
  id?: string;
  user_id: string;
  google_sheet_id?: string;
  sync_enabled: boolean;
  sync_frequency: 'real-time' | 'hourly' | 'daily';
  last_sync_at?: string;
  sync_status: 'pending' | 'syncing' | 'success' | 'error';
  sync_error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MetricConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  unit: string;
  type: 'target' | 'snapshot';
  category: 'revenue' | 'business_development' | 'current_state';
  isReversed?: boolean; // For costs where lower is better
}

export interface ProgressStatus {
  status: 'ahead' | 'on-track' | 'behind';
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  message: string;
}

export interface MetricProgress {
  name: string;
  key: string;
  current: number;
  target: number;
  dailyTarget: number;
  progress: ProgressStatus;
  icon: LucideIcon;
  unit: string;
  type: 'target' | 'snapshot';
  category: string;
  isReversed?: boolean;
}

export interface Opportunity {
  id?: string;
  user_id: string;
  type: 'workshop' | 'advisory' | 'lecture' | 'pr';
  title: string;
  company?: string;
  contact_person?: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability: number; // 0-100
  estimated_value: number;
  estimated_close_date?: string; // YYYY-MM-DD format
  notes?: string;
  month: string; // YYYY-MM format
  created_at?: string;
  updated_at?: string;
}

export interface PipelineStats {
  totalOpportunities: number;
  totalValue: number;
  weightedValue: number;
  averageProbability: number;
  conversionRate: number;
  stageDistribution: Record<string, number>;
}

export interface MonthlyProgress {
  month: string;
  target: number;
  achieved: number;
  inPipeline: number;
  pipelineValue: number;
  conversionRate: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  unlocked: boolean;
  unlockedDate?: string;
  category: 'streak' | 'target' | 'growth' | 'milestone';
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  totalDaysTracked: number;
  lastUpdated: string;
}