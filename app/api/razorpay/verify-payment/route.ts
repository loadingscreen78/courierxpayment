import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { RAZORPAY_API_BASE } from '@/lib/wallet/razorpayConfig';

export async function POST(request: NextRequest) {
  try {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (!keySecret || !keyId) {
      console.error('[razorpay/verify] Missing Razorpay credentials');
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 500 },
      );
    }

    // Authenticate
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.slice(7),
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      await request.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment details' },
        { status: 400 },
      );
    }

    // HMAC-SHA256 signature verification
    const expectedSig = createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      console.error('[razorpay/verify] Signature mismatch');
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 },
      );
    }

    // Fetch order and payment from Razorpay to get verified amount and method
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const [orderRes, paymentRes] = await Promise.all([
      fetch(`${RAZORPAY_API_BASE}/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: `Basic ${basicAuth}` },
      }),
      fetch(`${RAZORPAY_API_BASE}/v1/payments/${razorpay_payment_id}`, {
        headers: { Authorization: `Basic ${basicAuth}` },
      }),
    ]);

    if (!orderRes.ok || !paymentRes.ok) {
      console.error('[razorpay/verify] Failed to fetch order/payment from Razorpay');
      return NextResponse.json(
        { error: 'Failed to verify payment details' },
        { status: 500 },
      );
    }

    const order = await orderRes.json();
    const payment = await paymentRes.json();

    const amountInRupees = order.amount / 100;
    const paymentMethod = payment.method || 'upi';

    // Credit wallet via add_wallet_funds RPC (idempotency via razorpay_payment_id)
    const { data: ledgerEntryId, error: rpcError } = await supabase.rpc(
      'add_wallet_funds',
      {
        p_user_id: user.id,
        p_amount: amountInRupees,
        p_description: `Wallet recharge via ${paymentMethod.toUpperCase()}`,
        p_reference_id: razorpay_payment_id,
        p_idempotency_key: razorpay_payment_id,
      },
    );

    if (rpcError) {
      // Duplicate idempotency key — already credited, return success
      if (rpcError.code === '23505') {
        const { data: existing } = await supabase
          .from('wallet_ledger')
          .select('id')
          .eq('idempotency_key', razorpay_payment_id)
          .single();

        return NextResponse.json({
          success: true,
          ledgerEntryId: existing?.id || '',
          amount: amountInRupees,
          paymentMethod,
        });
      }
      console.error('[razorpay/verify] RPC error:', rpcError);
      return NextResponse.json(
        { error: 'Failed to credit wallet' },
        { status: 500 },
      );
    }

    // Store Razorpay metadata on the ledger entry
    await supabase
      .from('wallet_ledger')
      .update({
        metadata: {
          razorpay_payment_id,
          razorpay_order_id,
          method: paymentMethod,
        },
      })
      .eq('id', ledgerEntryId);

    return NextResponse.json({
      success: true,
      ledgerEntryId,
      amount: amountInRupees,
      paymentMethod,
    });
  } catch (error) {
    console.error('[razorpay/verify] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
