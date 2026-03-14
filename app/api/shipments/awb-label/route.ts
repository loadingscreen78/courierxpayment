import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { fetchLabel } from '@/lib/shipment-lifecycle/nimbusClient';

/**
 * GET /api/shipments/awb-label?awb=<awb>
 * Fetches the AWB label from Nimbus and stores it on the shipment row.
 * Admin-only endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient();

    // Auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === 'admin');
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const awb = request.nextUrl.searchParams.get('awb');
    if (!awb) {
      return NextResponse.json({ success: false, error: 'Missing awb parameter' }, { status: 400 });
    }

    // Fetch label from Nimbus
    const labelResponse = await fetchLabel(awb);
    if (!labelResponse.success) {
      return NextResponse.json(
        { success: false, error: labelResponse.error ?? 'Nimbus label fetch failed' },
        { status: 502 },
      );
    }

    const labelValue = labelResponse.labelUrl ?? labelResponse.labelBase64 ?? null;
    if (!labelValue) {
      return NextResponse.json({ success: false, error: 'No label data returned by Nimbus' }, { status: 502 });
    }

    // Persist to shipments row
    const { error: updateError } = await supabase
      .from('shipments')
      .update({ domestic_label_url: labelValue })
      .eq('domestic_awb', awb);

    if (updateError) {
      console.error('[awb-label] Failed to persist label:', updateError.message);
    }

    return NextResponse.json({ success: true, labelUrl: labelValue });
  } catch (error) {
    console.error('[awb-label] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
