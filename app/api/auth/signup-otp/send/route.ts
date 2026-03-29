import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { renderGuestOtpEmail } from '@/lib/email/templates/guestOtpEmail';
import crypto from 'crypto';

const OTP_SECRET = process.env.RESEND_API_KEY || 'fallback-otp-secret-key';
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateOtpHash(email: string, otp: string, expiresAt: number): string {
  const payload = `${email.toLowerCase()}:${otp}:${expiresAt}`;
  return crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    const hash = generateOtpHash(normalizedEmail, otp, expiresAt);

    // Send email via Resend
    const html = renderGuestOtpEmail({ otp, email: normalizedEmail });
    const result = await sendEmail({
      to: normalizedEmail,
      subject: `${otp} — Your CourierX Verification Code`,
      html,
    });

    if (!result.success) {
      console.error('[Signup OTP] Failed to send:', result.error);
      return NextResponse.json({ error: 'Failed to send verification email. Please try again.' }, { status: 500 });
    }

    console.log(`[Signup OTP] Sent to ${normalizedEmail} - ID: ${result.id}`);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      otpToken: `${hash}:${expiresAt}`,
    });
  } catch (err: any) {
    console.error('[Signup OTP] Error:', err?.message);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
