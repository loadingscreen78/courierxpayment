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

    // Check profile — if no profile or column missing, allow through
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      // No profile yet — allow (onboarding)
      return NextResponse.json({ allowed: true, status: 'unknown' });
    }

    // Check if user is an approved CXBC partner — always allow them through
    const { data: cxbcPartner } = await supabaseAdmin
      .from('cxbc_partners')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .maybeSingle();

    if (cxbcPartner) {
      return NextResponse.json({ allowed: true, status: 'cxbc_partner' });
    }

    // Default: allow all authenticated users
    return NextResponse.json({ allowed: true, status: 'active' });
  } catch (err: any) {
    console.error('[check-account-status] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
