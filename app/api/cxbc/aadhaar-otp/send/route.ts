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
 * POST /api/cxbc/aadhaar-otp/send
 * Body: { aadhaarNumber: string }
 * Sends OTP to the Aadhaar-linked mobile via sandbox.co.in OKYC API.
 * Returns: { referenceId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { aadhaarNumber } = await req.json();

    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return NextResponse.json({ error: 'Invalid Aadhaar number. Must be 12 digits.' }, { status: 400 });
    }

    const apiKey = process.env.SANDBOX_API_KEY;
    const apiSecret = process.env.SANDBOX_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Aadhaar verification service not configured.' }, { status: 500 });
    }

    const token = await getSandboxToken();

    const res = await fetch(`${SANDBOX_BASE}/kyc/aadhaar/okyc/otp`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request',
        aadhaar_number: aadhaarNumber,
        consent: 'Y',
        reason: 'CXBC Partner KYC verification for onboarding',
      }),
    });

    const data = await res.json();
    console.log('[aadhaar-otp/send]', res.status, JSON.stringify(data).slice(0, 200));

    if (!res.ok || data?.code !== 200) {
      const msg = data?.message || data?.error || 'Failed to send OTP';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      referenceId: data.data?.reference_id,
    });
  } catch (err: any) {
    console.error('[aadhaar-otp/send]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
