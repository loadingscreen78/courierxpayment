import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

/**
 * GET /api/domestic/serial-lookup?serial=C02X1234ABCD
 * Looks up a laptop serial number in the database to verify details.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serial = searchParams.get('serial');

  if (!serial || serial.length < 3) {
    return NextResponse.json({ success: false, error: 'Serial number too short' }, { status: 400 });
  }

  try {
    const supabase = getServiceRoleClient();

    // Check if serial number exists in laptop_serials table
    const { data, error } = await supabase
      .from('laptop_serials')
      .select('brand, model, serial_number, status')
      .eq('serial_number', serial.toUpperCase().trim())
      .maybeSingle();

    if (error) {
      console.warn('[serial-lookup] DB error:', error.message);
      // If table doesn't exist yet, return not found gracefully
      return NextResponse.json({
        success: true,
        found: false,
        message: 'Serial number not found in our database. You can still proceed with shipping.',
      });
    }

    if (data) {
      // Check if this serial was already shipped (prevent duplicate shipments)
      if (data.status === 'shipped') {
        return NextResponse.json({
          success: true,
          found: true,
          brand: data.brand,
          model: data.model,
          message: 'This serial number has been previously shipped through our service.',
        });
      }

      return NextResponse.json({
        success: true,
        found: true,
        brand: data.brand,
        model: data.model,
      });
    }

    return NextResponse.json({
      success: true,
      found: false,
      message: 'Serial number not found in our database. You can still proceed with shipping.',
    });
  } catch (err) {
    console.error('[serial-lookup] Error:', err);
    return NextResponse.json({
      success: true,
      found: false,
      message: 'Could not verify serial number at this time.',
    });
  }
}
