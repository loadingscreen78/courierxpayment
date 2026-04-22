import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const PASSPHRASE = process.env.DEV_ACCESS_PASSPHRASE || '';
const PORTAL_KEY = process.env.DEV_PORTAL_KEY || '';

function hashToken(passphrase: string, portalKey: string): string {
  return createHash('sha256')
    .update(`${passphrase}::${portalKey}::courierx-dev`)
    .digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { passphrase, portalKey } = await req.json();

    if (!PASSPHRASE || !PORTAL_KEY) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    if (passphrase !== PASSPHRASE || portalKey !== PORTAL_KEY) {
      return NextResponse.json({ error: 'Invalid passphrase' }, { status: 403 });
    }

    const token = hashToken(PASSPHRASE, PORTAL_KEY);
    const res = NextResponse.json({ success: true });

    res.cookies.set('cx_dev_access', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return res;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
