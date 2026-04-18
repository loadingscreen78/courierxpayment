import type { ShipmentStatus, ShipmentLeg } from './types';
import { getServiceRoleClient } from './supabaseAdmin';

export interface CancellationEligibility {
  canCancel: boolean;
  refundPercentage: number;
  deductionPercentage: number;
  stage: string;
  reason: string;
  isFreeWindow: boolean;
}

const CANCELLABLE_STATUSES: ShipmentStatus[] = [
  'PENDING', 'BOOKING_CONFIRMED',
  'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
  'ARRIVED_AT_WAREHOUSE', 'QUALITY_CHECKED', 'PACKAGED',
];

const FREE_CANCELLATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Determines cancellation eligibility based on time elapsed and shipment type.
 *
 * Domestic:
 *   - Within 1hr: 100% refund (free cancellation)
 *   - After 1hr: No refund
 *
 * International (COUNTER leg):
 *   - Within 1hr: 100% refund (free cancellation)
 *   - After 1hr: 90% refund (10% deduction)
 */
export function getCancellationEligibility(
  status: ShipmentStatus,
  createdAt: string,
  currentLeg: ShipmentLeg
): CancellationEligibility {
  // Terminal / non-cancellable statuses
  if (status === 'CANCELLED') {
    return { canCancel: false, refundPercentage: 0, deductionPercentage: 0, stage: 'N/A', reason: 'Shipment is already cancelled', isFreeWindow: false };
  }
  if (status === 'FAILED') {
    return { canCancel: false, refundPercentage: 0, deductionPercentage: 0, stage: 'N/A', reason: 'Shipment has failed', isFreeWindow: false };
  }

  // Stage 3+ — not cancellable
  if (['DISPATCH_APPROVED', 'DISPATCHED'].includes(status)) {
    return { canCancel: false, refundPercentage: 0, deductionPercentage: 0, stage: 'Stage 3 – After Customs Filing', reason: 'Cancellation not allowed after customs filing', isFreeWindow: false };
  }
  if (['IN_INTERNATIONAL_TRANSIT', 'CUSTOMS_CLEARANCE', 'INTL_OUT_FOR_DELIVERY'].includes(status)) {
    return { canCancel: false, refundPercentage: 0, deductionPercentage: 0, stage: 'Stage 4 – In Transit', reason: 'Cancellation not allowed during international transit', isFreeWindow: false };
  }
  if (status === 'INTL_DELIVERED') {
    return { canCancel: false, refundPercentage: 0, deductionPercentage: 0, stage: 'Stage 5 – Delivered', reason: 'Shipment already delivered', isFreeWindow: false };
  }

  if (!CANCELLABLE_STATUSES.includes(status)) {
    return { canCancel: false, refundPercentage: 0, deductionPercentage: 0, stage: 'N/A', reason: 'Cancellation not available', isFreeWindow: false };
  }

  // Time-based logic
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const withinFreeWindow = elapsed < FREE_CANCELLATION_WINDOW_MS;
  const isDomestic = currentLeg === 'DOMESTIC';

  if (withinFreeWindow) {
    // Both domestic & international: free cancellation within 1hr
    return {
      canCancel: true,
      refundPercentage: 100,
      deductionPercentage: 0,
      stage: 'Free Cancellation Window',
      reason: 'Full refund — cancelled within 1 hour',
      isFreeWindow: true,
    };
  }

  // After 1hr
  if (isDomestic) {
    return {
      canCancel: true,
      refundPercentage: 0,
      deductionPercentage: 100,
      stage: 'After Free Window – Domestic',
      reason: 'No refund — domestic cancellation after 1 hour',
      isFreeWindow: false,
    };
  }

  // International after 1hr — 10% deduction
  return {
    canCancel: true,
    refundPercentage: 90,
    deductionPercentage: 10,
    stage: 'After Free Window – International',
    reason: '90% refund — 10% cancellation fee deducted',
    isFreeWindow: false,
  };
}

export function isCancellable(status: ShipmentStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}


export interface CancellationResult {
  success: boolean;
  error?: string;
  refundAmount?: number;
  deductionAmount?: number;
  refundStatus?: 'full_refund' | 'partial_refund' | 'no_refund';
}

/**
 * Orchestrates the full cancellation flow:
 * 1. Fetch shipment
 * 2. Check time-based eligibility
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

  if (shipment.user_id !== userId) {
    return { success: false, error: 'You do not own this shipment' };
  }

  const currentStatus = shipment.current_status as ShipmentStatus;
  const currentLeg = shipment.current_leg as ShipmentLeg;

  // 2. Check eligibility with time-based rules
  const eligibility = getCancellationEligibility(currentStatus, shipment.created_at, currentLeg);
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

  // 4. Process refund
  const totalAmount = parseFloat(shipment.total_amount) || 0;
  const refundAmount = Math.round((totalAmount * eligibility.refundPercentage) / 100 * 100) / 100;
  const deductionAmount = Math.round(totalAmount - refundAmount);

  if (refundAmount > 0) {
    const description = eligibility.isFreeWindow
      ? `Free cancellation refund for ${shipment.tracking_number}`
      : `Cancellation refund (${eligibility.deductionPercentage}% fee) for ${shipment.tracking_number}`;

    const { error: refundError } = await supabase
      .from('wallet_ledger')
      .insert({
        user_id: userId,
        transaction_type: 'refund',
        amount: refundAmount,
        description,
        reference_id: shipmentId,
        reference_type: 'refund',
      });

    if (refundError) {
      console.error('[cancellationService] Refund insert failed:', refundError);
    }
  }

  // 5. Insert timeline entry
  const { error: timelineError } = await supabase
    .from('shipment_timeline')
    .insert({
      shipment_id: shipmentId,
      status: 'CANCELLED',
      leg: currentLeg,
      source: 'SYSTEM',
      metadata: {
        cancelledBy: userId,
        previousStatus: currentStatus,
        refundAmount,
        deductionAmount,
        refundPercentage: eligibility.refundPercentage,
        deductionPercentage: eligibility.deductionPercentage,
        stage: eligibility.stage,
        isFreeWindow: eligibility.isFreeWindow,
      },
    });

  if (timelineError) {
    console.error('[cancellationService] Timeline insert failed:', timelineError);
  }

  let refundStatus: 'full_refund' | 'partial_refund' | 'no_refund' = 'no_refund';
  if (eligibility.refundPercentage === 100) refundStatus = 'full_refund';
  else if (eligibility.refundPercentage > 0) refundStatus = 'partial_refund';

  return {
    success: true,
    refundAmount,
    deductionAmount,
    refundStatus,
  };
}
