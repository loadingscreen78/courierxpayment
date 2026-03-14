import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { CASHFREE_API_BASE, CASHFREE_API_VERSION } from '@/lib/wallet/cashfreeConfig';

export async function POST(request: NextRequest) {
  try {
    const appId = process.env.CASHFREE_APP_ID?.trim();
    const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();

    if (!appId || !secretKey) {
      console.error('[cashfree/verify] Missing Cashfree credentials');
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

    const { orderId, couponCode } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const cfHeaders = {
      'x-api-version': CASHFREE_API_VERSION,
      'x-client-id': appId,
      'x-client-secret': secretKey,
    };

    // Fetch order status from Cashfree
    const orderRes = await fetch(`${CASHFREE_API_BASE}/orders/${orderId}`, {
      headers: cfHeaders,
    });

    if (!orderRes.ok) {
      console.error('[cashfree/verify] Failed to fetch order:', orderRes.status);
      return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
    }

    const order = await orderRes.json();

    if (order.order_status !== 'PAID') {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${order.order_status}` },
        { status: 400 },
      );
    }

    // Fetch payments for this order to get payment method
    const paymentsRes = await fetch(`${CASHFREE_API_BASE}/orders/${orderId}/payments`, {
      headers: cfHeaders,
    });

    let paymentMethod = 'upi';
    let cfPaymentId = orderId;

    if (paymentsRes.ok) {
      const payments = await paymentsRes.json();
      const successfulPayment = Array.isArray(payments)
        ? payments.find((p: any) => p.payment_status === 'SUCCESS')
        : null;
      if (successfulPayment) {
        paymentMethod = successfulPayment.payment_group?.toLowerCase() || 'upi';
        cfPaymentId = successfulPayment.cf_payment_id?.toString() || orderId;
      }
    }

    const amountInRupees = Number(order.order_amount);
    const idempotencyKey = `cf_${cfPaymentId}`;

    // Credit wallet (idempotent)
    const { data: ledgerEntryId, error: rpcError } = await supabase.rpc('add_wallet_funds', {
      p_user_id: user.id,
      p_amount: amountInRupees,
      p_description: `Wallet recharge via ${paymentMethod.toUpperCase()}`,
      p_reference_id: cfPaymentId,
      p_idempotency_key: idempotencyKey,
    });

    if (rpcError) {
      if (rpcError.code === '23505') {
        // Already credited — idempotent success
        const { data: existing } = await supabase
          .from('wallet_ledger')
          .select('id')
          .eq('idempotency_key', idempotencyKey)
          .single();
        return NextResponse.json({
          success: true,
          ledgerEntryId: existing?.id || '',
          amount: amountInRupees,
          paymentMethod,
        });
      }
      console.error('[cashfree/verify] RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to credit wallet' }, { status: 500 });
    }

    // Store Cashfree metadata
    await supabase
      .from('wallet_ledger')
      .update({
        metadata: {
          cf_payment_id: cfPaymentId,
          cf_order_id: orderId,
          method: paymentMethod,
        },
      })
      .eq('id', ledgerEntryId);

    // Apply coupon bonus if applicable
    let bonusAmount = 0;
    let bonusLedgerEntryId: string | null = null;

    const resolvedCouponCode = couponCode || order.order_tags?.coupon_code;
    if (resolvedCouponCode) {
      const { data: validation, error: valError } = await supabase.rpc('validate_coupon', {
        p_code: resolvedCouponCode,
        p_user_id: user.id,
        p_amount: amountInRupees,
      });

      if (!valError && validation?.[0]?.is_valid) {
        bonusAmount = Number(validation[0].bonus_amount);
        const couponId = validation[0].coupon_id;
        const bonusKey = `bonus_cf_${cfPaymentId}`;

        const { data: bonusEntryId, error: bonusError } = await supabase.rpc('add_wallet_funds', {
          p_user_id: user.id,
          p_amount: bonusAmount,
          p_description: `Coupon bonus (${resolvedCouponCode.toUpperCase()})`,
          p_reference_id: cfPaymentId,
          p_idempotency_key: bonusKey,
        });

        if (!bonusError && bonusEntryId) {
          bonusLedgerEntryId = bonusEntryId;
          await supabase
            .from('wallet_ledger')
            .update({
              metadata: {
                coupon_code: resolvedCouponCode.toUpperCase(),
                coupon_id: couponId,
                cf_payment_id: cfPaymentId,
                type: 'coupon_bonus',
              },
            })
            .eq('id', bonusEntryId);

          await supabase.from('coupon_usage').insert({
            coupon_id: couponId,
            user_id: user.id,
            recharge_amount: amountInRupees,
            bonus_amount: bonusAmount,
            cf_order_id: orderId,
            ledger_entry_id: bonusEntryId,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      ledgerEntryId,
      amount: amountInRupees,
      paymentMethod,
      bonusAmount,
      bonusLedgerEntryId,
    });
  } catch (error) {
    console.error('[cashfree/verify] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
