import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyAdmin(token: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  const { data: roles } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
  const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');
  return isAdmin ? user : null;
}

// GET all customer requests
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await verifyAdmin(authHeader.replace('Bearer ', ''));
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabaseAdmin
      .from('customer_requests')
      .select('*, profiles:user_id(full_name, email, phone_number, account_number)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ requests: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH - approve/reject a request
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await verifyAdmin(authHeader.replace('Bearer ', ''));
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { request_id, action, admin_notes } = await req.json();
    if (!request_id || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    // Get the request
    const { data: request, error: fetchErr } = await supabaseAdmin
      .from('customer_requests')
      .select('*, profiles:user_id(full_name, email, phone_number)')
      .eq('id', request_id)
      .single();

    if (fetchErr || !request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (request.status !== 'pending') return NextResponse.json({ error: 'Request already resolved' }, { status: 400 });

    // Handle account_opening approval
    if (action === 'approved' && request.request_type === 'account_opening') {
      // Activate the account
      await supabaseAdmin
        .from('profiles')
        .update({ account_status: 'active' })
        .eq('user_id', request.user_id);

      // Send approval email via Resend
      const customerEmail = request.profiles?.email;
      const customerName = request.profiles?.full_name || 'Customer';
      if (customerEmail) {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/account-approved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userEmail: customerEmail,
            userName: customerName,
          }),
        }).catch(err => console.error('[PATCH] Failed to send approval email:', err));
      }

      // Log activity
      await supabaseAdmin.from('activity_logs').insert({
        user_id: request.user_id,
        action: 'Account activated by admin',
        details: admin_notes || '',
      });
    }

    // Handle account_opening rejection
    if (action === 'rejected' && request.request_type === 'account_opening') {
      // Mark account as rejected
      await supabaseAdmin
        .from('profiles')
        .update({ account_status: 'rejected' })
        .eq('user_id', request.user_id);

      // Send rejection email
      const customerEmail = request.profiles?.email;
      const customerName = request.profiles?.full_name || 'Customer';
      if (customerEmail) {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/account-rejected`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userEmail: customerEmail,
            userName: customerName,
            reason: admin_notes || 'Your application did not meet our requirements.',
          }),
        }).catch(err => console.error('[PATCH] Failed to send rejection email:', err));
      }
    }

    // If approving a mobile change, update the profile
    if (action === 'approved' && request.request_type === 'mobile_change' && request.requested_value) {
      await supabaseAdmin
        .from('profiles')
        .update({ phone_number: request.requested_value })
        .eq('user_id', request.user_id);
    }

    // If approving account deletion, mark for deletion (don't actually delete here)
    if (action === 'approved' && request.request_type === 'account_deletion') {
      // We'll just mark it approved - actual deletion should be a separate careful process
      await supabaseAdmin.from('activity_logs').insert({
        user_id: request.user_id,
        action: 'Account deletion approved by admin',
        details: admin_notes || '',
      });
    }

    // Update request status
    const { error: updateErr } = await supabaseAdmin
      .from('customer_requests')
      .update({
        status: action,
        admin_notes: admin_notes || null,
        resolved_by: admin.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', request_id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
