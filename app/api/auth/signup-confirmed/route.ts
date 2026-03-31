import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

/**
 * Server-side signup that auto-confirms the email.
 * Called after our custom OTP verification, so email is already verified.
 * Creates the user with email_confirm=true and returns session tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Try to create the user with auto-confirm using admin API
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      const msg = createError.message || '';
      // If user already exists, just sign them in
      if (msg.includes('already been registered') || 
          msg.includes('duplicate key') ||
          msg.includes('already exists')) {
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          return NextResponse.json({ error: signInError.message }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          session: {
            access_token: signInData.session?.access_token,
            refresh_token: signInData.session?.refresh_token,
          },
          user_id: signInData.user?.id,
        });
      }

      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // User created, sign them in to get session tokens
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('[signup-confirmed] Sign-in after create failed:', signInError.message);
      return NextResponse.json({ error: 'Account created but sign-in failed. Please try logging in.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session: {
        access_token: signInData.session?.access_token,
        refresh_token: signInData.session?.refresh_token,
      },
      user_id: signInData.user?.id,
    });
  } catch (err: any) {
    console.error('[signup-confirmed] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
