"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  MagnifyingGlass,
  Funnel,
  ArrowRight
} from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getStatusLabel, getStatusDotColor } from '@/lib/shipment-lifecycle/statusLabelMap';
import type { ShipmentStatus } from '@/lib/shipment-lifecycle/types';

interface Shipment {
  id: string;
  tracking_number: string;
  recipient_name: string;
  destination_country: string;
  shipment_type: string;
  status: string;
  current_status: ShipmentStatus;
  current_leg: string;
  created_at: string;
  weight_kg: number;
  total_amount: number;
  user_id: string;
  pickup_address: any;
  consignee_address: any;
  profiles?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ARRIVED_AT_WAREHOUSE', label: 'Arrived at Warehouse' },
  { value: 'QUALITY_CHECKED', label: 'Quality Check Completed' },
  { value: 'PACKAGED', label: 'Shipment Packaged' },
  { value: 'DISPATCH_APPROVED', label: 'Dispatch Approved' },
  { value: 'DISPATCHED', label: 'Dispatched Internationally' },
  { value: 'IN_INTERNATIONAL_TRANSIT', label: 'In International Transit' },
  { value: 'CUSTOMS_CLEARANCE', label: 'Customs Clearance' },
  { value: 'INTL_OUT_FOR_DELIVERY', label: 'Out for Delivery (International)' },
  { value: 'INTL_DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
];

export default function AllShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [legFilter, setLegFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const fetchShipments = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('shipments')
          .select('*')
          .in('current_leg', ['COUNTER', 'INTERNATIONAL', 'COMPLETED', 'DOMESTIC'])
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('current_status', statusFilter as any);
        }

        if (typeFilter !== 'all') {
          query = query.eq('shipment_type', typeFilter as any);
        }

        if (legFilter === 'domestic') {
          query = query.eq('current_leg', 'DOMESTIC');
        } else if (legFilter === 'international') {
          query = query.in('current_leg', ['COUNTER', 'INTERNATIONAL', 'COMPLETED']);
        }

        const { data, error } = await query;

        if (error) throw error;

        const rows = data || [];
        const userIds = [...new Set(rows.map((s: any) => s.user_id).filter(Boolean))];
        let profileMap: Record<string, { full_name: string; email: string; phone: string }> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, phone_number')
            .in('user_id', userIds);
          (profiles || []).forEach((p: any) => {
            profileMap[p.user_id] = {
              full_name: p.full_name || '',
              email: p.email || '',
              phone: p.phone_number || '',
            };
          });
        }
        setShipments(rows.map((s: any) => {
          const profile = profileMap[s.user_id];
          // Fallback: use pickup address contact info if no profile row exists
          const fallbackName = s.pickup_address?.fullName || s.pickup_address?.full_name || '';
          const fallbackPhone = s.pickup_address?.phone || '';
          return {
            ...s,
            profiles: profile
              ? profile
              : (fallbackName ? { full_name: fallbackName, email: '', phone: fallbackPhone } : null),
          };
        }));
      } catch (error) {
        console.error('Error fetching shipments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipments();

    // Subscribe to real-time updates filtered by relevant legs
    const channel = supabase
      .channel('admin-shipments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
          filter: 'current_leg=in.(COUNTER,INTERNATIONAL,COMPLETED,DOMESTIC)'
        },
        () => {
          fetchShipments();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[AllShipments] Channel error, will refresh on reconnect');
        }
        if (status === 'SUBSCRIBED') {
          // Re-fetch on reconnection to catch missed events
          fetchShipments();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter, typeFilter, legFilter]);

  const filteredShipments = shipments.filter(s => 
    s.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.destination_country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-2xl font-bold text-white">All Shipments</h1>
          <p className="text-gray-400">View and manage all shipments</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracking, recipient, or country..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-colors text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-[#16161a] border-white/10 text-white">
              <Funnel size={16} weight="bold" className="mr-2 text-gray-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#16161a] border-white/10">
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-gray-300 focus:bg-white/10 focus:text-white">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px] bg-[#16161a] border-white/10 text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#16161a] border-white/10">
              <SelectItem value="all" className="text-gray-300 focus:bg-white/10 focus:text-white">All Types</SelectItem>
              <SelectItem value="medicine" className="text-gray-300 focus:bg-white/10 focus:text-white">Medicine</SelectItem>
              <SelectItem value="document" className="text-gray-300 focus:bg-white/10 focus:text-white">Document</SelectItem>
              <SelectItem value="gift" className="text-gray-300 focus:bg-white/10 focus:text-white">Gift</SelectItem>
            </SelectContent>
          </Select>
          <Select value={legFilter} onValueChange={setLegFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-[#16161a] border-white/10 text-white">
              <SelectValue placeholder="Route" />
            </SelectTrigger>
            <SelectContent className="bg-[#16161a] border-white/10">
              <SelectItem value="all" className="text-gray-300 focus:bg-white/10 focus:text-white">All Routes</SelectItem>
              <SelectItem value="domestic" className="text-gray-300 focus:bg-white/10 focus:text-white">🇮🇳 Domestic</SelectItem>
              <SelectItem value="international" className="text-gray-300 focus:bg-white/10 focus:text-white">🌍 International</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex gap-3 overflow-x-auto pb-2"
        >
          <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white">
            Total: {filteredShipments.length}
          </span>
          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            🇮🇳 Domestic: {filteredShipments.filter(s => s.current_leg === 'DOMESTIC').length}
          </span>
          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            🌍 International: {filteredShipments.filter(s => s.current_leg !== 'DOMESTIC').length}
          </span>
          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Pending QC: {filteredShipments.filter(s => s.current_status === 'ARRIVED_AT_WAREHOUSE').length}
          </span>
          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Ready: {filteredShipments.filter(s => s.current_status === 'DISPATCH_APPROVED').length}
          </span>
        </motion.div>

        {/* Shipments List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-3"
        >
          {isLoading ? (
            Array(10).fill(0).map((_, i) => (
              <div key={i} className="h-20 w-full bg-white/5 rounded-xl animate-pulse" />
            ))
          ) : filteredShipments.length === 0 ? (
            <div className="bg-[#16161a] rounded-[2rem] border border-white/5 shadow-2xl py-12 text-center">
              <Package size={48} weight="bold" className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <h3 className="font-semibold text-white mb-1">No Shipments Found</h3>
              <p className="text-gray-500 text-sm">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            filteredShipments.map((shipment) => (
              <div
                key={shipment.id}
                className="bg-[#16161a] rounded-2xl sm:rounded-[2rem] border border-white/5 p-3 sm:p-4 hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => router.push(`/admin/qc/${shipment.id}`)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                      {shipment.shipment_type === 'medicine' && '💊'}
                      {shipment.shipment_type === 'document' && '📄'}
                      {shipment.shipment_type === 'gift' && '🎁'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-white">
                          {shipment.tracking_number || 'No tracking'}
                        </p>
                        {/* Domestic / International badge */}
                        {shipment.current_leg === 'DOMESTIC' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 border border-green-500/30 text-green-400">
                            🇮🇳 Domestic
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                            🌍 International
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10">
                          <span className={`w-2 h-2 rounded-full ${getStatusDotColor(shipment.current_status as any)}`} />
                          <span className="text-gray-300">{getStatusLabel(shipment.current_status as any)}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        <span className="font-medium text-gray-300">{shipment.recipient_name}</span> → {shipment.destination_country}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        User: {shipment.profiles?.full_name || 'Unknown'} • {shipment.profiles?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-white">
                      ₹{shipment.total_amount?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(shipment.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(shipment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 text-gray-400 hover:text-white hover:bg-white/10">
                    <ArrowRight size={16} weight="bold" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}