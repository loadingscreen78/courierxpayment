import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/cxbc/partner-status
 * Returns the CXBC partner status for the currently authenticated user.
 * Uses service role to bypass RLS.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ isPartner: false, status: null }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token and get user
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ isPartner: false, status: null }, { status: 401 });
    }

    // Use service role to bypass RLS
    const supabase = getServiceRoleClient();

    // Check by user_id first
    const { data: byUserId } = await supabase
      .from('cxbc_partners')
      .select('id, status, business_name, owner_name, email, phone, zone, wallet_balance')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .maybeSingle();

    if (byUserId) {
      return NextResponse.json({ isPartner: true, partner: byUserId });
    }

    // Fallback: check by email
    if (user.email) {
      const { data: byEmail } = await supabase
        .from('cxbc_partners')
        .select('id, status, business_name, owner_name, email, phone, zone, wallet_balance')
        .eq('email', user.email)
        .eq('status', 'approved')
        .maybeSingle();

      if (byEmail) {
        // Auto-link user_id
        await supabase
          .from('cxbc_partners')
          .update({ user_id: user.id })
          .eq('id', byEmail.id);

        return NextResponse.json({ isPartner: true, partner: byEmail });
      }
    }

    // Check application status
    let applicationStatus: string | null = null;
    if (user.email) {
      const { data: app } = await supabase
        .from('cxbc_partner_applications')
        .select('status')
        .eq('email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      applicationStatus = app?.status ?? null;
    }

    return NextResponse.json({ isPartner: false, applicationStatus });
  } catch (err: any) {
    console.error('[partner-status]', err);
    return NextResponse.json({ isPartner: false, status: null }, { status: 500 });
  }
}
