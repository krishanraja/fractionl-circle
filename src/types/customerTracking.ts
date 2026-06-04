// Enhanced BI tracking types for customer tools

export interface CustomerToolSession {
  id?: string;
  user_id: string;
  customer_email?: string;
  customer_name?: string;
  tool_type: 'leadership_assessment' | 'ai_agent_analysis' | 'idea_blueprint' | 'enterprise_assessment';
  session_duration: number;
  questions_asked: number;
  completion_percentage: number;
  return_visit: boolean;
  session_quality_score: number;
  ip_address?: string;
  user_agent?: string;
  referrer_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeadScoring {
  id?: string;
  user_id: string;
  customer_email: string;
  customer_name?: string;
  lead_source: string;
  engagement_score: number;
  conversion_probability: number;
  lead_temperature: 'cold' | 'warm' | 'hot';
  tool_usage_frequency: number;
  cross_tool_usage_count: number;
  last_interaction: string;
  consultation_booked: boolean;
  seminar_attended: boolean;
  converted_to_paid: boolean;
  estimated_value: number;
  actual_value: number;
  conversion_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ToolPerformanceMetrics {
  id?: string;
  user_id: string;
  tool_type: 'leadership_assessment' | 'ai_agent_analysis' | 'idea_blueprint' | 'enterprise_assessment';
  date: string;
  total_sessions: number;
  unique_visitors: number;
  avg_session_duration: number;
  avg_completion_rate: number;
  total_leads_generated: number;
  qualified_leads: number;
  consultation_bookings: number;
  conversion_rate: number;
  revenue_attributed: number;
  customer_acquisition_cost: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerJourneyTracking {
  id?: string;
  user_id: string;
  customer_email: string;
  journey_stage: 'awareness' | 'consideration' | 'decision' | 'retention' | 'advocacy';
  touchpoints: unknown[];
  first_tool_used?: string;
  tools_used: string[];
  progression_velocity: number;
  total_engagement_time: number;
  last_touchpoint: string;
  conversion_path: string[];
  revenue_attribution: number;
  created_at?: string;
  updated_at?: string;
}

export interface EngagementAnalytics {
  id?: string;
  user_id: string;
  metric_type: 'active_sessions' | 'daily_usage' | 'conversion_events' | 'lead_temperature_changes';
  metric_value: number;
  metadata: Record<string, unknown>;
  timestamp: string;
  created_at?: string;
}

export interface ToolAnalytics {
  toolType: string;
  toolName: string;
  sessions: number;
  uniqueVisitors: number;
  avgDuration: number;
  completionRate: number;
  leadsGenerated: number;
  conversionRate: number;
  revenue: number;
  cac: number;
}

export interface LeadInsight {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  avgEngagementScore: number;
  avgConversionProbability: number;
  consultationBookings: number;
  convertedToRevenue: number;
}