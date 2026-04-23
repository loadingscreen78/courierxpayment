import { NextRequest, NextResponse } from 'next/server';
import { CASHFREE_VERIFICATION_BASE } from '@/lib/wallet/cashfreeConfig';

/**
 * POST /api/cxbc/aadhaar-otp/send
 * Sends OTP to the Aadhaar-linked mobile via Cashfree Secure ID OKYC API.
 * Body: { aadhaarNumber: string }
 * Returns: { referenceId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { aadhaarNumber } = await req.json();

    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return NextResponse.json({ error: 'Invalid Aadhaar number. Must be 12 digits.' }, { status: 400 });
    }

    const appId = process.env.CASHFREE_KYC_CLIENT_ID?.trim();
    const secretKey = process.env.CASHFREE_KYC_CLIENT_SECRET?.trim();

    if (!appId || !secretKey) {
      return NextResponse.json({ error: 'Aadhaar verification service not configured.' }, { status: 500 });
    }

    const verificationId = `cxbc_aadhaar_${Date.now()}`;

    const res = await fetch(`${CASHFREE_VERIFICATION_BASE}/aadhaar/okyc/generate-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-12-01',
      },
      body: JSON.stringify({
        verification_id: verificationId,
        aadhaar_number: aadhaarNumber,
        consent: 'Y',
        reason: 'CXBC Partner KYC verification for onboarding',
      }),
    });

    const data = await res.json();
    console.log('[cxbc/aadhaar-otp/send]', res.status, JSON.stringify(data).slice(0, 300));

    if (!res.ok) {
      const msg = data?.message || data?.error || `Cashfree error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Cashfree returns reference_id to correlate the OTP verify call
    const referenceId = data?.reference_id ?? data?.referenceId ?? verificationId;

    return NextResponse.json({ success: true, referenceId });
  } catch (err: any) {
    console.error('[cxbc/aadhaar-otp/send]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
