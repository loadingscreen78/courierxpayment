import { getTwilioClient } from './client';

export interface WhatsAppResult {
  success: boolean;
  sid?: string;
  error?: string;
}

const PHONE_REGEX = /^\+?\d{10,15}$/;

/**
 * Sends a WhatsApp message via Twilio.
 * Phone number is automatically formatted as `whatsapp:+<number>`.
 * Uses the Twilio WhatsApp Sandbox number by default.
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<WhatsAppResult> {
  // Strip spaces/dashes and validate
  const cleaned = phone.replace(/[\s\-()]/g, '');

  if (!PHONE_REGEX.test(cleaned)) {
    console.error(`[WhatsApp] Invalid phone number: ${phone}`);
    return { success: false, error: `Invalid phone number: ${phone}` };
  }

  // Ensure leading +
  const normalized = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  const to = `whatsapp:${normalized}`;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  try {
    const client = getTwilioClient();
    const result = await client.messages.create({
      body: message,
      from,
      to,
    });

    console.log(`[WhatsApp] Sent to ${to} - SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (err: unknown) {
    const message_ = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[WhatsApp] Failed to send to ${to}: ${message_}`);
    return { success: false, error: message_ };
  }
}
