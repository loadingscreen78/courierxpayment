import { Resend } from 'resend';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEnv = process.env.RESEND_FROM_EMAIL || '';

  if (!apiKey) {
    console.error('[Email] Missing RESEND_API_KEY environment variable');
    return { success: false, error: 'Missing RESEND_API_KEY configuration' };
  }

  // Use the configured from address (should be on a verified domain)
  const from = fromEnv || 'CourierX <notifications@update.courierx.in>';

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo && { reply_to: payload.replyTo }),
    });

    if (error) {
      console.error(`[Email] Failed to send to ${payload.to} - Subject: "${payload.subject}" - Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Sent to ${payload.to} - Subject: "${payload.subject}" - ID: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    console.error(`[Email] Failed to send to ${payload.to} - Subject: "${payload.subject}" - Error: ${message}`);
    return { success: false, error: message };
  }
}
