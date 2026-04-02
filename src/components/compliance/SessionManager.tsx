import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { auditLogger } from '@/utils/auditLogger';

/**
 * Session Manager — handles:
 * - Auto-logout after inactivity (SOC2 CC6.1, HIPAA §164.312(a)(2)(iii))
 * - Session activity tracking
 * - Audit logging of auth events
 */

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];

export function SessionManager() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInactivityTimeout = useCallback(async () => {
    if (!user) return;

    await auditLogger.log({
      action: 'logout',
      resource: 'session',
      details: { reason: 'inactivity_timeout' },
      framework: 'SOC2',
    });
    await auditLogger.flush();
    await signOut();
  }, [user, signOut]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (user) {
      timeoutRef.current = setTimeout(handleInactivityTimeout, INACTIVITY_TIMEOUT_MS);
    }
  }, [user, handleInactivityTimeout]);

  useEffect(() => {
    if (!user) return;

    // Log session start
    auditLogger.log({
      action: 'login',
      resource: 'session',
      details: { user_id: user.id },
      framework: 'SOC2',
    });

    // Set up activity listeners
    resetTimer();
    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, resetTimer]);

  // Flush audit log on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      auditLogger.flush();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return null; // Invisible component
}
