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

// PATCH /api/coupons/[id] - Update a coupon
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceRoleClient();
  const body = await request.json();
  const { id } = params;

  const updateFields: Record<string, any> = { updated_at: new Date().toISOString() };

  if (body.code !== undefined) updateFields.code = body.code.toUpperCase().trim();
  if (body.description !== undefined) updateFields.description = body.description;
  if (body.discount_type !== undefined) updateFields.discount_type = body.discount_type;
  if (body.discount_value !== undefined) updateFields.discount_value = Number(body.discount_value);
  if (body.min_recharge_amount !== undefined) updateFields.min_recharge_amount = Number(body.min_recharge_amount);
  if (body.max_discount !== undefined) updateFields.max_discount = body.max_discount ? Number(body.max_discount) : null;
  if (body.max_uses !== undefined) updateFields.max_uses = body.max_uses ? Number(body.max_uses) : null;
  if (body.max_uses_per_user !== undefined) updateFields.max_uses_per_user = body.max_uses_per_user ? Number(body.max_uses_per_user) : null;
  if (body.valid_from !== undefined) updateFields.valid_from = body.valid_from;
  if (body.valid_until !== undefined) updateFields.valid_until = body.valid_until || null;
  if (body.is_active !== undefined) updateFields.is_active = body.is_active;

  const { data, error } = await supabase
    .from('promo_coupons')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    }
    console.error('[coupons] Update error:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }

  return NextResponse.json({ coupon: data });
}

// DELETE /api/coupons/[id] - Delete a coupon
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceRoleClient();
  const { id } = params;

  const { error } = await supabase
    .from('promo_coupons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[coupons] Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
