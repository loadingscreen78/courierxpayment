"use client";

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, MagnifyingGlass, DownloadSimple, ArrowSquareOut, Package,
  ArrowsClockwise, Funnel, Globe, Truck, CurrencyInr, TrendUp,
} from '@phosphor-icons/react';
import { ExternalLink, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface AWBShipment {
  id: string;
  user_id: string;
  domestic_awb: string | null;
  domestic_label_url: string | null;
  international_awb: string | null;
  recipient_name: string;
  recipient_phone: string | null;
  origin_address: string;
  destination_address: string;
  destination_country: string;
  shipment_type: string;
  current_status: string;
  current_leg: string;
  weight_kg: number | null;
  declared_value: number | null;
  total_amount: number | null;
  booking_reference_id: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
}

export default function AWBLabels() {
  const [domesticShipments, setDomesticShipments] = useState<AWBShipment[]>([]);
  const [intlShipments, setIntlShipments] = useState<AWBShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('domestic');
  const { toast } = useToast();

  const fetchShipments = useCallback(async () => {
    setIsLoading(true);
    try {
      // Domestic AWBs
      let dQuery = supabase
        .from('shipments')
        .select(`id, domestic_awb, domestic_label_url, international_awb,
          recipient_name, recipient_phone, origin_address, destination_address,
          destination_country, shipment_type, current_status, current_leg,
          weight_kg, declared_value, total_amount, booking_reference_id, created_at, user_id`)
        .not('domestic_awb', 'is', null)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') dQuery = dQuery.eq('shipment_type', typeFilter as never);
      const { data: dData, error: dErr } = await dQuery;
      if (dErr) throw dErr;

      // International AWBs
      let iQuery = supabase
        .from('shipments')
        .select(`id, domestic_awb, domestic_label_url, international_awb,
          recipient_name, recipient_phone, origin_address, destination_address,
          destination_country, shipment_type, current_status, current_leg,
          weight_kg, declared_value, total_amount, booking_reference_id, created_at, user_id`)
        .not('international_awb', 'is', null)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') iQuery = iQuery.eq('shipment_type', typeFilter as never);
      const { data: iData, error: iErr } = await iQuery;
      if (iErr) throw iErr;

      // Fetch profiles separately to avoid RLS join failures
      const allRows = [...(dData || []), ...(iData || [])] as any[];
      const userIds: string[] = [...new Set(allRows.map(r => r.user_id as string).filter(Boolean))];
      let profileMap: Record<string, { full_name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        (profiles || []).forEach((p: any) => {
          profileMap[p.id] = { full_name: p.full_name || '', email: p.email || '' };
        });
      }

      const attachProfile = (r: any): AWBShipment => ({ ...r, profiles: profileMap[r.user_id] || null });
      setDomesticShipments((dData || []).map(attachProfile));
      setIntlShipments((iData || []).map(attachProfile));
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to load shipments', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, toast]);

  useEffect(() => {
    fetchShipments();

    // Real-time subscription for AWB updates
    const channel = supabase
      .channel('admin-awb-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipments' },
        () => { fetchShipments(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchShipments]);

  const isMockAwb = (awb: string | null) => !awb || awb.startsWith('CXD-MOCK-') || awb.startsWith('CX-MOCK-') || awb.startsWith('MOCK-');

  const handleRegenerateLabel = async (shipment: AWBShipment) => {
    if (!shipment.domestic_awb) return;

    if (isMockAwb(shipment.domestic_awb)) {
      toast({ title: 'Mock shipment', description: 'This was booked without NimbusPost credentials. Re-book to get a real AWB label.', variant: 'destructive' });
      return;
    }

    setRegeneratingId(shipment.id);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`/api/shipments/awb-label?awb=${encodeURIComponent(shipment.domestic_awb)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed');
      toast({ title: 'Label regenerated', description: `AWB: ${shipment.domestic_awb}` });
      fetchShipments();
    } catch (err) {
      toast({ title: 'Regeneration failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally { setRegeneratingId(null); }
  };

  const handleDownload = (shipment: AWBShipment) => {
    if (!shipment.domestic_label_url) return;
    if (shipment.domestic_label_url.startsWith('data:') || !shipment.domestic_label_url.startsWith('http')) {
      const dataUrl = shipment.domestic_label_url.startsWith('data:')
        ? shipment.domestic_label_url
        : `data:application/pdf;base64,${shipment.domestic_label_url}`;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `AWB_${shipment.domestic_awb}.pdf`;
      a.click();
    } else {
      window.open(shipment.domestic_label_url, '_blank');
    }
  };

  const filterList = (list: AWBShipment[]) => {
    const q = searchQuery.toLowerCase();
    return list.filter(s =>
      s.domestic_awb?.toLowerCase().includes(q) ||
      s.international_awb?.toLowerCase().includes(q) ||
      s.recipient_name?.toLowerCase().includes(q) ||
      s.booking_reference_id?.toLowerCase().includes(q) ||
      (s.profiles as any)?.full_name?.toLowerCase().includes(q)
    );
  };

  const filteredDomestic = filterList(domesticShipments);
  const filteredIntl = filterList(intlShipments);

  // Revenue stats
  const allShipments = [...new Map([...domesticShipments, ...intlShipments].map(s => [s.id, s])).values()];
  const totalRevenue = allShipments.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const domesticRevenue = domesticShipments.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const intlRevenue = intlShipments.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl font-bold text-white">AWB Labels</h1>
          <p className="text-gray-400">Domestic & International Air Waybill labels</p>
        </motion.div>

        {/* Revenue stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { label: 'Total Shipment Revenue', value: totalRevenue, color: 'from-red-600/20 to-red-900/10 border-red-500/20', text: 'text-red-400', icon: TrendUp },
            { label: 'Domestic Revenue', value: domesticRevenue, color: 'from-green-600/20 to-green-900/10 border-green-500/20', text: 'text-green-400', icon: Truck },
            { label: 'International Revenue', value: intlRevenue, color: 'from-blue-600/20 to-blue-900/10 border-blue-500/20', text: 'text-blue-400', icon: Globe },
          ].map(card => (
            <div key={card.label} className={`bg-gradient-to-br ${card.color} border rounded-2xl p-5 flex items-center gap-4`}>
              <div className={`p-2.5 rounded-xl bg-white/5`}>
                <card.icon className={`h-5 w-5 ${card.text}`} />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">{card.label}</p>
                <p className={`text-xl font-bold font-mono ${card.text}`}>
                  ₹{card.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search AWB, recipient, booking ID..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-colors text-sm"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] bg-[#16161a] border-white/10 text-white">
              <Funnel size={16} weight="bold" className="mr-2 text-gray-400" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#16161a] border-white/10">
              <SelectItem value="all" className="text-gray-300 focus:bg-white/10 focus:text-white">All Types</SelectItem>
              <SelectItem value="medicine" className="text-gray-300 focus:bg-white/10 focus:text-white">Medicine</SelectItem>
              <SelectItem value="document" className="text-gray-300 focus:bg-white/10 focus:text-white">Document</SelectItem>
              <SelectItem value="gift" className="text-gray-300 focus:bg-white/10 focus:text-white">Gift</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={fetchShipments}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors text-sm"
          >
            <ArrowsClockwise size={16} weight="bold" /> Refresh
          </button>
        </motion.div>

        {/* Domestic / International tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1 gap-1 mb-4">
              <TabsTrigger value="domestic" className="rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-300 text-gray-400 text-sm px-5 py-2 flex items-center gap-2">
                <Truck size={14} weight="bold" />
                Domestic AWB
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-gray-300">{filteredDomestic.length}</span>
              </TabsTrigger>
              <TabsTrigger value="international" className="rounded-lg data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 text-gray-400 text-sm px-5 py-2 flex items-center gap-2">
                <Globe size={14} weight="bold" />
                International AWB
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-gray-300">{filteredIntl.length}</span>
              </TabsTrigger>
            </TabsList>

            {/* Domestic */}
            <TabsContent value="domestic">
              <div className="flex gap-3 flex-wrap mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white">Total: {filteredDomestic.length}</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-500" />Label Ready: {filteredDomestic.filter(s => s.domestic_label_url).length}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />Pending: {filteredDomestic.filter(s => !s.domestic_label_url).length}
                </span>
              </div>
              <AWBList
                shipments={filteredDomestic}
                isLoading={isLoading}
                regeneratingId={regeneratingId}
                onDownload={handleDownload}
                onRegenerate={handleRegenerateLabel}
                mode="domestic"
              />
            </TabsContent>

            {/* International */}
            <TabsContent value="international">
              <div className="flex gap-3 flex-wrap mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white">Total: {filteredIntl.length}</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />With AWB: {filteredIntl.filter(s => s.international_awb).length}
                </span>
              </div>
              <AWBList
                shipments={filteredIntl}
                isLoading={isLoading}
                regeneratingId={regeneratingId}
                onDownload={handleDownload}
                onRegenerate={handleRegenerateLabel}
                mode="international"
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </AdminLayout>
  );
}

function AWBList({ shipments, isLoading, regeneratingId, onDownload, onRegenerate, mode }: {
  shipments: AWBShipment[];
  isLoading: boolean;
  regeneratingId: string | null;
  onDownload: (s: AWBShipment) => void;
  onRegenerate: (s: AWBShipment) => void;
  mode: 'domestic' | 'international';
}) {
  if (isLoading) return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-24 w-full bg-white/5 rounded-xl animate-pulse" />)}</div>;
  if (shipments.length === 0) return (
    <div className="bg-[#16161a] rounded-[2rem] border border-white/5 py-12 text-center">
      <FileText size={48} weight="bold" className="mx-auto mb-4 text-gray-600" />
      <h3 className="font-semibold text-white mb-1">No AWB Labels Found</h3>
      <p className="text-gray-500 text-sm">
        {mode === 'domestic' ? 'Book a domestic shipment to generate AWB labels' : 'International AWBs will appear here once assigned'}
      </p>
    </div>
  );
  return (
    <div className="space-y-3">
      {shipments.map(shipment => (
        <AWBCard
          key={shipment.id}
          shipment={shipment}
          isRegenerating={regeneratingId === shipment.id}
          onDownload={onDownload}
          onRegenerate={onRegenerate}
          mode={mode}
        />
      ))}
    </div>
  );
}

function AWBCard({ shipment, isRegenerating, onDownload, onRegenerate, mode }: {
  shipment: AWBShipment;
  isRegenerating: boolean;
  onDownload: (s: AWBShipment) => void;
  onRegenerate: (s: AWBShipment) => void;
  mode: 'domestic' | 'international';
}) {
  const hasLabel = !!shipment.domestic_label_url;
  const awbNumber = mode === 'domestic' ? shipment.domestic_awb : shipment.international_awb;
  const isMock = awbNumber?.startsWith('CXD-MOCK-') || awbNumber?.startsWith('CX-MOCK-') || awbNumber?.startsWith('MOCK-');
  const profile = shipment.profiles as { full_name: string; email: string } | null;

  return (
    <div className="bg-[#16161a] rounded-[2rem] border border-white/5 p-4 hover:bg-white/[0.02] transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0">
            {shipment.shipment_type === 'medicine' && 'Rx'}
            {shipment.shipment_type === 'document' && 'Doc'}
            {shipment.shipment_type === 'gift' && 'Gift'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-sm font-bold text-white">{awbNumber}</span>
              {mode === 'domestic' && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                  isMock ? 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                  : hasLabel ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isMock ? 'bg-gray-500' : hasLabel ? 'bg-green-500' : 'bg-amber-500'}`} />
                  {isMock ? 'Mock AWB' : hasLabel ? 'Label Ready' : 'No Label'}
                </span>
              )}
              {mode === 'international' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-500/10 border-blue-500/30 text-blue-400">
                  <Globe size={12} weight="bold" /> International
                </span>
              )}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-400 capitalize">
                {shipment.shipment_type}
              </span>
            </div>
            <p className="text-sm text-gray-300 truncate">
              <span className="font-medium">{shipment.recipient_name}</span>
              {shipment.recipient_phone && <span className="text-gray-500"> · {shipment.recipient_phone}</span>}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {shipment.origin_address} → {shipment.destination_country}
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {profile?.full_name && <span className="text-xs text-gray-600">Customer: {profile.full_name}</span>}
              {shipment.weight_kg && <span className="text-xs text-gray-600">{shipment.weight_kg} kg</span>}
              {shipment.total_amount && (
                <span className="text-xs font-medium text-emerald-500/80">₹{shipment.total_amount.toLocaleString('en-IN')}</span>
              )}
              <span className="text-xs text-gray-600">
                {new Date(shipment.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {mode === 'domestic' && (
            hasLabel ? (
              <button onClick={() => onDownload(shipment)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors">
                {shipment.domestic_label_url!.startsWith('http') ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                {shipment.domestic_label_url!.startsWith('http') ? 'Open' : 'Download'}
              </button>
            ) : (
              <button onClick={() => onRegenerate(shipment)} disabled={isRegenerating || !!isMock} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors">
                <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isMock ? 'Mock — No Label' : isRegenerating ? 'Fetching...' : 'Fetch Label'}
              </button>
            )
          )}
          {mode === 'international' && (
            <span className="text-xs text-gray-500 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              {shipment.current_status?.replace(/_/g, ' ')}
            </span>
          )}
          {mode === 'domestic' && !isMock && (
            <button onClick={() => onRegenerate(shipment)} disabled={isRegenerating} title="Re-fetch label" className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
