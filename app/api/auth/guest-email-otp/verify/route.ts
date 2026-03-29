import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const OTP_SECRET = process.env.RESEND_API_KEY || 'fallback-otp-secret-key';

function generateOtpHash(email: string, otp: string, expiresAt: number): string {
  const payload = `${email.toLowerCase()}:${otp}:${expiresAt}`;
  return crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { email, otp, otpToken } = await request.json();

    if (!email || !otp || !otpToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    if (!/^\d{6}$/.test(normalizedOtp)) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    // Parse the token
    const lastColon = otpToken.lastIndexOf(':');
    if (lastColon === -1) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
    }

    const hash = otpToken.substring(0, lastColon);
    const expiresAt = parseInt(otpToken.substring(lastColon + 1), 10);

    // Check expiry
    if (Date.now() > expiresAt) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // Verify the OTP by regenerating the hash
    const expectedHash = generateOtpHash(normalizedEmail, normalizedOtp, expiresAt);

    if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))) {
      return NextResponse.json({ error: 'Incorrect verification code. Please try again.' }, { status: 400 });
    }

    console.log(`[Guest OTP] Verified successfully for ${normalizedEmail}`);
    return NextResponse.json({ success: true, verified: true });

  } catch (err: any) {
    console.error('[Guest OTP] Verify error:', err?.message);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
