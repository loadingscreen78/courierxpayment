import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, amount } = await request.json();
    if (!code || !amount) {
      return NextResponse.json({ error: 'Coupon code and amount are required' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: code,
      p_user_id: user.id,
      p_amount: Number(amount),
    });

    if (error) {
      console.error('[coupons/validate] RPC error:', error);
      return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
    }

    const result = data?.[0];
    if (!result) {
      return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
    }

    if (!result.is_valid) {
      return NextResponse.json({ valid: false, error: result.error_message }, { status: 200 });
    }

    return NextResponse.json({
      valid: true,
      couponId: result.coupon_id,
      discountType: result.discount_type,
      discountValue: result.discount_value,
      bonusAmount: result.bonus_amount,
    });
  } catch (error) {
    console.error('[coupons/validate] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
