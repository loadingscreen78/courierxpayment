import { NextRequest, NextResponse } from 'next/server';
import { CASHFREE_VERIFICATION_BASE } from '@/lib/wallet/cashfreeConfig';

/**
 * POST /api/cxbc/aadhaar-otp/verify
 * Verifies OTP via Cashfree Secure ID OKYC and returns verified Aadhaar details.
 * Body: { referenceId: string, otp: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { referenceId, otp } = await req.json();

    if (!referenceId || !otp) {
      return NextResponse.json({ error: 'Missing referenceId or OTP.' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'OTP must be 6 digits.' }, { status: 400 });
    }

    const appId = process.env.CASHFREE_KYC_CLIENT_ID?.trim();
    const secretKey = process.env.CASHFREE_KYC_CLIENT_SECRET?.trim();

    if (!appId || !secretKey) {
      return NextResponse.json({ error: 'Aadhaar verification service not configured.' }, { status: 500 });
    }

    const res = await fetch(`${CASHFREE_VERIFICATION_BASE}/aadhaar/okyc/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-12-01',
      },
      body: JSON.stringify({
        reference_id: referenceId,
        otp,
      }),
    });

    const data = await res.json();
    console.log('[cxbc/aadhaar-otp/verify]', res.status, JSON.stringify(data).slice(0, 400));

    if (!res.ok) {
      const msg = data?.message || data?.error || 'OTP verification failed.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Parse address from Cashfree response
    const addr = data?.address || data?.split_address || {};
    const fullAddress = [
      addr.house, addr.street, addr.landmark,
      addr.vtc, addr.subdist, addr.dist,
      addr.state, addr.pincode,
    ].filter(Boolean).join(', ');

    return NextResponse.json({
      success: true,
      verifiedName: data?.name || data?.full_name || '',
      dob: data?.dob || data?.date_of_birth || '',
      gender: data?.gender || '',
      address: fullAddress || data?.address_string || '',
      maskedAadhaar: data?.masked_aadhaar_number || data?.uid || '',
    });
  } catch (err: any) {
    console.error('[cxbc/aadhaar-otp/verify]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
