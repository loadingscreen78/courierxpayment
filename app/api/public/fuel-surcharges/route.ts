/**
 * Public API to get current fuel surcharge percentages.
 * Used by the frontend to display accurate rate breakdowns.
 * Cached for 30 minutes via Cache-Control header.
 */

import { NextResponse } from 'next/server';
import { getFuelSurcharges } from '@/lib/shipping/fuelSurcharge';

export async function GET() {
  const data = await getFuelSurcharges();

  return NextResponse.json(
    { success: true, data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    },
  );
}
