import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const PASSPHRASE = process.env.DEV_ACCESS_PASSPHRASE || '';
const PORTAL_KEY = process.env.DEV_PORTAL_KEY || '';

function getExpectedToken(): string {
  if (!PASSPHRASE || !PORTAL_KEY) return '';
  return createHash('sha256')
    .update(`${PASSPHRASE}::${PORTAL_KEY}::courierx-dev`)
    .digest('hex');
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('cx_dev_access')?.value;
  const expected = getExpectedToken();
  const valid = !!token && !!expected && token === expected;
  return NextResponse.json({ valid });
}
