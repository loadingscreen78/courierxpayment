import Twilio from 'twilio';

let _client: ReturnType<typeof Twilio> | null = null;

/**
 * Returns a singleton Twilio client authenticated with account credentials.
 * Used exclusively by server-side WhatsApp messaging and Verify code.
 * Never import from client-side code.
 */
export function getTwilioClient() {
  if (_client) return _client;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid) {
    throw new Error(
      '[WhatsApp] TWILIO_ACCOUNT_SID is not set. Add it to your .env.local file.'
    );
  }

  if (!authToken) {
    throw new Error(
      '[WhatsApp] TWILIO_AUTH_TOKEN is not set. Add it to your .env.local file.'
    );
  }

  _client = Twilio(accountSid, authToken);
  return _client;
}
