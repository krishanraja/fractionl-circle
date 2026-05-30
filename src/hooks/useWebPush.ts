import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Web Push opt-in hook for the Circle PWA.
 *
 * Entirely inert and safe when VITE_VAPID_PUBLIC_KEY is missing or the
 * platform lacks Service Worker / Notification / PushManager support — in that
 * case `supported` is false and subscribe()/unsubscribe() no-op. None of the
 * exposed methods ever throw to the caller; they resolve to a boolean.
 *
 * The push_subscriptions table is intentionally not in the generated Supabase
 * types yet, so we cast the client narrowly where we touch it.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UseWebPush {
  supported: boolean;
  permission: NotificationPermissionState;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

// Narrowly-typed view of the supabase client for the un-typed table.
type LooseClient = { from: (table: string) => any };
const db = supabase as unknown as LooseClient;

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined' &&
    !!VAPID_PUBLIC_KEY
  );
}

// base64url -> Uint8Array, per the Web Push applicationServerKey spec.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function useWebPush(): UseWebPush {
  const supported = isSupported();
  const [permission, setPermission] = useState<NotificationPermissionState>('default');

  useEffect(() => {
    if (!supported) {
      setPermission('unsupported');
      return;
    }
    try {
      setPermission(Notification.permission as NotificationPermissionState);
    } catch {
      setPermission('unsupported');
    }
  }, [supported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported || !VAPID_PUBLIC_KEY) return false;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as NotificationPermissionState);
      if (perm !== 'granted') return false;

      const registration = await navigator.serviceWorker.ready;

      // Reuse an existing subscription if present, else create one.
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = subscription.toJSON();
      const endpoint = json.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!endpoint || !p256dh || !auth) return false;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return false;

      const { error } = await db
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userId,
            endpoint,
            p256dh,
            auth,
            user_agent:
              typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
          },
          { onConflict: 'endpoint' }
        );
      if (error) return false;

      return true;
    } catch {
      // Never throw to the caller; opt-in is best-effort.
      return false;
    }
  }, [supported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return true;

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch(() => undefined);

      if (endpoint) {
        await db
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint)
          .then(undefined, () => undefined);
      }
      return true;
    } catch {
      return false;
    }
  }, [supported]);

  return { supported, permission, subscribe, unsubscribe };
}
