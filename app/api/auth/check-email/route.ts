import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/auth/check-email
 * Checks whether an email already exists in the system.
 * Returns { exists: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check auth.users via admin API
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const users = listData?.users ?? [];
    const found = users.find(
      (u: { email?: string }) => u.email?.toLowerCase() === normalizedEmail
    );

    return NextResponse.json({ exists: !!found });
  } catch (err: any) {
    console.error('[check-email] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
