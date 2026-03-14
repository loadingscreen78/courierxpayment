import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { CASHFREE_API_BASE, CASHFREE_API_VERSION } from '@/lib/wallet/cashfreeConfig';
import { MIN_RECHARGE_AMOUNT } from '@/lib/wallet/types';

export async function POST(request: NextRequest) {
  try {
    const appId = process.env.CASHFREE_APP_ID?.trim();
    const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();

    if (!appId || !secretKey) {
      console.error('[cashfree/create-order] Missing Cashfree credentials');
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount);
    const couponCode: string | null = body.couponCode || null;

    if (!Number.isFinite(amount) || amount < MIN_RECHARGE_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum recharge amount is ₹${MIN_RECHARGE_AMOUNT}` },
        { status: 400 },
      );
    }

    // Validate coupon if provided
    let couponData: { couponId: string; bonusAmount: number } | null = null;
    if (couponCode) {
      const { data: validation, error: valError } = await supabase.rpc('validate_coupon', {
        p_code: couponCode,
        p_user_id: user.id,
        p_amount: amount,
      });
      if (valError || !validation?.[0]?.is_valid) {
        return NextResponse.json(
          { error: validation?.[0]?.error_message || 'Invalid coupon' },
          { status: 400 },
        );
      }
      couponData = {
        couponId: validation[0].coupon_id,
        bonusAmount: Number(validation[0].bonus_amount),
      };
    }

    // Fetch customer profile for prefill
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone_number')
      .eq('id', user.id)
      .single();

    const orderId = `cxw_${user.id.slice(0, 8)}_${Date.now()}`;

    const orderPayload: Record<string, unknown> = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: user.id,
        customer_name: profile?.full_name || 'Customer',
        customer_email: profile?.email || user.email || '',
        customer_phone: profile?.phone_number || '9999999999',
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?order_id={order_id}`,
        notify_url: 'https://courierx.in/api/cashfree/webhook',
      },
      order_tags: {
        user_id: user.id,
        ...(couponCode ? { coupon_code: couponCode } : {}),
        ...(couponData ? { coupon_id: couponData.couponId, bonus_amount: String(couponData.bonusAmount) } : {}),
      },
    };

    const cfRes = await fetch(`${CASHFREE_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!cfRes.ok) {
      const errText = await cfRes.text();
      console.error('[cashfree/create-order] Cashfree API error:', cfRes.status, errText);
      return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
    }

    const order = await cfRes.json();

    return NextResponse.json({
      orderId: order.order_id,
      paymentSessionId: order.payment_session_id,
      amount,
    });
  } catch (error) {
    console.error('[cashfree/create-order] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
