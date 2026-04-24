import { NextRequest, NextResponse } from 'next/server';
import { CASHFREE_VERIFICATION_DIRECT } from '@/lib/wallet/cashfreeConfig';

/**
 * POST /api/ocr/aadhaar
 * Extracts Aadhaar details using Cashfree Smart OCR (bharat-ocr).
 * Accepts front (required) and back (optional) images, calls Cashfree for each,
 * then merges results into the AadhaarOcrResult shape the frontend expects.
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
  uid?: string;
  father?: string;
  pincode?: string;
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
  pincode?: number;
  country?: string;
  locality?: string;
}

interface CashfreeOcrResponse {
  verification_id: string;
  reference_id: number;
  status: string;
  document_type: string;
  document_fields: CashfreeOcrFields;
  quality_checks?: Record<string, boolean | null>;
  fraud_checks?: Record<string, boolean | null>;
  qr_details?: {
    status?: string;
    name?: string;
    dob?: string;
    gender?: string;
    care_of?: string;
    address?: string;
    split_address?: CashfreeQrSplitAddress;
    year_of_birth?: number;
    aadhaar_last_four_digit?: string;
    mobile_linked?: boolean;
  };
}

/** Call Cashfree Smart OCR for a single image */
async function callCashfreeOcr(file: File, side: 'front' | 'back'): Promise<CashfreeOcrResponse> {
  const form = new FormData();
  form.append('verification_id', `cx_aadhaar_${side}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  form.append('document_type', 'AADHAAR');
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

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.message || errBody?.error || `Cashfree OCR failed (${res.status})`);
  }

  return res.json();
}

/** Extract pincode from a raw address string */
function extractPincode(address: string): string {
  const match = address.match(/\b(\d{6})\b/);
  return match ? match[1] : '';
}

/** Extract city from Cashfree split_address or raw address */
function extractCity(splitAddr?: CashfreeQrSplitAddress, rawAddress?: string): string {
  if (splitAddr?.dist) return splitAddr.dist;
  if (splitAddr?.vtc) return splitAddr.vtc;
  if (splitAddr?.po) return splitAddr.po;
  // Fallback: try to parse from raw address (comma-separated segments)
  if (rawAddress) {
    const parts = rawAddress.split(',').map(s => s.trim());
    // City is typically 2nd-to-last before state+pincode
    if (parts.length >= 3) return parts[parts.length - 3] || '';
  }
  return '';
}

/** Extract state from Cashfree split_address or raw address */
function extractState(splitAddr?: CashfreeQrSplitAddress, rawAddress?: string): string {
  if (splitAddr?.state) return splitAddr.state;
  if (rawAddress) {
    const parts = rawAddress.split(',').map(s => s.trim());
    // State is typically the last meaningful segment (may include pincode)
    const last = parts[parts.length - 1] || '';
    return last.replace(/\s*-?\s*\d{6}\s*$/, '').trim();
  }
  return '';
}

/** Calculate age from DOB string (YYYY-MM-DD) */
function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/** Determine confidence level based on quality and fraud checks */
function determineConfidence(
  qualityChecks?: Record<string, boolean | null>,
  fraudChecks?: Record<string, boolean | null>,
): 'high' | 'medium' | 'low' {
  const warnings: string[] = [];

  if (fraudChecks?.is_forged || fraudChecks?.is_photo_imposed || fraudChecks?.is_overwritten) {
    return 'low';
  }
  if (fraudChecks?.is_screenshot || fraudChecks?.is_photo_of_screen) {
    warnings.push('screenshot');
  }
  if (qualityChecks?.blur === true) warnings.push('blur');
  if (qualityChecks?.glare === true) warnings.push('glare');
  if (qualityChecks?.partially_present === true) warnings.push('partial');
  if (qualityChecks?.obscured === true) warnings.push('obscured');

  if (warnings.length >= 2) return 'low';
  if (warnings.length === 1) return 'medium';
  return 'high';
}

/** Collect warning messages from quality/fraud checks */
function collectWarnings(
  qualityChecks?: Record<string, boolean | null>,
  fraudChecks?: Record<string, boolean | null>,
): string[] {
  const warnings: string[] = [];
  if (qualityChecks?.blur === true) warnings.push('Image appears blurry');
  if (qualityChecks?.glare === true) warnings.push('Glare detected on image');
  if (qualityChecks?.partially_present === true) warnings.push('Document partially visible');
  if (qualityChecks?.obscured === true) warnings.push('Part of document is obscured');
  if (qualityChecks?.black_and_white === true) warnings.push('Black and white image detected');
  if (fraudChecks?.is_screenshot === true) warnings.push('Image appears to be a screenshot');
  if (fraudChecks?.is_photo_of_screen === true) warnings.push('Photo of screen detected');
  if (fraudChecks?.is_photo_imposed === true) warnings.push('Photo may be tampered');
  if (fraudChecks?.is_overwritten === true) warnings.push('Document may have been altered');
  if (fraudChecks?.is_forged === true) warnings.push('Possible forged document detected');
  return warnings;
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

    // Validate sizes (5 MB max per file)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (frontFile.size > MAX_SIZE || (backFile && backFile.size > MAX_SIZE)) {
      return NextResponse.json(
        { success: false, error: 'Each file must be under 5MB' },
        { status: 400 },
      );
    }

    // Call Cashfree Smart OCR for front (always) and back (if provided)
    const [frontResult, backResult] = await Promise.all([
      callCashfreeOcr(frontFile, 'front'),
      backFile ? callCashfreeOcr(backFile, 'back') : Promise.resolve(null),
    ]);

    // --- Extract fields from front ---
    const ff = frontResult.document_fields || {};
    const qr = frontResult.qr_details;
    const splitAddr = qr?.split_address;

    // Prefer QR data when available (more reliable), fall back to OCR fields
    const name = qr?.name || ff.name || '';
    const dob = qr?.dob || ff.dob || '';
    const gender = qr?.gender || ff.gender || '';
    const uid = ff.uid || '';

    // Address: prefer QR full address, fall back to OCR address
    const rawAddress = qr?.address || ff.address || '';

    // --- Extract fields from back (address side) ---
    const bf = backResult?.document_fields || {};
    const backQr = backResult?.qr_details;
    const backSplitAddr = backQr?.split_address;
    const backRawAddress = backQr?.address || bf.address || '';

    // Merge: back image typically has the full address
    const finalAddress = backRawAddress || rawAddress;
    const finalSplitAddr = backSplitAddr || splitAddr;

    const city = extractCity(finalSplitAddr, finalAddress);
    const state = extractState(finalSplitAddr, finalAddress);
    const pincode = finalSplitAddr?.pincode?.toString() || extractPincode(finalAddress);

    // UID may appear on front or back
    const aadhaarNumber = uid || bf.uid || '';

    // Age calculation
    const age = calculateAge(dob);

    // Confidence & warnings (merge both sides)
    const confidence = determineConfidence(frontResult.quality_checks, frontResult.fraud_checks);
    const warnings = [
      ...collectWarnings(frontResult.quality_checks, frontResult.fraud_checks),
      ...(backResult ? collectWarnings(backResult.quality_checks, backResult.fraud_checks).map(w => `(Back) ${w}`) : []),
    ];

    // Build field confidence scores (1.0 = from QR, 0.8 = from OCR fields, 0.5 = from back)
    const fieldConfidence: Record<string, number> = {};
    fieldConfidence.name = qr?.name ? 100 : ff.name ? 80 : 0;
    fieldConfidence.address = backQr?.address ? 100 : qr?.address ? 95 : (bf.address || ff.address) ? 75 : 0;
    fieldConfidence.city = finalSplitAddr?.dist ? 100 : city ? 70 : 0;
    fieldConfidence.state = finalSplitAddr?.state ? 100 : state ? 70 : 0;
    fieldConfidence.pincode = finalSplitAddr?.pincode ? 100 : pincode ? 80 : 0;
    fieldConfidence.dob = qr?.dob ? 100 : ff.dob ? 80 : 0;
    fieldConfidence.gender = qr?.gender ? 100 : ff.gender ? 80 : 0;
    fieldConfidence.aadhaarNumber = aadhaarNumber ? 90 : 0;

    // Clean address: remove pincode suffix if present (frontend has separate pincode field)
    const cleanAddress = finalAddress
      .replace(/\s*-?\s*\d{6}\s*$/, '')
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
      phone: '', // Cashfree Smart OCR doesn't return phone; user fills manually
      confidence,
      warnings,
      fieldConfidence,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[ocr/aadhaar] Cashfree Smart OCR error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'OCR service unavailable. Please enter details manually.' },
      { status: 502 },
    );
  }
}
