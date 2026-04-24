import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

/**
 * GET /api/track?awb=<tracking_number_or_awb_or_phone>
 *
 * Public endpoint — no auth required.
 * Looks up by tracking_number, domestic_awb, or recipient_phone in shipments table.
 * Also searches guest_bookings table for guest shipments.
 * Returns shipment + full timeline for the customer tracking page.
 */
export async function GET(request: NextRequest) {
  const awb = request.nextUrl.searchParams.get('awb')?.trim();

  if (!awb) {
    return NextResponse.json({ success: false, error: 'Missing awb parameter' }, { status: 400 });
  }

  const supabase = getServiceRoleClient();

  // ── Search shipments table first ──
  let shipment: any = null;

  const { data: byTracking } = await supabase
    .from('shipments')
    .select('id, tracking_number, current_status, current_leg, domestic_awb, international_awb, recipient_name, destination_country, destination_address, origin_address, weight_kg, shipment_type, created_at')
    .eq('tracking_number', awb)
    .maybeSingle();

  if (byTracking) {
    shipment = byTracking;
  } else {
    const { data: byAwb } = await supabase
      .from('shipments')
      .select('id, tracking_number, current_status, current_leg, domestic_awb, international_awb, recipient_name, destination_country, destination_address, origin_address, weight_kg, shipment_type, created_at')
      .eq('domestic_awb', awb)
      .maybeSingle();

    if (byAwb) {
      shipment = byAwb;
    }
  }

  // If found in shipments, return with timeline
  if (shipment) {
    const { data: timeline } = await supabase
      .from('shipment_timeline')
      .select('id, status, leg, source, metadata, created_at')
      .eq('shipment_id', shipment.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      success: true,
      shipment,
      timeline: timeline ?? [],
    });
  }

  // ── Search guest_bookings table ──
  const { data: guestByTracking } = await supabase
    .from('guest_bookings')
    .select('*')
    .eq('tracking_number', awb)
    .maybeSingle();

  let guestBooking = guestByTracking;

  if (!guestBooking) {
    const { data: guestByAwb } = await supabase
      .from('guest_bookings')
      .select('*')
      .eq('awb_number', awb)
      .maybeSingle();
    guestBooking = guestByAwb;
  }

  if (!guestBooking) {
    // Try phone search in shipments (recipient_phone)
    const { data: byPhone } = await supabase
      .from('shipments')
      .select('id, tracking_number, current_status, current_leg, domestic_awb, international_awb, recipient_name, destination_country, destination_address, origin_address, weight_kg, shipment_type, created_at')
      .eq('recipient_phone', awb)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byPhone) {
      const { data: timeline } = await supabase
        .from('shipment_timeline')
        .select('id, status, leg, source, metadata, created_at')
        .eq('shipment_id', byPhone.id)
        .order('created_at', { ascending: true });

      return NextResponse.json({ success: true, shipment: byPhone, timeline: timeline ?? [] });
    }

    // Try phone search in guest_bookings (sender_phone) — strip to last 10 digits for flexible match
    const phoneDigits = awb.replace(/\D/g, '').slice(-10);
    const { data: guestByPhone } = await supabase
      .from('guest_bookings')
      .select('*')
      .ilike('sender_phone', `%${phoneDigits}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (guestByPhone) {
      guestBooking = guestByPhone;
    } else {
      return NextResponse.json({ success: false, error: 'No shipment found with this tracking number.' }, { status: 404 });
    }
  }

  // ── Build guest booking response in shipment-compatible format ──
  const payload = typeof guestBooking.booking_payload === 'string'
    ? JSON.parse(guestBooking.booking_payload)
    : guestBooking.booking_payload || {};

  const senderReceiver = payload.senderReceiver || {};
  const rateFormData = payload.rateFormData || {};
  const isInternational = !!rateFormData.destinationCountry;

  // Map guest booking status to lifecycle status
  const STATUS_MAP: Record<string, string> = {
    pending_payment: 'PENDING',
    paid: 'BOOKING_CONFIRMED',
    shipped: 'BOOKING_CONFIRMED',
    paid_nimbus_failed: 'PENDING',
  };

  const guestShipment = {
    id: guestBooking.order_id,
    tracking_number: guestBooking.tracking_number,
    current_status: STATUS_MAP[guestBooking.status] || 'PENDING',
    current_leg: 'DOMESTIC',
    domestic_awb: guestBooking.awb_number || null,
    international_awb: null,
    recipient_name: senderReceiver.receiverName || 'Recipient',
    destination_country: rateFormData.destinationCountry || 'IN',
    destination_address: `${senderReceiver.receiverAddress || ''}, ${senderReceiver.receiverCity || ''}`,
    origin_address: `${senderReceiver.senderAddress || ''}, ${senderReceiver.senderCity || ''}`,
    weight_kg: rateFormData.weightGrams ? rateFormData.weightGrams / 1000 : rateFormData.weightKg || null,
    shipment_type: guestBooking.shipment_type || rateFormData.shipmentType || 'parcel',
    created_at: guestBooking.created_at,
    is_guest: true,
  };

  // Build a simple timeline from guest booking status
  const guestTimeline: any[] = [];

  guestTimeline.push({
    id: `gt_${guestBooking.order_id}_1`,
    status: 'PENDING',
    leg: 'DOMESTIC',
    source: 'SYSTEM',
    metadata: {},
    created_at: guestBooking.created_at,
  });

  if (guestBooking.paid_at || guestBooking.status !== 'pending_payment') {
    guestTimeline.push({
      id: `gt_${guestBooking.order_id}_2`,
      status: 'BOOKING_CONFIRMED',
      leg: 'DOMESTIC',
      source: 'SYSTEM',
      metadata: { awb: guestBooking.awb_number || '' },
      created_at: guestBooking.paid_at || guestBooking.created_at,
    });
  }

  if (guestBooking.status === 'paid_nimbus_failed') {
    guestTimeline.push({
      id: `gt_${guestBooking.order_id}_3`,
      status: 'PENDING',
      leg: 'DOMESTIC',
      source: 'SYSTEM',
      metadata: { note: 'Shipment creation pending — our team is processing this manually.' },
      created_at: payload._failed_at || guestBooking.created_at,
    });
  }

  return NextResponse.json({
    success: true,
    shipment: guestShipment,
    timeline: guestTimeline,
  });
}
