import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

    if (!webhookSecret) {
      console.error('[razorpay/webhook] Missing RAZORPAY_WEBHOOK_SECRET');
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 500 },
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // Verify webhook signature
    const expectedSig = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSig !== signature) {
      console.error('[razorpay/webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 },
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    if (eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      if (!paymentEntity) {
        console.error('[razorpay/webhook] Missing payment entity');
        return NextResponse.json({ status: 'ok' });
      }

      const paymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      const amountInRupees = paymentEntity.amount / 100;
      const userId = paymentEntity.notes?.user_id;
      const method = paymentEntity.method || 'upi';

      if (!userId) {
        console.error('[razorpay/webhook] Missing user_id in payment notes');
        return NextResponse.json({ status: 'ok' });
      }

      const supabase = getServiceRoleClient();

      // Credit wallet (idempotency prevents duplicates if verify-payment already ran)
      const { error: rpcError } = await supabase.rpc('add_wallet_funds', {
        p_user_id: userId,
        p_amount: amountInRupees,
        p_description: `Wallet recharge via ${method.toUpperCase()}`,
        p_reference_id: paymentId,
        p_idempotency_key: paymentId,
      });

      if (rpcError && rpcError.code !== '23505') {
        console.error('[razorpay/webhook] RPC error:', rpcError);
      }

      // Update metadata if entry was just created
      if (!rpcError) {
        const { data: entry } = await supabase
          .from('wallet_ledger')
          .select('id')
          .eq('idempotency_key', paymentId)
          .single();

        if (entry) {
          await supabase
            .from('wallet_ledger')
            .update({
              metadata: {
                razorpay_payment_id: paymentId,
                razorpay_order_id: orderId,
                method,
                source: 'webhook',
              },
            })
            .eq('id', entry.id);
        }
      }

      console.log('[razorpay/webhook] payment.captured processed:', paymentId);
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      console.log('[razorpay/webhook] payment.failed:', {
        id: paymentEntity?.id,
        error_code: paymentEntity?.error_code,
        error_description: paymentEntity?.error_description,
      });
      // No ledger modification for failed payments
    } else {
      console.log('[razorpay/webhook] Unhandled event type:', eventType);
    }

    // Always return 200 for valid signatures to prevent Razorpay retries
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[razorpay/webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
