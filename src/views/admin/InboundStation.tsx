"use client";

import { useState, useRef, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import { motion } from 'framer-motion';
import { 
  ScanLine, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Package, 
  User, 
  MapPin,
  Phone,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useRouter } from 'next/navigation';
import { sendStatusNotification } from '@/lib/email/notify';

interface FoundShipment {
  id: string;
  tracking_number: string;
  domestic_tracking_id: string;
  recipient_name: string;
  recipient_phone: string;
  destination_country: string;
  shipment_type: string;
  status: string;
  user_id: string;
  profiles?: {
    full_name: string;
    phone_number: string;
  };
}

export default function InboundStation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundShipment, setFoundShipment] = useState<FoundShipment | null>(null);
  const [searchResult, setSearchResult] = useState<'found' | 'not_found' | null>(null);
  const [isMarking, setIsMarking] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { playSuccess, playError } = useSoundEffects();
  const router = useRouter();

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setFoundShipment(null);
    setSearchResult(null);

    try {
      // Search by domestic tracking ID or tracking number
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .or(`domestic_tracking_id.eq.${searchQuery},tracking_number.eq.${searchQuery}`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFoundShipment(data);
        setSearchResult('found');
        playSuccess();
        toast({
          title: 'Shipment Found!',
          description: `Tracking: ${data.tracking_number || data.domestic_tracking_id}`,
        });
      } else {
        setSearchResult('not_found');
        playError();
        toast({
          title: 'Shipment Not Found',
          description: 'No matching shipment found. Try searching by phone number.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      playError();
      toast({
        title: 'Search Error',
        description: 'Failed to search for shipment.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleMarkArrived = async () => {
    if (!foundShipment) return;

    setIsMarking(true);

    try {
      // Update shipment status
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ status: 'at_warehouse' })
        .eq('id', foundShipment.id);

      if (updateError) throw updateError;

      // Add tracking log
      const { error: logError } = await supabase
        .from('domestic_tracking_logs')
        .insert({
          shipment_id: foundShipment.id,
          status: 'DELIVERED_TO_WAREHOUSE',
          location: 'CourierX Warehouse, Mumbai',
        });

      if (logError) throw logError;

      playSuccess();
      toast({
        title: 'Status Updated!',
        description: 'Shipment marked as arrived at warehouse.',
      });

      // Fire-and-forget email notification
      sendStatusNotification(foundShipment.id, 'at_warehouse').catch(() => {});

      // Reset for next scan
      setSearchQuery('');
      setFoundShipment(null);
      setSearchResult(null);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Update error:', error);
      playError();
      toast({
        title: 'Update Failed',
        description: 'Failed to update shipment status.',
        variant: 'destructive',
      });
    } finally {
      setIsMarking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <h1 className="text-2xl font-typewriter font-bold text-white">Inbound Station</h1>
          <p className="text-gray-400">Scan or enter domestic AWB to receive packages</p>
        </motion.div>

        {/* Scanner Input - Prominent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-[#16161a] rounded-[2rem] border-2 border-dashed border-red-500/30 p-8"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <ScanLine className="h-10 w-10 text-red-500" />
            </div>
            
            <div className="w-full max-w-md space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scan barcode or enter AWB number..."
                  className="w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none pl-12 h-14 text-lg text-center rounded-lg font-typewriter"
                  autoComplete="on"
                />
              </div>
              
              <button 
                onClick={handleSearch} 
                className="bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all w-full h-12 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? 'Searching...' : 'Search Shipment'}
              </button>
            </div>

            <p className="text-sm text-gray-400">
              Scan the domestic courier barcode (Delhivery/BlueDart AWB) or enter manually
            </p>
          </div>
        </motion.div>

        {/* Search Result */}
        {searchResult === 'found' && foundShipment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-[#16161a] rounded-[2rem] border border-green-500/30 p-6"
          >
            <div className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-white font-bold font-typewriter">Shipment Found</h3>
                  <p className="text-gray-400 text-sm">
                    {foundShipment.tracking_number || foundShipment.domestic_tracking_id}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {/* Shipment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Recipient</p>
                    <p className="text-white font-medium">{foundShipment.recipient_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-white font-medium">{foundShipment.recipient_phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Destination</p>
                    <p className="text-white font-medium">{foundShipment.destination_country}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-white/10 text-white capitalize">
                      {foundShipment.shipment_type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button 
                  onClick={handleMarkArrived}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.3)] h-10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isMarking || foundShipment.status === 'at_warehouse'}
                >
                  {isMarking ? 'Updating...' : foundShipment.status === 'at_warehouse' ? 'Already Received' : 'Mark as Arrived'}
                </button>
                <button 
                  onClick={() => router.push(`/admin/qc/${foundShipment.id}`)}
                  className="bg-white/10 border border-white/10 text-white hover:bg-white/20 rounded-lg font-bold px-4 h-10 transition-all inline-flex items-center gap-2"
                >
                  Go to QC
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Not Found State */}
        {searchResult === 'not_found' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-[#16161a] rounded-[2rem] border border-red-500/30 p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">Unknown Shipment</h3>
                <p className="text-sm text-gray-400">
                  No shipment found with AWB: {searchQuery}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-gray-400 mb-3">Try searching by:</p>
              <div className="flex gap-2">
                <button
                  className="bg-white/10 border border-white/10 text-white hover:bg-white/20 rounded-lg font-bold px-3 py-1.5 text-sm transition-all"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResult(null);
                    inputRef.current?.focus();
                  }}
                >
                  Customer Phone
                </button>
                <button
                  className="bg-white/10 border border-white/10 text-white hover:bg-white/20 rounded-lg font-bold px-3 py-1.5 text-sm transition-all"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResult(null);
                    inputRef.current?.focus();
                  }}
                >
                  Booking ID
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}
