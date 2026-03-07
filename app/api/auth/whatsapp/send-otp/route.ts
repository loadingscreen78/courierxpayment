import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendWhatsAppOtp } from '@/lib/whatsapp/verify';

const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, 'Phone must be in E.164 format (e.g. +91XXXXXXXXXX)'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = sendOtpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppOtp(validation.data.phone);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'OTP sent via WhatsApp' });
  } catch (error) {
    console.error('[WhatsApp Auth] send-otp error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
