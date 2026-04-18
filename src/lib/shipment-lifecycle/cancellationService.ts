import type { ShipmentStatus } from './types';
import { getServiceRoleClient } from './supabaseAdmin';

interface CancellationEligibility {
  canCancel: boolean;
  refundPercentage: number;
  stage: string;
  reason: string;
}

/**
 * Stage 1 & 2 statuses — eligible for 100% refund and cancellation.
 * Stage 3+ (DISPATCH_APPROVED, DISPATCHED, international, delivered) — no cancellation.
 */
const CANCELLABLE_STATUSES: ShipmentStatus[] = [
  // Stage 1 – Before Pickup
  'PENDING',
  'BOOKING_CONFIRMED',
  // Stage 2 – After Pickup but Before Export Clearance
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'ARRIVED_AT_WAREHOUSE',
  'QUALITY_CHECKED',
  'PACKAGED',
];

export function getCancellationEligibility(status: ShipmentStatus): CancellationEligibility {
  if (['PENDING', 'BOOKING_CONFIRMED'].includes(status)) {
    return {
      canCancel: true,
      refundPercentage: 100,
      stage: 'Stage 1 – Before Pickup',
      reason: 'Full refund to wallet',
    };
  }

  if (['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ARRIVED_AT_WAREHOUSE', 'QUALITY_CHECKED', 'PACKAGED'].includes(status)) {
    return {
      canCancel: true,
      refundPercentage: 100,
      stage: 'Stage 2 – Before Export Clearance',
      reason: 'Full refund to wallet',
    };
  }

  if (['DISPATCH_APPROVED', 'DISPATCHED'].includes(status)) {
    return {
      canCancel: false,
      refundPercentage: 0,
      stage: 'Stage 3 – After Customs Filing',
      reason: 'Cancellation not allowed after customs filing',
    };
  }

  if (['IN_INTERNATIONAL_TRANSIT', 'CUSTOMS_CLEARANCE', 'INTL_OUT_FOR_DELIVERY'].includes(status)) {
    return {
      canCancel: false,
      refundPercentage: 0,
      stage: 'Stage 4 – In Transit Internationally',
      reason: 'Cancellation not allowed during international transit',
    };
  }

  if (status === 'INTL_DELIVERED') {
    return {
      canCancel: false,
      refundPercentage: 0,
      stage: 'Stage 5 – Delivered',
      reason: 'Shipment already delivered',
    };
  }

  // FAILED, CANCELLED, or unknown
  return {
    canCancel: false,
    refundPercentage: 0,
    stage: 'N/A',
    reason: status === 'CANCELLED' ? 'Shipment is already cancelled' : 'Cancellation not available for this status',
  };
}

export function isCancellable(status: ShipmentStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

interface CancellationResult {
  success: boolean;
  error?: string;
  refundAmount?: number;
  refundStatus?: 'refunded' | 'no_refund';
}

/**
 * Orchestrates the full cancellation flow:
 * 1. Fetch shipment & verify ownership
 * 2. Check eligibility
 * 3. Atomically update status to CANCELLED (version check)
 * 4. Process wallet refund if eligible
 * 5. Insert timeline entry
 */
export async function processCancellation(
  shipmentId: string,
  userId: string
): Promise<CancellationResult> {
  const supabase = getServiceRoleClient();

  // 1. Fetch shipment
  const { data: shipment, error: fetchError } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .single();

  if (fetchError || !shipment) {
    return { success: false, error: 'Shipment not found' };
  }

  // Verify ownership (user_id must match, unless caller is admin — handled at API layer)
  if (shipment.user_id !== userId) {
    return { success: false, error: 'You do not own this shipment' };
  }

  const currentStatus = shipment.current_status as ShipmentStatus;

  // 2. Check eligibility
  const eligibility = getCancellationEligibility(currentStatus);
  if (!eligibility.canCancel) {
    return { success: false, error: eligibility.reason };
  }

  // 3. Atomic status update with version check
  const currentVersion = shipment.version as number;
  const { data: updated, error: updateError } = await supabase
    .from('shipments')
    .update({
      current_status: 'CANCELLED',
      version: currentVersion + 1,
    })
    .eq('id', shipmentId)
    .eq('version', currentVersion)
    .select('*')
    .single();

  if (updateError || !updated) {
    return { success: false, error: 'Concurrent modification detected, please retry' };
  }

  // 4. Process refund if eligible
  let refundAmount = 0;
  if (eligibility.refundPercentage > 0) {
    const totalAmount = parseFloat(shipment.total_amount) || 0;
    refundAmount = Math.round((totalAmount * eligibility.refundPercentage) / 100 * 100) / 100;

    if (refundAmount > 0) {
      const { error: refundError } = await supabase
        .from('wallet_ledger')
        .insert({
          user_id: userId,
          transaction_type: 'refund',
          amount: refundAmount,
          description: `Cancellation refund for shipment ${shipment.tracking_number}`,
          reference_id: shipmentId,
          reference_type: 'refund',
        });

      if (refundError) {
        console.error('[cancellationService] Refund insert failed:', refundError);
        // Status is already CANCELLED — log but don't fail the whole operation
        // The refund can be manually processed by admin
      }
    }
  }

  // 5. Insert timeline entry
  const { error: timelineError } = await supabase
    .from('shipment_timeline')
    .insert({
      shipment_id: shipmentId,
      status: 'CANCELLED',
      leg: shipment.current_leg,
      source: 'SYSTEM',
      metadata: {
        cancelledBy: userId,
        previousStatus: currentStatus,
        refundAmount,
        refundPercentage: eligibility.refundPercentage,
        stage: eligibility.stage,
      },
    });

  if (timelineError) {
    console.error('[cancellationService] Timeline insert failed:', timelineError);
  }

  return {
    success: true,
    refundAmount,
    refundStatus: refundAmount > 0 ? 'refunded' : 'no_refund',
  };
}
