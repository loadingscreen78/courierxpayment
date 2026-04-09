import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

export interface WarehouseAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  region: string;
  isDefault: boolean;
}

// Hardcoded fallback warehouses
const FALLBACK_WAREHOUSES: WarehouseAddress[] = [
  {
    id: 'wh_maharashtra',
    name: 'CourierX Orissa Warehouse',
    phone: '8484050057',
    address: 'At, Rathagadasahi, Urali',
    city: 'Cuttack',
    state: 'Orissa',
    pincode: '411048',
    region: 'maharashtra',
    isDefault: true,
  },
  {
    id: 'wh_odisha',
    name: 'CourierX Odisha Warehouse',
    phone: '7008368628',
    address: 'Urali, Rathagargaha Sahi, near Utkal Karate School',
    city: 'Cuttack',
    state: 'Odisha',
    pincode: '753011',
    region: 'odisha',
    isDefault: false,
  },
];

// States near each warehouse region for proximity matching
const REGION_STATES: Record<string, string[]> = {
  odisha: [
    'Odisha', 'West Bengal', 'Jharkhand', 'Chhattisgarh', 'Bihar',
    'Assam', 'Meghalaya', 'Tripura', 'Mizoram', 'Manipur', 'Nagaland', 'Arunachal Pradesh', 'Sikkim',
    'Andhra Pradesh', 'Telangana',
  ],
  maharashtra: [
    'Maharashtra', 'Goa', 'Karnataka', 'Gujarat', 'Madhya Pradesh',
    'Rajasthan', 'Delhi', 'Haryana', 'Punjab', 'Uttar Pradesh', 'Uttarakhand',
    'Himachal Pradesh', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh',
    'Tamil Nadu', 'Kerala',
  ],
};

/**
 * Fetch all warehouses from DB, with hardcoded fallback.
 */
export async function getAllWarehouses(): Promise<WarehouseAddress[]> {
  try {
    const supabase = getServiceRoleClient();
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'warehouses')
      .maybeSingle();

    if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
      return data.value;
    }
  } catch (err) {
    console.error('[getWarehouse] Failed to fetch warehouses:', err);
  }
  return FALLBACK_WAREHOUSES;
}

/**
 * Pick the nearest warehouse based on sender's state.
 * Falls back to the default warehouse if no region match.
 */
export async function getNearestWarehouse(senderState: string): Promise<WarehouseAddress> {
  const warehouses = await getAllWarehouses();
  const stateNorm = (senderState || '').trim().toLowerCase();

  // Try to match sender state to a region
  for (const wh of warehouses) {
    const regionKey = (wh.region || '').toLowerCase();
    const regionStates = REGION_STATES[regionKey];
    if (regionStates && regionStates.some(s => s.toLowerCase() === stateNorm)) {
      return wh;
    }
  }

  // No region match — return default warehouse
  const defaultWh = warehouses.find(w => w.isDefault);
  return defaultWh || warehouses[0] || FALLBACK_WAREHOUSES[0];
}
