import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/admin/check-access
 * Returns whether the current user has admin access.
 * Uses service role to bypass RLS on user_roles table.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ hasAccess: false }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ hasAccess: false }, { status: 401 });
    }

    // Use service role to bypass RLS
    const supabase = getServiceRoleClient();
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roleList = (roles || []).map((r: any) => r.role);
    const isAdmin = roleList.includes('admin');
    const isWarehouseOperator = roleList.includes('warehouse_operator');
    const hasAccess = isAdmin || isWarehouseOperator;

    return NextResponse.json({ hasAccess, isAdmin, isWarehouseOperator, roles: roleList });
  } catch (err: any) {
    console.error('[check-access]', err);
    return NextResponse.json({ hasAccess: false }, { status: 500 });
  }
}
