import { NextRequest, NextResponse } from 'next/server';
import { CASHFREE_VERIFICATION_DIRECT } from '@/lib/wallet/cashfreeConfig';

/**
 * POST /api/ocr/aadhaar
 * Extracts Aadhaar details using Cashfree Smart OCR (bharat-ocr).
 * Accepts front (required) and back (optional) images, calls Cashfree for each,
 * then merges results into the AadhaarOcrResult shape the frontend expects.
 *
 * Cashfree field mapping:
 *   document_fields.uid        → full Aadhaar number (12 digits, may be masked)
 *   document_fields.name       → name
 *   document_fields.dob        → date of birth (YYYY-MM-DD)
 *   document_fields.gender     → gender
 *   document_fields.address    → full address string
 *   qr_details.uid             → full Aadhaar number from QR (more reliable)
 *   qr_details.name            → name from QR
 *   qr_details.dob             → DOB from QR
 *   qr_details.gender          → gender from QR
 *   qr_details.address         → full address from QR
 *   qr_details.split_address   → structured address (state, dist, pincode…)
 *   qr_details.aadhaar_last_four_digit → last 4 digits (fallback)
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

const CF_CLIENT_ID = () => process.env.CASHFREE_KYC_CLIENT_ID?.trim() || '';
const CF_CLIENT_SECRET = () => process.env.CASHFREE_KYC_CLIENT_SECRET?.trim() || '';
const CF_API_VERSION = '2024-12-01';

interface CashfreeOcrFields {
  name?: string;
  address?: string;
  dob?: string;
  gender?: string;
  uid?: string;           // full 12-digit Aadhaar number
  father?: string;
  pincode?: string;
  year_of_birth?: string;
}

interface CashfreeQrSplitAddress {
  house?: string;
  street?: string;
  landmark?: string;
  po?: string;
  subdist?: string;
  dist?: string;
  vtc?: string;
  state?: string;
  pincode?: number | string;
  country?: string;
  locality?: string;
}

interface CashfreeOcrResponse {
  verification_id?: string;
  reference_id?: number;
  status?: string;
  document_type?: string;
  document_fields?: CashfreeOcrFields;
  quality_checks?: Record<string, boolean | null>;
  fraud_checks?: Record<string, boolean | null>;
  qr_details?: {
    status?: string;
    name?: string;
    dob?: string;
    gender?: string;
    care_of?: string;
    address?: string;
    uid?: string;           // full Aadhaar number from QR scan
    split_address?: CashfreeQrSplitAddress;
    year_of_birth?: number;
    aadhaar_last_four_digit?: string;
    mobile_linked?: boolean;
  };
  // Cashfree sometimes wraps errors differently
  message?: string;
  error?: string;
}

/** Call Cashfree Smart OCR for a single Aadhaar image */
async function callCashfreeOcr(
  file: File,
  side: 'front' | 'back',
): Promise<CashfreeOcrResponse> {
  const verificationId = `cx_aadhaar_${side}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const form = new FormData();
  form.append('verification_id', verificationId);
  form.append('document_type', 'AADHAAR');  // Cashfree request enum value
  form.append('file', file);

  const res = await fetch(`${CASHFREE_VERIFICATION_DIRECT}/bharat-ocr`, {
    method: 'POST',
    headers: {
      'x-client-id': CF_CLIENT_ID(),
      'x-client-secret': CF_CLIENT_SECRET(),
      'x-api-version': CF_API_VERSION,
    },
    body: form,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = body?.message || body?.error || `Cashfree OCR failed (HTTP ${res.status})`;
    console.error(`[ocr/aadhaar] Cashfree ${side} error:`, msg, body);
    throw new Error(msg);
  }

  console.log(`[ocr/aadhaar] Cashfree ${side} raw response:`, JSON.stringify(body).slice(0, 500));
  return body as CashfreeOcrResponse;
}

/** Extract 6-digit pincode from a raw address string */
function extractPincode(address: string): string {
  const match = address.match(/\b(\d{6})\b/);
  return match ? match[1] : '';
}

/** Extract city from split_address or raw address */
function extractCity(split?: CashfreeQrSplitAddress, raw?: string): string {
  if (split?.dist) return split.dist;
  if (split?.vtc) return split.vtc;
  if (split?.po) return split.po;
  if (split?.subdist) return split.subdist;
  if (raw) {
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 3) return parts[parts.length - 3] || '';
  }
  return '';
}

/** Extract state from split_address or raw address */
function extractState(split?: CashfreeQrSplitAddress, raw?: string): string {
  if (split?.state) return split.state;
  if (raw) {
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1] || '';
    return last.replace(/\s*[-–]\s*\d{6}\s*$/, '').trim();
  }
  return '';
}

/** Calculate age from DOB string — handles YYYY-MM-DD and DD-MM-YYYY */
function calculateAge(dob: string): number | null {
  if (!dob) return null;

  let birthDate: Date;

  // Try YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    birthDate = new Date(dob);
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(dob)) {
    // DD-MM-YYYY
    const [dd, mm, yyyy] = dob.split('-');
    birthDate = new Date(`${yyyy}-${mm}-${dd}`);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
    // DD/MM/YYYY
    const [dd, mm, yyyy] = dob.split('/');
    birthDate = new Date(`${yyyy}-${mm}-${dd}`);
  } else {
    birthDate = new Date(dob);
  }

  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

/** Determine confidence level */
function determineConfidence(
  quality?: Record<string, boolean | null>,
  fraud?: Record<string, boolean | null>,
): 'high' | 'medium' | 'low' {
  if (fraud?.is_forged || fraud?.is_photo_imposed || fraud?.is_overwritten) return 'low';
  const issues = [
    fraud?.is_screenshot,
    fraud?.is_photo_of_screen,
    quality?.blur,
    quality?.glare,
    quality?.partially_present,
    quality?.obscured,
  ].filter(Boolean).length;
  if (issues >= 2) return 'low';
  if (issues === 1) return 'medium';
  return 'high';
}

/** Collect human-readable warnings */
function collectWarnings(
  quality?: Record<string, boolean | null>,
  fraud?: Record<string, boolean | null>,
): string[] {
  const w: string[] = [];
  if (quality?.blur) w.push('Image appears blurry');
  if (quality?.glare) w.push('Glare detected on image');
  if (quality?.partially_present) w.push('Document partially visible');
  if (quality?.obscured) w.push('Part of document is obscured');
  if (quality?.black_and_white) w.push('Black and white image detected');
  if (fraud?.is_screenshot) w.push('Image appears to be a screenshot');
  if (fraud?.is_photo_of_screen) w.push('Photo of screen detected');
  if (fraud?.is_photo_imposed) w.push('Photo may be tampered');
  if (fraud?.is_overwritten) w.push('Document may have been altered');
  if (fraud?.is_forged) w.push('Possible forged document detected');
  return w;
}

export async function POST(request: NextRequest) {
  try {
    if (!CF_CLIENT_ID() || !CF_CLIENT_SECRET()) {
      return NextResponse.json(
        { success: false, error: 'OCR service not configured' },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const frontFile = formData.get('aadhaarFront') as File | null;
    const backFile = formData.get('aadhaarBack') as File | null;

    if (!frontFile) {
      return NextResponse.json(
        { success: false, error: 'Aadhaar front image is required' },
        { status: 400 },
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (frontFile.size > MAX_SIZE || (backFile && backFile.size > MAX_SIZE)) {
      return NextResponse.json(
        { success: false, error: 'Each file must be under 5MB' },
        { status: 400 },
      );
    }

    // Call Cashfree Smart OCR in parallel for front + back
    const [frontResult, backResult] = await Promise.all([
      callCashfreeOcr(frontFile, 'front'),
      backFile ? callCashfreeOcr(backFile, 'back') : Promise.resolve(null),
    ]);

    // ── Extract from FRONT ──────────────────────────────────────────────────
    const ff = frontResult.document_fields || {};
    const fqr = frontResult.qr_details;
    const fSplit = fqr?.split_address;

    // Name: QR > OCR field
    const name = fqr?.name || ff.name || '';

    // DOB: QR > OCR field
    const dob = fqr?.dob || ff.dob || '';

    // Gender: QR > OCR field
    const gender = fqr?.gender || ff.gender || '';

    // Aadhaar UID: QR uid (full) > document_fields.uid > last-4 fallback
    const frontUid = fqr?.uid || ff.uid || '';

    // ── Extract from BACK ───────────────────────────────────────────────────
    const bf = backResult?.document_fields || {};
    const bqr = backResult?.qr_details;
    const bSplit = bqr?.split_address;

    const backUid = bqr?.uid || bf.uid || '';

    // ── Merge address (back has full address, front may have partial) ───────
    const backRawAddr = bqr?.address || bf.address || '';
    const frontRawAddr = fqr?.address || ff.address || '';
    const finalRawAddr = backRawAddr || frontRawAddr;
    const finalSplit = bSplit || fSplit;

    const city = extractCity(finalSplit, finalRawAddr);
    const state = extractState(finalSplit, finalRawAddr);
    const pincode =
      (finalSplit?.pincode !== undefined ? String(finalSplit.pincode) : '') ||
      extractPincode(finalRawAddr);

    // ── Aadhaar number ──────────────────────────────────────────────────────
    // Full 12-digit from QR (most reliable) or OCR field
    // Cashfree may mask it — if masked (contains 'X' or '*'), fall back to last-4
    const rawUid = frontUid || backUid;
    const cleanUid = rawUid.replace(/[\s\-]/g, '');
    const isMasked = /[Xx*X]/i.test(cleanUid);
    const aadhaarNumber = !isMasked && /^\d{12}$/.test(cleanUid)
      ? cleanUid
      : ''; // empty = user must enter manually; last-4 not useful for validation

    // ── Age ─────────────────────────────────────────────────────────────────
    const age = calculateAge(dob);

    // ── Confidence & warnings ───────────────────────────────────────────────
    const confidence = determineConfidence(frontResult.quality_checks, frontResult.fraud_checks);
    const warnings = [
      ...collectWarnings(frontResult.quality_checks, frontResult.fraud_checks),
      ...(backResult
        ? collectWarnings(backResult.quality_checks, backResult.fraud_checks).map(w => `(Back) ${w}`)
        : []),
    ];

    // ── Field confidence scores ─────────────────────────────────────────────
    const fieldConfidence: Record<string, number> = {
      name: fqr?.name ? 100 : ff.name ? 80 : 0,
      address: bqr?.address ? 100 : fqr?.address ? 95 : (bf.address || ff.address) ? 75 : 0,
      city: finalSplit?.dist ? 100 : city ? 70 : 0,
      state: finalSplit?.state ? 100 : state ? 70 : 0,
      pincode: finalSplit?.pincode !== undefined ? 100 : pincode ? 80 : 0,
      dob: fqr?.dob ? 100 : ff.dob ? 80 : 0,
      gender: fqr?.gender ? 100 : ff.gender ? 80 : 0,
      aadhaarNumber: aadhaarNumber ? 90 : 0,
    };

    // ── Clean address (strip trailing pincode) ──────────────────────────────
    const cleanAddress = finalRawAddr
      .replace(/\s*[-–]\s*\d{6}\s*$/, '')
      .replace(/,\s*$/, '')
      .trim();

    const result = {
      name,
      address: cleanAddress,
      city,
      state,
      pincode,
      aadhaarNumber,
      dob,
      age,
      gender,
      phone: '', // Cashfree Smart OCR does not return phone number
      confidence,
      warnings,
      fieldConfidence,
    };

    console.log('[ocr/aadhaar] Extracted result:', JSON.stringify({ ...result, address: result.address.slice(0, 50) }));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[ocr/aadhaar] Cashfree Smart OCR error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'OCR service unavailable. Please enter details manually.' },
      { status: 502 },
    );
  }
}
