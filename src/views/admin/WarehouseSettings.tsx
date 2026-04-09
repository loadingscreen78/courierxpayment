"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Warehouse, FloppyDisk, ArrowsClockwise, Plus, Trash, Star } from '@phosphor-icons/react';

interface WarehouseAddress {
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

const EMPTY_WAREHOUSE: Omit<WarehouseAddress, 'id'> = {
  name: '', phone: '', address: '', city: '', state: '', pincode: '', region: '', isDefault: false,
};

const DEFAULT_WAREHOUSES: WarehouseAddress[] = [
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

export default function WarehouseSettings() {
  const [warehouses, setWarehouses] = useState<WarehouseAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setLoading(false); return; }
      try {
        const r = await fetch('/api/admin/settings', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const res = await r.json();
        if (res.warehouses && res.warehouses.length > 0) {
          setWarehouses(res.warehouses);
        } else {
          // No warehouses saved yet — use defaults
          setWarehouses(DEFAULT_WAREHOUSES);
        }
      } catch {
        setWarehouses(DEFAULT_WAREHOUSES);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleFieldChange = (idx: number, key: keyof WarehouseAddress, value: string | boolean) => {
    setWarehouses(prev => prev.map((wh, i) => i === idx ? { ...wh, [key]: value } : wh));
    setMessage(null);
  };

  const handleSetDefault = (idx: number) => {
    setWarehouses(prev => prev.map((wh, i) => ({ ...wh, isDefault: i === idx })));
  };

  const handleAddWarehouse = () => {
    const newId = `wh_${Date.now()}`;
    setWarehouses(prev => [...prev, { ...EMPTY_WAREHOUSE, id: newId }]);
  };

  const handleRemoveWarehouse = (idx: number) => {
    if (warehouses.length <= 1) return;
    const removed = warehouses[idx];
    const updated = warehouses.filter((_, i) => i !== idx);
    // If we removed the default, make the first one default
    if (removed.isDefault && updated.length > 0) {
      updated[0].isDefault = true;
    }
    setWarehouses(updated);
  };

  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    // Validate all warehouses
    for (const wh of warehouses) {
      if (!wh.name || !wh.phone || !wh.address || !wh.city || !wh.state || !wh.pincode) {
        setMessage({ type: 'error', text: `All fields required for: ${wh.name || 'unnamed warehouse'}` });
        return;
      }
    }

    // Ensure at least one default
    if (!warehouses.some(w => w.isDefault) && warehouses.length > 0) {
      warehouses[0].isDefault = true;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ warehouses }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Warehouses saved successfully.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Save failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof WarehouseAddress; label: string; placeholder: string; colSpan?: boolean }[] = [
    { key: 'name', label: 'Warehouse Name', placeholder: 'CourierX Warehouse' },
    { key: 'phone', label: 'Contact Phone', placeholder: '9999999999' },
    { key: 'address', label: 'Street Address', placeholder: 'Full address', colSpan: true },
    { key: 'city', label: 'City', placeholder: 'City' },
    { key: 'state', label: 'State', placeholder: 'State' },
    { key: 'pincode', label: 'Pincode', placeholder: '000000' },
    { key: 'region', label: 'Region Tag', placeholder: 'e.g. maharashtra, odisha' },
  ];

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
          <Warehouse className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-white font-semibold text-lg">Warehouse Settings</h1>
          <p className="text-gray-500 text-sm">Manage pickup warehouses for international shipments. Nearest warehouse is auto-selected based on sender pincode.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <ArrowsClockwise className="h-4 w-4 animate-spin" weight="bold" />
          Loading...
        </div>
      ) : (
        <div className="space-y-6">
          {warehouses.map((wh, idx) => (
            <div key={wh.id} className="bg-white/4 border border-white/8 rounded-2xl p-6 space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-medium text-sm">
                    {wh.name || `Warehouse ${idx + 1}`}
                  </h2>
                  {wh.isDefault && (
                    <span className="text-[10px] font-semibold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">DEFAULT</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!wh.isDefault && (
                    <button
                      onClick={() => handleSetDefault(idx)}
                      className="text-xs text-gray-400 hover:text-yellow-400 flex items-center gap-1 transition-colors"
                      title="Set as default"
                    >
                      <Star className="h-3.5 w-3.5" /> Set Default
                    </button>
                  )}
                  {warehouses.length > 1 && (
                    <button
                      onClick={() => handleRemoveWarehouse(idx)}
                      className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <Trash className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map(({ key, label, placeholder, colSpan }) => (
                  <div key={key} className={colSpan ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={(wh as any)[key] || ''}
                      onChange={(e) => handleFieldChange(idx, key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={handleAddWarehouse}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-white/10 hover:border-white/20 rounded-2xl text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Plus className="h-4 w-4" weight="bold" /> Add Warehouse
          </button>

          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saving ? <ArrowsClockwise className="h-4 w-4 animate-spin" weight="bold" /> : <FloppyDisk className="h-4 w-4" weight="bold" />}
            {saving ? 'Saving...' : 'Save All Warehouses'}
          </button>
        </div>
      )}
    </div>
  );
}
