import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const PASSPHRASE = process.env.DEV_ACCESS_PASSPHRASE || '';

function hashToken(passphrase: string): string {
  return createHash('sha256')
    .update(`${passphrase}::courierx-dev-2026`)
    .digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { passphrase } = await req.json();

    if (!PASSPHRASE) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    if (passphrase !== PASSPHRASE) {
      return NextResponse.json({ error: 'Invalid passphrase' }, { status: 403 });
    }

    const token = hashToken(PASSPHRASE);
    const res = NextResponse.json({ success: true });

    res.cookies.set('cx_dev_access', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
