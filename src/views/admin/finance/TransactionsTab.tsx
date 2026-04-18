'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet, CreditCard, Loader2, ArrowUpRight, ArrowDownLeft,
  Package, RefreshCw, IndianRupee,
} from 'lucide-react';
import { format } from 'date-fns';

interface LedgerRow {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  full_name?: string | null;
  phone_number?: string | null;
}

interface ShipmentRow {
  id: string;
  user_id: string;
  total_amount: number;
  shipment_type: string;
  tracking_number: string;
  current_status: string;
  created_at: string;
  full_name?: string | null;
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${color} bg-white/[0.03]`}>
      <IndianRupee className="h-3.5 w-3.5 opacity-70" />
      <div>
        <p className="text-[10px] uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

async function fetchProfileMap(
  supabaseClient: typeof supabase,
  userIds: string[]
): Promise<Record<string, { full_name: string | null; phone_number: string | null }>> {
  if (userIds.length === 0) return {};
  const { data } = await supabaseClient
    .from('profiles')
    .select('id, full_name, phone_number')
    .in('id', userIds);
  const map: Record<string, { full_name: string | null; phone_number: string | null }> = {};
  (data || []).forEach((p: any) => {
    map[p.id] = { full_name: p.full_name ?? null, phone_number: p.phone_number ?? null };
  });
  return map;
}

export function TransactionsTab() {
  const [rechargeRows, setRechargeRows] = useState<LedgerRow[]>([]);
  const [shipmentRows, setShipmentRows] = useState<ShipmentRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [loadingRecharge, setLoadingRecharge] = useState(true);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [outerTab, setOuterTab] = useState('wallet-recharge');

  const fetchRecharges = useCallback(async () => {
    setLoadingRecharge(true);
    try {
      const { data, error } = await supabase
        .from('wallet_ledger')
        .select('id, user_id, transaction_type, amount, description, reference_id, reference_type, metadata, created_at')
        .eq('reference_type', 'payment')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) console.error('[Finance] recharges error:', error);

      const rows: any[] = data || [];
      const ids: string[] = rows.map(r => r.user_id as string);
      const userIds: string[] = [...new Set(ids)];
      const profileMap = await fetchProfileMap(supabase, userIds);
      setRechargeRows(rows.map(r => ({ ...r, ...profileMap[r.user_id] })));
    } finally {
      setLoadingRecharge(false);
    }
  }, []);

  const fetchShipmentPayments = useCallback(async () => {
    setLoadingShipments(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('id, user_id, total_amount, shipment_type, tracking_number, current_status, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) console.error('[Finance] shipments error:', error);

      const rows = (data || []) as ShipmentRow[];
      const ids: string[] = rows.map(r => r.user_id).filter(Boolean);
      const userIds: string[] = [...new Set(ids)];
      const profileMap = await fetchProfileMap(supabase, userIds);
      setShipmentRows(rows.map(r => ({ ...r, full_name: profileMap[r.user_id]?.full_name ?? null })));
    } finally {
      setLoadingShipments(false);
    }
  }, []);

  const fetchLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const { data, error } = await supabase
        .from('wallet_ledger')
        .select('id, user_id, transaction_type, amount, description, reference_id, reference_type, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) console.error('[Finance] ledger error:', error);

      const rows: any[] = data || [];
      const ids: string[] = rows.map(r => r.user_id as string).filter(Boolean);
      const userIds: string[] = [...new Set(ids)];
      const profileMap = await fetchProfileMap(supabase, userIds);
      setLedgerRows(rows.map(r => ({ ...r, ...profileMap[r.user_id] })));
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  useEffect(() => {
    fetchRecharges();
    fetchShipmentPayments();
    fetchLedger();

    const walletChannel = supabase
      .channel('admin-wallet-ledger-v3')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_ledger' }, () => {
        fetchRecharges();
        fetchLedger();
      })
      .subscribe();

    const shipmentsChannel = supabase
      .channel('admin-shipment-payments-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, fetchShipmentPayments)
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(shipmentsChannel);
    };
  }, [fetchRecharges, fetchShipmentPayments, fetchLedger]);

  const totalRecharge = rechargeRows
    .filter(r => r.transaction_type === 'credit')
    .reduce((s, r) => s + (r.amount || 0), 0);
  const totalShipmentRevenue = shipmentRows.reduce((s, r) => s + (r.total_amount || 0), 0);
  const walletCredits = ledgerRows
    .filter(r => r.transaction_type === 'credit' || r.transaction_type === 'refund')
    .reduce((s, r) => s + (r.amount || 0), 0);

  const typeBadgeClass = (type: string) =>
    type === 'credit' || type === 'refund' ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <StatPill label="Total Recharge (Cashfree)" value={`₹${totalRecharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} color="border-emerald-500/30 text-emerald-400" />
        <StatPill label="Shipment Revenue" value={`₹${totalShipmentRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} color="border-blue-500/30 text-blue-400" />
        <StatPill label="Wallet Credits" value={`₹${walletCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} color="border-purple-500/30 text-purple-400" />
      </div>

      <Tabs value={outerTab} onValueChange={setOuterTab}>
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1 gap-1 mb-4">
          <TabsTrigger value="wallet-recharge" className="rounded-lg data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-gray-400 text-sm px-4 py-2 flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5" />
            Wallet Recharge
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-gray-300">{rechargeRows.length}</span>
          </TabsTrigger>
          <TabsTrigger value="shipment-payments" className="rounded-lg data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 text-gray-400 text-sm px-4 py-2 flex items-center gap-2">
            <Package className="h-3.5 w-3.5" />
            Shipment Payments
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-gray-300">{shipmentRows.length}</span>
          </TabsTrigger>
          <TabsTrigger value="wallet-ledger" className="rounded-lg data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 text-gray-400 text-sm px-4 py-2 flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5" />
            Wallet Ledger
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-gray-300">{ledgerRows.length}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Wallet Recharge ── */}
        <TabsContent value="wallet-recharge">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-gray-400 font-medium">Live — Cashfree Payment Gateway (wallet_ledger)</span>
            </div>
            <button onClick={fetchRecharges} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          {loadingRecharge ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
          ) : rechargeRows.length === 0 ? (
            <div className="text-center py-20">
              <CreditCard className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No wallet recharges yet</p>
              <p className="text-xs text-gray-600 mt-1">Wallet recharges via Cashfree will appear here in real-time</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Method</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Payment ID</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rechargeRows.map(row => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-gray-300">{row.full_name || row.user_id.slice(0, 8) + '…'}</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">₹{Number(row.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-400 capitalize text-xs">{row.metadata?.method || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.metadata?.cf_payment_id || row.reference_id || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          {row.transaction_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(row.created_at), 'dd MMM yyyy, HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Shipment Payments ── */}
        <TabsContent value="shipment-payments">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs text-gray-400 font-medium">Live — Wallet deductions for booked shipments</span>
            </div>
            <button onClick={fetchShipmentPayments} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          {loadingShipments ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
          ) : shipmentRows.length === 0 ? (
            <div className="text-center py-20">
              <Package className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No shipment payments yet</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Tracking</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Amount Paid</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {shipmentRows.map(row => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-gray-300">{row.full_name || '—'}</td>
                      <td className="px-4 py-3 text-white font-mono text-xs">{row.tracking_number}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                          {row.shipment_type === 'medicine' ? 'Rx' : row.shipment_type === 'document' ? 'Doc' : 'Gift'} {row.shipment_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-blue-400 font-bold">₹{Number(row.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge className="text-[10px] capitalize border bg-white/5 border-white/10 text-gray-400">
                          {row.current_status?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(row.created_at), 'dd MMM yyyy, HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Wallet Ledger ── */}
        <TabsContent value="wallet-ledger">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs text-gray-400 font-medium">Live — All wallet credits &amp; debits</span>
            </div>
            <button onClick={fetchLedger} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          {loadingLedger ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
          ) : ledgerRows.length === 0 ? (
            <div className="text-center py-20">
              <Wallet className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No wallet transactions</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Description</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Ref</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map(row => {
                    const isCredit = row.transaction_type === 'credit' || row.transaction_type === 'refund';
                    return (
                      <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-gray-300 max-w-[150px] truncate">{row.full_name || row.user_id.slice(0, 8) + '…'}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs font-medium capitalize ${typeBadgeClass(row.transaction_type)}`}>
                            {isCredit ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            {row.transaction_type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-bold ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isCredit ? '+' : '-'}₹{Math.abs(Number(row.amount)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{row.description || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.reference_type || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(row.created_at), 'dd MMM yyyy, HH:mm')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
