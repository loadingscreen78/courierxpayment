'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Tag, Loader2, Pencil, Trash2, ToggleLeft, ToggleRight,
  Copy, Users, IndianRupee, Calendar, Percent, UserPlus, X, Search,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
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
  bypass_min_recharge: boolean;
  created_at: string;
  total_uses: number;
  assigned_count?: number;
}

interface Assignment {
  id: string;
  user_id: string;
  assigned_at: string;
  profile: { full_name: string | null; phone: string | null } | null;
}

interface UserSearchResult {
  id: string;
  full_name: string | null;
  phone: string | null;
}

const emptyCoupon = {
  code: '',
  description: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  min_recharge_amount: '500',
  max_discount: '',
  max_uses: '',
  max_uses_per_user: '1',
  valid_until: '',
  bypass_min_recharge: false,
};

export function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyCoupon);
  const [saving, setSaving] = useState(false);

  // Assign sheet state
  const [assignCoupon, setAssignCoupon] = useState<Coupon | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);

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
        // Fetch assignment counts
        const { data: assignCounts } = await supabase
          .from('coupon_user_assignments')
          .select('coupon_id');
        const countMap: Record<string, number> = {};
        assignCounts?.forEach((a: any) => {
          countMap[a.coupon_id] = (countMap[a.coupon_id] || 0) + 1;
        });
        setCoupons((data.coupons || []).map((c: Coupon) => ({
          ...c,
          assigned_count: countMap[c.id] || 0,
        })));
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
      bypass_min_recharge: coupon.bypass_min_recharge || false,
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
        bypass_min_recharge: form.bypass_min_recharge,
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
        method: 'PATCH', headers,
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });
      if (res.ok) {
        toast.success(coupon.is_active ? 'Coupon deactivated' : 'Coupon activated');
        fetchCoupons();
      }
    } catch { toast.error('Failed to toggle coupon'); }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/coupons/${coupon.id}`, { method: 'DELETE', headers });
      if (res.ok) { toast.success('Coupon deleted'); fetchCoupons(); }
    } catch { toast.error('Failed to delete coupon'); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  };

  // --- Assign sheet ---
  const openAssignSheet = async (coupon: Coupon) => {
    setAssignCoupon(coupon);
    setUserSearch('');
    setSearchResults([]);
    setAssignLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/coupons/${coupon.id}/assign`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch { toast.error('Failed to load assignments'); }
    finally { setAssignLoading(false); }
  };

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(10);
      setSearchResults(data || []);
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch, searchUsers]);

  const handleAssign = async (userId: string) => {
    if (!assignCoupon) return;
    setAssigning(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/coupons/${assignCoupon.id}/assign`, {
        method: 'POST', headers,
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('User assigned');
        setUserSearch('');
        setSearchResults([]);
        openAssignSheet(assignCoupon);
        fetchCoupons();
      } else {
        toast.error(data.error || 'Failed to assign');
      }
    } catch { toast.error('Failed to assign'); }
    finally { setAssigning(false); }
  };

  const handleUnassign = async (userId: string) => {
    if (!assignCoupon) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/coupons/${assignCoupon.id}/assign`, {
        method: 'DELETE', headers,
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        toast.success('User removed');
        openAssignSheet(assignCoupon);
        fetchCoupons();
      }
    } catch { toast.error('Failed to remove'); }
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
            <Plus className="h-4 w-4" />New Coupon
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
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <button
                        onClick={() => copyCode(coupon.code)}
                        className="font-mono font-bold text-base text-white hover:text-red-400 transition-colors flex items-center gap-1.5"
                      >
                        {coupon.code}
                        <Copy className="h-3 w-3 opacity-50" />
                      </button>
                      <Badge variant={coupon.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {coupon.bypass_min_recharge && (
                        <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                          <ShieldCheck className="h-2.5 w-2.5 mr-1" />Bypass Min
                        </Badge>
                      )}
                      {(coupon.assigned_count ?? 0) > 0 && (
                        <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">
                          <Users className="h-2.5 w-2.5 mr-1" />{coupon.assigned_count} assigned
                        </Badge>
                      )}
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
                      onClick={() => openAssignSheet(coupon)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title="Assign to users"
                    >
                      <UserPlus className="h-4 w-4 text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleToggle(coupon)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title={coupon.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {coupon.is_active
                        ? <ToggleRight className="h-4 w-4 text-green-400" />
                        : <ToggleLeft className="h-4 w-4 text-gray-500" />}
                    </button>
                    <button onClick={() => handleEdit(coupon)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                      <Pencil className="h-4 w-4 text-gray-400" />
                    </button>
                    <button onClick={() => handleDelete(coupon)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog — fixed centering with dark theme */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#16161a] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-white">
              {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400">Code</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. WELCOME50"
                className="font-mono uppercase mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
                className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400">Type</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full mt-1 h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400">
                  {form.discount_type === 'percentage' ? 'Discount %' : 'Bonus ₹'}
                </label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === 'percentage' ? 'e.g. 50' : 'e.g. 100'}
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400">Min Recharge ₹</label>
                <Input
                  type="number"
                  value={form.min_recharge_amount}
                  onChange={(e) => setForm({ ...form, min_recharge_amount: e.target.value })}
                  className="mt-1 bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400">Max Discount ₹</label>
                <Input
                  type="number"
                  value={form.max_discount}
                  onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                  placeholder="No limit"
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400">Max Total Uses</label>
                <Input
                  type="number"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="Unlimited"
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400">Per User Limit</label>
                <Input
                  type="number"
                  value={form.max_uses_per_user}
                  onChange={(e) => setForm({ ...form, max_uses_per_user: e.target.value })}
                  placeholder="Unlimited"
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400">Valid Until</label>
              <Input
                type="datetime-local"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="mt-1 bg-white/5 border-white/10 text-white"
              />
            </div>
            {/* Bypass min recharge toggle */}
            <div
              className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer"
              onClick={() => setForm({ ...form, bypass_min_recharge: !form.bypass_min_recharge })}
            >
              <div>
                <p className="text-sm font-medium text-amber-300">Bypass Min Recharge</p>
                <p className="text-xs text-amber-400/70 mt-0.5">Allow coupon on any recharge amount</p>
              </div>
              <div className={cn(
                "w-10 h-6 rounded-full transition-colors flex items-center px-1",
                form.bypass_min_recharge ? "bg-amber-500" : "bg-white/10"
              )}>
                <div className={cn(
                  "w-4 h-4 rounded-full bg-white transition-transform",
                  form.bypass_min_recharge ? "translate-x-4" : "translate-x-0"
                )} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-red-600 hover:bg-red-700 text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Users Sheet */}
      <Sheet open={!!assignCoupon} onOpenChange={(open) => { if (!open) setAssignCoupon(null); }}>
        <SheetContent className="bg-[#16161a] border-white/10 text-white w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white font-mono">
              Assign: {assignCoupon?.code}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {/* User search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>

            {/* Search results */}
            {searching && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 mb-2">Search results</p>
                {searchResults.map((u) => {
                  const alreadyAssigned = assignments.some((a) => a.user_id === u.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
                      <div>
                        <p className="text-sm text-white">{u.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{u.phone || u.id.slice(0, 8)}</p>
                      </div>
                      {alreadyAssigned ? (
                        <Badge className="text-[10px] bg-green-500/20 text-green-400">Assigned</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAssign(u.id)}
                          disabled={assigning}
                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                        >
                          {assigning ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Assign'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Current assignments */}
            <div>
              <p className="text-xs text-gray-500 mb-2">
                Assigned users ({assignments.length})
                {assignments.length > 0 && <span className="ml-1 text-blue-400">— coupon is restricted to these users</span>}
              </p>
              {assignLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                </div>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-6">No assignments — coupon is public</p>
              ) : (
                <div className="space-y-1">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
                      <div>
                        <p className="text-sm text-white">{a.profile?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{a.profile?.phone || a.user_id.slice(0, 8)}</p>
                      </div>
                      <button
                        onClick={() => handleUnassign(a.user_id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
