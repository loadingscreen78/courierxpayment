import { NextRequest, NextResponse } from 'next/server';

const SANDBOX_BASE = 'https://api.sandbox.co.in';

// Cache token in memory (valid 24h)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSandboxToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const apiKey = process.env.SANDBOX_API_KEY?.trim();
  const apiSecret = process.env.SANDBOX_API_SECRET?.trim();
  if (!apiKey || !apiSecret || apiSecret === 'your_sandbox_api_secret') {
    throw new Error('Sandbox API secret not configured. Add SANDBOX_API_SECRET to your .env file from app.sandbox.co.in → Settings → API Keys.');
  }

  const res = await fetch(`${SANDBOX_BASE}/authenticate`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'x-api-secret': apiSecret },
  });
  const data = await res.json();
  if (!res.ok || !data?.data?.access_token) {
    throw new Error(data?.message || 'Sandbox authentication failed');
  }
  cachedToken = { token: data.data.access_token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return cachedToken.token;
}

/**
 * POST /api/kyc/sandbox-otp
 * action=send  → sends OTP to Aadhaar-registered mobile
 * action=verify → verifies OTP, returns name/address
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.SANDBOX_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: 'Sandbox KYC not configured' }, { status: 500 });

    const body = await request.json();
    const { action, aadhaarNumber, referenceId, otp } = body;

    let token: string;
    try {
      token = await getSandboxToken();
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 503 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'Authorization': token, // NOT Bearer — raw token
    };

    // ── Send OTP ──────────────────────────────────────────────────────────────
    if (action === 'send') {
      if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
        return NextResponse.json({ error: 'Invalid Aadhaar number' }, { status: 400 });
      }

      const res = await fetch(`${SANDBOX_BASE}/kyc/aadhaar/okyc/otp`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request',
          aadhaar_number: aadhaarNumber,
          consent: 'Y',
          reason: 'Identity verification for courier shipment booking',
        }),
      });
      const data = await res.json();
      console.log('[sandbox-otp] send response:', res.status, JSON.stringify(data).slice(0, 200));

      if (!res.ok || data?.code !== 200) {
        const msg = data?.message || data?.error || 'Failed to send OTP';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        referenceId: String(data?.data?.reference_id || ''),
        message: 'OTP sent to Aadhaar-registered mobile number',
      });
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────
    if (action === 'verify') {
      if (!referenceId || !otp || !/^\d{6}$/.test(otp)) {
        return NextResponse.json({ error: 'Invalid OTP or reference ID' }, { status: 400 });
      }

      const res = await fetch(`${SANDBOX_BASE}/kyc/aadhaar/okyc/otp/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.request',
          reference_id: String(referenceId),
          otp: String(otp),
        }),
      });
      const data = await res.json();
      console.log('[sandbox-otp] verify response:', res.status, JSON.stringify(data).slice(0, 500));

      if (!res.ok || (data?.code !== 200 && data?.code !== 'OK')) {
        const msg = data?.message || data?.data?.message || data?.error || 'OTP verification failed';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      const kyc = data?.data || {};
      const addr = kyc?.address || kyc?.split_address || {};
      const verifiedAddress = [
        addr.house, addr.street, addr.landmark,
        addr.vtc, addr.subdist, addr.dist,
        addr.state, addr.pincode,
      ].filter(Boolean).join(', ');

      return NextResponse.json({
        success: true,
        verifiedName: kyc?.name || '',
        verifiedAddress,
        dob: kyc?.dob || '',
        gender: kyc?.gender || '',
        maskedAadhaar: aadhaarNumber ? `XXXX XXXX ${String(aadhaarNumber).slice(-4)}` : '',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[sandbox-otp] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
