import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side signup that creates user and returns session tokens.
 * Called after our custom OTP verification, so email is already verified.
 * 
 * Strategy:
 * 1. Use supabase.auth.signUp() to create the user (same as client was doing)
 * 2. If no session returned (email confirmation enabled), use admin generateLink 
 *    to create a magic link session
 * 3. Return session tokens to the client
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Step 1: Try signUp — this creates the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    // If signUp returned a session, great — use it
    if (!signUpError && signUpData.session) {
      return NextResponse.json({
        success: true,
        session: {
          access_token: signUpData.session.access_token,
          refresh_token: signUpData.session.refresh_token,
        },
        user_id: signUpData.user?.id,
      });
    }

    // If user already exists error, or signUp succeeded but no session (email confirm enabled)
    // Either way, try signInWithPassword
    if (signUpError) {
      const msg = signUpError.message || '';
      if (!msg.includes('already') && !msg.includes('duplicate') && !msg.includes('exists')) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    // Step 2: Try direct sign in with password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError && signInData.session) {
      return NextResponse.json({
        success: true,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        },
        user_id: signInData.user?.id,
      });
    }

    // Step 3: signInWithPassword failed (likely email not confirmed)
    // Use admin generateLink to create a magic link, then exchange it for a session
    const userId = signUpData?.user?.id;
    if (!userId) {
      // Need to find the user
      const { data: listData } = await supabase.auth.admin.listUsers();
      const users = listData?.users ?? [];
      const found = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found) {
        return NextResponse.json({ error: 'Failed to create or find user' }, { status: 500 });
      }
      
      // Generate magic link to get a session
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

      // The hashed_token from generateLink can be used to verify OTP
      const token = linkData.properties?.hashed_token;
      if (token) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          type: 'magiclink',
          token_hash: token,
        });

        if (!verifyError && verifyData.session) {
          return NextResponse.json({
            success: true,
            session: {
              access_token: verifyData.session.access_token,
              refresh_token: verifyData.session.refresh_token,
            },
            user_id: verifyData.user?.id,
          });
        }
      }
    } else {
      // We have the userId from signUp, generate link for that email
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

      if (linkError || !linkData) {
        return NextResponse.json({ error: linkError?.message || 'Failed to generate session' }, { status: 500 });
      }

      const token = linkData.properties?.hashed_token;
      if (token) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          type: 'magiclink',
          token_hash: token,
        });

        if (!verifyError && verifyData.session) {
          return NextResponse.json({
            success: true,
            session: {
              access_token: verifyData.session.access_token,
              refresh_token: verifyData.session.refresh_token,
            },
            user_id: verifyData.user?.id,
          });
        }
      }
    }

    return NextResponse.json({ error: 'Failed to establish session. Please try logging in.' }, { status: 500 });
  } catch (err: any) {
    console.error('[signup-confirmed] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
