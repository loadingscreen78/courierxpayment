"use client";

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Download,
  ExternalLink,
  Package,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AWBShipment {
  id: string;
  domestic_awb: string | null;
  domestic_label_url: string | null;
  recipient_name: string;
  recipient_phone: string | null;
  origin_address: string;
  destination_address: string;
  destination_country: string;
  shipment_type: string;
  current_status: string;
  weight_kg: number | null;
  declared_value: number | null;
  booking_reference_id: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
}

export default function AWBLabels() {
  const [shipments, setShipments] = useState<AWBShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchShipments = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('shipments')
        .select(`
          id, domestic_awb, domestic_label_url,
          recipient_name, recipient_phone,
          origin_address, destination_address, destination_country,
          shipment_type, current_status, weight_kg, declared_value,
          booking_reference_id, created_at,
          profiles:user_id ( full_name, email )
        `)
        .eq('current_leg', 'DOMESTIC')
        .not('domestic_awb', 'is', null)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('shipment_type', typeFilter as never);
      }

      const { data, error } = await query;
      if (error) throw error;
      setShipments((data as unknown as AWBShipment[]) || []);
    } catch (err) {
      console.error('Error fetching AWB shipments:', err);
      toast({ title: 'Failed to load shipments', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, toast]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const handleRegenerateLabel = async (shipment: AWBShipment) => {
    if (!shipment.domestic_awb) return;
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
      toast({
        title: 'Regeneration failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDownload = (shipment: AWBShipment) => {
    if (!shipment.domestic_label_url) return;
    // If it's a base64 PDF, trigger download
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

  const filtered = shipments.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.domestic_awb?.toLowerCase().includes(q) ||
      s.recipient_name?.toLowerCase().includes(q) ||
      s.booking_reference_id?.toLowerCase().includes(q) ||
      (s.profiles as { full_name: string; email: string } | null)?.full_name?.toLowerCase().includes(q)
    );
  });

  const withLabel = filtered.filter((s) => s.domestic_label_url);
  const withoutLabel = filtered.filter((s) => !s.domestic_label_url);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl font-bold text-white">AWB Labels</h1>
          <p className="text-gray-400">All domestic shipment Air Waybill labels</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search AWB, recipient, booking ID..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-colors text-sm"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] bg-[#16161a] border-white/10 text-white">
              <Filter className="h-4 w-4 mr-2 text-gray-400" />
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
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex gap-3 flex-wrap"
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white">
            Total: {filtered.length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Label Ready: {withLabel.length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Pending Label: {withoutLabel.length}
          </span>
        </motion.div>

        {/* List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-3"
        >
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-24 w-full bg-white/5 rounded-xl animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="bg-[#16161a] rounded-[2rem] border border-white/5 py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <h3 className="font-semibold text-white mb-1">No AWB Labels Found</h3>
              <p className="text-gray-500 text-sm">Book a domestic shipment to generate AWB labels</p>
            </div>
          ) : (
            filtered.map((shipment) => (
              <AWBCard
                key={shipment.id}
                shipment={shipment}
                isRegenerating={regeneratingId === shipment.id}
                onDownload={handleDownload}
                onRegenerate={handleRegenerateLabel}
              />
            ))
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}

function AWBCard({
  shipment,
  isRegenerating,
  onDownload,
  onRegenerate,
}: {
  shipment: AWBShipment;
  isRegenerating: boolean;
  onDownload: (s: AWBShipment) => void;
  onRegenerate: (s: AWBShipment) => void;
}) {
  const hasLabel = !!shipment.domestic_label_url;
  const profile = shipment.profiles as { full_name: string; email: string } | null;

  return (
    <div className="bg-[#16161a] rounded-[2rem] border border-white/5 p-4 hover:bg-white/[0.02] transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
            {shipment.shipment_type === 'medicine' && '💊'}
            {shipment.shipment_type === 'document' && '📄'}
            {shipment.shipment_type === 'gift' && '🎁'}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-sm font-bold text-white">
                {shipment.domestic_awb}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                hasLabel
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasLabel ? 'bg-green-500' : 'bg-amber-500'}`} />
                {hasLabel ? 'Label Ready' : 'No Label'}
              </span>
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
              {profile?.full_name && (
                <span className="text-xs text-gray-600">Customer: {profile.full_name}</span>
              )}
              {shipment.weight_kg && (
                <span className="text-xs text-gray-600">{shipment.weight_kg} kg</span>
              )}
              {shipment.declared_value && (
                <span className="text-xs text-gray-600">₹{shipment.declared_value.toLocaleString()}</span>
              )}
              <span className="text-xs text-gray-600">
                {new Date(shipment.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {hasLabel ? (
            <button
              onClick={() => onDownload(shipment)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
            >
              {shipment.domestic_label_url!.startsWith('http') ? (
                <ExternalLink className="h-3.5 w-3.5" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {shipment.domestic_label_url!.startsWith('http') ? 'Open' : 'Download'}
            </button>
          ) : (
            <button
              onClick={() => onRegenerate(shipment)}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Fetching...' : 'Fetch Label'}
            </button>
          )}
          <button
            onClick={() => onRegenerate(shipment)}
            disabled={isRegenerating}
            title="Re-fetch label from Nimbus"
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
