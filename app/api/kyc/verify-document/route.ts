import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { CASHFREE_VERIFICATION_DIRECT } from '@/lib/wallet/cashfreeConfig';
import crypto from 'crypto';

type DocType = 'pan' | 'passport' | 'voter_id';

interface VerifyDocBody {
  docType: DocType;
  // PAN
  pan?: string;
  name?: string;
  // Passport
  passportNumber?: string;
  dob?: string; // YYYY-MM-DD
  // Voter ID
  voterId?: string;
}

function hashValue(val: string) {
  return crypto.createHash('sha256').update(val.toUpperCase().trim()).digest('hex');
}

/**
 * POST /api/kyc/verify-document
 * Verifies PAN, Passport, or Voter ID via Cashfree Secure ID.
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

    // Check if already KYC verified
    const { data: profile } = await supabase
      .from('profiles')
      .select('kyc_verified, aadhaar_verified')
      .eq('user_id', user.id)
      .single();

    if (profile?.kyc_verified || profile?.aadhaar_verified) {
      return NextResponse.json({ error: 'KYC already completed' }, { status: 400 });
    }

    const body: VerifyDocBody = await request.json();
    const { docType } = body;

    const cfHeaders = {
      'Content-Type': 'application/json',
      'x-client-id': appId,
      'x-client-secret': secretKey,
    };

    const verificationId = `kyc_${docType}_${user.id.slice(0, 8)}_${Date.now()}`;

    if (docType === 'pan') {
      const pan = body.pan?.toUpperCase().trim();
      if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
        return NextResponse.json({ error: 'Invalid PAN format' }, { status: 400 });
      }

      // Uniqueness check
      const panHash = hashValue(pan);
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('pan_number_hash', panHash)
        .not('user_id', 'eq', user.id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'This PAN is already linked to another account.' }, { status: 409 });
      }

      const res = await fetch(`${CASHFREE_VERIFICATION_DIRECT}/pan`, {
        method: 'POST',
        headers: cfHeaders,
        body: JSON.stringify({ pan, verification_id: verificationId, name: body.name || '' }),
      });
      const data = await res.json();
      console.log('[kyc/verify-document] PAN response:', res.status, data);

      if (!res.ok || data?.valid !== true) {
        const msg = data?.message || data?.error || 'PAN verification failed';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      await supabase.from('profiles').update({
        kyc_verified: true,
        kyc_document_type: 'pan',
        kyc_verified_name: data.name_as_per_pan || data.name || '',
        pan_number_hash: panHash,
        kyc_completed_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        verifiedName: data.name_as_per_pan || data.name || '',
        docType: 'pan',
      });
    }

    if (docType === 'passport') {
      const passportNumber = body.passportNumber?.toUpperCase().trim();
      const dob = body.dob?.trim();
      if (!passportNumber || !/^[A-Z][0-9]{7}$/.test(passportNumber)) {
        return NextResponse.json({ error: 'Invalid passport number format (e.g. A1234567)' }, { status: 400 });
      }
      if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        return NextResponse.json({ error: 'Date of birth required (YYYY-MM-DD)' }, { status: 400 });
      }

      const passportHash = hashValue(passportNumber);
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('passport_number_hash', passportHash)
        .not('user_id', 'eq', user.id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'This passport is already linked to another account.' }, { status: 409 });
      }

      const res = await fetch(`${CASHFREE_VERIFICATION_DIRECT}/passport`, {
        method: 'POST',
        headers: cfHeaders,
        body: JSON.stringify({
          passport_number: passportNumber,
          dob,
          verification_id: verificationId,
        }),
      });
      const data = await res.json();
      console.log('[kyc/verify-document] Passport response:', res.status, data);

      if (!res.ok || (data?.status !== 'SUCCESS' && data?.valid !== true)) {
        const msg = data?.message || data?.error || 'Passport verification failed';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      await supabase.from('profiles').update({
        kyc_verified: true,
        kyc_document_type: 'passport',
        kyc_verified_name: data.name || '',
        passport_number_hash: passportHash,
        kyc_completed_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        verifiedName: data.name || '',
        docType: 'passport',
      });
    }

    if (docType === 'voter_id') {
      const voterId = body.voterId?.toUpperCase().trim();
      if (!voterId || voterId.length < 6) {
        return NextResponse.json({ error: 'Invalid Voter ID (EPIC number)' }, { status: 400 });
      }

      const voterHash = hashValue(voterId);
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('voter_id_hash', voterHash)
        .not('user_id', 'eq', user.id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'This Voter ID is already linked to another account.' }, { status: 409 });
      }

      const res = await fetch(`${CASHFREE_VERIFICATION_DIRECT}/voter-id`, {
        method: 'POST',
        headers: cfHeaders,
        body: JSON.stringify({ voter_id: voterId, verification_id: verificationId }),
      });
      const data = await res.json();
      console.log('[kyc/verify-document] Voter ID response:', res.status, data);

      if (!res.ok || (data?.status !== 'SUCCESS' && data?.valid !== true)) {
        const msg = data?.message || data?.error || 'Voter ID verification failed';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      await supabase.from('profiles').update({
        kyc_verified: true,
        kyc_document_type: 'voter_id',
        kyc_verified_name: data.name || '',
        voter_id_hash: voterHash,
        kyc_completed_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        verifiedName: data.name || '',
        docType: 'voter_id',
      });
    }

    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
  } catch (error) {
    console.error('[kyc/verify-document] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
