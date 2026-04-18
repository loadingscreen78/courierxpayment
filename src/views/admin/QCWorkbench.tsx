"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout';
import { 
  ClipboardCheck, 
  Package, 
  ArrowRight, 
  Search,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface QCShipment {
  id: string;
  tracking_number: string;
  recipient_name: string;
  destination_country: string;
  shipment_type: string;
  status: string;
  created_at: string;
  weight_kg: number;
}

export default function QCWorkbench() {
  const [shipments, setShipments] = useState<QCShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress'>('pending');
  const router = useRouter();

  useEffect(() => {
    const fetchShipments = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('shipments')
          .select('*')
          .order('created_at', { ascending: false });

        if (filter === 'pending') {
          query = query.eq('status', 'at_warehouse');
        } else if (filter === 'in_progress') {
          query = query.eq('status', 'qc_in_progress');
        } else {
          query = query.in('status', ['at_warehouse', 'qc_in_progress', 'qc_passed', 'qc_failed']);
        }

        const { data, error } = await query;

        if (error) throw error;
        setShipments(data || []);
      } catch (error) {
        console.error('Error fetching shipments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipments();
  }, [filter]);

  const filteredShipments = shipments.filter(s => 
    s.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusDot = (status: string) => {
    const colors: Record<string, string> = {
      at_warehouse: 'bg-amber-500',
      qc_in_progress: 'bg-blue-500',
      qc_passed: 'bg-green-500',
      qc_failed: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      at_warehouse: 'Pending QC',
      qc_in_progress: 'In Progress',
      qc_passed: 'Passed',
      qc_failed: 'Failed',
    };
    return labels[status] || status;
  };

  const getShipmentTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      medicine: 'Rx',
      document: 'Doc',
      gift: 'Gift',
    };
    return icons[type] || 'Pkg';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">QC Workbench</h1>
              <p className="text-gray-400">Quality control and verification</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {shipments.filter(s => s.status === 'at_warehouse').length} Pending
              </span>
            </div>
          </div>
        </motion.div>

        {/* Filters & Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tracking or recipient..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-colors text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(['pending', 'in_progress', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? 'bg-red-600 text-white font-bold rounded-lg px-4 py-2 text-sm'
                    : 'bg-white/10 border border-white/10 text-gray-400 hover:bg-white/20 hover:text-white rounded-lg px-4 py-2 text-sm font-bold transition-all'
                }
              >
                {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Shipments List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-3"
        >
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-24 w-full bg-white/5 rounded-[2rem] animate-pulse" />
            ))
          ) : filteredShipments.length === 0 ? (
            <div className="bg-[#16161a] rounded-[2rem] border border-white/5 shadow-2xl py-12 text-center">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <h3 className="font-semibold text-white mb-1">No Shipments</h3>
              <p className="text-gray-500 text-sm">
                {filter === 'pending' 
                  ? 'No shipments pending QC'
                  : 'No shipments found matching your criteria'
                }
              </p>
            </div>
          ) : (
            filteredShipments.map((shipment) => (
              <div
                key={shipment.id}
                className="bg-[#16161a] rounded-[2rem] border border-white/5 p-4 hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => router.push(`/admin/qc/${shipment.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                      {getShipmentTypeIcon(shipment.shipment_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">
                          {shipment.tracking_number || 'No tracking'}
                        </p>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10">
                          <span className={`w-2 h-2 rounded-full ${getStatusDot(shipment.status)}`} />
                          <span className="text-gray-300">{getStatusLabel(shipment.status as any)}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {shipment.recipient_name} • {shipment.destination_country}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {shipment.weight_kg || '?'} kg
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(shipment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}
