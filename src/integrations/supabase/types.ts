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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      circle_person: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          display_name: string
          fingerprint: string | null
          id: string
          last_interaction_at: string | null
          linkedin_url: string | null
          location: string | null
          primary_email: string | null
          primary_phone: string | null
          response_rate: number | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
          warmth: number | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name: string
          fingerprint?: string | null
          id?: string
          last_interaction_at?: string | null
          linkedin_url?: string | null
          location?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          response_rate?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
          warmth?: number | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string
          fingerprint?: string | null
          id?: string
          last_interaction_at?: string | null
          linkedin_url?: string | null
          location?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          response_rate?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
          warmth?: number | null
        }
        Relationships: []
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
      data_breach_log: {
        Row: {
          affected_records_count: number | null
          authority_notified_at: string | null
          containment_actions: string | null
          created_at: string
          data_types_affected: string[] | null
          description: string
          detected_at: string
          id: string
          individuals_notified_at: string | null
          notification_required: boolean | null
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string
        }
        Insert: {
          affected_records_count?: number | null
          authority_notified_at?: string | null
          containment_actions?: string | null
          created_at?: string
          data_types_affected?: string[] | null
          description: string
          detected_at?: string
          id?: string
          individuals_notified_at?: string | null
          notification_required?: boolean | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity: string
        }
        Update: {
          affected_records_count?: number | null
          authority_notified_at?: string | null
          containment_actions?: string | null
          created_at?: string
          data_types_affected?: string[] | null
          description?: string
          detected_at?: string
          id?: string
          individuals_notified_at?: string | null
          notification_required?: boolean | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
        }
        Relationships: []
      }
      data_processing_records: {
        Row: {
          created_at: string
          data_categories: string[]
          data_subjects: string[]
          id: string
          legal_basis: string
          processing_activity: string
          purpose: string
          recipients: string[] | null
          retention_period: string
          security_measures: string[] | null
          third_country_transfers: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_categories: string[]
          data_subjects: string[]
          id?: string
          legal_basis: string
          processing_activity: string
          purpose: string
          recipients?: string[] | null
          retention_period: string
          security_measures?: string[] | null
          third_country_transfers?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_categories?: string[]
          data_subjects?: string[]
          id?: string
          legal_basis?: string
          processing_activity?: string
          purpose?: string
          recipients?: string[] | null
          retention_period?: string
          security_measures?: string[] | null
          third_country_transfers?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      data_retention_policies: {
        Row: {
          auto_purge: boolean | null
          created_at: string
          description: string | null
          id: string
          last_purge_at: string | null
          legal_basis: string | null
          retention_days: number
          table_name: string
        }
        Insert: {
          auto_purge?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          last_purge_at?: string | null
          legal_basis?: string | null
          retention_days: number
          table_name: string
        }
        Update: {
          auto_purge?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          last_purge_at?: string | null
          legal_basis?: string | null
          retention_days?: number
          table_name?: string
        }
        Relationships: []
      }
      data_subject_requests: {
        Row: {
          acknowledged_at: string | null
          completed_at: string | null
          created_at: string
          deadline_at: string
          description: string | null
          id: string
          processed_by: string | null
          request_type: Database["public"]["Enums"]["data_request_type"]
          requested_at: string
          response_notes: string | null
          status: Database["public"]["Enums"]["data_request_status"]
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          completed_at?: string | null
          created_at?: string
          deadline_at?: string
          description?: string | null
          id?: string
          processed_by?: string | null
          request_type: Database["public"]["Enums"]["data_request_type"]
          requested_at?: string
          response_notes?: string | null
          status?: Database["public"]["Enums"]["data_request_status"]
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          completed_at?: string | null
          created_at?: string
          deadline_at?: string
          description?: string | null
          id?: string
          processed_by?: string | null
          request_type?: Database["public"]["Enums"]["data_request_type"]
          requested_at?: string
          response_notes?: string | null
          status?: Database["public"]["Enums"]["data_request_status"]
          user_id?: string | null
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
      ideas: {
        Row: {
          created_at: string
          icp: string | null
          id: string
          offer: string | null
          one_liner: string | null
          price_band: string | null
          source_transcript_id: string | null
          status: Database["public"]["Enums"]["idea_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icp?: string | null
          id?: string
          offer?: string | null
          one_liner?: string | null
          price_band?: string | null
          source_transcript_id?: string | null
          status?: Database["public"]["Enums"]["idea_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          icp?: string | null
          id?: string
          offer?: string | null
          one_liner?: string | null
          price_band?: string | null
          source_transcript_id?: string | null
          status?: Database["public"]["Enums"]["idea_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount_cents: number | null
          circle_person_id: string | null
          created_at: string
          id: string
          kind: string
          minutes: number | null
          note: string | null
          occurred_at: string
          source: string | null
          stream_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          circle_person_id?: string | null
          created_at?: string
          id?: string
          kind: string
          minutes?: number | null
          note?: string | null
          occurred_at: string
          source?: string | null
          stream_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          circle_person_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          minutes?: number | null
          note?: string | null
          occurred_at?: string
          source?: string | null
          stream_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_circle_person_id_fkey"
            columns: ["circle_person_id"]
            isOneToOne: false
            referencedRelation: "circle_person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          approved_at: string | null
          circle_person_id: string
          closed_at: string | null
          closed_reason: string | null
          id: string
          idea_id: string | null
          rationale: string | null
          score: number | null
          signal_id: string | null
          state: Database["public"]["Enums"]["match_state"]
          stream_id: string | null
          surfaced_at: string
          user_id: string
          warm_path: Json | null
        }
        Insert: {
          approved_at?: string | null
          circle_person_id: string
          closed_at?: string | null
          closed_reason?: string | null
          id?: string
          idea_id?: string | null
          rationale?: string | null
          score?: number | null
          signal_id?: string | null
          state?: Database["public"]["Enums"]["match_state"]
          stream_id?: string | null
          surfaced_at?: string
          user_id: string
          warm_path?: Json | null
        }
        Update: {
          approved_at?: string | null
          circle_person_id?: string
          closed_at?: string | null
          closed_reason?: string | null
          id?: string
          idea_id?: string | null
          rationale?: string | null
          score?: number | null
          signal_id?: string | null
          state?: Database["public"]["Enums"]["match_state"]
          stream_id?: string | null
          surfaced_at?: string
          user_id?: string
          warm_path?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_circle_person_id_fkey"
            columns: ["circle_person_id"]
            isOneToOne: false
            referencedRelation: "circle_person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_goals: {
        Row: {
          advisory_target: number | null
          cost_budget: number | null
          created_at: string
          id: string
          lectures_target: number | null
          month: string
          pipeline_target: number | null
          pr_target: number | null
          revenue_forecast: number | null
          total_hours_capacity: number | null
          total_revenue_target: number | null
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
          pipeline_target?: number | null
          pr_target?: number | null
          revenue_forecast?: number | null
          total_hours_capacity?: number | null
          total_revenue_target?: number | null
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
          pipeline_target?: number | null
          pr_target?: number | null
          revenue_forecast?: number | null
          total_hours_capacity?: number | null
          total_revenue_target?: number | null
          updated_at?: string
          user_id?: string
          workshops_target?: number | null
        }
        Relationships: []
      }
      moves: {
        Row: {
          channel: Database["public"]["Enums"]["move_channel"]
          created_at: string
          draft_body: string
          draft_subject: string | null
          edit_distance: number | null
          final_body: string | null
          id: string
          match_id: string
          responded_at: string | null
          sent_at: string | null
          state: Database["public"]["Enums"]["move_state"]
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["move_channel"]
          created_at?: string
          draft_body: string
          draft_subject?: string | null
          edit_distance?: number | null
          final_body?: string | null
          id?: string
          match_id: string
          responded_at?: string | null
          sent_at?: string | null
          state?: Database["public"]["Enums"]["move_state"]
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["move_channel"]
          created_at?: string
          draft_body?: string
          draft_subject?: string | null
          edit_distance?: number | null
          final_body?: string | null
          id?: string
          match_id?: string
          responded_at?: string | null
          sent_at?: string | null
          state?: Database["public"]["Enums"]["move_state"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moves_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
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
      person_raw: {
        Row: {
          circle_person_id: string | null
          confidence: number | null
          external_id: string | null
          fingerprint: string | null
          id: string
          ingested_at: string
          payload: Json
          source_id: string
          user_id: string
        }
        Insert: {
          circle_person_id?: string | null
          confidence?: number | null
          external_id?: string | null
          fingerprint?: string | null
          id?: string
          ingested_at?: string
          payload: Json
          source_id: string
          user_id: string
        }
        Update: {
          circle_person_id?: string | null
          confidence?: number | null
          external_id?: string | null
          fingerprint?: string | null
          id?: string
          ingested_at?: string
          payload?: Json
          source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_raw_circle_person_fk"
            columns: ["circle_person_id"]
            isOneToOne: false
            referencedRelation: "circle_person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_raw_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          active: boolean
          client_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          id: string
          repeat_pattern: string | null
          scheduled_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          repeat_pattern?: string | null
          scheduled_at: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          active?: boolean
          client_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          repeat_pattern?: string | null
          scheduled_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "talent_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_entries: {
        Row: {
          amount: number
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          month?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          affected_resource_id: string | null
          compliance_framework: string | null
          created_at: string
          data_classification: string | null
          details: Json | null
          id: string
          ip_address: unknown
          outcome: string | null
          resource: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          affected_resource_id?: string | null
          compliance_framework?: string | null
          created_at?: string
          data_classification?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          outcome?: string | null
          resource?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          affected_resource_id?: string | null
          compliance_framework?: string | null
          created_at?: string
          data_classification?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          outcome?: string | null
          resource?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          circle_person_id: string | null
          confidence: number | null
          created_at: string
          detail: string | null
          headline: string
          id: string
          kind: Database["public"]["Enums"]["signal_kind"]
          occurred_at: string | null
          raw: Json | null
          source_url: string | null
          subject: Database["public"]["Enums"]["signal_subject"]
          user_id: string
        }
        Insert: {
          circle_person_id?: string | null
          confidence?: number | null
          created_at?: string
          detail?: string | null
          headline: string
          id?: string
          kind: Database["public"]["Enums"]["signal_kind"]
          occurred_at?: string | null
          raw?: Json | null
          source_url?: string | null
          subject: Database["public"]["Enums"]["signal_subject"]
          user_id: string
        }
        Update: {
          circle_person_id?: string | null
          confidence?: number | null
          created_at?: string
          detail?: string | null
          headline?: string
          id?: string
          kind?: Database["public"]["Enums"]["signal_kind"]
          occurred_at?: string | null
          raw?: Json | null
          source_url?: string | null
          subject?: Database["public"]["Enums"]["signal_subject"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_circle_person_id_fkey"
            columns: ["circle_person_id"]
            isOneToOne: false
            referencedRelation: "circle_person"
            referencedColumns: ["id"]
          },
        ]
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
      sources: {
        Row: {
          created_at: string
          credentials_ref: string | null
          id: string
          kind: Database["public"]["Enums"]["source_kind"]
          label: string | null
          last_error: string | null
          last_ingested_at: string | null
          scope_payload: Json | null
          status: Database["public"]["Enums"]["source_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials_ref?: string | null
          id?: string
          kind: Database["public"]["Enums"]["source_kind"]
          label?: string | null
          last_error?: string | null
          last_ingested_at?: string | null
          scope_payload?: Json | null
          status?: Database["public"]["Enums"]["source_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials_ref?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["source_kind"]
          label?: string | null
          last_error?: string | null
          last_ingested_at?: string | null
          scope_payload?: Json | null
          status?: Database["public"]["Enums"]["source_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streams: {
        Row: {
          activated_at: string | null
          created_at: string
          id: string
          idea_id: string | null
          monthly_target_cents: number | null
          name: string
          playbook: Json | null
          retired_at: string | null
          retired_reason: string | null
          state: Database["public"]["Enums"]["stream_state"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          id?: string
          idea_id?: string | null
          monthly_target_cents?: number | null
          name: string
          playbook?: Json | null
          retired_at?: string | null
          retired_reason?: string | null
          state?: Database["public"]["Enums"]["stream_state"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          id?: string
          idea_id?: string | null
          monthly_target_cents?: number | null
          name?: string
          playbook?: Json | null
          retired_at?: string | null
          retired_reason?: string | null
          state?: Database["public"]["Enums"]["stream_state"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streams_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sunday_letters: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          model: string | null
          stats: Json | null
          text_body: string
          user_id: string
          week_of: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          model?: string | null
          stats?: Json | null
          text_body: string
          user_id: string
          week_of: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          model?: string | null
          stats?: Json | null
          text_body?: string
          user_id?: string
          week_of?: string
        }
        Relationships: []
      }
      talent_contact_identities: {
        Row: {
          confidence: number | null
          contact_id: string
          created_at: string
          id: string
          kind: string
          source: string | null
          user_id: string
          value_normalized: string
          value_raw: string | null
        }
        Insert: {
          confidence?: number | null
          contact_id: string
          created_at?: string
          id?: string
          kind: string
          source?: string | null
          user_id: string
          value_normalized: string
          value_raw?: string | null
        }
        Update: {
          confidence?: number | null
          contact_id?: string
          created_at?: string
          id?: string
          kind?: string
          source?: string | null
          user_id?: string
          value_normalized?: string
          value_raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_contact_identities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "talent_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_contact_merges: {
        Row: {
          created_at: string
          field_choices: Json | null
          id: string
          reversed_at: string | null
          snapshot_loser: Json
          snapshot_winner_after: Json
          snapshot_winner_before: Json
          surviving_contact_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_choices?: Json | null
          id?: string
          reversed_at?: string | null
          snapshot_loser: Json
          snapshot_winner_after: Json
          snapshot_winner_before: Json
          surviving_contact_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_choices?: Json | null
          id?: string
          reversed_at?: string | null
          snapshot_loser?: Json
          snapshot_winner_after?: Json
          snapshot_winner_before?: Json
          surviving_contact_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_contact_merges_surviving_contact_id_fkey"
            columns: ["surviving_contact_id"]
            isOneToOne: false
            referencedRelation: "talent_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_contacts: {
        Row: {
          availability_status: string | null
          city: string | null
          company: string | null
          created_at: string
          email: string | null
          enrichment_failure_reason: string | null
          enrichment_last_attempt_at: string | null
          enrichment_status: string | null
          id: string
          last_interaction_date: string | null
          linkedin_url: string | null
          met_at: string | null
          met_date: string | null
          name: string
          needs_review: boolean | null
          notes_voice_raw: string | null
          phone: string | null
          photo_url: string | null
          portfolio_url: string | null
          rate_max: number | null
          rate_min: number | null
          rate_type: string | null
          source: string | null
          specialty_summary: string | null
          tags: string[] | null
          timezone: string | null
          title: string | null
          trust_rating: number | null
          updated_at: string
          user_id: string
          vetted: boolean | null
          working_style_notes: string | null
        }
        Insert: {
          availability_status?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          enrichment_failure_reason?: string | null
          enrichment_last_attempt_at?: string | null
          enrichment_status?: string | null
          id?: string
          last_interaction_date?: string | null
          linkedin_url?: string | null
          met_at?: string | null
          met_date?: string | null
          name: string
          needs_review?: boolean | null
          notes_voice_raw?: string | null
          phone?: string | null
          photo_url?: string | null
          portfolio_url?: string | null
          rate_max?: number | null
          rate_min?: number | null
          rate_type?: string | null
          source?: string | null
          specialty_summary?: string | null
          tags?: string[] | null
          timezone?: string | null
          title?: string | null
          trust_rating?: number | null
          updated_at?: string
          user_id: string
          vetted?: boolean | null
          working_style_notes?: string | null
        }
        Update: {
          availability_status?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          enrichment_failure_reason?: string | null
          enrichment_last_attempt_at?: string | null
          enrichment_status?: string | null
          id?: string
          last_interaction_date?: string | null
          linkedin_url?: string | null
          met_at?: string | null
          met_date?: string | null
          name?: string
          needs_review?: boolean | null
          notes_voice_raw?: string | null
          phone?: string | null
          photo_url?: string | null
          portfolio_url?: string | null
          rate_max?: number | null
          rate_min?: number | null
          rate_type?: string | null
          source?: string | null
          specialty_summary?: string | null
          tags?: string[] | null
          timezone?: string | null
          title?: string | null
          trust_rating?: number | null
          updated_at?: string
          user_id?: string
          vetted?: boolean | null
          working_style_notes?: string | null
        }
        Relationships: []
      }
      talent_interactions: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          interaction_type: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          interaction_type?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          interaction_type?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "talent_contacts"
            referencedColumns: ["id"]
          },
        ]
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
      usage_tracking: {
        Row: {
          count: number
          created_at: string | null
          feature: string
          id: string
          period_end: string
          period_start: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          feature: string
          id?: string
          period_end: string
          period_start: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string | null
          feature?: string
          id?: string
          period_end?: string
          period_start?: string
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
      user_consents: {
        Row: {
          consent_type: string
          consent_version: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: unknown
          revoked_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          consent_version?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          consent_version?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
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
      erase_user_data: { Args: { target_user_id: string }; Returns: boolean }
      export_user_data: { Args: { target_user_id: string }; Returns: Json }
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
      increment_usage: {
        Args: {
          p_feature: string
          p_period_end: string
          p_period_start: string
          p_user_id: string
        }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      log_compliance_event: {
        Args: {
          p_action: string
          p_classification?: string
          p_details?: Json
          p_framework?: string
          p_outcome?: string
          p_resource: string
          p_user_id: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          action_type: string
          client_ip?: unknown
          client_user_agent?: string
          event_details?: Json
          resource_name: string
          target_user_id: string
        }
        Returns: undefined
      }
      log_token_access: {
        Args: {
          access_type: string
          additional_info?: Json
          success?: boolean
          target_user_id: string
        }
        Returns: undefined
      }
      merge_circle_persons: {
        Args: { drop_id: string; keep_id: string }
        Returns: undefined
      }
      verify_token_integrity: {
        Args: { target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      data_request_status:
        | "pending"
        | "processing"
        | "completed"
        | "denied"
        | "expired"
      data_request_type:
        | "access"
        | "rectification"
        | "erasure"
        | "portability"
        | "restriction"
        | "objection"
        | "opt_out"
      idea_status: "proposed" | "voiced" | "active" | "retired"
      match_state:
        | "new"
        | "approved"
        | "edited"
        | "sent"
        | "won"
        | "cold"
        | "declined"
      move_channel:
        | "email"
        | "linkedin_dm"
        | "sms"
        | "call"
        | "calendar_invite"
        | "post"
        | "other"
      move_state: "draft" | "approved" | "sent" | "responded" | "declined"
      signal_kind:
        | "job_change"
        | "promotion"
        | "fundraise"
        | "hiring"
        | "public_post"
        | "mention"
        | "rfp"
        | "trend"
        | "calendar_meeting"
        | "email_interaction"
        | "other"
      signal_subject: "person" | "market"
      source_kind:
        | "google"
        | "microsoft"
        | "linkedin_csv"
        | "linkedin_extension"
        | "instagram_export"
        | "facebook_export"
        | "x_export"
        | "legacy_crm_csv"
        | "sheet_upload"
        | "ios_contacts"
        | "ios_shortcut"
        | "share_sheet"
        | "voice_seed"
        | "external_enrichment"
        | "business_card_photo"
        | "inbox_signature_scan"
        | "calendar_backscan"
      source_status:
        | "connecting"
        | "ingesting"
        | "active"
        | "stale"
        | "revoked"
        | "failed"
      stream_state: "prototyping" | "live" | "paused" | "retired"
      subscription_tier: "free" | "pro" | "executive"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      data_request_status: [
        "pending",
        "processing",
        "completed",
        "denied",
        "expired",
      ],
      data_request_type: [
        "access",
        "rectification",
        "erasure",
        "portability",
        "restriction",
        "objection",
        "opt_out",
      ],
      idea_status: ["proposed", "voiced", "active", "retired"],
      match_state: [
        "new",
        "approved",
        "edited",
        "sent",
        "won",
        "cold",
        "declined",
      ],
      move_channel: [
        "email",
        "linkedin_dm",
        "sms",
        "call",
        "calendar_invite",
        "post",
        "other",
      ],
      move_state: ["draft", "approved", "sent", "responded", "declined"],
      signal_kind: [
        "job_change",
        "promotion",
        "fundraise",
        "hiring",
        "public_post",
        "mention",
        "rfp",
        "trend",
        "calendar_meeting",
        "email_interaction",
        "other",
      ],
      signal_subject: ["person", "market"],
      source_kind: [
        "google",
        "microsoft",
        "linkedin_csv",
        "linkedin_extension",
        "instagram_export",
        "facebook_export",
        "x_export",
        "legacy_crm_csv",
        "sheet_upload",
        "ios_contacts",
        "ios_shortcut",
        "share_sheet",
        "voice_seed",
        "external_enrichment",
        "business_card_photo",
        "inbox_signature_scan",
        "calendar_backscan",
      ],
      source_status: [
        "connecting",
        "ingesting",
        "active",
        "stale",
        "revoked",
        "failed",
      ],
      stream_state: ["prototyping", "live", "paused", "retired"],
      subscription_tier: ["free", "pro", "executive"],
    },
  },
} as const
