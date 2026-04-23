import { NextRequest, NextResponse } from 'next/server';

const SANDBOX_BASE = 'https://api.sandbox.co.in';

async function getSandboxToken(): Promise<string> {
  const res = await fetch(`${SANDBOX_BASE}/authenticate`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.SANDBOX_API_KEY!,
      'x-api-secret': process.env.SANDBOX_API_SECRET!,
    },
  });
  const data = await res.json();
  if (!res.ok || !data?.data?.access_token) {
    throw new Error(data?.message || 'Failed to authenticate with Sandbox');
  }
  return data.data.access_token;
}

/**
 * POST /api/cxbc/aadhaar-otp/verify
 * Body: { referenceId: string, otp: string }
 * Verifies OTP and returns verified Aadhaar details.
 */
export async function POST(req: NextRequest) {
  try {
    const { referenceId, otp } = await req.json();

    if (!referenceId || !otp) {
      return NextResponse.json({ error: 'Missing referenceId or OTP' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'OTP must be 6 digits' }, { status: 400 });
    }

    const apiKey = process.env.SANDBOX_API_KEY;
    const apiSecret = process.env.SANDBOX_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Aadhaar verification service not configured.' }, { status: 500 });
    }

    const token = await getSandboxToken();

    const res = await fetch(`${SANDBOX_BASE}/kyc/aadhaar/okyc/otp/verify`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.request',
        reference_id: referenceId,
        otp,
      }),
    });

    const data = await res.json();
    console.log('[aadhaar-otp/verify]', res.status, JSON.stringify(data).slice(0, 300));

    if (!res.ok || data?.code !== 200) {
      const msg = data?.message || data?.error || 'OTP verification failed';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const kycData = data.data;
    const addr = kycData?.address || {};
    const fullAddress = [
      addr.house, addr.street, addr.landmark,
      addr.vtc, addr.subdist, addr.dist,
      addr.state, addr.pincode,
    ].filter(Boolean).join(', ');

    return NextResponse.json({
      success: true,
      verifiedName: kycData?.name || '',
      dob: kycData?.dob || '',
      gender: kycData?.gender || '',
      address: fullAddress,
      pincode: addr?.pincode || '',
      state: addr?.state || '',
      maskedAadhaar: kycData?.maskedNumber || '',
    });
  } catch (err: any) {
    console.error('[aadhaar-otp/verify]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
