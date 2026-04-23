import { NextResponse } from 'next/server';

/**
 * POST /api/cxbc/aadhaar-otp/send
 *
 * Cashfree discontinued the OKYC (Aadhaar OTP) endpoint in 2024.
 * This route now returns a clear error directing clients to use DigiLocker instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Aadhaar OTP verification is no longer available. Please use DigiLocker verification instead.',
      code: 'OKYC_DEPRECATED',
    },
    { status: 410 },
  );
}
