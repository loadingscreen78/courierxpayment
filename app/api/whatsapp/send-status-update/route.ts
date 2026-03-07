import { NextRequest, NextResponse } from 'next/server';
import { dispatchStatusWhatsApp } from '@/lib/whatsapp/dispatcher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shipmentId, status } = body;

    if (!shipmentId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: shipmentId and status are required' },
        { status: 400 }
      );
    }

    const result = await dispatchStatusWhatsApp(shipmentId, status);

    if (result.errors.length > 0 && !result.userWhatsAppSent) {
      return NextResponse.json(
        { success: false, result, error: result.errors.join('; ') },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[WhatsApp] send-status-update route error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
