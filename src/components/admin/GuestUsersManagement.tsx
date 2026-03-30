"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Users, Search, Eye, Download, Loader2, Package, Phone, Mail,
  MapPin, CreditCard, FileText, ShieldCheck, Globe, Truck,
  ChevronDown, ChevronUp, X, ExternalLink, Clock, CheckCircle2,
  XCircle, AlertCircle, Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────
interface GuestBooking {
  id: string;
  order_id: string;
  tracking_number: string | null;
  amount: number;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  sender_address: string | null;
  receiver_name: string | null;
  receiver_email: string | null;
  receiver_phone: string | null;
  receiver_address: string | null;
  shipment_type: string | null;
  courier_name: string | null;
  aadhaar_last4: string | null;
  coupon_code: string | null;
  status: string;
  awb_number: string | null;
  label_url: string | null;
  paid_at: string | null;
  booking_payload: any;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending_payment: { label: 'Pending Payment', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  paid: { label: 'Paid', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CreditCard },
  shipped: { label: 'Shipped', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  paid_nimbus_failed: { label: 'Shipment Failed', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
};

const TYPE_EMOJI: Record<string, string> = {
  medicine: '💊',
  document: '📄',
  gift: '🎁',
};

const PAGE_SIZE = 15;

// ─── Stat Card ───────────────────────────────────────────────────────
function GuestStatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: any; color: string; sub?: string;
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
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub || label}</p>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function GuestUsersManagement() {
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<GuestBooking | null>(null);
  const [docViewerOpen, setDocViewerOpen] = useState(false);
  const [docViewerUrl, setDocViewerUrl] = useState('');
  const [docViewerTitle, setDocViewerTitle] = useState('');

  const fetchBookings = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/guest-bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { bookings: data } = await res.json();
      setBookings(data || []);
    } catch (err) {
      console.error('[GuestUsers] fetch error:', err);
      toast.error('Failed to load guest bookings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    const channel = supabase
      .channel('admin-guest-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_bookings' }, fetchBookings)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  // ─── Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = bookings.length;
    const paid = bookings.filter(b => b.status === 'shipped' || b.status === 'paid').length;
    const pending = bookings.filter(b => b.status === 'pending_payment').length;
    const failed = bookings.filter(b => b.status === 'paid_nimbus_failed').length;
    const totalRevenue = bookings
      .filter(b => b.status === 'shipped' || b.status === 'paid')
      .reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const uniqueSenders = new Set(bookings.map(b => b.sender_email || b.sender_phone).filter(Boolean)).size;
    return { total, paid, pending, failed, totalRevenue, uniqueSenders };
  }, [bookings]);

  // ─── Filtered ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...bookings];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b =>
        b.sender_name?.toLowerCase().includes(q) ||
        b.sender_email?.toLowerCase().includes(q) ||
        b.sender_phone?.includes(q) ||
        b.receiver_name?.toLowerCase().includes(q) ||
        b.tracking_number?.toLowerCase().includes(q) ||
        b.order_id?.toLowerCase().includes(q) ||
        b.awb_number?.toLowerCase().includes(q) ||
        b.aadhaar_last4?.includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter(b => b.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter(b => b.shipment_type === typeFilter);
    return list;
  }, [bookings, searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ─── CSV Export ────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Order ID', 'Tracking', 'AWB', 'Status', 'Type', 'Amount', 'Sender Name', 'Sender Email', 'Sender Phone', 'Sender Address', 'Receiver Name', 'Receiver Email', 'Receiver Phone', 'Receiver Address', 'Courier', 'Aadhaar Last 4', 'Coupon', 'Created'];
    const rows = filtered.map(b => [
      b.order_id, b.tracking_number || '', b.awb_number || '', b.status, b.shipment_type || '',
      b.amount, b.sender_name || '', b.sender_email || '', b.sender_phone || '', b.sender_address || '',
      b.receiver_name || '', b.receiver_email || '', b.receiver_phone || '', b.receiver_address || '',
      b.courier_name || '', b.aadhaar_last4 || '', b.coupon_code || '',
      b.created_at ? format(parseISO(b.created_at), 'yyyy-MM-dd HH:mm') : '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `courierx-guest-bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} guest bookings`);
  };

  // ─── Parse booking payload for extra details ───────────────────────
  const getPayloadDetails = (booking: GuestBooking) => {
    try {
      const payload = typeof booking.booking_payload === 'string'
        ? JSON.parse(booking.booking_payload)
        : booking.booking_payload;
      return payload || {};
    } catch { return {}; }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { label: status, color: 'bg-white/5 text-gray-400 border-white/10', icon: AlertCircle };
    const Icon = config.icon;
    return (
      <Badge className={cn("text-[10px] border", config.color)}>
        <Icon className="h-3 w-3 mr-1" /> {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GuestStatCard label="Total Guest Bookings" value={stats.total} icon={Users} color="bg-purple-500/15 text-purple-400" sub={`${stats.uniqueSenders} unique senders`} />
        <GuestStatCard label="Shipped" value={stats.paid} icon={Package} color="bg-green-500/15 text-green-400" sub="Successfully shipped" />
        <GuestStatCard label="Pending Payment" value={stats.pending} icon={Clock} color="bg-yellow-500/15 text-yellow-400" sub="Awaiting payment" />
        <GuestStatCard label="Guest Revenue" value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} icon={CreditCard} color="bg-amber-500/15 text-amber-400" sub={`${stats.failed} failed shipments`} />
      </div>

      {/* Filters */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name, email, phone, tracking, AWB, Aadhaar..."
              value
={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-red-500/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[170px] bg-white/5 border-white/10 text-gray-300">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_payment">Pending Payment</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="paid_nimbus_failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px] bg-white/5 border-white/10 text-gray-300">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="medicine">💊 Medicine</SelectItem>
              <SelectItem value="document">📄 Document</SelectItem>
              <SelectItem value="gift">🎁 Gift</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline" size="sm" className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white shrink-0">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">{filtered.length} bookings match filters</p>
          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); setTypeFilter('all'); setPage(0); }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
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
                    <TableHead className="text-gray-500 text-xs font-semibold">Sender</TableHead>
                    <TableHead className="text-gray-500 text-xs font-semibold">Receiver</TableHead>
                    <TableHead className="text-gray-500 text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-gray-500 text-xs font-semibold">Tracking / AWB</TableHead>
                    <TableHead className="text-gray-500 text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-gray-500 text-xs font-semibold">Amount</TableHead>
                    <TableHead className="text-gray-500 text-xs font-semibold">KYC</TableHead>
                    <TableHead className="text-gray-500 text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-gray-500 text-xs font-semibold w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                        <Users className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                        No guest bookings found
                      </TableCell>
                    </TableRow>
                  ) : paged.map(b => (
                    <TableRow
                      key={b.id || b.order_id}
                      className="border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
                      onClick={() => setSelectedBooking(b)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/80 to-purple-800/80 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(b.sender_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate max-w-[140px]">{b.sender_name || 'Unknown'}</p>
                            <p className="text-[10px] text-gray-500 truncate max-w-[140px]">{b.sender_email || b.sender_phone || '—'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-300 truncate max-w-[120px]">{b.receiver_name || '—'}</p>
                          <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{b.receiver_email || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{TYPE_EMOJI[b.shipment_type || ''] || '📦'} {b.shipment_type || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-xs text-white font-mono truncate max-w-[130px]">{b.tracking_number || '—'}</p>
                          {b.awb_number && <p className="text-[10px] text-gray-500 font-mono">AWB: {b.awb_number}</p>}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(b.status)}</TableCell>
                      <TableCell className="text-sm text-white font-medium">₹{(Number(b.amount) || 0).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        {b.aadhaar_last4 ? (
                          <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">
                            <ShieldCheck className="h-3 w-3 mr-1" /> ****{b.aadhaar_last4}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-gray-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {b.created_at ? format(parseISO(b.created_at), 'dd MMM yy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-white hover:bg-white/5" onClick={e => { e.stopPropagation(); setSelectedBooking(b); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
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
                  <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-gray-400 hover:text-white hover:bg-white/5 h-8 px-3 text-xs">Previous</Button>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-gray-400 hover:text-white hover:bg-white/5 h-8 px-3 text-xs">Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-[#0f0f12] border-white/5 text-white">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Guest Booking Details
            </SheetTitle>
          </SheetHeader>
          {selectedBooking && <GuestBookingDetail booking={selectedBooking} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}


// ─── Detail Component ────────────────────────────────────────────────
function GuestBookingDetail({ booking }: { booking: GuestBooking }) {
  const payload = (() => {
    try {
      return typeof booking.booking_payload === 'string'
        ? JSON.parse(booking.booking_payload)
        : booking.booking_payload || {};
    } catch { return {}; }
  })();

  const rateFormData = payload.rateFormData || {};
  const selectedCourier = payload.selectedCourier || {};
  const senderReceiver = payload.senderReceiver || {};

  const statusConfig = STATUS_CONFIG[booking.status] || { label: booking.status, color: 'bg-white/5 text-gray-400 border-white/10', icon: AlertCircle };
  const StatusIcon = statusConfig.icon;

  return (
    <div className="mt-4 space-y-5">
      {/* Status Banner */}
      <div className={cn("rounded-xl p-4 border flex items-center gap-3", statusConfig.color)}>
        <StatusIcon className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold text-sm">{statusConfig.label}</p>
          <p className="text-xs opacity-70">Order: {booking.order_id}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-lg font-bold">₹{(Number(booking.amount) || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Tracking Info */}
      <div className="bg-white/[0.04] rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shipment Info</p>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Tracking" value={booking.tracking_number || '—'} mono />
          <InfoRow label="AWB" value={booking.awb_number || '—'} mono />
          <InfoRow label="Type" value={`${TYPE_EMOJI[booking.shipment_type || ''] || '📦'} ${booking.shipment_type || '—'}`} />
          <InfoRow label="Courier" value={booking.courier_name || selectedCourier.carrier || selectedCourier.courier_name || '—'} />
          {booking.coupon_code && <InfoRow label="Coupon" value={booking.coupon_code} />}
          <InfoRow label="Created" value={booking.created_at ? format(parseISO(booking.created_at), 'dd MMM yyyy, HH:mm') : '—'} />
          {booking.paid_at && <InfoRow label="Paid At" value={format(parseISO(booking.paid_at), 'dd MMM yyyy, HH:mm')} />}
        </div>
        {booking.label_url && (
          <a href={booking.label_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-400 hover:text-blue-300">
            <ExternalLink className="h-3 w-3" /> Download AWB Label
          </a>
        )}
      </div>

      {/* Sender Details */}
      <div className="bg-white/[0.04] rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Sender Details
        </p>
        <div className="space-y-1.5">
          <DetailLine icon={Users} value={booking.sender_name || senderReceiver.senderName || '—'} />
          <DetailLine icon={Mail} value={booking.sender_email || senderReceiver.senderEmail || '—'} />
          <DetailLine icon={Phone} value={booking.sender_phone || senderReceiver.senderPhone || '—'} />
          <DetailLine icon={MapPin} value={booking.sender_address || [senderReceiver.senderAddress, senderReceiver.senderCity, senderReceiver.senderPincode].filter(Boolean).join(', ') || '—'} />
        </div>
      </div>

      {/* Receiver Details */}
      <div className="bg-white/[0.04] rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" /> Receiver Details
        </p>
        <div className="space-y-1.5">
          <DetailLine icon={Users} value={booking.receiver_name || senderReceiver.receiverName || '—'} />
          <DetailLine icon={Mail} value={booking.receiver_email || senderReceiver.receiverEmail || '—'} />
          <DetailLine icon={Phone} value={booking.receiver_phone || senderReceiver.receiverPhone || '—'} />
          <DetailLine icon={MapPin} value={booking.receiver_address || [senderReceiver.receiverAddress, senderReceiver.receiverCity, senderReceiver.receiverZipcode].filter(Boolean).join(', ') || '—'} />
        </div>
      </div>

      {/* KYC / Identity */}
      <div className="bg-white/[0.04] rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Identity Verification
        </p>
        <div className="space-y-2">
          {booking.aadhaar_last4 ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs">
                <ShieldCheck className="h-3 w-3 mr-1" /> Aadhaar Verified
              </Badge>
              <span className="text-sm text-gray-300 font-mono">XXXX XXXX {booking.aadhaar_last4}</span>
            </div>
          ) : (
            <p className="text-xs text-gray-500">No Aadhaar data available</p>
          )}
        </div>
      </div>

      {/* Shipment Details from Payload */}
      {(rateFormData.weightGrams || rateFormData.weightKg || rateFormData.destinationCountry) && (
        <div className="bg-white/[0.04] rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Package Details
          </p>
          <div className="grid grid-cols-2 gap-3">
            {rateFormData.destinationCountry && <InfoRow label="Destination" value={rateFormData.destinationCountry} />}
            {(rateFormData.weightGrams || rateFormData.weightKg) && (
              <InfoRow label="Weight" value={rateFormData.weightGrams ? `${rateFormData.weightGrams}g` : `${rateFormData.weightKg}kg`} />
            )}
            {rateFormData.lengthCm && <InfoRow label="Dimensions" value={`${rateFormData.lengthCm} × ${rateFormData.widthCm} × ${rateFormData.heightCm} cm`} />}
            {rateFormData.declaredValue && <InfoRow label="Declared Value" value={`₹${Number(rateFormData.declaredValue).toLocaleString('en-IN')}`} />}
            {senderReceiver.contentDescription && <InfoRow label="Contents" value={senderReceiver.contentDescription} />}
          </div>
        </div>
      )}

      {/* Content Items (for gift/document flows with HSN codes) */}
      {payload._contentItems && Array.isArray(payload._contentItems) && payload._contentItems.length > 0 && (
        <div className="bg-white/[0.04] rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Content Items</p>
          <div className="space-y-1.5">
            {payload._contentItems.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                <span className="text-gray-300">{item.name || 'Item'} {item.hsnCode ? `(HSN: ${item.hsnCode})` : ''}</span>
                <span className="text-gray-400">Qty: {item.qty} × ₹{item.unitPrice}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NimbusPost Error (if failed) */}
      {booking.status === 'paid_nimbus_failed' && payload._nimbus_error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-400 mb-1">Shipment Creation Error</p>
          <p className="text-xs text-red-300/70">{payload._nimbus_error}</p>
          {payload._failed_at && <p className="text-[10px] text-red-400/50 mt-1">Failed at: {payload._failed_at}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────────
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className={cn("text-xs text-gray-200", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function DetailLine({ icon: Icon, value }: { icon: any; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-gray-500 mt-0.5 shrink-0" />
      <p className="text-xs text-gray-300">{value}</p>
    </div>
  );
}
