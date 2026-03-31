"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { format, subDays, startOfMonth, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Users, UserCheck, Wallet, Package, Search, Filter, ChevronDown,
  ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal,
  Mail, Phone, ShieldCheck, ShieldX, Eye, Edit2, Download,
  TrendingUp, TrendingDown, Activity, Calendar, X, Loader2,
  IndianRupee, MapPin, Clock, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { GuestUsersManagement } from '@/components/admin/GuestUsersManagement';
import { CustomerRequestsManagement } from '@/components/admin/CustomerRequestsManagement';

// ─── Types ───────────────────────────────────────────────────────────
interface Customer {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  wallet_balance: number;
  aadhaar_verified: boolean | null;
  kyc_completed_at: string | null;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  aadhaar_address: string | null;
  shipment_count: number;
  total_spent: number;
  last_shipment_at: string | null;
  roles: string[];
}

interface CustomerShipment {
  id: string;
  tracking_number: string | null;
  shipment_type: string;
  status: string;
  destination_country: string;
  total_amount: number;
  created_at: string;
}

type SortField = 'full_name' | 'created_at' | 'wallet_balance' | 'shipment_count' | 'total_spent';
type SortDir = 'asc' | 'desc';

// ─── Constants ───────────────────────────────────────────────────────
const PIE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];
const PAGE_SIZE = 20;

// ─── Stat Card ───────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, trend, trendLabel, color }: {
  label: string; value: string | number; icon: any;
  trend?: number; trendLabel?: string; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.06] transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg",
            trend >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          )}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{trendLabel || label}</p>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function CustomerCRM() {
  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [top10, setTop10] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  // Detail sheet
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerShipments, setCustomerShipments] = useState<CustomerShipment[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone_number: '', email: '' });
  const [saving, setSaving] = useState(false);

  // Wallet adjustment dialog
  const [walletDialog, setWalletDialog] = useState(false);
  const [walletForm, setWalletForm] = useState({ amount: '', description: '' });
  const [walletTarget, setWalletTarget] = useState<Customer | null>(null);
  const [walletSaving, setWalletSaving] = useState(false);
  // OTP verification state
  const [walletStep, setWalletStep] = useState<'form' | 'otp'>('form');
  const [walletOtp, setWalletOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpSendsRemaining, setOtpSendsRemaining] = useState(2);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(3);
  const [otpError, setOtpError] = useState('');


  // ─── Fetch all customers via admin API (reads auth.users, not just profiles) ──
  const fetchCustomers = useCallback(async () => {
    // Always get a fresh token to avoid stale/expired access_token issues
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    const token = freshSession?.access_token;
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/customers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { customers: data, top10: topData } = await res.json();
      setCustomers(data || []);
      setTop10(topData || []);
    } catch (err) {
      console.error('[CRM] fetch error:', err);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();

    // Real-time subscriptions: re-fetch when profiles/shipments/wallet change
    const profilesChannel = supabase
      .channel('admin-crm-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchCustomers)
      .subscribe();

    const shipmentsChannel = supabase
      .channel('admin-crm-shipments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shipments' }, fetchCustomers)
      .subscribe();

    const walletChannel = supabase
      .channel('admin-crm-wallet')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_ledger' }, fetchCustomers)
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(shipmentsChannel);
      supabase.removeChannel(walletChannel);
    };
  }, [fetchCustomers]);

  // ─── Computed stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = customers.length;
    const kycVerified = customers.filter(c => c.aadhaar_verified).length;
    const activeShippers = customers.filter(c => c.shipment_count > 0).length;
    const totalWallet = customers.reduce((s, c) => s + c.wallet_balance, 0);
    const totalRevenue = customers.reduce((s, c) => s + c.total_spent, 0);

    // 30-day signups
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    const recentSignups = customers.filter(c => c.created_at >= thirtyDaysAgo).length;
    const prevThirty = customers.filter(c => {
      const d = c.created_at;
      return d < thirtyDaysAgo && d >= subDays(new Date(), 60).toISOString();
    }).length;
    const signupTrend = prevThirty > 0 ? Math.round(((recentSignups - prevThirty) / prevThirty) * 100) : 0;

    return { total, kycVerified, activeShippers, totalWallet, totalRevenue, recentSignups, signupTrend };
  }, [customers]);

  // ─── Chart data ────────────────────────────────────────────────────
  const signupChartData = useMemo(() => {
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(new Date(), 29 - i);
      return { date: format(d, 'MMM dd'), count: 0 };
    });
    for (const c of customers) {
      const dayStr = format(parseISO(c.created_at), 'MMM dd');
      const entry = last30.find(e => e.date === dayStr);
      if (entry) entry.count++;
    }
    return last30;
  }, [customers]);

  const kycFunnelData = useMemo(() => [
    { name: 'Total Users', value: stats.total, fill: '#6366f1' },
    { name: 'KYC Verified', value: stats.kycVerified, fill: '#22c55e' },
    { name: 'Active Shippers', value: stats.activeShippers, fill: '#ef4444' },
  ], [stats]);

  const shipmentTypeData = useMemo(() => {
    const types: Record<string, number> = {};
    // We don't have shipment types per customer here, so use shipment_count distribution
    const buckets = [
      { name: '0 shipments', value: customers.filter(c => c.shipment_count === 0).length },
      { name: '1-5 shipments', value: customers.filter(c => c.shipment_count >= 1 && c.shipment_count <= 5).length },
      { name: '6-20 shipments', value: customers.filter(c => c.shipment_count >= 6 && c.shipment_count <= 20).length },
      { name: '20+ shipments', value: customers.filter(c => c.shipment_count > 20).length },
    ].filter(b => b.value > 0);
    return buckets;
  }, [customers]);

  // ─── Filtered & sorted customers ──────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...customers];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        (c.full_name?.toLowerCase().includes(q)) ||
        (c.email?.toLowerCase().includes(q)) ||
        (c.phone_number?.includes(q)) ||
        (c.user_id.toLowerCase().includes(q))
      );
    }

    // KYC filter
    if (kycFilter === 'verified') list = list.filter(c => c.aadhaar_verified);
    else if (kycFilter === 'pending') list = list.filter(c => !c.aadhaar_verified);

    // Activity filter
    if (activityFilter === 'active') list = list.filter(c => c.shipment_count > 0);
    else if (activityFilter === 'inactive') list = list.filter(c => c.shipment_count === 0);
    else if (activityFilter === 'high_value') list = list.filter(c => c.total_spent >= 5000);

    // Sort
    list.sort((a, b) => {
      let av: any = a[sortField];
      let bv: any = b[sortField];
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [customers, searchQuery, kycFilter, activityFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-gray-600" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-red-400" />
      : <ArrowDown className="h-3 w-3 text-red-400" />;
  };

  // ─── Customer detail ───────────────────────────────────────────────
  const openDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoadingDetail(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('id, tracking_number, shipment_type, status, destination_country, total_amount, created_at')
        .eq('user_id', customer.user_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setCustomerShipments((data as any[]) || []);
    } catch {
      toast.error('Failed to load shipment history');
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── Edit customer ─────────────────────────────────────────────────
  const openEdit = (customer: Customer) => {
    setEditForm({
      full_name: customer.full_name || '',
      phone_number: customer.phone_number || '',
      email: customer.email || '',
    });
    setSelectedCustomer(customer);
    setEditDialog(true);
  };

  const saveEdit = async () => {
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name || null,
          phone_number: editForm.phone_number || null,
          email: editForm.email || null,
        })
        .eq('user_id', selectedCustomer.user_id);
      if (error) throw error;
      toast.success('Customer updated');
      setEditDialog(false);
      fetchCustomers();
    } catch {
      toast.error('Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  // ─── Wallet adjustment ───────────────────────────────────────────
  const openWalletAdjust = (customer: Customer) => {
    setWalletTarget(customer);
    setWalletForm({ amount: '', description: '' });
    setWalletStep('form');
    setWalletOtp('');
    setOtpError('');
    setOtpAttemptsLeft(3);
    setWalletDialog(true);
  };

  const sendWalletOtp = async () => {
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    const token = freshSession?.access_token;
    if (!token) return;
    setOtpSending(true);
    setOtpError('');
    try {
      const res = await fetch('/api/admin/wallet-otp/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setOtpSendsRemaining(data.sendsRemaining ?? 0);
      setWalletStep('otp');
      setWalletOtp('');
      setOtpAttemptsLeft(3);
      toast.success('OTP sent to admin email');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
      setOtpError(err.message || 'Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const submitWalletAdjust = async () => {
    if (!walletTarget) return;
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    const token = freshSession?.access_token;
    if (!token) return;
    setWalletSaving(true);
    setOtpError('');
    try {
      const res = await fetch('/api/admin/wallet-adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: walletTarget.user_id,
          amount: Number(walletForm.amount),
          description: walletForm.description,
          otp: walletOtp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.otpExpired) {
          setOtpError(data.error);
          setOtpAttemptsLeft(0);
        } else if (data.attemptsRemaining !== undefined) {
          setOtpAttemptsLeft(data.attemptsRemaining);
          setOtpError(data.error);
        } else {
          throw new Error(data.error || 'Failed to adjust wallet');
        }
        return;
      }
      toast.success(data.message || 'Wallet adjusted successfully');
      setWalletDialog(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust wallet');
    } finally {
      setWalletSaving(false);
    }
  };

  // ─── CSV export ────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'KYC', 'Wallet Balance', 'Shipments', 'Total Spent', 'Joined'];
    const rows = filtered.map(c => [
      c.full_name || '', c.email || '', c.phone_number || '',
      c.aadhaar_verified ? 'Verified' : 'Pending',
      c.wallet_balance.toFixed(2), c.shipment_count,
      c.total_spent.toFixed(2), format(parseISO(c.created_at), 'yyyy-MM-dd'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `courierx-customers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} customers`);
  };

  // ─── Active tab ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'customers' | 'guests' | 'requests'>('customers');

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Customer CRM</h1>
            <p className="text-sm text-gray-500 mt-0.5">{stats.total} total customers</p>
          </div>
          {activeTab === 'customers' && (
            <Button
              onClick={exportCSV}
              variant="outline"
              size="sm"
              className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
          <button
            onClick={() => setActiveTab('customers')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'customers'
                ? "bg-white/[0.08] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
            )}
          >
            <Users className="h-4 w-4" />
            Registered Customers
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'guests'
                ? "bg-purple-500/20 text-purple-300 shadow-sm"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
            )}
          >
            <Users className="h-4 w-4" />
            Guest Users
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold">NEW</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'requests'
                ? "bg-amber-500/20 text-amber-300 shadow-sm"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
            )}
          >
            <AlertCircle className="h-4 w-4" />
            Customer Requests
          </button>
        </div>

        {/* Guest Users Tab */}
        {activeTab === 'guests' && <GuestUsersManagement />}

        {/* Customer Requests Tab */}
        {activeTab === 'requests' && <CustomerRequestsManagement />}

        {/* Registered Customers Tab */}
        {activeTab === 'customers' && (
        <div className="space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Customers"
            value={stats.total}
            icon={Users}
            trend={stats.signupTrend}
            trendLabel={`${stats.recentSignups} new in 30d`}
            color="bg-blue-500/15 text-blue-400"
          />
          <StatCard
            label="KYC Verified"
            value={stats.kycVerified}
            icon={ShieldCheck}
            trendLabel={`${stats.total > 0 ? Math.round((stats.kycVerified / stats.total) * 100) : 0}% verification rate`}
            color="bg-green-500/15 text-green-400"
          />
          <StatCard
            label="Active Shippers"
            value={stats.activeShippers}
            icon={Package}
            trendLabel={`${stats.total > 0 ? Math.round((stats.activeShippers / stats.total) * 100) : 0}% conversion`}
            color="bg-red-500/15 text-red-400"
          />
          <StatCard
            label="Total Wallet Balance"
            value={`₹${stats.totalWallet.toLocaleString('en-IN')}`}
            icon={Wallet}
            trendLabel={`₹${stats.totalRevenue.toLocaleString('en-IN')} total revenue`}
            color="bg-amber-500/15 text-amber-400"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Signup Trend */}
          <div className="lg:col-span-2 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-white">Signup Trend</p>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </div>
              <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">
                <Activity className="h-3 w-3 mr-1" /> Daily
              </Badge>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={signupChartData}>
                  <defs>
                    <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12, color: '#fff' }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} fill="url(#signupGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KYC Funnel + Activity Distribution */}
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-1">Customer Funnel</p>
            <p className="text-xs text-gray-500 mb-4">Onboarding → KYC → Active</p>
            <div className="space-y-3">
              {kycFunnelData.map((item, i) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">{item.name}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.total > 0 ? (item.value / stats.total) * 100 : 0}%` }}
                      transition={{ duration: 0.8, delay: i * 0.15 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-xs text-gray-500 mb-3">Shipment Activity</p>
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={shipmentTypeData} cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={3} dataKey="value">
                      {shipmentTypeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11, color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {shipmentTypeData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top 10 Customers — Coupon Recommendations */}
        {top10.length > 0 && (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  Top 10 Customers — Coupon Recommendations
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Highest spenders based on real-time wallet transactions</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-gray-500 font-semibold pb-2 pr-4">#</th>
                    <th className="text-left text-gray-500 font-semibold pb-2 pr-4">Customer</th>
                    <th className="text-left text-gray-500 font-semibold pb-2 pr-4">Email</th>
                    <th className="text-right text-gray-500 font-semibold pb-2 pr-4">Total Spent</th>
                    <th className="text-right text-gray-500 font-semibold pb-2 pr-4">Shipments</th>
                    <th className="text-right text-gray-500 font-semibold pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((c, i) => (
                    <tr key={c.user_id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 pr-4">
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                          i === 0 ? "bg-amber-500/20 text-amber-400" :
                          i === 1 ? "bg-gray-400/20 text-gray-300" :
                          i === 2 ? "bg-orange-600/20 text-orange-400" :
                          "bg-white/5 text-gray-500"
                        )}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <p className="text-white font-medium truncate max-w-[140px]">{c.full_name || 'Unnamed'}</p>
                      </td>
                      <td className="py-2.5 pr-4">
                        <p className="text-gray-400 truncate max-w-[180px]">{c.email || '—'}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className="text-green-400 font-semibold">₹{c.total_spent.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-300">{c.shipment_count}</td>
                      <td className="py-2.5 text-right">
                        <a
                          href="/admin/coupons"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-[10px] font-medium"
                        >
                          <IndianRupee className="h-3 w-3" /> Assign Coupon
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by name, email, phone, or ID..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-red-500/50"
              />
            </div>
            <Select value={kycFilter} onValueChange={v => { setKycFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-gray-300">
                <SelectValue placeholder="KYC Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={v => { setActivityFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-gray-300">
                <SelectValue placeholder="Activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="active">Has Shipments</SelectItem>
                <SelectItem value="inactive">No Shipments</SelectItem>
                <SelectItem value="high_value">High Value (₹5k+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500">{filtered.length} customers match filters</p>
            {(searchQuery || kycFilter !== 'all' || activityFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setKycFilter('all'); setActivityFilter('all'); setPage(0); }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-gray-500 text-xs font-semibold">
                        <button onClick={() => toggleSort('full_name')} className="flex items-center gap-1 hover:text-gray-300">
                          Customer <SortIcon field="full_name" />
                        </button>
                      </TableHead>
                      <TableHead className="text-gray-500 text-xs font-semibold">Contact</TableHead>
                      <TableHead className="text-gray-500 text-xs font-semibold">KYC</TableHead>
                      <TableHead className="text-gray-500 text-xs font-semibold">
                        <button onClick={() => toggleSort('wallet_balance')} className="flex items-center gap-1 hover:text-gray-300">
                          Wallet <SortIcon field="wallet_balance" />
                        </button>
                      </TableHead>
                      <TableHead className="text-gray-500 text-xs font-semibold">
                        <button onClick={() => toggleSort('shipment_count')} className="flex items-center gap-1 hover:text-gray-300">
                          Shipments <SortIcon field="shipment_count" />
                        </button>
                      </TableHead>
                      <TableHead className="text-gray-500 text-xs font-semibold">
                        <button onClick={() => toggleSort('total_spent')} className="flex items-center gap-1 hover:text-gray-300">
                          Revenue <SortIcon field="total_spent" />
                        </button>
                      </TableHead>
                      <TableHead className="text-gray-500 text-xs font-semibold">
                        <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-gray-300">
                          Joined <SortIcon field="created_at" />
                        </button>
                      </TableHead>
                      <TableHead className="text-gray-500 text-xs font-semibold w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                          No customers found
                        </TableCell>
                      </TableRow>
                    ) : paged.map((c, i) => (
                      <TableRow
                        key={c.user_id}
                        className="border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
                        onClick={() => openDetail(c)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600/80 to-red-800/80 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {(c.full_name || c.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate max-w-[160px]">
                                {c.full_name || 'Unnamed'}
                              </p>
                              {c.roles.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {c.roles.map(r => (
                                    <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">{r}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {c.email && <p className="text-xs text-gray-400 truncate max-w-[180px]">{c.email}</p>}
                            {c.phone_number && <p className="text-xs text-gray-500">{c.phone_number}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {c.aadhaar_verified ? (
                            <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px]">
                              <Clock className="h-3 w-3 mr-1" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-white font-medium">
                          ₹{c.wallet_balance.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-white">{c.shipment_count}</span>
                        </TableCell>
                        <TableCell className="text-sm text-white">
                          ₹{c.total_spent.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {format(parseISO(c.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <button className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1a1f] border-white/10 text-white">
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); openDetail(c); }}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); openEdit(c); }}>
                                <Edit2 className="h-4 w-4 mr-2" /> Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); openWalletAdjust(c); }}>
                                <Wallet className="h-4 w-4 mr-2" /> Adjust Wallet
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                  <p className="text-xs text-gray-500">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="sm" disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                      className="text-gray-400 hover:text-white hover:bg-white/5 h-8 px-3 text-xs"
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = page < 3 ? i : page > totalPages - 4 ? totalPages - 5 + i : page - 2 + i;
                      if (p < 0 || p >= totalPages) return null;
                      return (
                        <Button
                          key={p} variant="ghost" size="sm"
                          onClick={() => setPage(p)}
                          className={cn(
                            "h-8 w-8 p-0 text-xs",
                            p === page ? "bg-red-500/20 text-red-400" : "text-gray-500 hover:text-white hover:bg-white/5"
                          )}
                        >
                          {p + 1}
                        </Button>
                      );
                    })}
                    <Button
                      variant="ghost" size="sm" disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                      className="text-gray-400 hover:text-white hover:bg-white/5 h-8 px-3 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}
      </div>

      {/* Customer Detail Sheet */}
      <Sheet open={!!selectedCustomer && !editDialog} onOpenChange={() => setSelectedCustomer(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-[#0f0f12] border-white/5 text-white">
          <SheetHeader>
            <SheetTitle className="text-white">Customer Details</SheetTitle>
          </SheetHeader>
          {selectedCustomer && (
            <div className="mt-4 space-y-5">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {(selectedCustomer.full_name || selectedCustomer.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-white truncate">{selectedCustomer.full_name || 'Unnamed'}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedCustomer.email}</p>
                  {selectedCustomer.phone_number && (
                    <p className="text-xs text-gray-500">{selectedCustomer.phone_number}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" className="border-white/10 text-gray-300 hover:bg-white/5" onClick={() => openEdit(selectedCustomer)}>
                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.04] rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white">₹{selectedCustomer.wallet_balance.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-gray-500">Wallet</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white">{selectedCustomer.shipment_count}</p>
                  <p className="text-[10px] text-gray-500">Shipments</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white">₹{selectedCustomer.total_spent.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-gray-500">Revenue</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-gray-500">KYC Status</span>
                  {selectedCustomer.aadhaar_verified ? (
                    <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px]">
                      <Clock className="h-3 w-3 mr-1" /> Pending
                    </Badge>
                  )}
                </div>
                {selectedCustomer.kyc_completed_at && (
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs text-gray-500">KYC Date</span>
                    <span className="text-xs text-gray-300">{format(parseISO(selectedCustomer.kyc_completed_at), 'dd MMM yyyy')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-gray-500">Joined</span>
                  <span className="text-xs text-gray-300">{format(parseISO(selectedCustomer.created_at), 'dd MMM yyyy, HH:mm')}</span>
                </div>
                {selectedCustomer.last_shipment_at && (
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs text-gray-500">Last Shipment</span>
                    <span className="text-xs text-gray-300">{format(parseISO(selectedCustomer.last_shipment_at), 'dd MMM yyyy')}</span>
                  </div>
                )}
                {selectedCustomer.aadhaar_address && (
                  <div className="flex items-start justify-between py-2 border-b border-white/5">
                    <span className="text-xs text-gray-500 shrink-0">Address</span>
                    <span className="text-xs text-gray-300 text-right ml-4">{selectedCustomer.aadhaar_address}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-gray-500">User ID</span>
                  <span className="text-[10px] text-gray-500 font-mono">{selectedCustomer.user_id}</span>
                </div>
                {selectedCustomer.roles.length > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs text-gray-500">Roles</span>
                    <div className="flex gap-1">
                      {selectedCustomer.roles.map(r => (
                        <Badge key={r} variant="outline" className="border-white/10 text-gray-400 text-[10px]">{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Shipment History */}
              <div>
                <p className="text-sm font-semibold text-white mb-3">Recent Shipments</p>
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                  </div>
                ) : customerShipments.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No shipments yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerShipments.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl hover:bg-white/[0.05] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0",
                            s.shipment_type === 'medicine' ? 'bg-blue-500/15 text-blue-400' :
                            s.shipment_type === 'document' ? 'bg-amber-500/15 text-amber-400' :
                            'bg-purple-500/15 text-purple-400'
                          )}>
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">{s.tracking_number || s.id.slice(0, 8)}</p>
                            <p className="text-[10px] text-gray-500">{s.destination_country} · {s.shipment_type}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-xs font-medium text-white">₹{s.total_amount.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-gray-500">{format(parseISO(s.created_at), 'dd MMM')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-[#16161a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription className="text-gray-500">
              Update customer profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Full Name</label>
              <Input
                value={editForm.full_name}
                onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <Input
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Phone Number</label>
              <Input
                value={editForm.phone_number}
                onChange={e => setEditForm(f => ({ ...f, phone_number: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialog(false)} className="text-gray-400">Cancel</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Adjustment Dialog */}
      <Dialog open={walletDialog} onOpenChange={(open) => { if (!open) { setWalletDialog(false); setWalletStep('form'); setOtpError(''); } }}>
        <DialogContent className="bg-[#16161a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-400" />
              Adjust Wallet
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {walletStep === 'form'
                ? <>Add funds to {walletTarget?.full_name || walletTarget?.email || 'customer'}&apos;s wallet. Current balance: ₹{walletTarget?.wallet_balance.toLocaleString('en-IN') || '0'}</>
                : 'Enter the OTP sent to admin email to confirm.'
              }
            </DialogDescription>
          </DialogHeader>

          {walletStep === 'form' && (
            <>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Amount (₹)</label>
                  <Input
                    type="number"
                    min="1"
                    max="1000000"
                    placeholder="Enter amount"
                    value={walletForm.amount}
                    onChange={e => setWalletForm(f => ({ ...f, amount: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Reason / Description</label>
                  <Textarea
                    placeholder="e.g. Promotional credit, Refund adjustment, etc."
                    value={walletForm.description}
                    onChange={e => setWalletForm(f => ({ ...f, description: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white resize-none"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setWalletDialog(false)} className="text-gray-400">Cancel</Button>
                <Button
                  onClick={sendWalletOtp}
                  disabled={otpSending || !walletForm.amount || !walletForm.description || Number(walletForm.amount) <= 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {otpSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send OTP to Verify
                </Button>
              </DialogFooter>
            </>
          )}

          {walletStep === 'otp' && (
            <>
              <div className="space-y-4 py-2">
                <div className="bg-white/[0.04] rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-lg font-bold text-green-400">₹{walletForm.amount ? Number(walletForm.amount).toLocaleString('en-IN') : '0'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="text-sm text-white">{walletTarget?.full_name || walletTarget?.email || '—'}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-amber-400" />
                    <label className="text-xs text-amber-400 font-medium">Enter 6-digit OTP from admin email</label>
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={walletOtp}
                    onChange={e => { setWalletOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                    className="bg-white/5 border-white/10 text-white text-center text-2xl font-mono tracking-[0.5em]"
                  />
                  {otpError && (
                    <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> {otpError}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-gray-600">{otpAttemptsLeft} attempt(s) remaining</p>
                    {otpAttemptsLeft === 0 || otpSendsRemaining > 0 ? (
                      <button
                        onClick={sendWalletOtp}
                        disabled={otpSending || otpSendsRemaining <= 0}
                        className="text-[10px] text-amber-400 hover:text-amber-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                      >
                        {otpSending ? 'Sending...' : otpSendsRemaining > 0 ? `Resend OTP (${otpSendsRemaining} left)` : 'No resends left (24h limit)'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setWalletStep('form')} className="text-gray-400">Back</Button>
                <Button
                  onClick={submitWalletAdjust}
                  disabled={walletSaving || walletOtp.length !== 6 || otpAttemptsLeft <= 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {walletSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <IndianRupee className="h-4 w-4 mr-1" />}
                  Confirm &amp; Add ₹{walletForm.amount ? Number(walletForm.amount).toLocaleString('en-IN') : '0'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
