import { NextRequest, NextResponse } from 'next/server';
import { CASHFREE_VERIFICATION_BASE } from '@/lib/wallet/cashfreeConfig';

/**
 * POST /api/kyc/guest-digilocker
 * Guest DigiLocker flow — creates a consent URL.
 * Body: { docType: 'aadhaar'|'pan'|'driving_license', aadhaarNumber?: string, sessionId: string }
 *
 * GET /api/kyc/guest-digilocker?verification_id=xxx&docType=pan
 * Fetches verification status + document after redirect.
 */

// DigiLocker only supports these 3 document types
const DL_DOC_MAP: Record<string, string> = {
  aadhaar:         'AADHAAR',
  pan:             'PAN',
  driving_license: 'DRIVING_LICENSE',
};

const cfHeaders = () => ({
  'Content-Type': 'application/json',
  'x-client-id': process.env.CASHFREE_KYC_CLIENT_ID?.trim() || '',
  'x-client-secret': process.env.CASHFREE_KYC_CLIENT_SECRET?.trim() || '',
});

export async function POST(request: NextRequest) {
  try {
    const appId = process.env.CASHFREE_KYC_CLIENT_ID?.trim();
    const secretKey = process.env.CASHFREE_KYC_CLIENT_SECRET?.trim();
    if (!appId || !secretKey) return NextResponse.json({ error: 'KYC service not configured' }, { status: 500 });

    const { docType = 'aadhaar', aadhaarNumber, sessionId } = await request.json();

    const dlDoc = DL_DOC_MAP[docType];
    if (!dlDoc) return NextResponse.json({ error: `DigiLocker does not support ${docType}. Use Aadhaar, PAN, or Driving License.` }, { status: 400 });

    // Aadhaar number only needed for verify-account check
    if (docType === 'aadhaar' && (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber))) {
      return NextResponse.json({ error: 'Invalid Aadhaar number' }, { status: 400 });
    }

    const verificationId = `guest_${sessionId?.slice(0, 8) || Date.now().toString(36)}_${Date.now()}`;
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/public/book?kyc_callback=1`;
    const headers = cfHeaders();

    // Check if DigiLocker account exists (Aadhaar only)
    let userFlow = 'signup';
    if (docType === 'aadhaar' && aadhaarNumber) {
      try {
        const verifyRes = await fetch(`${CASHFREE_VERIFICATION_BASE}/digilocker/verify-account`, {
          method: 'POST', headers,
          body: JSON.stringify({ verification_id: `${verificationId.slice(0, 45)}_v`, aadhaar_number: aadhaarNumber }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData?.status === 'ACCOUNT_EXISTS') userFlow = 'signin';
      } catch { /* best-effort */ }
    }

    const urlRes = await fetch(`${CASHFREE_VERIFICATION_BASE}/digilocker`, {
      method: 'POST', headers,
      body: JSON.stringify({
        verification_id: verificationId,
        document_requested: [dlDoc],
        redirect_url: redirectUrl,
        user_flow: userFlow,
      }),
    });

    const urlData = await urlRes.json();
    if (!urlRes.ok || !urlData?.url) {
      return NextResponse.json({ error: urlData?.message || urlData?.error || `Cashfree error ${urlRes.status}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      digilockerUrl: urlData.url,
      verificationId: urlData.verification_id || verificationId,
      referenceId: urlData.reference_id,
      docType,
    });
  } catch (error) {
    console.error('[kyc/guest-digilocker] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const appId = process.env.CASHFREE_KYC_CLIENT_ID?.trim();
    const secretKey = process.env.CASHFREE_KYC_CLIENT_SECRET?.trim();
    if (!appId || !secretKey) return NextResponse.json({ error: 'KYC service not configured' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const verificationId = searchParams.get('verification_id');
    const referenceId = searchParams.get('reference_id');
    const docType = searchParams.get('docType') || 'aadhaar';

    if (!verificationId && !referenceId) return NextResponse.json({ error: 'Missing verification_id or reference_id' }, { status: 400 });

    const headers = cfHeaders();
    const statusParam = referenceId ? `reference_id=${referenceId}` : `verification_id=${verificationId}`;

    const statusRes = await fetch(`${CASHFREE_VERIFICATION_BASE}/digilocker?${statusParam}`, { headers });
    const statusData = await statusRes.json();

    if (statusData?.status !== 'AUTHENTICATED') {
      return NextResponse.json({ verified: false, status: statusData?.status || 'PENDING' });
    }

    const dlDoc = DL_DOC_MAP[docType] || 'AADHAAR';
    const refId = statusData.reference_id || referenceId;

    const docRes = await fetch(`${CASHFREE_VERIFICATION_BASE}/digilocker/document/${dlDoc}?reference_id=${refId}`, { headers });
    const docData = await docRes.json();

    if (!docRes.ok || docData?.status !== 'SUCCESS') {
      return NextResponse.json({ verified: false, error: docData?.message || 'Failed to retrieve document' });
    }

    const addr = docData.split_address || {};
    const verifiedAddress = [addr.house, addr.street, addr.landmark, addr.vtc, addr.subdist, addr.dist, addr.state, addr.pincode].filter(Boolean).join(', ');

    return NextResponse.json({
      verified: true,
      verifiedName: docData.name || '',
      verifiedAddress,
      maskedAadhaar: docData.uid ? `XXXX XXXX ${String(docData.uid).slice(-4)}` : '',
      docType,
    });
  } catch (error) {
    console.error('[kyc/guest-digilocker] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
