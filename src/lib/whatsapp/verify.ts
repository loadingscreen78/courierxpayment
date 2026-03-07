import { getTwilioClient } from './client';

const PHONE_REGEX = /^\+\d{10,15}$/;

/**
 * Sends a WhatsApp OTP via Twilio Verify.
 * Phone must be in E.164 format (e.g. +91XXXXXXXXXX).
 */
export async function sendWhatsAppOtp(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  if (!PHONE_REGEX.test(phone)) {
    return { success: false, error: `Invalid phone number format: ${phone}. Use E.164 format (e.g. +91XXXXXXXXXX)` };
  }

  const serviceId = process.env.TWILIO_VERIFY_SERVICE_ID;
  if (!serviceId) {
    throw new Error('[WhatsApp] TWILIO_VERIFY_SERVICE_ID is not set. Add it to your .env.local file.');
  }

  try {
    const client = getTwilioClient();
    const verification = await client.verify.v2
      .services(serviceId)
      .verifications.create({
        to: phone,
        channel: 'whatsapp',
      });

    console.log(`[WhatsApp OTP] Sent to ${phone} - Status: ${verification.status}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[WhatsApp OTP] Failed to send to ${phone}:`, message);
    return { success: false, error: message };
  }
}

/**
 * Verifies a WhatsApp OTP code via Twilio Verify.
 * Returns success if the code is valid, failure otherwise.
 */
export async function verifyWhatsAppOtp(
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (!PHONE_REGEX.test(phone)) {
    return { success: false, error: `Invalid phone number format: ${phone}` };
  }

  if (!code || code.length !== 6) {
    return { success: false, error: 'OTP code must be 6 digits' };
  }

  const serviceId = process.env.TWILIO_VERIFY_SERVICE_ID;
  if (!serviceId) {
    throw new Error('[WhatsApp] TWILIO_VERIFY_SERVICE_ID is not set.');
  }

  try {
    const client = getTwilioClient();
    const check = await client.verify.v2
      .services(serviceId)
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (check.status === 'approved') {
      console.log(`[WhatsApp OTP] Verified for ${phone}`);
      return { success: true };
    }

    console.warn(`[WhatsApp OTP] Verification failed for ${phone}: ${check.status}`);
    return { success: false, error: `Verification failed: ${check.status}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[WhatsApp OTP] Verification error for ${phone}:`, message);
    return { success: false, error: message };
  }
}
