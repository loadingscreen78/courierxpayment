import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { getCancellationEligibility, processCancellation } from '@/lib/shipment-lifecycle/cancellationService';
import type { ShipmentStatus } from '@/lib/shipment-lifecycle/types';

const bodySchema = z.object({
  shipmentId: z.string().uuid(),
});

// Simple in-memory rate limiter: max 5 cancellations per user per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return { allowed: true };
  }
  if (entry.count >= 5) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }
  entry.count++;
  return { allowed: true };
}

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

    // 2. Rate limit
    const rl = checkRateLimit(user.id);
    if (!rl.allowed) {
      const retryAfterSec = Math.ceil((rl.retryAfterMs ?? 60_000) / 1000);
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      );
    }

    // 3. Validate body
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.issues,
      }, { status: 400 });
    }

    const { shipmentId } = parsed.data;

    // 4. Check if user is admin (admins can cancel on behalf of users)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = (roles ?? []).some((r: any) =>
      ['admin', 'super_admin'].includes(r.role)
    );

    // 5. Fetch shipment to determine ownership
    const { data: shipment, error: fetchError } = await supabase
      .from('shipments')
      .select('user_id, current_status')
      .eq('id', shipmentId)
      .single();

    if (fetchError || !shipment) {
      return NextResponse.json({ success: false, error: 'Shipment not found' }, { status: 404 });
    }

    // Verify ownership or admin
    if (shipment.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // 6. Pre-check eligibility for a clear error message
    const eligibility = getCancellationEligibility(shipment.current_status as ShipmentStatus);
    if (!eligibility.canCancel) {
      return NextResponse.json({
        success: false,
        error: eligibility.reason,
        stage: eligibility.stage,
      }, { status: 400 });
    }

    // 7. Process cancellation (uses the shipment's user_id for refund, not the caller)
    const result = await processCancellation(shipmentId, shipment.user_id);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      refundAmount: result.refundAmount,
      refundStatus: result.refundStatus,
    });
  } catch (err) {
    console.error('[cancel] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
