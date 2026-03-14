import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { renderAuthEmail } from '@/lib/email/templates/authEmail';

/**
 * Custom email handler for Supabase Auth using Resend
 * This endpoint is called by Supabase Auth when it needs to send emails
 */
export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      console.error('[Auth Email] Failed to parse request body');
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 200 });
    }

    console.log('[Auth Email] Received hook payload keys:', Object.keys(body || {}));

    // GoTrue hook format (Supabase auth hook):
    //   { user: { email, ... }, email_data: { token_hash, email_action_type, redirect_to, ... } }
    // Direct format (our own calls):
    //   { email, type, token_hash, redirect_to }
    let email: string = '';
    let type: string = '';
    let token_hash: string = '';
    let redirect_to: string | undefined;

    if (body?.email_data) {
      // GoTrue hook format
      email = body.user?.email || body.email || '';
      type = body.email_data?.email_action_type || body.email_data?.type || '';
      token_hash = body.email_data?.token_hash || body.email_data?.hashed_token || '';
      redirect_to = body.email_data?.redirect_to;
    } else {
      // Direct format
      email = body?.email || '';
      type = body?.type || '';
      token_hash = body?.token_hash || body?.hashed_token || '';
      redirect_to = body?.redirect_to;
    }

    console.log('[Auth Email] Parsed:', { email, type, hasToken: !!token_hash });

    if (!email || !type || !token_hash) {
      console.error('[Auth Email] Missing required fields:', { email: !!email, type: !!type, token_hash: !!token_hash });
      // Return 200 so Supabase doesn't block the auth action
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, type, token_hash' },
        { status: 200 }
      );
    }

    // Build confirmation URL
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.courierx.in';
    const siteUrl = process.env.SITE_URL || 'https://courierx.in';
    
    // Construct the confirmation URL based on type
    let confirmationUrl: string;
    
    switch (type) {
      case 'signup':
      case 'invite':
        confirmationUrl = `${baseUrl}/auth/v1/verify?token=${token_hash}&type=signup${redirect_to ? `&redirect_to=${encodeURIComponent(redirect_to)}` : ''}`;
        break;
      case 'recovery':
        confirmationUrl = `${siteUrl}/auth/reset-password?token_hash=${token_hash}&type=recovery`;
        break;
      case 'email_change':
        confirmationUrl = `${baseUrl}/auth/v1/verify?token=${token_hash}&type=email_change${redirect_to ? `&redirect_to=${encodeURIComponent(redirect_to)}` : ''}`;
        break;
      default:
        console.error('[Auth Email] Unsupported email type:', type);
        // Return 200 so Supabase doesn't block the auth action
        return NextResponse.json(
          { success: false, error: `Unsupported email type: ${type}` },
          { status: 200 }
        );
    }

    // Render email HTML
    const html = renderAuthEmail({
      type: type as 'signup' | 'recovery' | 'email_change' | 'invite',
      confirmationUrl,
      email,
    });

    // Get subject based on type
    const subjects = {
      signup: 'Verify your email - CourierX',
      recovery: 'Reset your password - CourierX',
      email_change: 'Confirm your email change - CourierX',
      invite: 'You\'ve been invited to CourierX',
    };

    // Send email via Resend
    const result = await sendEmail({
      to: email,
      subject: subjects[type as keyof typeof subjects] || 'CourierX Notification',
      html,
    });

    if (!result.success) {
      // Log the failure but return 200 so Supabase doesn't block the auth action.
      // Supabase will fall back to its own email sender if the hook returns non-2xx.
      console.error('[Auth Email] Failed to send via Resend:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 200 }
      );
    }

    console.log(`[Auth Email] Sent ${type} email to ${email} - ID: ${result.id}`);
    
    return NextResponse.json({
      success: true,
      messageId: result.id,
    });
  } catch (error: any) {
    // Always return 200 to prevent Supabase from blocking the auth action
    console.error('[Auth Email] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 200 }
    );
  }
}
