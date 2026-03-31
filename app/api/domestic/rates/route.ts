import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchDomesticRates } from '@/lib/domestic/nimbusPostDomestic';
import { DOMESTIC_LIMITS } from '@/lib/domestic/types';
import type { DomesticShipmentType } from '@/lib/domestic/types';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

import { DOMESTIC_GUEST_MULTIPLIER } from '@/lib/shipping/rateCalculator';

const rateCheckSchema = z.object({
  pickupPincode: z.string().regex(/^\d{6}$/, 'Invalid pickup pincode'),
  deliveryPincode: z.string().regex(/^\d{6}$/, 'Invalid delivery pincode'),
  weightKg: z.number().positive(),
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  declaredValue: z.number().nonnegative().max(49000),
  shipmentType: z.enum(['document', 'gift']),
  isGuest: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Auth check — optional for guest bookings
    const authHeader = request.headers.get('authorization');
    let isAuthenticated = false;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const supabase = getServiceRoleClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        isAuthenticated = true;
      }
    }

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
    // Guest if explicitly flagged or not authenticated
    const isGuest = data.isGuest || !isAuthenticated;
    const limits = DOMESTIC_LIMITS[data.shipmentType as DomesticShipmentType];

    if (data.weightKg > limits.maxWeightKg) {
      return NextResponse.json({
        success: false,
        error: `Maximum weight for ${data.shipmentType} is ${limits.maxWeightKg} kg`,
      }, { status: 400 });
    }

    // Check if NimbusPost is configured — use mock data if not
    const skipNimbus = !process.env.NIMBUS_EMAIL || !process.env.NIMBUS_PASSWORD;

    if (skipNimbus) {
      // Mock courier options for development — includes air & surface modes
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

      // Sort by customer_price ascending and mark cheapest as recommended
      mockCouriers.sort((a, b) => a.customer_price - b.customer_price);
      if (mockCouriers.length > 0) {
        mockCouriers[0].is_recommended = true;
      }

      // Apply guest markup if applicable
      const finalCouriers = isGuest
        ? mockCouriers.map(c => ({
            ...c,
            shipping_charge: Math.round(c.shipping_charge * DOMESTIC_GUEST_MULTIPLIER),
            gst_amount: Math.round(c.gst_amount * DOMESTIC_GUEST_MULTIPLIER),
            customer_price: Math.round(c.customer_price * DOMESTIC_GUEST_MULTIPLIER),
          }))
        : mockCouriers;

      return NextResponse.json({ success: true, couriers: finalCouriers, isGuest });
    }

    const couriers = await fetchDomesticRates(data as import('@/lib/domestic/types').RateCheckRequest);

    // Apply guest markup if applicable
    const finalCouriers = isGuest
      ? couriers.map(c => ({
          ...c,
          shipping_charge: Math.round(c.shipping_charge * DOMESTIC_GUEST_MULTIPLIER),
          gst_amount: Math.round(c.gst_amount * DOMESTIC_GUEST_MULTIPLIER),
          customer_price: Math.round(c.customer_price * DOMESTIC_GUEST_MULTIPLIER),
        }))
      : couriers;

    if (finalCouriers.length === 0) {
      console.warn('[domestic/rates] NimbusPost returned 0 couriers for:', {
        pickup: data.pickupPincode,
        delivery: data.deliveryPincode,
        weightKg: data.weightKg,
        dims: `${data.lengthCm}x${data.widthCm}x${data.heightCm}`,
      });
    }

    return NextResponse.json({ success: true, couriers: finalCouriers, isGuest });
  } catch (error) {
    console.error('[domestic/rates] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rates. Please try again.' },
      { status: 500 },
    );
  }
}
