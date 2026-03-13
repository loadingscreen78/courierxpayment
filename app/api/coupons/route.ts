import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const supabase = getServiceRoleClient();
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;
  return user;
}

// GET /api/coupons - List all coupons (admin only)
export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceRoleClient();

  const { data: coupons, error } = await supabase
    .from('promo_coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[coupons] List error:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }

  // Get usage counts per coupon
  const { data: usageCounts } = await supabase
    .from('coupon_usage')
    .select('coupon_id');

  const usageMap: Record<string, number> = {};
  usageCounts?.forEach((u: any) => {
    usageMap[u.coupon_id] = (usageMap[u.coupon_id] || 0) + 1;
  });

  const enriched = coupons?.map((c: any) => ({
    ...c,
    total_uses: usageMap[c.id] || 0,
  }));

  return NextResponse.json({ coupons: enriched });
}

// POST /api/coupons - Create a coupon (admin only)
export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceRoleClient();
  const body = await request.json();

  const {
    code,
    description,
    discount_type = 'percentage',
    discount_value,
    min_recharge_amount = 500,
    max_discount,
    max_uses,
    max_uses_per_user = 1,
    valid_from,
    valid_until,
  } = body;

  if (!code || !discount_value) {
    return NextResponse.json({ error: 'Code and discount value are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('promo_coupons')
    .insert({
      code: code.toUpperCase().trim(),
      description: description || null,
      discount_type,
      discount_value: Number(discount_value),
      min_recharge_amount: Number(min_recharge_amount),
      max_discount: max_discount ? Number(max_discount) : null,
      max_uses: max_uses ? Number(max_uses) : null,
      max_uses_per_user: max_uses_per_user ? Number(max_uses_per_user) : null,
      valid_from: valid_from || new Date().toISOString(),
      valid_until: valid_until || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    }
    console.error('[coupons] Create error:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }

  return NextResponse.json({ coupon: data }, { status: 201 });
}
