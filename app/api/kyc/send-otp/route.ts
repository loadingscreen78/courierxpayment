import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { CASHFREE_API_BASE, CASHFREE_API_VERSION } from '@/lib/wallet/cashfreeConfig';

/**
 * POST /api/kyc/send-otp
 * Initiates Cashfree Aadhaar OTP verification.
 * Cashfree sends OTP to the mobile number linked to the Aadhaar via UIDAI.
 */
export async function POST(request: NextRequest) {
  try {
    const appId = process.env.CASHFREE_APP_ID?.trim();
    const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();

    if (!appId || !secretKey) {
      return NextResponse.json({ error: 'KYC service not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if already verified
    const { data: profile } = await supabase
      .from('profiles')
      .select('aadhaar_verified')
      .eq('id', user.id)
      .single();

    if (profile?.aadhaar_verified) {
      return NextResponse.json({ error: 'Aadhaar already verified' }, { status: 400 });
    }

    const { aadhaarNumber } = await request.json();

    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return NextResponse.json({ error: 'Invalid Aadhaar number' }, { status: 400 });
    }

    // Cashfree Aadhaar OTP initiation
    const cfRes = await fetch(`${CASHFREE_API_BASE}/verification/offline-aadhaar/otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify({ aadhaar_number: aadhaarNumber }),
    });

    const cfData = await cfRes.json();

    if (!cfRes.ok) {
      console.error('[kyc/send-otp] Cashfree error:', cfData);
      const msg = cfData?.message || cfData?.error || 'Failed to send OTP';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // ref_id is needed for OTP verification step
    return NextResponse.json({
      success: true,
      refId: cfData.ref_id,
      message: 'OTP sent to Aadhaar-linked mobile number',
    });
  } catch (error) {
    console.error('[kyc/send-otp] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
