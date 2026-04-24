import * as admin from 'firebase-admin';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { STATUS_LABEL_MAP } from '@/lib/shipment-lifecycle/statusLabelMap';
import type { ShipmentStatus } from '@/lib/shipment-lifecycle/types';

// ---------------------------------------------------------------------------
// Firebase Admin initialisation (singleton)
// ---------------------------------------------------------------------------

function getAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
  }

  // Fallback: individual env vars
  const projectId = process.env.FIREBASE_PROJECT_ID || 'courierx-in';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('[FCM] Firebase Admin credentials not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.');
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

// ---------------------------------------------------------------------------
// FCM token lookup
// ---------------------------------------------------------------------------

async function getFcmToken(userId: string): Promise<string | null> {
  const supabase = getServiceRoleClient();
  const { data } = await supabase
    .from('profiles')
    .select('fcm_token, notifications_push')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.fcm_token) return null;
  // Respect push notification preference (default true if null)
  if (data.notifications_push === false) return null;
  return data.fcm_token as string;
}

// ---------------------------------------------------------------------------
// Send a single FCM push notification
// ---------------------------------------------------------------------------

export async function sendFcmPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const app = getAdminApp();
    await admin.messaging(app).send({
      token,
      notification: { title, body },
      data: data || {},
      webpush: {
        notification: {
          title,
          body,
          icon: '/favicon.png',
          badge: '/favicon.png',
          requireInteraction: false,
        },
        fcmOptions: { link: data?.trackingNumber ? `/public/track?tracking=${data.trackingNumber}` : '/dashboard' },
      },
      android: {
        notification: { title, body, icon: 'ic_notification', color: '#E8272A' },
        priority: 'high',
      },
      apns: {
        payload: { aps: { alert: { title, body }, badge: 1, sound: 'default' } },
      },
    });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'FCM send failed';
    console.error('[FCM] Push failed:', msg);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Dispatch push for a shipment status change
// ---------------------------------------------------------------------------

export async function dispatchStatusPush(
  shipmentId: string,
  newStatus: ShipmentStatus
): Promise<void> {
  // Skip non-meaningful statuses
  if (newStatus === 'PENDING') return;

  try {
    const supabase = getServiceRoleClient();
    const { data: shipment } = await supabase
      .from('shipments')
      .select('user_id, tracking_number, recipient_name, destination_country')
      .eq('id', shipmentId)
      .maybeSingle();

    if (!shipment?.user_id) return;

    const token = await getFcmToken(shipment.user_id);
    if (!token) return;

    const statusInfo = STATUS_LABEL_MAP[newStatus];
    const label = statusInfo?.label ?? newStatus.replace(/_/g, ' ');
    const tracking = shipment.tracking_number || shipmentId;

    const title = `Shipment ${label}`;
    const body = `Your shipment ${tracking} to ${shipment.destination_country} is now: ${label}`;

    await sendFcmPush(token, title, body, {
      shipmentId,
      trackingNumber: tracking,
      status: newStatus,
    });

    console.log(`[FCM] Push sent for shipment ${tracking} → ${newStatus}`);
  } catch (err) {
    // Never throw — fire-and-forget
    console.error('[FCM] dispatchStatusPush error:', err);
  }
}
