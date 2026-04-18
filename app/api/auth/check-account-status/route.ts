import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check profile account_status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('account_status, full_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        allowed: true, // If no profile yet, allow (they're in onboarding)
        status: 'unknown'
      });
    }

    const status = profile.account_status || 'active';

    if (status === 'pending') {
      // Allow pending users to access the dashboard — they'll see a KYC completion banner
      return NextResponse.json({
        allowed: true,
        status: 'pending',
        message: 'Complete your KYC to unlock lower shipping rates and full account features.'
      });
    }

    if (status === 'rejected') {
      return NextResponse.json({
        allowed: false,
        status: 'rejected',
        message: 'Your account application was not approved. Please contact support for more information.'
      });
    }

    if (status === 'suspended') {
      return NextResponse.json({
        allowed: false,
        status: 'suspended',
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    return NextResponse.json({
      allowed: true,
      status: 'active'
    });
  } catch (err: any) {
    console.error('[check-account-status] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
