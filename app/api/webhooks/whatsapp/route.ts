import { NextRequest, NextResponse } from 'next/server';

/**
 * Twilio WhatsApp incoming message webhook.
 * Receives messages from Twilio, logs them, and responds with TwiML.
 *
 * Configure in Twilio Console → Sandbox → "When a message comes in":
 *   https://<your-domain>/api/webhooks/whatsapp
 *
 * For local testing with ngrok:
 *   ngrok http 8080
 *   Then set webhook URL to: https://<ngrok-id>.ngrok-free.app/api/webhooks/whatsapp
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = formData.get('Body')?.toString() || '';
    const from = formData.get('From')?.toString() || '';

    console.log(`[WhatsApp Webhook] From: ${from}, Body: ${body}`);

    // Respond with TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Message received successfully.</Message>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Message received successfully.</Message>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
