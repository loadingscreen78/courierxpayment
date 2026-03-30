import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ocr/aadhaar
 * Proxies Aadhaar OCR requests to the VPS microservice where native
 * Tesseract 5.3.4 runs (~1-2s per image vs 15-30s with tesseract.js WASM).
 *
 * Frontend uploads files here → this route forwards to VPS → returns extracted data.
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

const VPS_OCR_URL = process.env.VPS_OCR_URL || 'http://76.13.242.163:3002';
const VPS_OCR_KEY = process.env.VPS_OCR_API_KEY || 'cxocr_prod_2026';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const frontFile = formData.get('aadhaarFront') as File | null;
    const backFile = formData.get('aadhaarBack') as File | null;

    if (!frontFile) {
      return NextResponse.json({ success: false, error: 'Aadhaar front image is required' }, { status: 400 });
    }

    // Validate sizes
    const MAX_SIZE = 5 * 1024 * 1024;
    if (frontFile.size > MAX_SIZE || (backFile && backFile.size > MAX_SIZE)) {
      return NextResponse.json({ success: false, error: 'Each file must be under 5MB' }, { status: 400 });
    }

    // Forward to VPS OCR service
    const vpsForm = new FormData();
    vpsForm.append('aadhaarFront', frontFile);
    if (backFile) vpsForm.append('aadhaarBack', backFile);

    const vpsRes = await fetch(`${VPS_OCR_URL}/api/ocr/aadhaar`, {
      method: 'POST',
      headers: { 'x-api-key': VPS_OCR_KEY },
      body: vpsForm,
    });

    const data = await vpsRes.json();

    if (!vpsRes.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'OCR processing failed' },
        { status: vpsRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[ocr/aadhaar] Proxy error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'OCR service unavailable. Please enter details manually.' },
      { status: 502 }
    );
  }
}
