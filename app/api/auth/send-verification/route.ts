import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/resend';
import { renderAuthEmail } from '@/lib/email/templates/authEmail';

/**
 * Send email verification link using Resend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId } = body;

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: email, userId' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Verification Email] Missing Supabase env vars');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Use resend (re-send confirmation) instead of generateLink to avoid
    // creating a duplicate user. This triggers Supabase to re-send the
    // confirmation email through the configured hook (our /api/auth/send-email).
    // But since we want to send it ourselves via Resend, we generate a magic link
    // for the existing user instead.
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (error || !data?.properties?.action_link) {
      console.error('[Verification Email] Failed to generate magic link:', error?.message);
      // Fall back: just send a plain "check your inbox" email without a link
      // The Supabase hook already sent the real confirmation email
      const html = renderAuthEmail({
        type: 'signup',
        confirmationUrl: `${process.env.SITE_URL || 'https://courierx.in'}/auth`,
        email,
      });

      await sendEmail({
        to: email,
        subject: 'Welcome to CourierX - Please verify your email',
        html,
      });

      return NextResponse.json({ success: true, fallback: true });
    }

    const confirmationUrl = data.properties.action_link;

    const html = renderAuthEmail({
      type: 'signup',
      confirmationUrl,
      email,
    });

    const result = await sendEmail({
      to: email,
      subject: 'Verify your email - CourierX',
      html,
    });

    if (!result.success) {
      console.error('[Verification Email] Resend failed:', result.error);
      // Don't return 500 — signup already succeeded
      return NextResponse.json({ success: false, error: result.error }, { status: 200 });
    }

    console.log(`[Verification Email] Sent to ${email} - ID: ${result.id}`);
    return NextResponse.json({ success: true, messageId: result.id });

  } catch (error: any) {
    console.error('[Verification Email] Unexpected error:', error?.message);
    // Don't block — signup already succeeded
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
