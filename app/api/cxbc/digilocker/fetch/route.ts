import { NextRequest, NextResponse } from 'next/server';
import { CASHFREE_VERIFICATION_BASE } from '@/lib/wallet/cashfreeConfig';

/**
 * POST /api/cxbc/digilocker/fetch
 * After DigiLocker redirect, checks status and fetches verified Aadhaar document.
 * Body: { verificationId: string, referenceId?: string }
 * Returns: { verifiedName, maskedAadhaar, address }
 */
export async function POST(req: NextRequest) {
  try {
    const { verificationId, referenceId } = await req.json();

    if (!verificationId && !referenceId) {
      return NextResponse.json({ error: 'Missing verificationId or referenceId.' }, { status: 400 });
    }

    const appId = process.env.CASHFREE_KYC_CLIENT_ID?.trim();
    const secretKey = process.env.CASHFREE_KYC_CLIENT_SECRET?.trim();

    if (!appId || !secretKey) {
      return NextResponse.json({ error: 'KYC service not configured.' }, { status: 500 });
    }

    const cfHeaders = {
      'Content-Type': 'application/json',
      'x-client-id': appId,
      'x-client-secret': secretKey,
    };

    // Check verification status
    const statusParam = referenceId
      ? `reference_id=${referenceId}`
      : `verification_id=${verificationId}`;

    const statusRes = await fetch(
      `${CASHFREE_VERIFICATION_BASE}/digilocker?${statusParam}`,
      { headers: cfHeaders },
    );
    const statusData = await statusRes.json();
    console.log('[cxbc/digilocker/fetch] status:', statusRes.status, JSON.stringify(statusData).slice(0, 200));

    if (statusData?.status === 'PENDING' || statusData?.status === 'INITIATED') {
      return NextResponse.json({ error: 'Verification not completed yet. Please complete the DigiLocker flow.' }, { status: 202 });
    }
    if (statusData?.status === 'CONSENT_DENIED') {
      return NextResponse.json({ error: 'Consent was denied. Please try again and allow document access.' }, { status: 400 });
    }
    if (statusData?.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Verification link expired. Please start again.' }, { status: 400 });
    }
    if (statusData?.status !== 'AUTHENTICATED') {
      return NextResponse.json({ error: 'Verification not completed yet. Please complete the DigiLocker flow.' }, { status: 202 });
    }

    // Fetch Aadhaar document
    const resolvedRef = statusData.reference_id || referenceId;
    const docRes = await fetch(
      `${CASHFREE_VERIFICATION_BASE}/digilocker/document/AADHAAR?reference_id=${resolvedRef}`,
      { headers: cfHeaders },
    );
    const docData = await docRes.json();
    console.log('[cxbc/digilocker/fetch] doc:', docRes.status, JSON.stringify(docData).slice(0, 300));

    if (!docRes.ok || docData?.status !== 'SUCCESS') {
      const msg = docData?.message || 'Failed to retrieve Aadhaar document.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const addr = docData.split_address || {};
    const fullAddress = [
      addr.house, addr.street, addr.landmark,
      addr.vtc, addr.subdist, addr.dist,
      addr.state, addr.pincode,
    ].filter(Boolean).join(', ');

    const last4 = docData.uid?.slice(-4) || '';

    return NextResponse.json({
      success: true,
      verifiedName: docData.name || '',
      maskedAadhaar: last4 ? `XXXX XXXX ${last4}` : '',
      address: fullAddress,
      dob: docData.dob || '',
      gender: docData.gender || '',
    });
  } catch (err: any) {
    console.error('[cxbc/digilocker/fetch]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
