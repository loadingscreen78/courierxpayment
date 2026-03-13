import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { RAZORPAY_API_BASE } from '@/lib/wallet/razorpayConfig';
import { MIN_RECHARGE_AMOUNT } from '@/lib/wallet/types';

export async function POST(request: NextRequest) {
  try {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (!keyId || !keySecret) {
      console.error('[razorpay/create-order] Missing Razorpay credentials');
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 500 },
      );
    }

    // Authenticate via Supabase session
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

    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount < MIN_RECHARGE_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum recharge amount is ₹${MIN_RECHARGE_AMOUNT}` },
        { status: 400 },
      );
    }

    // Create Razorpay order
    const paise = Math.round(amount * 100);
    const receiptId = `rcpt_${user.id.slice(0, 8)}_${Date.now()}`;

    const razorpayRes = await fetch(`${RAZORPAY_API_BASE}/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: paise,
        currency: 'INR',
        receipt: receiptId,
        notes: { user_id: user.id },
      }),
    });

    if (!razorpayRes.ok) {
      const errText = await razorpayRes.text();
      console.error('[razorpay/create-order] Razorpay API error:', razorpayRes.status, errText);
      console.error('[razorpay/create-order] Key ID length:', keyId.length, 'Secret length:', keySecret.length);
      return NextResponse.json(
        { error: 'Failed to create payment order' },
        { status: 500 },
      );
    }

    const order = await razorpayRes.json();

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    console.error('[razorpay/create-order] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
