import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // First try to create the user with auto-confirm using admin API
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since we already verified via OTP
    });

    if (createError) {
      // If user already exists, try to sign them in directly
      if (createError.message.includes('already been registered') || 
          createError.message.includes('duplicate key') ||
          createError.message.includes('already exists')) {
        
        // Ensure the existing user's email is confirmed
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === email.toLowerCase());
        if (existingUser && !existingUser.email_confirmed_at) {
          await supabaseAdmin.auth.admin.updateUser(existingUser.id, {
            email_confirm: true,
          });
        }

        // Sign in the existing user
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
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

    // User created successfully, now sign them in to get session tokens
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // User was created but sign-in failed — shouldn't happen with auto-confirm
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
