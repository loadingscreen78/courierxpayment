import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const PASSPHRASE = process.env.DEV_ACCESS_PASSPHRASE || '';

function getExpectedToken(): string {
  if (!PASSPHRASE) return '';
  return createHash('sha256')
    .update(`${PASSPHRASE}::courierx-dev-2026`)
    .digest('hex');
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('cx_dev_access')?.value;
  const expected = getExpectedToken();
  const valid = !!token && !!expected && token === expected;
  return NextResponse.json({ valid });
}
