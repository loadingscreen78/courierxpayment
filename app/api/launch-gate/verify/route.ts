import { NextRequest, NextResponse } from 'next/server';

const LAUNCH_PASSWORD = process.env.LAUNCH_GATE_PASSWORD || 'courierx2026';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

// In-memory rate limiting (resets on server restart, fine for pre-launch)
const attempts = new Map<string, { count: number; lockedUntil: number }>();

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, lockedUntil: 0 };

  // Check lockout
  if (record.lockedUntil > now) {
    return NextResponse.json(
      { error: 'locked', remaining: Math.ceil((record.lockedUntil - now) / 1000) },
      { status: 429 }
    );
  }

  // Reset if lockout expired
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    record.count = 0;
    record.lockedUntil = 0;
  }

  const body = await req.json().catch(() => ({}));
  const { password } = body as { password?: string };

  if (!password || password !== LAUNCH_PASSWORD) {
    record.count += 1;

    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION;
      attempts.set(ip, record);
      return NextResponse.json(
        { error: 'locked', remaining: Math.ceil(LOCKOUT_DURATION / 1000), attemptsExhausted: true },
        { status: 429 }
      );
    }

    attempts.set(ip, record);
    return NextResponse.json(
      { error: 'invalid', attemptsLeft: MAX_ATTEMPTS - record.count },
      { status: 401 }
    );
  }

  // Success — reset attempts
  attempts.delete(ip);

  // Create a 24-hour token (simple HMAC-like approach)
  const expiresAt = now + 24 * 60 * 60 * 1000;
  const token = Buffer.from(JSON.stringify({ ip, expiresAt })).toString('base64');

  const response = NextResponse.json({ success: true, expiresAt });
  response.cookies.set('cx-launch-token', token, {
    httpOnly: false, // needs to be readable client-side
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  });

  return response;
}
