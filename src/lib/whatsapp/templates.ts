import { getStatusConfig, ShipmentStatus, formatCurrency } from '@/lib/email/templates/shared';

export interface StatusMessageData {
  trackingNumber: string;
  recipientName: string;
  shipmentType: 'medicine' | 'document' | 'gift';
  status: ShipmentStatus;
  destinationCountry: string;
  timestamp: string;
}

export interface InvoiceMessageData {
  invoiceNumber: string;
  trackingNumber: string;
  recipientName: string;
  shipmentType: 'medicine' | 'document' | 'gift';
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  paymentStatus: string;
}

/**
 * Renders a plain-text WhatsApp message for shipment status updates.
 */
export function renderStatusMessage(data: StatusMessageData): string {
  const config = getStatusConfig(data.status);

  return [
    `${config.icon} *CourierX Shipment Update*`,
    ``,
    `*Status:* ${config.label}`,
    `${config.message}`,
    ``,
    `📦 *Tracking:* ${data.trackingNumber}`,
    `👤 *Recipient:* ${data.recipientName}`,
    `📋 *Type:* ${data.shipmentType}`,
    `🌍 *Destination:* ${data.destinationCountry}`,
    `🕐 *Updated:* ${data.timestamp}`,
    ``,
    `Need help? Contact support@courierx.com`,
  ].join('\n');
}

/**
 * Renders a plain-text WhatsApp message for invoice notifications.
 */
export function renderInvoiceMessage(data: InvoiceMessageData): string {
  return [
    `🧾 *CourierX Invoice*`,
    ``,
    `*Invoice:* ${data.invoiceNumber}`,
    `📦 *Tracking:* ${data.trackingNumber}`,
    `👤 *Recipient:* ${data.recipientName}`,
    `📋 *Type:* ${data.shipmentType}`,
    ``,
    `💰 *Subtotal:* ${formatCurrency(data.subtotal)}`,
    `📊 *GST:* ${formatCurrency(data.gstAmount)}`,
    `✅ *Total:* ${formatCurrency(data.totalAmount)}`,
    `📌 *Payment:* ${data.paymentStatus}`,
    ``,
    `Need help? Contact support@courierx.com`,
  ].join('\n');
}
