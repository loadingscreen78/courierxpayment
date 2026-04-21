import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchDomesticRates } from '@/lib/domestic/nimbusPostDomestic';
import { DOMESTIC_LIMITS } from '@/lib/domestic/types';
import type { DomesticShipmentType } from '@/lib/domestic/types';

/**
 * Public domestic rate check — no auth required.
 * Used by the public rate calculator page.
 */
const rateCheckSchema = z.object({
  pickupPincode: z.string().regex(/^\d{6}$/, 'Invalid pickup pincode'),
  deliveryPincode: z.string().regex(/^\d{6}$/, 'Invalid delivery pincode'),
  weightKg: z.number().positive(),
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  declaredValue: z.number().nonnegative().max(100000),
  shipmentType: z.enum(['document', 'gift', 'laptop']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = rateCheckSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      }, { status: 400 });
    }

    const data = validation.data;
    const limits = DOMESTIC_LIMITS[data.shipmentType as DomesticShipmentType];

    if (data.weightKg > limits.maxWeightKg) {
      return NextResponse.json({
        success: false,
        error: `Maximum weight for ${data.shipmentType} is ${limits.maxWeightKg} kg`,
      }, { status: 400 });
    }

    const skipNimbus = !process.env.NIMBUS_EMAIL || !process.env.NIMBUS_PASSWORD;

    if (skipNimbus) {
      const buildMock = (id: number, name: string, base: number, perKg: number, days: number, rating: number, mode: 'surface' | 'air', recommended: boolean) => {
        const freight = Math.round(base + data.weightKg * perKg);
        const shipping = Math.round(freight * 2.65);
        const gst = Math.round(shipping * 0.18);
        return {
          courier_company_id: id, courier_name: name, freight_charge: freight,
          shipping_charge: shipping, gst_amount: gst, customer_price: shipping + gst,
          estimated_delivery_days: days, etd: '', rating, rto_charges: 0,
          cod: false, cod_charges: 0, pickup_availability: true,
          is_recommended: recommended, mode,
        };
      };

      const mockCouriers = [
        buildMock(1, 'Delhivery Surface', 40, 30, 5, 4.2, 'surface', false),
        buildMock(2, 'BlueDart Air', 80, 50, 2, 4.5, 'air', false),
        buildMock(3, 'DTDC Surface', 50, 35, 4, 3.8, 'surface', false),
        buildMock(4, 'Ecom Express Surface', 35, 28, 6, 3.5, 'surface', false),
        buildMock(5, 'Delhivery Air', 70, 45, 2, 4.2, 'air', false),
        buildMock(6, 'DTDC Air', 75, 48, 2, 3.8, 'air', false),
        buildMock(7, 'Xpressbees Surface', 38, 26, 5, 3.9, 'surface', false),
        buildMock(8, 'Xpressbees Air', 65, 42, 2, 3.9, 'air', false),
      ];

      mockCouriers.sort((a, b) => a.customer_price - b.customer_price);
      if (mockCouriers.length > 0) mockCouriers[0].is_recommended = true;

      return NextResponse.json({ success: true, couriers: mockCouriers });
    }

    const couriers = await fetchDomesticRates(data as import('@/lib/domestic/types').RateCheckRequest);
    return NextResponse.json({ success: true, couriers });
  } catch (error) {
    console.error('[public/domestic-rates] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rates. Please try again.' },
      { status: 500 },
    );
  }
}
