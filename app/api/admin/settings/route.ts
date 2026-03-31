import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const supabase = getServiceRoleClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  return role ? user : null;
}

export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getServiceRoleClient();

  // Fetch warehouses list
  const { data: warehouseSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'warehouses')
    .maybeSingle();

  if (warehouseSetting?.value) {
    return NextResponse.json({ success: true, warehouses: warehouseSetting.value });
  }

  // Migration: check for old single warehouse_address key and convert
  const { data: oldSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'warehouse_address')
    .maybeSingle();

  const defaultWarehouses = oldSetting?.value
    ? [{ ...oldSetting.value, id: 'wh_1', region: 'default', isDefault: true }]
    : [];

  return NextResponse.json({ success: true, warehouses: defaultWarehouses });
}

export async function PUT(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  if (body.warehouses && Array.isArray(body.warehouses)) {
    for (const wh of body.warehouses) {
      if (!wh.name || !wh.phone || !wh.address || !wh.city || !wh.state || !wh.pincode) {
        return NextResponse.json({ error: `All fields required for warehouse: ${wh.name || 'unnamed'}` }, { status: 400 });
      }
    }

    const supabase = getServiceRoleClient();
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'warehouses',
        value: body.warehouses,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Also update legacy key with the default warehouse
    const defaultWh = body.warehouses.find((w: any) => w.isDefault) || body.warehouses[0];
    if (defaultWh) {
      await supabase.from('app_settings').upsert({
        key: 'warehouse_address',
        value: { name: defaultWh.name, phone: defaultWh.phone, address: defaultWh.address, city: defaultWh.city, state: defaultWh.state, pincode: defaultWh.pincode },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
    }

    return NextResponse.json({ success: true });
  }

  // Legacy single warehouse update
  const { name, phone, address, city, state, pincode } = body;
  if (!name || !phone || !address || !city || !state || !pincode) {
    return NextResponse.json({ error: 'All warehouse fields are required' }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('app_settings')
    .upsert({
      key: 'warehouse_address',
      value: { name, phone, address, city, state, pincode },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
