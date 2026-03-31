import { NextRequest, NextResponse } from 'next/server';
import { CASHFREE_API_BASE, CASHFREE_API_VERSION } from '@/lib/wallet/cashfreeConfig';

/**
 * Lightweight payment status check — only queries Cashfree order status.
 * Does NOT trigger NimbusPost shipment creation. Used for polling during QR/UPI payments.
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ paid: false, error: 'Order ID required' }, { status: 400 });
    }

    const appId = process.env.CASHFREE_APP_ID?.trim();
    const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();

    if (!appId || !secretKey) {
      // Dev mode — always return paid
      return NextResponse.json({ paid: true });
    }

    const cfRes = await fetch(`${CASHFREE_API_BASE}/orders/${orderId}`, {
      headers: {
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
    });

    if (!cfRes.ok) {
      return NextResponse.json({ paid: false });
    }

    const order = await cfRes.json();
    return NextResponse.json({ paid: order.order_status === 'PAID' });
  } catch {
    return NextResponse.json({ paid: false });
  }
}
