import { NextRequest, NextResponse } from 'next/server';
import { getStateFromPincode } from '@/lib/pincode-lookup';

const DATA_GOV_IN_RESOURCE = 'all-india-pincode-directory-till-last-month';

/**
 * Public pincode lookup — uses data.gov.in All India Pincode Directory API.
 * Falls back to local prefix-based state mapping if the API is down.
 * GET /api/public/pincode-lookup?pincode=110001
 * GET /api/public/pincode-lookup?query=Connaught
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pincode = searchParams.get('pincode');
  const query = searchParams.get('query');
  const apiKey = process.env.DATA_GOV_IN_API_KEY;

  try {
    if (pincode && /^\d{6}$/.test(pincode)) {
      // Try data.gov.in API with timeout
      if (apiKey) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          const url = `https://api.data.gov.in/resource/${DATA_GOV_IN_RESOURCE}?api-key=${apiKey}&format=json&limit=20&filters%5Bpincode%5D=${pincode}`;
          const res = await fetch(url, {
            signal: controller.signal,
            next: { revalidate: 86400 }, // cache 24h
          });
          clearTimeout(timeout);

          const data = await res.json();
          if (data?.records?.length) {
            const records: any[] = data.records;
            const first = records[0];
            const allAreas = records.map((r: any) => r.officename).filter(Boolean);
            const allDistricts = [...new Set(records.map((r: any) => r.districtname).filter(Boolean))] as string[];
            return NextResponse.json({
              success: true,
              state: first.statename || '',
              district: first.districtname || '',
              areas: allAreas,
              districts: allDistricts,
              postOffices: records.map((r: any) => ({
                name: r.officename,
                pincode: r.pincode,
                district: r.districtname,
                state: r.statename,
              })),
            });
          }
        } catch (apiErr) {
          console.warn('[pincode-lookup] data.gov.in API failed, using local fallback:', (apiErr as Error).message);
        }
      }

      // Fallback: local prefix-based state resolution
      const state = getStateFromPincode(pincode);
      if (state) {
        return NextResponse.json({
          success: true,
          state,
          district: state,
          areas: [state],
          districts: [state],
          postOffices: [],
          _fallback: true,
        });
      }

      return NextResponse.json({ success: false, error: 'Pincode not found' });
    }

    if (query && query.length >= 3) {
      if (!apiKey) {
        return NextResponse.json({ success: true, results: [] });
      }
      // Search by office name
      const url = `https://api.data.gov.in/resource/${DATA_GOV_IN_RESOURCE}?api-key=${apiKey}&format=json&limit=30&filters%5Bofficename%5D=${encodeURIComponent(query)}`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      const data = await res.json();
      if (!data?.records?.length) {
        return NextResponse.json({ success: true, results: [] });
      }
      // Deduplicate by pincode, limit to 20
      const seen = new Set<string>();
      const results: any[] = [];
      for (const r of data.records) {
        const key = r.pincode;
        if (!seen.has(key) && results.length < 20) {
          seen.add(key);
          results.push({
            name: r.officename,
            pincode: r.pincode,
            district: r.districtname,
            state: r.statename,
          });
        }
      }
      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ success: false, error: 'Provide pincode or query param' }, { status: 400 });
  } catch (error) {
    console.error('[pincode-lookup] Error:', error);
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 });
  }
}
