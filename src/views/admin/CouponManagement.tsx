'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  Tag,
  Loader2,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Copy,
  Users,
  IndianRupee,
  Calendar,
  Percent,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_recharge_amount: number;
  max_discount: number | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  total_uses: number;
}

const emptyCoupon = {
  code: '',
  description: '',
  discount_type: 'percentage' as const,
  discount_value: '',
  min_recharge_amount: '500',
  max_discount: '',
  max_uses: '',
  max_uses_per_user: '1',
  valid_until: '',
};

export function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyCoupon);
  const [saving, setSaving] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token}`,
    };
  }, []);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/coupons', { headers });
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleCreate = () => {
    setEditingCoupon(null);
    setForm(emptyCoupon);
    setShowDialog(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_recharge_amount: coupon.min_recharge_amount.toString(),
      max_discount: coupon.max_discount?.toString() || '',
      max_uses: coupon.max_uses?.toString() || '',
      max_uses_per_user: coupon.max_uses_per_user?.toString() || '',
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 16) : '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.discount_value) {
      toast.error('Code and discount value are required');
      return;
    }
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const payload = {
        code: form.code,
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_recharge_amount: Number(form.min_recharge_amount) || 500,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        max_uses_per_user: form.max_uses_per_user ? Number(form.max_uses_per_user) : null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      };

      const url = editingCoupon ? `/api/coupons/${editingCoupon.id}` : '/api/coupons';
      const method = editingCoupon ? 'PATCH' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();

      if (res.ok) {
        toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created');
        setShowDialog(false);
        fetchCoupons();
      } else {
        toast.error(data.error || 'Failed to save coupon');
      }
    } catch {
      toast.error('Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });
      if (res.ok) {
        toast.success(coupon.is_active ? 'Coupon deactivated' : 'Coupon activated');
        fetchCoupons();
      }
    } catch {
      toast.error('Failed to toggle coupon');
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/coupons/${coupon.id}`, { method: 'DELETE', headers });
      if (res.ok) {
        toast.success('Coupon deleted');
        fetchCoupons();
      }
    } catch {
      toast.error('Failed to delete coupon');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10">
              <Tag className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Promo Coupons</h2>
              <p className="text-sm text-gray-400">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button onClick={handleCreate} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
            <Plus className="h-4 w-4" />
            New Coupon
          </Button>
        </div>

        {/* Coupon List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-20">
            <Tag className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No coupons yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first promo coupon</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all",
                  coupon.is_active
                    ? "bg-white/[0.03] border-white/10 hover:border-white/20"
                    : "bg-white/[0.01] border-white/5 opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => copyCode(coupon.code)}
                        className="font-typewriter font-bold text-base text-white hover:text-red-400 transition-colors flex items-center gap-1.5"
                      >
                        {coupon.code}
                        <Copy className="h-3 w-3 opacity-50" />
                      </button>
                      <Badge variant={coupon.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {coupon.valid_until && new Date(coupon.valid_until) < new Date() && (
                        <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                      )}
                    </div>
                    {coupon.description && (
                      <p className="text-sm text-gray-400 mb-2">{coupon.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        {coupon.discount_type === 'percentage' ? (
                          <><Percent className="h-3 w-3" />{coupon.discount_value}% off</>
                        ) : (
                          <><IndianRupee className="h-3 w-3" />₹{coupon.discount_value} flat</>
                        )}
                        {coupon.max_discount && ` (max ₹${coupon.max_discount})`}
                      </span>
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />Min ₹{coupon.min_recharge_amount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />{coupon.total_uses}{coupon.max_uses ? `/${coupon.max_uses}` : ''} used
                      </span>
                      {coupon.valid_until && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />Until {format(new Date(coupon.valid_until), 'dd MMM yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(coupon)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title={coupon.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {coupon.is_active ? (
                        <ToggleRight className="h-4 w-4 text-green-400" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Pencil className="h-4 w-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Code</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. WELCOME50"
                className="font-typewriter uppercase mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  {form.discount_type === 'percentage' ? 'Discount %' : 'Bonus ₹'}
                </label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === 'percentage' ? 'e.g. 50' : 'e.g. 100'}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Min Recharge ₹</label>
                <Input
                  type="number"
                  value={form.min_recharge_amount}
                  onChange={(e) => setForm({ ...form, min_recharge_amount: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Max Discount ₹</label>
                <Input
                  type="number"
                  value={form.max_discount}
                  onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                  placeholder="No limit"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Max Total Uses</label>
                <Input
                  type="number"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Per User Limit</label>
                <Input
                  type="number"
                  value={form.max_uses_per_user}
                  onChange={(e) => setForm({ ...form, max_uses_per_user: e.target.value })}
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valid Until</label>
              <Input
                type="datetime-local"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="mt-1"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
