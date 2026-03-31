import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { CASHFREE_API_BASE, CASHFREE_API_VERSION } from '@/lib/wallet/cashfreeConfig';

/**
 * Create a Cashfree payment order for guest (non-account) bookings.
 * No auth required — uses sender details for customer info.
 * Stores full booking payload so verify-guest-payment can create the NimbusPost shipment.
 */
export async function POST(request: NextRequest) {
  try {
    const appId = process.env.CASHFREE_APP_ID?.trim();
    const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();

    const formData = await request.formData();
    const amount = Number(formData.get('amount'));
    const senderReceiver = JSON.parse(formData.get('senderReceiver') as string || '{}');
    const rateFormData = JSON.parse(formData.get('rateFormData') as string || '{}');
    const selectedCourier = JSON.parse(formData.get('selectedCourier') as string || '{}');
    const aadhaarNumber = formData.get('aadhaarNumber') as string || '';
    const couponCode = formData.get('couponCode') as string || '';

    if (!amount || !senderReceiver?.senderEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const orderId = `cxg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const trackingNumber = `CRX-${Date.now().toString(36).toUpperCase()}`;

    // Store guest booking in DB with full payload for NimbusPost
    const supabase = getServiceRoleClient();
    const { error: insertError } = await supabase.from('guest_bookings').insert({
      order_id: orderId,
      tracking_number: trackingNumber,
      amount,
      sender_name: senderReceiver.senderName,
      sender_email: senderReceiver.senderEmail,
      sender_phone: senderReceiver.senderPhone,
      sender_address: `${senderReceiver.senderAddress}, ${senderReceiver.senderCity} - ${senderReceiver.senderPincode}`,
      receiver_name: senderReceiver.receiverName,
      receiver_email: senderReceiver.receiverEmail,
      receiver_phone: senderReceiver.receiverPhone,
      receiver_address: `${senderReceiver.receiverAddress}, ${senderReceiver.receiverCity} - ${senderReceiver.receiverZipcode}`,
      shipment_type: rateFormData?.shipmentType || 'gift',
      courier_name: selectedCourier?.carrier || selectedCourier?.courier_name || 'Unknown',
      aadhaar_last4: aadhaarNumber?.slice(-4) || '',
      coupon_code: couponCode || null,
      status: 'pending_payment',
      booking_payload: { senderReceiver, rateFormData, selectedCourier },
    });

    if (insertError) {
      console.error('[create-guest-order] DB insert failed:', insertError.message, insertError.code);
      return NextResponse.json({ error: `Booking failed: ${insertError.message}` }, { status: 500 });
    }

    if (!appId || !secretKey) {
      // Dev mode — return mock response
      return NextResponse.json({
        orderId: orderId,
        trackingNumber,
        awbUrl: '',
        paymentSessionId: null,
        amount,
      });
    }

    // Create Cashfree order
    const orderPayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: `guest_${Date.now()}`,
        customer_name: senderReceiver.senderName,
        customer_email: senderReceiver.senderEmail,
        customer_phone: senderReceiver.senderPhone?.replace(/\D/g, '').slice(-10) || '9999999999',
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/public/book/confirm?order_id={order_id}&tracking=${trackingNumber}`,
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/cashfree/webhook`,
      },
      order_tags: {
        type: 'guest_booking',
        tracking_number: trackingNumber,
        ...(couponCode ? { coupon_code: couponCode } : {}),
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
      console.error('[create-guest-order] Cashfree error:', cfRes.status, errText);
      return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
    }

    const order = await cfRes.json();

    return NextResponse.json({
      orderId: order.order_id,
      paymentSessionId: order.payment_session_id,
      trackingNumber,
      awbUrl: '',
      amount,
    });
  } catch (error) {
    console.error('[create-guest-order] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
