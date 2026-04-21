import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { createDomesticShipment } from '@/lib/domestic/nimbusPostDomestic';
import { DOMESTIC_LIMITS } from '@/lib/domestic/types';
import type { DomesticShipmentType } from '@/lib/domestic/types';

const addressSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().regex(/^\+?[6-9]\d{9,13}$/),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional().default(''),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/),
});

const bookingSchema = z.object({
  shipmentType: z.enum(['document', 'gift', 'laptop']),
  weightKg: z.number().positive(),
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  declaredValue: z.number().nonnegative().max(100000),
  contentDescription: z.string().min(1).max(500),
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema,
  selectedCourier: z.object({
    courier_company_id: z.number(),
    courier_name: z.string(),
    customer_price: z.number().positive(),
    shipping_charge: z.number().nonnegative().optional(),
    gst_amount: z.number().nonnegative().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabase = getServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate
    const body = await request.json();
    const validation = bookingSchema.safeParse(body);
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

    const totalAmount = data.selectedCourier.customer_price;
    const gstAmount = data.selectedCourier.gst_amount ?? 0;
    const shippingCost = data.selectedCourier.shipping_charge ?? totalAmount;

    // 3. Check wallet balance
    const { data: ledgerData, error: ledgerError } = await supabase
      .rpc('get_wallet_balance', { p_user_id: user.id });

    const walletBalance = ledgerData ?? 0;
    if (ledgerError || walletBalance < totalAmount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient wallet balance. Required: ₹${totalAmount}, Available: ₹${Math.floor(walletBalance)}`,
      }, { status: 400 });
    }

    // 4. Create shipment in DB first
    const trackingNumber = `CXD${Date.now().toString(36).toUpperCase()}`;
    const bookingRefId = `DOM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const pickupAddr = data.pickupAddress;
    const deliveryAddr = data.deliveryAddress;
    const originStr = `${pickupAddr.addressLine1}, ${pickupAddr.city}, ${pickupAddr.state} ${pickupAddr.pincode}`;
    const destStr = `${deliveryAddr.addressLine1}, ${deliveryAddr.city}, ${deliveryAddr.state} ${deliveryAddr.pincode}`;

    const { data: shipment, error: insertError } = await supabase
      .from('shipments')
      .insert({
        user_id: user.id,
        booking_reference_id: bookingRefId,
        tracking_number: trackingNumber,
        shipment_type: data.shipmentType,
        current_status: 'PENDING',
        current_leg: 'DOMESTIC',
        version: 1,
        recipient_name: deliveryAddr.fullName,
        recipient_phone: deliveryAddr.phone,
        origin_address: originStr,
        destination_address: destStr,
        destination_country: 'India',
        weight_kg: data.weightKg,
        declared_value: data.declaredValue,
        shipping_cost: shippingCost,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        alert_sent: false,
        pickup_address: pickupAddr,
        consignee_address: deliveryAddr,
        source: 'customer',
      })
      .select('*')
      .single();

    if (insertError || !shipment) {
      console.error('[domestic/book] Insert error:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create shipment record',
      }, { status: 500 });
    }

    // 5. Call NimbusPost to create shipment & get AWB
    const skipNimbus = !process.env.NIMBUS_EMAIL || !process.env.NIMBUS_PASSWORD;

    let awb: string;
    let labelUrl: string | undefined;

    if (skipNimbus) {
      awb = `CXD-MOCK-${Date.now()}`;
      labelUrl = undefined;
    } else {
      const nimbusResult = await createDomesticShipment({
        courier_id: data.selectedCourier.courier_company_id,
        pickup: {
          name: pickupAddr.fullName,
          phone: pickupAddr.phone,
          address: `${pickupAddr.addressLine1} ${pickupAddr.addressLine2}`.trim(),
          city: pickupAddr.city,
          state: pickupAddr.state,
          pincode: pickupAddr.pincode,
        },
        delivery: {
          name: deliveryAddr.fullName,
          phone: deliveryAddr.phone,
          address: `${deliveryAddr.addressLine1} ${deliveryAddr.addressLine2}`.trim(),
          city: deliveryAddr.city,
          state: deliveryAddr.state,
          pincode: deliveryAddr.pincode,
        },
        order_amount: data.declaredValue,
        weight: data.weightKg,
        length: data.lengthCm,
        breadth: data.widthCm,
        height: data.heightCm,
        payment_type: 'prepaid',
        content_description: data.contentDescription,
      });

      if (!nimbusResult.success || !nimbusResult.awb) {
        // Mark shipment as failed
        await supabase
          .from('shipments')
          .update({ current_status: 'FAILED' })
          .eq('id', shipment.id);

        return NextResponse.json({
          success: false,
          error: nimbusResult.error || 'Failed to create shipment with courier',
        }, { status: 502 });
      }

      awb = nimbusResult.awb;
      labelUrl = nimbusResult.label_url;
    }

    // 6. Update shipment with AWB
    await supabase
      .from('shipments')
      .update({
        domestic_awb: awb,
        current_status: 'BOOKING_CONFIRMED',
        ...(labelUrl && { domestic_label_url: labelUrl }),
      })
      .eq('id', shipment.id);

    // 7. Deduct wallet
    await supabase.from('wallet_ledger').insert({
      user_id: user.id,
      transaction_type: 'debit',
      amount: totalAmount,
      description: `Domestic ${data.shipmentType} shipment — ${data.selectedCourier.courier_name} — AWB: ${awb}`,
      reference_id: shipment.id,
      reference_type: 'shipment',
    });

    return NextResponse.json({
      success: true,
      shipment: {
        id: shipment.id,
        awb,
        tracking_number: trackingNumber,
        label_url: labelUrl,
        courier_name: data.selectedCourier.courier_name,
        total_amount: totalAmount,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[domestic/book] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
