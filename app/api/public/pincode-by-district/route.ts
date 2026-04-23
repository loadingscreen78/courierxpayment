import { NextRequest, NextResponse } from 'next/server';

const DATA_GOV_IN_RESOURCE = '6176ee09-3d56-4a3b-8115-21841576b2f6';

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
    const timeout = setTimeout(() => controller.abort(), 20000);

    // Fetch all records via pagination (data.gov.in returns post office rows, not unique pincodes)
    // A large district like Pune can have 2000+ post office rows, so we paginate with limit=1000
    const PAGE_SIZE = 1000;
    let offset = 0;
    let allRecords: Record<string, string>[] = [];

    while (true) {
      const url = `https://api.data.gov.in/resource/${DATA_GOV_IN_RESOURCE}?api-key=${apiKey}&format=json&limit=${PAGE_SIZE}&offset=${offset}&filters%5Bdistrictname%5D=${encodeURIComponent(district)}&filters%5Bstatename%5D=${encodeURIComponent(state.toUpperCase())}`;
      const res = await fetch(url, {
        signal: controller.signal,
        next: { revalidate: 86400 }, // cache 24h
      });
      const data = await res.json();
      const records: Record<string, string>[] = data?.records ?? [];
      allRecords = allRecords.concat(records);
      // Stop if we got fewer records than the page size (last page)
      if (records.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    clearTimeout(timeout);

    if (!allRecords.length) {
      return NextResponse.json({ success: true, pincodes: [] });
    }

    // Deduplicate by pincode, collect all post offices per pincode
    const pincodeMap = new Map<string, { pincode: string; offices: string[]; district: string; state: string }>();

    for (const r of allRecords) {
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
