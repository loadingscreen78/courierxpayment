import { NextRequest, NextResponse } from 'next/server';
import { CASHFREE_VERIFICATION_BASE } from '@/lib/wallet/cashfreeConfig';

/**
 * POST /api/cxbc/digilocker/initiate
 * Creates a DigiLocker consent URL for CXBC partner Aadhaar verification.
 * No auth required — called during onboarding before account exists.
 * Returns: { digilockerUrl, verificationId, referenceId }
 */
export async function POST(req: NextRequest) {
  try {
    const appId = process.env.CASHFREE_KYC_CLIENT_ID?.trim();
    const secretKey = process.env.CASHFREE_KYC_CLIENT_SECRET?.trim();

    if (!appId || !secretKey) {
      return NextResponse.json({ error: 'KYC service not configured.' }, { status: 500 });
    }

    const verificationId = `cxbc_dl_${Date.now()}`;
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cxbc/apply?kyc=digilocker&vid=${verificationId}`;

    const cfHeaders = {
      'Content-Type': 'application/json',
      'x-client-id': appId,
      'x-client-secret': secretKey,
    };

    // Create DigiLocker consent URL
    const res = await fetch(`${CASHFREE_VERIFICATION_BASE}/digilocker`, {
      method: 'POST',
      headers: cfHeaders,
      body: JSON.stringify({
        verification_id: verificationId,
        document_requested: ['AADHAAR'],
        redirect_url: redirectUrl,
        user_flow: 'signup',
      }),
    });

    const data = await res.json();
    console.log('[cxbc/digilocker/initiate]', res.status, JSON.stringify(data).slice(0, 300));

    if (!res.ok || !data?.url) {
      const msg = data?.message || data?.error || `Cashfree error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      digilockerUrl: data.url,
      verificationId: data.verification_id || verificationId,
      referenceId: data.reference_id,
    });
  } catch (err: any) {
    console.error('[cxbc/digilocker/initiate]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
