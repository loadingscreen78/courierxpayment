import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { request_type, current_value, requested_value, reason } = body;

    if (!request_type || !['mobile_change', 'account_deletion'].includes(request_type)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }

    // Check for existing pending request of same type
    const { data: existing } = await supabaseAdmin
      .from('customer_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('request_type', request_type)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You already have a pending request of this type' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('customer_requests')
      .insert({
        user_id: user.id,
        request_type,
        current_value: current_value || null,
        requested_value: requested_value || null,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabaseAdmin.from('activity_logs').insert({
      user_id: user.id,
      action: request_type === 'mobile_change' ? 'Requested mobile number change' : 'Requested account deletion',
      details: request_type === 'mobile_change' 
        ? `From ${current_value} to ${requested_value}` 
        : reason || 'No reason provided',
    });

    return NextResponse.json({ success: true, request: data });
  } catch (err: any) {
    console.error('[request-change]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('customer_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ requests: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
