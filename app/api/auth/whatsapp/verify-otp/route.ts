import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyWhatsAppOtp } from '@/lib/whatsapp/verify';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, 'Phone must be in E.164 format'),
  code: z.string().length(6, 'OTP must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = verifyOtpSchema.safeParse(body);

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

    const { phone, code } = validation.data;

    // 1. Verify OTP with Twilio
    const verifyResult = await verifyWhatsAppOtp(phone, code);

    if (!verifyResult.success) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || 'OTP verification failed' },
        { status: 401 }
      );
    }

    // 2. Create or retrieve Supabase user by phone
    const supabase = getServiceRoleClient();

    // Check if user exists with this phone
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.phone === phone
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user with phone
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        phone,
        phone_confirm: true,
      });

      if (createError || !newUser?.user) {
        console.error('[WhatsApp Auth] Failed to create user:', createError?.message);
        return NextResponse.json(
          { success: false, error: 'Failed to create user account' },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
    }

    // 3. Generate a session link for the user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `${phone.replace('+', '')}@phone.courierx.local`,
    });

    // Fallback: use signInWithPassword-less approach via admin
    // Generate an OTP-verified session by updating user and creating a session
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: existingUser?.email || `${phone.replace(/\+/g, '')}@phone.courierx.local`,
    });

    if (sessionError) {
      console.error('[WhatsApp Auth] Session generation failed:', sessionError.message);
      // Still return success since OTP was verified — client can use phone sign-in
      return NextResponse.json({
        success: true,
        verified: true,
        userId,
        message: 'OTP verified. Use Supabase phone sign-in to complete authentication.',
      });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      userId,
      actionLink: sessionData?.properties?.action_link,
    });
  } catch (error) {
    console.error('[WhatsApp Auth] verify-otp error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
