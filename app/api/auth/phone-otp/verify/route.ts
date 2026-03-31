import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOtp } from '@/lib/fast2sms/client';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, 'Phone must be in E.164 format'),
  code: z.string().length(6, 'OTP must be 6 digits'),
});

/** Build a deterministic synthetic email from a phone number */
function syntheticEmail(phone: string): string {
  return `${phone.replace(/\D/g, '')}@phone.courierx.local`;
}

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

    // 1. Verify OTP against stored value
    const verifyResult = verifyOtp(phone, code);

    if (!verifyResult.success) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || 'OTP verification failed' },
        { status: 401 }
      );
    }

    // 2. Create or retrieve Supabase user (mirrors whatsapp/verify-otp pattern)
    const supabase = getServiceRoleClient();
    const email = syntheticEmail(phone);

    const { data: listData } = await supabase.auth.admin.listUsers();
    const users = listData?.users ?? [];
    let existingUser = users.find(
      (u: { phone?: string }) => u.phone === phone
    );
    if (!existingUser) {
      existingUser = users.find(
        (u: { email?: string }) => u.email === email
      );
    }

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        phone,
        password: tempPassword,
        phone_confirm: true,
        email_confirm: true,
        user_metadata: { phone_number: phone, registered_via: 'phone_otp' },
      });

      if (createError || !newUser?.user) {
        console.error('[Phone OTP] Failed to create user:', createError?.message);
        return NextResponse.json(
          { success: false, error: createError?.message || 'Failed to create user account' },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;

      await supabase.from('profiles').upsert({
        user_id: userId,
        phone_number: phone,
        email,
        preferred_otp_method: 'whatsapp', // keeping existing enum value
      }, { onConflict: 'user_id' });
    }

    // 3. Generate magic link session (same pattern as whatsapp/verify-otp)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData) {
      console.error('[Phone OTP] generateLink failed:', linkError?.message);
      return NextResponse.json(
        { success: false, error: 'Failed to generate session' },
        { status: 500 }
      );
    }

    const hashedToken = linkData.properties?.hashed_token;

    if (!hashedToken) {
      console.error('[Phone OTP] No hashed_token in generateLink response');
      return NextResponse.json(
        { success: false, error: 'Failed to generate session token' },
        { status: 500 }
      );
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: hashedToken,
    });

    if (sessionError || !sessionData?.session) {
      console.error('[Phone OTP] session creation failed:', sessionError?.message);
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      userId,
      isNewUser,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      },
    });
  } catch (error) {
    console.error('[Phone OTP] verify error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
