export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          client_id: string | null
          created_at: string
          created_via_voice: boolean | null
          duration_minutes: number | null
          id: string
          logged_at: string
          notes: string | null
          revenue: number | null
          summary: string
          transcript_raw: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          client_id?: string | null
          created_at?: string
          created_via_voice?: boolean | null
          duration_minutes?: number | null
          id?: string
          logged_at?: string
          notes?: string | null
          revenue?: number | null
          summary: string
          transcript_raw?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          client_id?: string | null
          created_at?: string
          created_via_voice?: boolean | null
          duration_minutes?: number | null
          id?: string
          logged_at?: string
          notes?: string | null
          revenue?: number | null
          summary?: string
          transcript_raw?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          context: Json | null
          conversation_type: string
          created_at: string
          id: string
          question: string
          response: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          conversation_type?: string
          created_at?: string
          id?: string
          question: string
          response: string
          user_id: string
        }
        Update: {
          context?: Json | null
          conversation_type?: string
          created_at?: string
          id?: string
          question?: string
          response?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          color: string | null
          created_at: string
          engagement_type: string | null
          hours_weekly: number | null
          id: string
          last_activity_date: string | null
          monthly_revenue_target: number | null
          name: string
          notes: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          engagement_type?: string | null
          hours_weekly?: number | null
          id?: string
          last_activity_date?: string | null
          monthly_revenue_target?: number | null
          name: string
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          engagement_type?: string | null
          hours_weekly?: number | null
          id?: string
          last_activity_date?: string | null
          monthly_revenue_target?: number | null
          name?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          message_count: number | null
          summary: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          message_count?: number | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          message_count?: number | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_journey_tracking: {
        Row: {
          conversion_path: string[] | null
          created_at: string
          customer_email: string
          first_tool_used: string | null
          id: string
          journey_stage: string | null
          last_touchpoint: string | null
          progression_velocity: number | null
          revenue_attribution: number | null
          tools_used: string[] | null
          total_engagement_time: number | null
          touchpoints: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversion_path?: string[] | null
          created_at?: string
          customer_email: string
          first_tool_used?: string | null
          id?: string
          journey_stage?: string | null
          last_touchpoint?: string | null
          progression_velocity?: number | null
          revenue_attribution?: number | null
          tools_used?: string[] | null
          total_engagement_time?: number | null
          touchpoints?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversion_path?: string[] | null
          created_at?: string
          customer_email?: string
          first_tool_used?: string | null
          id?: string
          journey_stage?: string | null
          last_touchpoint?: string | null
          progression_velocity?: number | null
          revenue_attribution?: number | null
          tools_used?: string[] | null
          total_engagement_time?: number | null
          touchpoints?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_tool_sessions: {
        Row: {
          completion_percentage: number | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          id: string
          ip_address: string | null
          questions_asked: number | null
          referrer_url: string | null
          return_visit: boolean | null
          session_duration: number | null
          session_quality_score: number | null
          tool_type: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          ip_address?: string | null
          questions_asked?: number | null
          referrer_url?: string | null
          return_visit?: boolean | null
          session_duration?: number | null
          session_quality_score?: number | null
          tool_type: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          ip_address?: string | null
          questions_asked?: number | null
          referrer_url?: string | null
          return_visit?: boolean | null
          session_duration?: number | null
          session_quality_score?: number | null
          tool_type?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_progress: {
        Row: {
          advisory_progress: number | null
          created_at: string
          date: string
          id: string
          lectures_progress: number | null
          month: string
          notes: string | null
          pr_progress: number | null
          updated_at: string
          user_id: string
          workshops_progress: number | null
        }
        Insert: {
          advisory_progress?: number | null
          created_at?: string
          date: string
          id?: string
          lectures_progress?: number | null
          month: string
          notes?: string | null
          pr_progress?: number | null
          updated_at?: string
          user_id?: string
          workshops_progress?: number | null
        }
        Update: {
          advisory_progress?: number | null
          created_at?: string
          date?: string
          id?: string
          lectures_progress?: number | null
          month?: string
          notes?: string | null
          pr_progress?: number | null
          updated_at?: string
          user_id?: string
          workshops_progress?: number | null
        }
        Relationships: []
      }
      engagement_analytics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          timestamp?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          avg_time_spent_seconds: number | null
          completion_rate: number | null
          created_at: string
          feature_key: string
          first_used_at: string | null
          id: string
          last_used_at: string | null
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          avg_time_spent_seconds?: number | null
          completion_rate?: number | null
          created_at?: string
          feature_key: string
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          avg_time_spent_seconds?: number | null
          completion_rate?: number | null
          created_at?: string
          feature_key?: string
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      lead_scoring: {
        Row: {
          actual_value: number | null
          consultation_booked: boolean | null
          conversion_date: string | null
          conversion_probability: number | null
          converted_to_paid: boolean | null
          created_at: string
          cross_tool_usage_count: number | null
          customer_email: string
          customer_name: string | null
          engagement_score: number | null
          estimated_value: number | null
          id: string
          last_interaction: string | null
          lead_source: string
          lead_temperature: string | null
          notes: string | null
          seminar_attended: boolean | null
          tool_usage_frequency: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_value?: number | null
          consultation_booked?: boolean | null
          conversion_date?: string | null
          conversion_probability?: number | null
          converted_to_paid?: boolean | null
          created_at?: string
          cross_tool_usage_count?: number | null
          customer_email: string
          customer_name?: string | null
          engagement_score?: number | null
          estimated_value?: number | null
          id?: string
          last_interaction?: string | null
          lead_source: string
          lead_temperature?: string | null
          notes?: string | null
          seminar_attended?: boolean | null
          tool_usage_frequency?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_value?: number | null
          consultation_booked?: boolean | null
          conversion_date?: string | null
          conversion_probability?: number | null
          converted_to_paid?: boolean | null
          created_at?: string
          cross_tool_usage_count?: number | null
          customer_email?: string
          customer_name?: string | null
          engagement_score?: number | null
          estimated_value?: number | null
          id?: string
          last_interaction?: string | null
          lead_source?: string
          lead_temperature?: string | null
          notes?: string | null
          seminar_attended?: boolean | null
          tool_usage_frequency?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_goals: {
        Row: {
          advisory_target: number | null
          cost_budget: number | null
          created_at: string
          id: string
          lectures_target: number | null
          month: string
          pr_target: number | null
          revenue_forecast: number | null
          updated_at: string
          user_id: string
          workshops_target: number | null
        }
        Insert: {
          advisory_target?: number | null
          cost_budget?: number | null
          created_at?: string
          id?: string
          lectures_target?: number | null
          month: string
          pr_target?: number | null
          revenue_forecast?: number | null
          updated_at?: string
          user_id?: string
          workshops_target?: number | null
        }
        Update: {
          advisory_target?: number | null
          cost_budget?: number | null
          created_at?: string
          id?: string
          lectures_target?: number | null
          month?: string
          pr_target?: number | null
          revenue_forecast?: number | null
          updated_at?: string
          user_id?: string
          workshops_target?: number | null
        }
        Relationships: []
      }
      monthly_snapshots: {
        Row: {
          created_at: string
          id: string
          month: string
          site_visits: number | null
          social_followers: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          site_visits?: number | null
          social_followers?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          site_visits?: number | null
          social_followers?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          company: string | null
          contact_person: string | null
          created_at: string
          estimated_close_date: string | null
          estimated_value: number | null
          id: string
          month: string
          notes: string | null
          probability: number | null
          stage: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          contact_person?: string | null
          created_at?: string
          estimated_close_date?: string | null
          estimated_value?: number | null
          id?: string
          month: string
          notes?: string | null
          probability?: number | null
          stage?: string
          title: string
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          company?: string | null
          contact_person?: string | null
          created_at?: string
          estimated_close_date?: string | null
          estimated_value?: number | null
          id?: string
          month?: string
          notes?: string | null
          probability?: number | null
          stage?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          scheduled_at: string
          completed_at: string | null
          client_id: string | null
          contact_id: string | null
          repeat_pattern: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          description?: string | null
          scheduled_at: string
          completed_at?: string | null
          client_id?: string | null
          contact_id?: string | null
          repeat_pattern?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          scheduled_at?: string
          completed_at?: string | null
          client_id?: string | null
          contact_id?: string | null
          repeat_pattern?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_entries: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          id: string
          month: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date: string
          description?: string | null
          id?: string
          month: string
          source: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          month?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sheets_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          google_sheet_id: string | null
          id: string
          integration_type: string
          is_token_compromised: boolean | null
          last_sync_at: string | null
          refresh_token: string | null
          security_hash: string | null
          settings: Json | null
          sheet_name: string | null
          sync_enabled: boolean | null
          sync_error: string | null
          sync_status: string | null
          token_access_count: number | null
          token_expires_at: string | null
          token_last_rotated_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          google_sheet_id?: string | null
          id?: string
          integration_type?: string
          is_token_compromised?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string | null
          security_hash?: string | null
          settings?: Json | null
          sheet_name?: string | null
          sync_enabled?: boolean | null
          sync_error?: string | null
          sync_status?: string | null
          token_access_count?: number | null
          token_expires_at?: string | null
          token_last_rotated_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          google_sheet_id?: string | null
          id?: string
          integration_type?: string
          is_token_compromised?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string | null
          security_hash?: string | null
          settings?: Json | null
          sheet_name?: string | null
          sync_enabled?: boolean | null
          sync_error?: string | null
          sync_status?: string | null
          token_access_count?: number | null
          token_expires_at?: string | null
          token_last_rotated_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spreadsheet_sync: {
        Row: {
          created_at: string
          google_sheet_id: string | null
          id: string
          last_sync_at: string | null
          sync_enabled: boolean | null
          sync_error: string | null
          sync_frequency: string | null
          sync_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_sheet_id?: string | null
          id?: string
          last_sync_at?: string | null
          sync_enabled?: boolean | null
          sync_error?: string | null
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          google_sheet_id?: string | null
          id?: string
          last_sync_at?: string | null
          sync_enabled?: boolean | null
          sync_error?: string | null
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_performance_metrics: {
        Row: {
          avg_completion_rate: number | null
          avg_session_duration: number | null
          consultation_bookings: number | null
          conversion_rate: number | null
          created_at: string
          customer_acquisition_cost: number | null
          date: string
          id: string
          qualified_leads: number | null
          revenue_attributed: number | null
          tool_type: string
          total_leads_generated: number | null
          total_sessions: number | null
          unique_visitors: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_completion_rate?: number | null
          avg_session_duration?: number | null
          consultation_bookings?: number | null
          conversion_rate?: number | null
          created_at?: string
          customer_acquisition_cost?: number | null
          date?: string
          id?: string
          qualified_leads?: number | null
          revenue_attributed?: number | null
          tool_type: string
          total_leads_generated?: number | null
          total_sessions?: number | null
          unique_visitors?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_completion_rate?: number | null
          avg_session_duration?: number | null
          consultation_bookings?: number | null
          conversion_rate?: number | null
          created_at?: string
          customer_acquisition_cost?: number | null
          date?: string
          id?: string
          qualified_leads?: number | null
          revenue_attributed?: number | null
          tool_type?: string
          total_leads_generated?: number | null
          total_sessions?: number | null
          unique_visitors?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_behavior_logs: {
        Row: {
          component_name: string | null
          created_at: string
          device_type: string | null
          event_action: string
          event_category: string
          event_label: string | null
          event_type: string
          event_value: number | null
          id: string
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          device_type?: string | null
          event_action: string
          event_category: string
          event_label?: string | null
          event_type: string
          event_value?: number | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          component_name?: string | null
          created_at?: string
          device_type?: string | null
          event_action?: string
          event_category?: string
          event_label?: string | null
          event_type?: string
          event_value?: number | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_business_context: {
        Row: {
          business_type: string | null
          communication_style: string | null
          created_at: string
          id: string
          main_challenges: string[] | null
          priorities: string[] | null
          target_market: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_type?: string | null
          communication_style?: string | null
          created_at?: string
          id?: string
          main_challenges?: string[] | null
          priorities?: string[] | null
          target_market?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_type?: string | null
          communication_style?: string | null
          created_at?: string
          id?: string
          main_challenges?: string[] | null
          priorities?: string[] | null
          target_market?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_insights: {
        Row: {
          actioned_at: string | null
          category: string
          confidence_score: number | null
          created_at: string
          description: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          insight_type: string
          priority: string | null
          status: string | null
          suggested_actions: Json | null
          supporting_data: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actioned_at?: string | null
          category: string
          confidence_score?: number | null
          created_at?: string
          description: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          insight_type: string
          priority?: string | null
          status?: string | null
          suggested_actions?: Json | null
          supporting_data?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actioned_at?: string | null
          category?: string
          confidence_score?: number | null
          created_at?: string
          description?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          insight_type?: string
          priority?: string | null
          status?: string | null
          suggested_actions?: Json | null
          supporting_data?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          accent_color: string | null
          ai_auto_insights: boolean | null
          ai_personality: string | null
          ai_proactive_suggestions: boolean | null
          animations_enabled: boolean | null
          browser_notifications: boolean | null
          compact_mode: boolean | null
          created_at: string
          daily_digest: boolean | null
          default_view: string | null
          email_notifications: boolean | null
          favorite_metrics: string[] | null
          goal_reminders: boolean | null
          hidden_sections: string[] | null
          id: string
          sidebar_collapsed: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
          weekly_summary: boolean | null
          widget_order: Json | null
        }
        Insert: {
          accent_color?: string | null
          ai_auto_insights?: boolean | null
          ai_personality?: string | null
          ai_proactive_suggestions?: boolean | null
          animations_enabled?: boolean | null
          browser_notifications?: boolean | null
          compact_mode?: boolean | null
          created_at?: string
          daily_digest?: boolean | null
          default_view?: string | null
          email_notifications?: boolean | null
          favorite_metrics?: string[] | null
          goal_reminders?: boolean | null
          hidden_sections?: string[] | null
          id?: string
          sidebar_collapsed?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
          weekly_summary?: boolean | null
          widget_order?: Json | null
        }
        Update: {
          accent_color?: string | null
          ai_auto_insights?: boolean | null
          ai_personality?: string | null
          ai_proactive_suggestions?: boolean | null
          animations_enabled?: boolean | null
          browser_notifications?: boolean | null
          compact_mode?: boolean | null
          created_at?: string
          daily_digest?: boolean | null
          default_view?: string | null
          email_notifications?: boolean | null
          favorite_metrics?: string[] | null
          goal_reminders?: boolean | null
          hidden_sections?: string[] | null
          id?: string
          sidebar_collapsed?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          weekly_summary?: boolean | null
          widget_order?: Json | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          business_type: string | null
          created_at: string
          currency: string | null
          email: string | null
          fiscal_year_start: number | null
          full_name: string | null
          id: string
          industry: string | null
          last_active_at: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_step: number | null
          revenue_range: string | null
          service_types: string[] | null
          target_market: string | null
          timezone: string | null
          total_sessions: number | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          business_type?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          fiscal_year_start?: number | null
          full_name?: string | null
          id: string
          industry?: string | null
          last_active_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          revenue_range?: string | null
          service_types?: string[] | null
          target_market?: string | null
          timezone?: string | null
          total_sessions?: number | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          business_type?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          fiscal_year_start?: number | null
          full_name?: string | null
          id?: string
          industry?: string | null
          last_active_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          revenue_range?: string | null
          service_types?: string[] | null
          target_market?: string | null
          timezone?: string | null
          total_sessions?: number | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          actions_taken: number | null
          ai_interactions: number | null
          browser: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          os: string | null
          pages_viewed: number | null
          screen_width: number | null
          session_quality_score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          actions_taken?: number | null
          ai_interactions?: number | null
          browser?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          os?: string | null
          pages_viewed?: number | null
          screen_width?: number | null
          session_quality_score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          actions_taken?: number | null
          ai_interactions?: number | null
          browser?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          os?: string | null
          pages_viewed?: number | null
          screen_width?: number | null
          session_quality_score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      talent_contacts: {
        Row: {
          availability_status: string | null
          created_at: string
          email: string | null
          id: string
          linkedin_url: string | null
          name: string
          phone: string | null
          photo_url: string | null
          portfolio_url: string | null
          rate_max: number | null
          rate_min: number | null
          rate_type: string | null
          specialty_summary: string | null
          trust_rating: number | null
          updated_at: string
          user_id: string
          working_style_notes: string | null
        }
        Insert: {
          availability_status?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          portfolio_url?: string | null
          rate_max?: number | null
          rate_min?: number | null
          rate_type?: string | null
          specialty_summary?: string | null
          trust_rating?: number | null
          updated_at?: string
          user_id: string
          working_style_notes?: string | null
        }
        Update: {
          availability_status?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          portfolio_url?: string | null
          rate_max?: number | null
          rate_min?: number | null
          rate_type?: string | null
          specialty_summary?: string | null
          trust_rating?: number | null
          updated_at?: string
          user_id?: string
          working_style_notes?: string | null
        }
        Relationships: []
      }
      talent_opportunities: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          talent_contact_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          talent_contact_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          talent_contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_opportunities_talent_contact_id_fkey"
            columns: ["talent_contact_id"]
            isOneToOne: false
            referencedRelation: "talent_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_referrals: {
        Row: {
          client_name: string | null
          commission_fee: number | null
          created_at: string
          estimated_value: number | null
          follow_up_date: string | null
          id: string
          notes: string | null
          outcome_delivered: boolean | null
          outcome_notes: string | null
          project_type: string | null
          referred_date: string
          talent_contact_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name?: string | null
          commission_fee?: number | null
          created_at?: string
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          outcome_delivered?: boolean | null
          outcome_notes?: string | null
          project_type?: string | null
          referred_date: string
          talent_contact_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string | null
          commission_fee?: number | null
          created_at?: string
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          outcome_delivered?: boolean | null
          outcome_notes?: string | null
          project_type?: string | null
          referred_date?: string
          talent_contact_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_referrals_talent_contact_id_fkey"
            columns: ["talent_contact_id"]
            isOneToOne: false
            referencedRelation: "talent_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_skills: {
        Row: {
          created_at: string
          id: string
          skill_id: string
          talent_contact_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          skill_id: string
          talent_contact_id: string
        }
        Update: {
          created_at?: string
          id?: string
          skill_id?: string
          talent_contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_skills_talent_contact_id_fkey"
            columns: ["talent_contact_id"]
            isOneToOne: false
            referencedRelation: "talent_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_summaries: {
        Row: {
          ai_summary: string | null
          created_at: string
          generated_at: string
          highlights: string[] | null
          id: string
          insights: Json | null
          top_clients: Json | null
          total_activities: number | null
          total_hours: number | null
          total_revenue: number | null
          user_id: string
          viewed: boolean | null
          viewed_at: string | null
          week_end: string
          week_start: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          generated_at?: string
          highlights?: string[] | null
          id?: string
          insights?: Json | null
          top_clients?: Json | null
          total_activities?: number | null
          total_hours?: number | null
          total_revenue?: number | null
          user_id: string
          viewed?: boolean | null
          viewed_at?: string | null
          week_end: string
          week_start: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          generated_at?: string
          highlights?: string[] | null
          id?: string
          insights?: Json | null
          top_clients?: Json | null
          total_activities?: number | null
          total_hours?: number | null
          total_revenue?: number | null
          user_id?: string
          viewed?: boolean | null
          viewed_at?: string | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_google_tokens: {
        Args: { target_user_id: string }
        Returns: {
          access_token: string
          refresh_token: string
          token_expires_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      log_token_access: {
        Args: {
          access_type: string
          additional_info?: Json
          success?: boolean
          target_user_id: string
        }
        Returns: undefined
      }
      verify_token_integrity: {
        Args: { target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
