import { NextRequest, NextResponse } from 'next/server';

const DATA_GOV_IN_RESOURCE = 'all-india-pincode-directory-till-last-month';

/**
 * Fetch all pincodes for a given district + state using data.gov.in API.
 * GET /api/public/pincode-by-district?state=Maharashtra&district=Mumbai
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const district = searchParams.get('district');
  const state = searchParams.get('state');

  if (!district || !state) {
    return NextResponse.json(
      { success: false, error: 'Both district and state params required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: true, pincodes: [] });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Fetch by district name via data.gov.in API (limit 500 to get all pincodes)
    const url = `https://api.data.gov.in/resource/${DATA_GOV_IN_RESOURCE}?api-key=${apiKey}&format=json&limit=500&filters%5Bdistrictname%5D=${encodeURIComponent(district)}&filters%5Bstatename%5D=${encodeURIComponent(state)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 86400 }, // cache 24h
    });
    clearTimeout(timeout);

    const data = await res.json();

    if (!data?.records?.length) {
      return NextResponse.json({ success: true, pincodes: [] });
    }

    // Deduplicate by pincode, collect all post offices per pincode
    const pincodeMap = new Map<string, { pincode: string; offices: string[]; district: string; state: string }>();

    for (const r of data.records) {
      const pin = r.pincode;
      if (!pin) continue;
      if (pincodeMap.has(pin)) {
        if (r.officename) pincodeMap.get(pin)!.offices.push(r.officename);
      } else {
        pincodeMap.set(pin, {
          pincode: pin,
          offices: r.officename ? [r.officename] : [],
          district: r.districtname || district,
          state: r.statename || state,
        });
      }
    }

    const pincodes = Array.from(pincodeMap.values())
      .sort((a, b) => a.pincode.localeCompare(b.pincode));

    return NextResponse.json({ success: true, pincodes });
  } catch (error) {
    console.error('[pincode-by-district] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Lookup failed' },
      { status: 500 }
    );
  }
}
