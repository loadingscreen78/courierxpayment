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
    const couponCode = body.couponCode || null;

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

    // Create Razorpay order
    const paise = Math.round(amount * 100);
    const receiptId = `rcpt_${user.id.slice(0, 8)}_${Date.now()}`;

    const notes: Record<string, string> = { user_id: user.id };
    if (couponCode) notes.coupon_code = couponCode;
    if (couponData) {
      notes.coupon_id = couponData.couponId;
      notes.bonus_amount = couponData.bonusAmount.toString();
    }

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
        notes,
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
