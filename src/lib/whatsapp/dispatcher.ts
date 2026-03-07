import { supabaseServer } from '@/lib/email/supabaseServer';
import { sendWhatsAppMessage } from './messaging';
import { renderStatusMessage } from './templates';
import { renderInvoiceMessage } from './templates';
import { ShipmentStatus } from '@/lib/email/templates/shared';

export interface WhatsAppNotificationResult {
  userWhatsAppSent: boolean;
  errors: string[];
}

/**
 * Resolves the user's phone number and WhatsApp notification preference.
 */
async function resolveUserPhone(userId: string): Promise<{
  phone: string | null;
  notificationsEnabled: boolean;
}> {
  const { data: profile, error } = await supabaseServer
    .from('profiles')
    .select('phone_number, notifications_whatsapp')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.warn(`[WhatsApp] Profile lookup failed for ${userId}:`, error.message);
    return { phone: null, notificationsEnabled: false };
  }

  return {
    phone: profile?.phone_number || null,
    notificationsEnabled: profile?.notifications_whatsapp !== false,
  };
}

/**
 * Dispatches a WhatsApp notification for a shipment status change.
 * Mirrors the email dispatcher pattern — fire-and-forget, never throws.
 */
export async function dispatchStatusWhatsApp(
  shipmentId: string,
  newStatus: string
): Promise<WhatsAppNotificationResult> {
  const result: WhatsAppNotificationResult = { userWhatsAppSent: false, errors: [] };

  if (newStatus === 'draft') return result;

  console.log(`[WhatsApp] Dispatching status notification for shipment=${shipmentId}, status=${newStatus}`);

  // Fetch shipment
  const { data: shipment, error: shipmentErr } = await supabaseServer
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .single();

  if (shipmentErr || !shipment) {
    console.error(`[WhatsApp] Shipment not found: ${shipmentId}`, shipmentErr?.message);
    result.errors.push(`Shipment not found: ${shipmentId}`);
    return result;
  }

  // Resolve user phone
  const { phone, notificationsEnabled } = await resolveUserPhone(shipment.user_id);

  if (!phone) {
    console.warn(`[WhatsApp] No phone found for shipment ${shipmentId}`);
    return result;
  }

  if (!notificationsEnabled) {
    console.log(`[WhatsApp] Skipping for ${phone} — notifications disabled`);
    return result;
  }

  const message = renderStatusMessage({
    trackingNumber: shipment.tracking_number || shipmentId,
    recipientName: shipment.recipient_name,
    shipmentType: shipment.shipment_type as 'medicine' | 'document' | 'gift',
    status: newStatus as ShipmentStatus,
    destinationCountry: shipment.destination_country,
    timestamp: new Date().toLocaleString('en-IN'),
  });

  const sendResult = await sendWhatsAppMessage(phone, message);
  result.userWhatsAppSent = sendResult.success;

  if (!sendResult.success) {
    console.error(`[WhatsApp] Status notification failed:`, sendResult.error);
    result.errors.push(`WhatsApp send failed: ${sendResult.error}`);
  } else {
    console.log(`[WhatsApp] Status notification sent to ${phone}`);
  }

  return result;
}

/**
 * Dispatches a WhatsApp notification for an invoice.
 * Mirrors the email dispatcher pattern — fire-and-forget, never throws.
 */
export async function dispatchInvoiceWhatsApp(
  shipmentId: string,
  invoiceId: string
): Promise<WhatsAppNotificationResult> {
  const result: WhatsAppNotificationResult = { userWhatsAppSent: false, errors: [] };

  console.log(`[WhatsApp] Dispatching invoice notification for shipment=${shipmentId}, invoice=${invoiceId}`);

  // Fetch shipment
  const { data: shipment, error: shipmentErr } = await supabaseServer
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .single();

  if (shipmentErr || !shipment) {
    result.errors.push(`Shipment not found: ${shipmentId}`);
    return result;
  }

  // Fetch invoice
  const { data: invoice, error: invoiceErr } = await supabaseServer
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (invoiceErr || !invoice) {
    result.errors.push(`Invoice not found: ${invoiceId}`);
    return result;
  }

  // Resolve user phone
  const { phone, notificationsEnabled } = await resolveUserPhone(shipment.user_id);

  if (!phone || !notificationsEnabled) return result;

  const message = renderInvoiceMessage({
    invoiceNumber: invoice.invoice_number,
    trackingNumber: shipment.tracking_number || shipmentId,
    recipientName: shipment.recipient_name,
    shipmentType: shipment.shipment_type as 'medicine' | 'document' | 'gift',
    subtotal: invoice.amount,
    gstAmount: invoice.gst_amount,
    totalAmount: invoice.total_amount,
    paymentStatus: invoice.status,
  });

  const sendResult = await sendWhatsAppMessage(phone, message);
  result.userWhatsAppSent = sendResult.success;

  if (!sendResult.success) {
    result.errors.push(`WhatsApp send failed: ${sendResult.error}`);
  }

  return result;
}
