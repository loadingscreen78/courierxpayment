import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

/**
 * POST /api/user/link-guest-bookings
 * Links guest_bookings to the authenticated user's account by matching
 * sender_phone or sender_email against the user's profile.
 * Called once after login / on History page load.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile to get phone + email
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number, email')
      .eq('user_id', user.id)
      .single();

    const phone = profile?.phone_number?.replace(/\D/g, '').slice(-10) || null;
    const email = profile?.email || user.email || null;

    if (!phone && !email) {
      return NextResponse.json({ linked: 0 });
    }

    // Build OR filter for phone / email match
    const orParts: string[] = [];
    if (phone) orParts.push(`sender_phone.ilike.%${phone}`);
    if (email) orParts.push(`sender_email.eq.${email}`);

    const { data: unlinked, error: fetchErr } = await supabase
      .from('guest_bookings')
      .select('id')
      .is('user_id', null)
      .or(orParts.join(','));

    if (fetchErr) {
      console.error('[link-guest-bookings] fetch error:', fetchErr.message);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!unlinked || unlinked.length === 0) {
      return NextResponse.json({ linked: 0 });
    }

    const ids = unlinked.map((b) => b.id);
    const { error: updateErr } = await supabase
      .from('guest_bookings')
      .update({ user_id: user.id })
      .in('id', ids);

    if (updateErr) {
      console.error('[link-guest-bookings] update error:', updateErr.message);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ linked: ids.length });
  } catch (err: any) {
    console.error('[link-guest-bookings] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
