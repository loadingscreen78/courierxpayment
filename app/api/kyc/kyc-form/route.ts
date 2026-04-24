import { NextRequest, NextResponse } from 'next/server';
import { CASHFREE_VERIFICATION_DIRECT } from '@/lib/wallet/cashfreeConfig';

// Cashfree KYC Link template names per document type
const TEMPLATE_MAP: Record<string, string> = {
  aadhaar:  'Aadhaar_verification',
  pan:      'PAN_verification',
  passport: 'Passport_verification',
  voter_id: 'VoterID_verification',
};

/**
 * POST /api/kyc/kyc-form
 * Generates a Cashfree hosted KYC verification form link.
 * Body: { docType, phone, name, email? }
 *
 * GET /api/kyc/kyc-form?verification_id=xxx
 * Polls form status.
 */
export async function POST(request: NextRequest) {
  try {
    const appId = process.env.CASHFREE_KYC_CLIENT_ID?.trim();
    const secretKey = process.env.CASHFREE_KYC_CLIENT_SECRET?.trim();
    if (!appId || !secretKey) return NextResponse.json({ error: 'KYC service not configured' }, { status: 500 });

    const { docType, phone, name, email } = await request.json();

    if (!docType || !TEMPLATE_MAP[docType]) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }
    if (!phone || !/^\d{10}$/.test(phone.replace(/^\+91/, ''))) {
      return NextResponse.json({ error: 'Valid 10-digit phone number required' }, { status: 400 });
    }

    const verificationId = `kycform_${docType}_${Date.now()}`;
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0]; // 30 min

    const res = await fetch(`${CASHFREE_VERIFICATION_DIRECT}/form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify({
        phone: phone.replace(/^\+91/, '').slice(-10),
        template_name: TEMPLATE_MAP[docType],
        verification_id: verificationId,
        name: name || 'User',
        email: email || '',
        link_expiry: expiry,
        notification_types: ['sms'],
      }),
    });

    const data = await res.json();
    console.log('[kyc-form] create response:', res.status, data);

    if (!res.ok || !data?.form_link) {
      const msg = data?.message || data?.error || `Cashfree error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      formLink: data.form_link,
      verificationId: data.verification_id || verificationId,
      referenceId: data.reference_id,
    });
  } catch (error) {
    console.error('[kyc-form] POST error:', error);
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
    if (!verificationId) return NextResponse.json({ error: 'Missing verification_id' }, { status: 400 });

    const res = await fetch(`${CASHFREE_VERIFICATION_DIRECT}/form/${verificationId}`, {
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
    });
    const data = await res.json();
    console.log('[kyc-form] status response:', res.status, data);

    const verified = data?.form_status === 'SUCCESS' ||
      data?.verification_details?.some((d: any) => d.status === 'SUCCESS');

    const detail = data?.verification_details?.[0] || {};

    return NextResponse.json({
      verified,
      formStatus: data?.form_status,
      verifiedName: detail?.name || data?.name || '',
      docType: detail?.type || '',
    });
  } catch (error) {
    console.error('[kyc-form] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
