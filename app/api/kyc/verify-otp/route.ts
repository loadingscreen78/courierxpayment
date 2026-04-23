import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { CASHFREE_VERIFICATION_BASE } from '@/lib/wallet/cashfreeConfig';
import crypto from 'crypto';

/**
 * POST /api/kyc/verify-otp
 * After DigiLocker redirect, fetch the verified Aadhaar document and store in profile.
 * Body: { referenceId: number, verificationId: string, aadhaarNumber: string }
 */
export async function POST(request: NextRequest) {
  try {
    const appId = process.env.CASHFREE_KYC_CLIENT_ID?.trim();
    const secretKey = process.env.CASHFREE_KYC_CLIENT_SECRET?.trim();

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

    const { referenceId, verificationId, aadhaarNumber } = await request.json();

    if (!referenceId && !verificationId) {
      return NextResponse.json({ error: 'Missing referenceId or verificationId' }, { status: 400 });
    }

    const cfHeaders = {
      'Content-Type': 'application/json',
      'x-client-id': appId,
      'x-client-secret': secretKey,
    };

    // Check verification status first
    const statusParams = referenceId
      ? `reference_id=${referenceId}`
      : `verification_id=${verificationId}`;

    const statusRes = await fetch(
      `${CASHFREE_VERIFICATION_BASE}/digilocker?${statusParams}`,
      { headers: cfHeaders },
    );
    const statusData = await statusRes.json();
    console.log('[kyc/verify-otp] status response:', statusRes.status, JSON.stringify(statusData).slice(0, 200));

    if (statusData?.status !== 'AUTHENTICATED') {
      const msg =
        statusData?.status === 'CONSENT_DENIED'
          ? 'Consent was denied. Please try again and allow document access.'
          : statusData?.status === 'EXPIRED'
          ? 'Verification link expired. Please start again.'
          : 'Verification not completed yet. Please complete the DigiLocker flow.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Fetch Aadhaar document
    const docRes = await fetch(
      `${CASHFREE_VERIFICATION_BASE}/digilocker/document/AADHAAR?reference_id=${statusData.reference_id || referenceId}`,
      { headers: cfHeaders },
    );
    const docData = await docRes.json();

    if (!docRes.ok || docData?.status !== 'SUCCESS') {
      console.error('[kyc/verify-otp] Document fetch error:', docData);
      const msg = docData?.message || 'Failed to retrieve Aadhaar document';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const verifiedName: string = docData.name || '';
    const addr = docData.split_address || {};
    const verifiedAddress = [
      addr.house, addr.street, addr.landmark,
      addr.vtc, addr.subdist, addr.dist,
      addr.state, addr.pincode,
    ].filter(Boolean).join(', ');

    const last4 = aadhaarNumber ? aadhaarNumber.slice(-4) : (docData.uid?.slice(-4) || '');

    // Compute aadhaar_hash for uniqueness enforcement
    const aadhaarHash = aadhaarNumber
      ? crypto.createHash('sha256').update(aadhaarNumber).digest('hex')
      : null;

    // Double-check uniqueness before saving
    if (aadhaarHash) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('aadhaar_hash', aadhaarHash)
        .not('user_id', 'eq', user.id)
        .maybeSingle();

      if (existingProfile) {
        return NextResponse.json(
          { error: 'This Aadhaar number is already verified with another account.' },
          { status: 409 }
        );
      }
    }

    // Update profile — never store full Aadhaar
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        aadhaar_verified: true,
        kyc_verified: true,
        kyc_document_type: 'aadhaar',
        kyc_verified_name: verifiedName || null,
        aadhaar_address: verifiedAddress || null,
        kyc_completed_at: new Date().toISOString(),
        ...(aadhaarHash ? { aadhaar_hash: aadhaarHash } : {}),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[kyc/verify-otp] Profile update error:', updateError);
      return NextResponse.json({ error: 'Failed to save KYC data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      verifiedName,
      verifiedAddress,
      maskedAadhaar: last4 ? `XXXX XXXX ${last4}` : undefined,
    });
  } catch (error) {
    console.error('[kyc/verify-otp] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
