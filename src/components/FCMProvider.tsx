'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase/messaging';
import { useToast } from '@/hooks/use-toast';

/**
 * FCMProvider — mounts once inside AuthProvider.
 * 1. Requests notification permission after login
 * 2. Saves FCM token to the backend
 * 3. Shows foreground push notifications as toasts
 */
export function FCMProvider() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const tokenSavedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !session?.access_token) return;

    let unsubscribe: (() => void) | null = null;

    async function init() {
      const token = await requestNotificationPermission();
      if (!token) return;

      // Only save if token changed
      if (tokenSavedRef.current === token) return;
      tokenSavedRef.current = token;

      try {
        await fetch('/api/user/fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session!.access_token}`,
          },
          body: JSON.stringify({ token }),
        });
        console.log('[FCM] Token saved');
      } catch (err) {
        console.error('[FCM] Failed to save token:', err);
      }

      // Listen for foreground messages and show as toast
      unsubscribe = onForegroundMessage(({ title, body, data }) => {
        toast({
          title,
          description: body,
          duration: 6000,
          ...(data?.trackingNumber && {
            action: (
              <a
                href={`/public/track?tracking=${encodeURIComponent(data.trackingNumber)}`}
                className="text-xs underline"
              >
                Track
              </a>
            ) as any,
          }),
        });
      });
    }

    init();

    return () => {
      unsubscribe?.();
    };
  }, [user?.id, session?.access_token]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
