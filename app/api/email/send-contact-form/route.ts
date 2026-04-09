import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { renderContactFormEmail } from '@/lib/email/templates/contactFormEmail';

const CONTACT_EMAIL = 'courierx.in@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, reason, message } = body;

    // Validation
    if (!firstName || !lastName || !email || !reason || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }

    console.log(`[Contact Form] New submission from ${email}`);

    // Render email template
    const html = renderContactFormEmail({
      firstName,
      lastName,
      email,
      phone,
      reason,
      message,
    });

    // Send email to company
    const result = await sendEmail({
      to: CONTACT_EMAIL,
      subject: `New Contact Form: ${reason} - ${firstName} ${lastName}`,
      html,
      replyTo: email,
    });

    if (!result.success) {
      console.error('[Contact Form] Failed to send:', result.error);
      return NextResponse.json(
        { success: false, error: 'Failed to send message. Please try again.' },
        { status: 500 },
      );
    }

    console.log(`[Contact Form] Email sent successfully - ID: ${result.id}`);

    return NextResponse.json({
      success: true,
      messageId: result.id,
      message: 'Your message has been sent successfully!',
    });
  } catch (error) {
    console.error('[Contact Form] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
