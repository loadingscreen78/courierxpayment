import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { CASHFREE_API_BASE, CASHFREE_API_VERSION } from '@/lib/wallet/cashfreeConfig';

/**
 * POST /api/kyc/verify-otp
 * Verifies the Aadhaar OTP via Cashfree and stores verified data in the user profile.
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

    const { otp, refId, aadhaarNumber } = await request.json();

    if (!otp || !refId || !aadhaarNumber) {
      return NextResponse.json({ error: 'Missing otp, refId, or aadhaarNumber' }, { status: 400 });
    }

    // Cashfree Aadhaar OTP verification
    const cfRes = await fetch(`${CASHFREE_API_BASE}/verification/offline-aadhaar/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify({ ref_id: refId, otp }),
    });

    const cfData = await cfRes.json();

    if (!cfRes.ok || cfData.status !== 'SUCCESS') {
      console.error('[kyc/verify-otp] Cashfree error:', cfData);
      const msg = cfData?.message || cfData?.error || 'OTP verification failed';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Extract verified data from Cashfree response
    const aadhaarData = cfData.aadhaar_data || {};
    const verifiedName: string = aadhaarData.name || '';
    const verifiedAddress: string = [
      aadhaarData.address?.house,
      aadhaarData.address?.street,
      aadhaarData.address?.landmark,
      aadhaarData.address?.loc,
      aadhaarData.address?.dist,
      aadhaarData.address?.state,
      aadhaarData.address?.pc,
    ]
      .filter(Boolean)
      .join(', ');

    const maskedAadhaar = `XXXX XXXX ${aadhaarNumber.slice(-4)}`;

    // Update profile with verified Aadhaar data
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        aadhaar_verified: true,
        aadhaar_address: verifiedAddress || null,
        kyc_completed_at: new Date().toISOString(),
        // Store masked number only — never store full Aadhaar
        aadhaar_last4: aadhaarNumber.slice(-4),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[kyc/verify-otp] Profile update error:', updateError);
      return NextResponse.json({ error: 'Failed to save KYC data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      verifiedName,
      verifiedAddress,
      maskedAadhaar,
    });
  } catch (error) {
    console.error('[kyc/verify-otp] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
