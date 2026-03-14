import { ShipmentRow } from './types';
import { bookingRequestSchema } from './inputValidator';
import { getServiceRoleClient } from './supabaseAdmin';
import { updateShipmentStatus } from './stateMachine';
import * as nimbusClient from './nimbusClient';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface BookingRequest {
  userId: string;
  bookingReferenceId: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  originAddress: string;
  destinationAddress: string;
  destinationCountry: string;
  weightKg: number;
  dimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  declaredValue: number;
  shipmentType: 'medicine' | 'document' | 'gift';
  shippingCost?: number;
  gstAmount?: number;
  totalAmount?: number;
  cxbcPartnerId?: string;
  source?: 'cxbc' | 'customer';
}

export interface BookingResult {
  success: boolean;
  shipment?: ShipmentRow;
  error?: string;
  errorCode?: 'VALIDATION_ERROR' | 'NIMBUS_API_FAILURE' | 'RATE_LIMITED';
}

// ---------------------------------------------------------------------------
// createBooking
// ---------------------------------------------------------------------------

/**
 * Creates a new shipment booking.
 *
 * 1. Validate inputs via Zod
 * 2. Check idempotency by booking_reference_id
 * 3. Create shipment row (PENDING / DOMESTIC / version=1)
 * 4. Call Nimbus createShipment
 * 5. On success: update domestic_awb, transition to BOOKING_CONFIRMED
 * 6. On failure: mark FAILED, return error
 * 7. API calls are logged with PII masking by the Nimbus client
 */
export async function createBooking(req: BookingRequest): Promise<BookingResult> {
  // 1. Validate inputs
  const validation = bookingRequestSchema.safeParse({
    bookingReferenceId: req.bookingReferenceId,
    recipientName: req.recipientName,
    recipientPhone: req.recipientPhone,
    recipientEmail: req.recipientEmail,
    originAddress: req.originAddress,
    destinationAddress: req.destinationAddress,
    destinationCountry: req.destinationCountry,
    weightKg: req.weightKg,
    dimensions: req.dimensions,
    declaredValue: req.declaredValue,
    shipmentType: req.shipmentType,
    shippingCost: req.shippingCost,
    gstAmount: req.gstAmount,
    totalAmount: req.totalAmount,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues.map((i) => i.message).join('; '),
      errorCode: 'VALIDATION_ERROR',
    };
  }

  const supabase = getServiceRoleClient();

  // 2. Idempotency check
  const { data: existing } = await supabase
    .from('shipments')
    .select('*')
    .eq('booking_reference_id', req.bookingReferenceId)
    .maybeSingle();

  if (existing) {
    return { success: true, shipment: existing as unknown as ShipmentRow };
  }

  // 3. Create shipment row
  const { data: created, error: insertError } = await supabase
    .from('shipments')
    .insert({
      user_id: req.userId,
      booking_reference_id: req.bookingReferenceId,
      current_status: 'PENDING',
      current_leg: 'DOMESTIC',
      version: 1,
      recipient_name: req.recipientName,
      recipient_phone: req.recipientPhone,
      ...(req.recipientEmail && { recipient_email: req.recipientEmail }),
      origin_address: req.originAddress,
      destination_address: req.destinationAddress,
      destination_country: req.destinationCountry,
      weight_kg: req.weightKg,
      declared_value: req.declaredValue,
      shipment_type: req.shipmentType,
      alert_sent: false,
      ...(req.shippingCost !== undefined && { shipping_cost: req.shippingCost }),
      ...(req.gstAmount !== undefined && { gst_amount: req.gstAmount }),
      ...(req.totalAmount !== undefined && { total_amount: req.totalAmount }),
      ...(req.cxbcPartnerId && { cxbc_partner_id: req.cxbcPartnerId }),
      ...(req.source && { source: req.source }),
    })
    .select('*')
    .single();

  if (insertError || !created) {
    return {
      success: false,
      error: `Failed to create shipment: ${insertError?.message ?? 'unknown'}`,
    };
  }

  const shipment = created as unknown as ShipmentRow;

  // 4. Call Nimbus createShipment (retries + logging handled internally)
  let nimbusResponse: nimbusClient.NimbusCreateResponse;
  try {
    nimbusResponse = await nimbusClient.createShipment({
      senderName: 'CourierX',
      senderPhone: '',
      senderAddress: req.originAddress,
      recipientName: req.recipientName,
      recipientPhone: req.recipientPhone,
      recipientAddress: req.destinationAddress,
      weightKg: req.weightKg,
      declaredValue: req.declaredValue,
      shipmentType: req.shipmentType,
    });
  } catch {
    // 6. Nimbus failed after retries — mark FAILED
    await supabase
      .from('shipments')
      .update({ current_status: 'FAILED' })
      .eq('id', shipment.id)
      .eq('version', 1);

    return {
      success: false,
      error: 'Nimbus API call failed after retries',
      errorCode: 'NIMBUS_API_FAILURE',
    };
  }

  if (!nimbusResponse.success || !nimbusResponse.awb) {
    await supabase
      .from('shipments')
      .update({ current_status: 'FAILED' })
      .eq('id', shipment.id)
      .eq('version', 1);

    return {
      success: false,
      error: nimbusResponse.error ?? 'Nimbus API returned no AWB',
      errorCode: 'NIMBUS_API_FAILURE',
    };
  }

  // 5. Update domestic_awb and transition to BOOKING_CONFIRMED
  await supabase
    .from('shipments')
    .update({ domestic_awb: nimbusResponse.awb })
    .eq('id', shipment.id);

  // 5a. Fetch AWB label from Nimbus (non-blocking — failure doesn't abort booking)
  try {
    const labelResponse = await nimbusClient.fetchLabel(nimbusResponse.awb!);
    if (labelResponse.success) {
      const labelValue = labelResponse.labelUrl ?? labelResponse.labelBase64 ?? null;
      if (labelValue) {
        await supabase
          .from('shipments')
          .update({ domestic_label_url: labelValue })
          .eq('id', shipment.id);
      }
    }
  } catch (err) {
    console.warn('[bookingService] Label fetch failed (non-fatal):', err instanceof Error ? err.message : err);
  }

  const result = await updateShipmentStatus({
    shipmentId: shipment.id,
    newStatus: 'BOOKING_CONFIRMED',
    source: 'NIMBUS',
    metadata: { awb: nimbusResponse.awb, bookingReferenceId: req.bookingReferenceId },
    expectedVersion: 1,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? 'Failed to confirm booking',
    };
  }

  return { success: true, shipment: result.shipment };
}

// ---------------------------------------------------------------------------
// dispatchInternational
// ---------------------------------------------------------------------------

/**
 * Dispatches a shipment internationally.
 *
 * 1. Validate shipment is DISPATCH_APPROVED
 * 2. Generate mock international_awb
 * 3. Transition to INTERNATIONAL / DISPATCHED via state machine
 */
export async function dispatchInternational(
  shipmentId: string,
  expectedVersion: number,
): Promise<BookingResult> {
  const supabase = getServiceRoleClient();

  const { data: shipment, error: fetchError } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .single();

  if (fetchError || !shipment) {
    return { success: false, error: `Shipment not found: ${shipmentId}` };
  }

  const row = shipment as unknown as ShipmentRow;

  if (row.current_status !== 'DISPATCH_APPROVED') {
    return {
      success: false,
      error: `Shipment must be DISPATCH_APPROVED to dispatch internationally, current status: ${row.current_status}`,
    };
  }

  // Generate mock international AWB
  const internationalAwb = `INTL-${crypto.randomUUID()}`;

  await supabase
    .from('shipments')
    .update({ international_awb: internationalAwb })
    .eq('id', shipmentId);

  const result = await updateShipmentStatus({
    shipmentId,
    newStatus: 'DISPATCHED',
    newLeg: 'INTERNATIONAL',
    source: 'INTERNAL',
    metadata: { internationalAwb },
    expectedVersion,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, shipment: result.shipment };
}
