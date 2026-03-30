import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ocr/aadhaar
 * Accepts Aadhaar front/back images (or PDFs), runs Tesseract.js OCR,
 * and returns structured extracted data:
 *   { name, address, city, state, pincode, aadhaarNumber, dob, age, phone? }
 *
 * Tesseract.js runs entirely in Node — no native binary or VPS install needed.
 * Works on Vercel serverless functions out of the box.
 */

// Increase body size limit for file uploads (Vercel default is 4.5MB)
export const runtime = 'nodejs';
export const maxDuration = 30; // seconds — OCR can be slow

// ── Aadhaar regex patterns ──────────────────────────────────────────────────

const AADHAAR_NUMBER_RE = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const PINCODE_RE = /\b[1-9]\d{5}\b/g;
const DOB_RE = /(?:DOB|D\.?O\.?B\.?|Date\s*of\s*Birth|Birth|Year\s*of\s*Birth|YOB)\s*[:\-]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}|\d{4})/i;
const DOB_STANDALONE_RE = /\b(\d{2}[\/.]\d{2}[\/.]\d{4})\b/g;
const PHONE_RE = /\b[6-9]\d{9}\b/;
const GENDER_RE = /\b(MALE|FEMALE|male|female|Male|Female|पुरुष|महिला|Transgender)\b/i;

// Indian states for matching
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'New Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh',
  'Puducherry', 'Andaman and Nicobar', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Lakshadweep',
];

// Common noise words to filter from name extraction
const NOISE_WORDS = [
  'government', 'india', 'aadhaar', 'aadhar', 'adhar', 'unique', 'identification',
  'authority', 'uidai', 'enrolment', 'enrollment', 'vid', 'download', 'date',
  'birth', 'male', 'female', 'address', 'dob', 'year', 'help', 'mera',
  'issue', 'printed', 'generated', 'valid', 'to:', 'c/o', 's/o', 'd/o', 'w/o',
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const frontFile = formData.get('aadhaarFront') as File | null;
    const backFile = formData.get('aadhaarBack') as File | null;

    if (!frontFile) {
      return NextResponse.json({ success: false, error: 'Aadhaar front image is required' }, { status: 400 });
    }

    // Validate file sizes (max 5MB each)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (frontFile.size > MAX_SIZE || (backFile && backFile.size > MAX_SIZE)) {
      return NextResponse.json({ success: false, error: 'Each file must be under 5MB' }, { status: 400 });
    }

    // Convert files to buffers
    const frontBuffer = Buffer.from(await frontFile.arrayBuffer());
    const backBuffer = backFile ? Buffer.from(await backFile.arrayBuffer()) : null;

    // Compress images using sharp (skip for PDFs)
    const frontProcessed = await compressImage(frontBuffer, frontFile.type);
    const backProcessed = backBuffer ? await compressImage(backBuffer, backFile!.type) : null;

    // Run OCR on both sides
    const frontText = await runOcr(frontProcessed);
    const backText = backProcessed ? await runOcr(backProcessed) : '';

    const combinedText = `${frontText}\n${backText}`;

    // Extract structured data
    const extracted = extractAadhaarData(frontText, backText, combinedText);

    return NextResponse.json({
      success: true,
      data: extracted,
      rawText: { front: frontText.substring(0, 500), back: backText.substring(0, 500) },
    });
  } catch (error) {
    console.error('[ocr/aadhaar] Error:', error);
    return NextResponse.json(
      { success: false, error: 'OCR processing failed. Please try again or enter details manually.' },
      { status: 500 }
    );
  }
}


// ── Image compression ────────────────────────────────────────────────────────

async function compressImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  // Skip compression for PDFs — tesseract.js handles them directly
  if (mimeType === 'application/pdf') return buffer;

  try {
    const sharp = (await import('sharp')).default;
    return await sharp(buffer)
      .resize(1800, 1800, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .sharpen()
      .normalize()
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    // If sharp fails, return original buffer
    return buffer;
  }
}

// ── Tesseract OCR ────────────────────────────────────────────────────────────

async function runOcr(imageBuffer: Buffer): Promise<string> {
  const Tesseract = await import('tesseract.js');
  const worker = await Tesseract.createWorker('eng+hin', undefined, {
    // Use CDN for trained data — no local tessdata needed
  });
  try {
    const { data: { text } } = await worker.recognize(imageBuffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

// ── Data extraction pipeline ─────────────────────────────────────────────────

interface AadhaarExtracted {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadhaarNumber: string;
  dob: string;
  age: number | null;
  gender: string;
  phone: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

function extractAadhaarData(frontText: string, backText: string, combined: string): AadhaarExtracted {
  const warnings: string[] = [];

  // 1. Extract Aadhaar number (front side typically)
  const aadhaarNumber = extractAadhaarNumber(combined);
  if (!aadhaarNumber) warnings.push('Could not extract Aadhaar number');

  // 2. Extract DOB / age (front side)
  const { dob, age } = extractDobAndAge(frontText || combined);
  if (!dob) warnings.push('Could not extract date of birth');

  // 3. Extract gender
  const gender = extractGender(frontText || combined);

  // 4. Extract name (front side — typically the first prominent name line)
  const name = extractName(frontText, dob, gender);
  if (!name) warnings.push('Could not extract name clearly');

  // 5. Extract address (back side typically has full address)
  const addressSource = backText || combined;
  const { address, city, state, pincode } = extractAddress(addressSource);
  if (!address) warnings.push('Could not extract address — please enter manually');

  // 6. Extract phone (rare on Aadhaar, but sometimes present)
  const phone = extractPhone(combined);

  // Confidence scoring
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (warnings.length >= 3) confidence = 'low';
  else if (warnings.length >= 1) confidence = 'medium';

  return {
    name: name || '',
    address: address || '',
    city: city || '',
    state: state || '',
    pincode: pincode || '',
    aadhaarNumber: aadhaarNumber || '',
    dob: dob || '',
    age,
    gender: gender || '',
    phone: phone || '',
    confidence,
    warnings,
  };
}

function extractAadhaarNumber(text: string): string {
  const matches = text.match(AADHAAR_NUMBER_RE);
  if (!matches) return '';
  // Return the last 12-digit match (Aadhaar number is usually at the bottom)
  for (let i = matches.length - 1; i >= 0; i--) {
    const clean = matches[i].replace(/\s/g, '');
    if (clean.length === 12 && !clean.startsWith('0')) return clean;
  }
  return '';
}

function extractDobAndAge(text: string): { dob: string; age: number | null } {
  // Try labeled DOB first
  const dobMatch = text.match(DOB_RE);
  if (dobMatch && dobMatch[1]) {
    const dob = dobMatch[1].trim();
    return { dob, age: calculateAge(dob) };
  }
  // Try standalone date patterns (DD/MM/YYYY)
  const dates = text.match(DOB_STANDALONE_RE);
  if (dates) {
    for (const d of dates) {
      const age = calculateAge(d);
      if (age !== null && age >= 0 && age <= 120) {
        return { dob: d, age };
      }
    }
  }
  // Try year-only (YOB)
  const yobMatch = text.match(/(?:YOB|Year\s*of\s*Birth)\s*[:\-]?\s*(\d{4})/i);
  if (yobMatch) {
    const year = parseInt(yobMatch[1]);
    const age = new Date().getFullYear() - year;
    if (age >= 0 && age <= 120) return { dob: yobMatch[1], age };
  }
  return { dob: '', age: null };
}

function calculateAge(dobStr: string): number | null {
  // Handle YYYY only
  if (/^\d{4}$/.test(dobStr)) {
    return new Date().getFullYear() - parseInt(dobStr);
  }
  // Handle DD/MM/YYYY or DD.MM.YYYY
  const parts = dobStr.split(/[\/\.]/);
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  if (year < 1900 || year > new Date().getFullYear()) return null;
  const dob = new Date(year, month, day);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 && age <= 120 ? age : null;
}

function extractGender(text: string): string {
  const match = text.match(GENDER_RE);
  if (!match) return '';
  const g = match[1].toLowerCase();
  if (g === 'male' || g === 'पुरुष') return 'Male';
  if (g === 'female' || g === 'महिला') return 'Female';
  return match[1];
}

function extractName(frontText: string, dob: string, gender: string): string {
  const lines = frontText.split('\n').map(l => l.trim()).filter(l => l.length > 2);

  // Strategy: find lines that look like a person's name
  // Aadhaar front typically has: header lines, then name, then DOB, then gender, then Aadhaar number
  // Look for lines that are mostly alphabetic, not noise, and appear before DOB line
  const candidates: string[] = [];
  let pastHeader = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Skip header/noise lines
    if (NOISE_WORDS.some(w => lower.includes(w))) {
      pastHeader = true;
      continue;
    }
    // Skip lines with Aadhaar number pattern
    if (AADHAAR_NUMBER_RE.test(line)) continue;
    // Skip lines that are mostly digits
    if (line.replace(/\D/g, '').length > line.length * 0.5) continue;
    // Skip very short lines
    if (line.length < 3) continue;

    // Good candidate: mostly letters, reasonable length
    const alphaRatio = line.replace(/[^a-zA-Z\s]/g, '').length / line.length;
    if (alphaRatio > 0.7 && line.length >= 3 && line.length <= 60) {
      candidates.push(line);
    }
  }

  // The name is typically the first good candidate after header noise
  // Sometimes there's a parent name (S/O, D/O, W/O line) — skip that
  for (const c of candidates) {
    const lower = c.toLowerCase();
    if (/^(s\/o|d\/o|w\/o|c\/o|son of|daughter of|wife of|care of)/i.test(lower)) continue;
    // Clean up the name
    return c.replace(/[^a-zA-Z\s.]/g, '').replace(/\s+/g, ' ').trim();
  }

  return candidates[0]?.replace(/[^a-zA-Z\s.]/g, '').replace(/\s+/g, ' ').trim() || '';
}

function extractAddress(text: string): { address: string; city: string; state: string; pincode: string } {
  // Extract pincode
  const pincodes = text.match(PINCODE_RE);
  const pincode = pincodes?.[pincodes.length - 1] || '';

  // Extract state
  let state = '';
  const textLower = text.toLowerCase();
  for (const s of INDIAN_STATES) {
    if (textLower.includes(s.toLowerCase())) {
      state = s;
      break;
    }
  }

  // Try to find address block — usually starts with "Address:" or after S/O, D/O line
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  let addressLines: string[] = [];
  let capturing = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('address') || lower.includes('पता')) {
      capturing = true;
      // Remove the "Address:" prefix
      const cleaned = line.replace(/^address\s*[:\-]?\s*/i, '').trim();
      if (cleaned) addressLines.push(cleaned);
      continue;
    }
    if (capturing) {
      // Stop at Aadhaar number or end markers
      if (AADHAAR_NUMBER_RE.test(line)) break;
      if (lower.includes('aadhaar') || lower.includes('uidai') || lower.includes('help')) break;
      addressLines.push(line);
    }
  }

  // If no "Address:" label found, try to find address-like content from back side
  if (addressLines.length === 0) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      // Skip noise
      if (lower.includes('aadhaar') || lower.includes('uidai') || lower.includes('unique')) continue;
      if (AADHAAR_NUMBER_RE.test(line)) continue;
      // Address lines typically contain commas, numbers, or known address words
      if (/\d/.test(line) || line.includes(',') || /\b(nagar|road|street|colony|sector|block|house|flat|floor|lane|gali|mohalla|ward|village|town|dist|po|ps|vill)\b/i.test(line)) {
        addressLines.push(line);
      }
    }
  }

  const fullAddress = addressLines.join(', ').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();

  // Extract city — look for district or city name before state/pincode
  let city = '';
  // Try to find "Dist" or "District" pattern
  const distMatch = fullAddress.match(/(?:dist(?:rict)?|जिला)\s*[:\-]?\s*([a-zA-Z\s]+?)(?:,|\d|$)/i);
  if (distMatch) {
    city = distMatch[1].trim();
  } else if (state) {
    // Try to find the word before state name
    const stateIdx = fullAddress.toLowerCase().indexOf(state.toLowerCase());
    if (stateIdx > 0) {
      const before = fullAddress.substring(0, stateIdx).trim();
      const parts = before.split(/[,\s]+/).filter(p => p.length > 2);
      city = parts[parts.length - 1] || '';
    }
  }

  return {
    address: fullAddress.replace(/\s*-\s*\d{6}\s*$/, '').trim(),
    city: city.replace(/[^a-zA-Z\s]/g, '').trim(),
    state,
    pincode,
  };
}

function extractPhone(text: string): string {
  const match = text.match(PHONE_RE);
  return match ? match[0] : '';
}
