/**
 * Client-side audit logging utility
 * Sends structured audit events to the security_audit_log table
 * SOC2 CC6.1, ISO A.12.4, HIPAA §164.312(b)
 */

import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'data_access'
  | 'data_export'
  | 'data_modification'
  | 'consent_update'
  | 'settings_change'
  | 'api_call'
  | 'voice_recording'
  | 'ai_query'
  | 'contact_access'
  | 'payment_action';

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

interface AuditEvent {
  action: AuditAction;
  resource: string;
  details?: Record<string, unknown>;
  framework?: string;
  classification?: DataClassification;
  outcome?: 'success' | 'failure' | 'denied' | 'error';
}

class AuditLogger {
  private queue: AuditEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000;

  async log(event: AuditEvent): Promise<void> {
    this.queue.push(event);

    if (this.queue.length >= this.BATCH_SIZE) {
      await this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL);
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const records = events.map(event => ({
        user_id: user.id,
        action: event.action,
        resource: event.resource,
        details: event.details || {},
        compliance_framework: event.framework || null,
        data_classification: event.classification || 'internal',
        outcome: event.outcome || 'success',
      }));

      // Insert batch — fire and forget, don't block UI
      await supabase.from('security_audit_log' as any).insert(records);
    } catch (err) {
      // Audit logging should never break the app
      console.error('Audit log flush failed:', err);
    }
  }

  // Convenience methods
  logDataAccess(resource: string, details?: Record<string, unknown>) {
    return this.log({
      action: 'data_access',
      resource,
      details,
      classification: 'confidential',
    });
  }

  logAIQuery(question: string) {
    return this.log({
      action: 'ai_query',
      resource: 'ai_strategic_analysis',
      details: { question_length: question.length },
      classification: 'confidential',
      framework: 'SOC2',
    });
  }

  logConsentUpdate(consentType: string, granted: boolean) {
    return this.log({
      action: 'consent_update',
      resource: 'user_consents',
      details: { consent_type: consentType, granted },
      framework: 'GDPR',
    });
  }

  logVoiceRecording() {
    return this.log({
      action: 'voice_recording',
      resource: 'transcription',
      classification: 'confidential',
      framework: 'HIPAA',
    });
  }

  logContactAccess(contactId: string) {
    return this.log({
      action: 'contact_access',
      resource: 'talent_contacts',
      details: { contact_id: contactId },
      classification: 'confidential',
    });
  }
}

export const auditLogger = new AuditLogger();
