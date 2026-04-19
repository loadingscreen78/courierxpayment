import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetch all pincodes for a given district + state using India Post API.
 * GET /api/public/pincode-by-district?state=Maharashtra&district=Mumbai
 * 
 * Uses the India Post postoffice search API which returns all post offices
 * matching a name. We search by district name to get comprehensive results.
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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Search by district name via India Post API
    const res = await fetch(
      `https://api.postalpincode.in/postoffice/${encodeURIComponent(district)}`,
      {
        signal: controller.signal,
        next: { revalidate: 86400 }, // cache 24h
      }
    );
    clearTimeout(timeout);

    const data = await res.json();
    const result = data?.[0];

    if (result?.Status !== 'Success' || !result?.PostOffice?.length) {
      return NextResponse.json({ success: true, pincodes: [] });
    }

    // Filter to only matching state + district
    const stateLower = state.toLowerCase();
    const districtLower = district.toLowerCase();

    const filtered = result.PostOffice.filter((po: any) => {
      const poState = (po.State || '').toLowerCase();
      const poDistrict = (po.District || '').toLowerCase();
      return poState.includes(stateLower) || poDistrict.includes(districtLower);
    });

    // Deduplicate by pincode, collect all post offices per pincode
    const pincodeMap = new Map<string, { pincode: string; offices: string[]; district: string; state: string }>();

    for (const po of filtered) {
      const pin = po.Pincode;
      if (pincodeMap.has(pin)) {
        pincodeMap.get(pin)!.offices.push(po.Name);
      } else {
        pincodeMap.set(pin, {
          pincode: pin,
          offices: [po.Name],
          district: po.District,
          state: po.State,
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
