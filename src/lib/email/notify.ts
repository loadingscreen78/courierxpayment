/**
 * Client-side notification helpers.
 * Thin wrappers that call the server-side API routes via fetch().
 * Errors are caught and logged — they never throw.
 */

export async function sendInvoiceNotification(
  shipmentId: string,
  invoiceId: string
): Promise<void> {
  try {
    const res = await fetch('/api/email/send-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentId, invoiceId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('[Notify] Invoice email failed:', data.error || res.statusText);
    }
  } catch (err) {
    console.error('[Notify] Invoice email request failed:', err);
  }
}

export async function sendStatusNotification(
  shipmentId: string,
  status: string
): Promise<void> {
  try {
    const res = await fetch('/api/email/send-status-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentId, status }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('[Notify] Status email failed:', data.error || res.statusText);
    }
  } catch (err) {
    console.error('[Notify] Status email request failed:', err);
  }
}


/**
 * Sends a WhatsApp status notification (fire-and-forget).
 */
export async function sendWhatsAppStatusNotification(
  shipmentId: string,
  status: string
): Promise<void> {
  try {
    const res = await fetch('/api/whatsapp/send-status-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentId, status }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('[Notify] WhatsApp status failed:', data.error || res.statusText);
    }
  } catch (err) {
    console.error('[Notify] WhatsApp status request failed:', err);
  }
}

/**
 * Sends a WhatsApp invoice notification (fire-and-forget).
 */
export async function sendWhatsAppInvoiceNotification(
  shipmentId: string,
  invoiceId: string
): Promise<void> {
  try {
    const res = await fetch('/api/whatsapp/send-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentId, invoiceId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('[Notify] WhatsApp invoice failed:', data.error || res.statusText);
    }
  } catch (err) {
    console.error('[Notify] WhatsApp invoice request failed:', err);
  }
}
