import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

// Cashfree webhook signature verification (2025-01-01 version)
// Signature = HMAC-SHA256(timestamp + rawBody, secretKey) → base64
function verifyCashfreeSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secretKey: string,
): boolean {
  const payload = timestamp + rawBody;
  const expected = createHmac('sha256', secretKey).update(payload).digest('base64');
  return expected === signature;
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.CASHFREE_WEBHOOK_SECRET?.trim();
    if (!secretKey) {
      console.error('[cashfree/webhook] Missing CASHFREE_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
    }

    const rawBody = await request.text();
    const timestamp = request.headers.get('x-webhook-timestamp') || '';
    const signature = request.headers.get('x-webhook-signature') || '';

    if (!timestamp || !signature) {
      console.error('[cashfree/webhook] Missing signature headers');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    if (!verifyCashfreeSignature(rawBody, timestamp, signature, secretKey)) {
      console.error('[cashfree/webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType: string = event.type;

    console.log('[cashfree/webhook] Event received:', eventType);

    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
      const paymentData = event.data?.payment;
      const orderData = event.data?.order;

      if (!paymentData || !orderData) {
        console.error('[cashfree/webhook] Missing payment/order data');
        return NextResponse.json({ status: 'ok' });
      }

      const cfPaymentId = paymentData.cf_payment_id?.toString();
      const orderId = orderData.order_id;
      const amountInRupees = Number(orderData.order_amount);
      const userId = orderData.order_tags?.user_id;
      const paymentMethod = paymentData.payment_group?.toLowerCase() || 'upi';

      if (!userId) {
        console.error('[cashfree/webhook] Missing user_id in order_tags');
        return NextResponse.json({ status: 'ok' });
      }

      const supabase = getServiceRoleClient();
      const idempotencyKey = `cf_${cfPaymentId}`;

      const { error: rpcError } = await supabase.rpc('add_wallet_funds', {
        p_user_id: userId,
        p_amount: amountInRupees,
        p_description: `Wallet recharge via ${paymentMethod.toUpperCase()}`,
        p_reference_id: cfPaymentId,
        p_idempotency_key: idempotencyKey,
      });

      if (rpcError && rpcError.code !== '23505') {
        console.error('[cashfree/webhook] RPC error:', rpcError);
      }

      if (!rpcError) {
        const { data: entry } = await supabase
          .from('wallet_ledger')
          .select('id')
          .eq('idempotency_key', idempotencyKey)
          .single();

        if (entry) {
          await supabase
            .from('wallet_ledger')
            .update({
              metadata: {
                cf_payment_id: cfPaymentId,
                cf_order_id: orderId,
                method: paymentMethod,
                source: 'webhook',
              },
            })
            .eq('id', entry.id);
        }
      }

      console.log('[cashfree/webhook] PAYMENT_SUCCESS processed:', cfPaymentId);
    } else if (eventType === 'PAYMENT_FAILED_WEBHOOK') {
      const paymentData = event.data?.payment;
      console.log('[cashfree/webhook] PAYMENT_FAILED:', {
        cf_payment_id: paymentData?.cf_payment_id,
        payment_message: paymentData?.payment_message,
      });
    } else {
      console.log('[cashfree/webhook] Unhandled event type:', eventType);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[cashfree/webhook] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
