/**
 * FAST2SMS OTP Client
 * Uses the OTP route which sends "Your OTP: {value}" without DLT registration.
 * Env: FAST2SMS_API_KEY
 */

const FAST2SMS_API = 'https://www.fast2sms.com/dev/bulkV2';
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP store (per serverless invocation this resets,
// but Vercel keeps warm instances alive for a few minutes which covers the OTP window)
const otpStore = new Map<string, OtpEntry>();

/** Generate a random 6-digit numeric OTP */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Strip +91 prefix and return 10-digit Indian number for FAST2SMS */
function toLocalNumber(phone: string): string {
  // E.164: +91XXXXXXXXXX → XXXXXXXXXX
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Send OTP via FAST2SMS OTP route.
 * Phone must be E.164 format (e.g. +91XXXXXXXXXX).
 */
export async function sendOtp(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'FAST2SMS_API_KEY is not configured' };
  }

  const otp = generateOtp();
  const localNumber = toLocalNumber(phone);

  try {
    const res = await fetch(FAST2SMS_API, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*',
        'cache-control': 'no-cache',
      },
      body: JSON.stringify({
        variables_values: otp,
        route: 'otp',
        numbers: localNumber,
      }),
    });

    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[FAST2SMS] Non-JSON response:', text);
      return { success: false, error: 'Unexpected response from SMS provider' };
    }

    if (!res.ok || data.return === false) {
      const msg = Array.isArray(data.message) ? data.message[0] : (data.message as string);
      console.error('[FAST2SMS] Send failed:', JSON.stringify(data));
      return { success: false, error: msg || `SMS send failed (HTTP ${res.status})` };
    }

    // Store OTP for verification
    otpStore.set(phone, {
      code: otp,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      attempts: 0,
    });

    console.log(`[FAST2SMS] OTP sent to ${localNumber} - Request ID: ${data.request_id || 'N/A'}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[FAST2SMS] Error sending OTP:', message);
    return { success: false, error: message };
  }
}

/**
 * Verify OTP code against the stored value.
 */
export function verifyOtp(
  phone: string,
  code: string
): { success: boolean; error?: string } {
  const entry = otpStore.get(phone);

  if (!entry) {
    return { success: false, error: 'No OTP found for this number. Please request a new one.' };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return { success: false, error: 'OTP has expired. Please request a new one.' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(phone);
    return { success: false, error: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (entry.code !== code) {
    entry.attempts += 1;
    return { success: false, error: 'Invalid OTP. Please try again.' };
  }

  // Success — clean up
  otpStore.delete(phone);
  return { success: true };
}
