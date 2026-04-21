'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  CalendarBlank,
  FileText,
  Pill,
  Gift,
  CheckCircle,
  MapPin,
  Truck,
  CurrencyInr,
  DownloadSimple,
  Funnel,
  X,
  ArrowsClockwise,
  Repeat,
  UserCircle,
  Globe,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CourierXLoader } from '@/components/landing/CourierXLoader';

type ShipmentType = 'medicine' | 'document' | 'gift';

interface CompletedShipment {
  id: string;
  trackingNumber: string;
  type: ShipmentType;
  origin: string;
  destination: string;
  destinationCountry: string;
  carrier: string;
  deliveredAt: Date;
  createdAt: Date;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  cost: number;
  declaredValue: number;
  weight: number;
  notes: string;
  items?: any[];
  addons?: any[];
}

interface GuestShipment {
  id: string;
  orderId: string;
  trackingNumber: string;
  awbNumber: string | null;
  type: string;
  status: string;
  courierName: string;
  amount: number;
  senderName: string;
  receiverName: string;
  receiverAddress: string;
  createdAt: Date;
  paidAt: Date | null;
  labelUrl: string | null;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  medicine: <Pill size={16} weight="bold" />,
  document: <FileText size={16} weight="bold" />,
  gift: <Gift size={16} weight="bold" />,
};

const TYPE_LABELS: Record<string, string> = {
  medicine: 'Medicine',
  document: 'Document',
  gift: 'Gift/Sample',
};

const GUEST_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Pending Payment', color: 'bg-yellow-500/10 text-yellow-700' },
  paid: { label: 'Paid', color: 'bg-blue-500/10 text-blue-700' },
  shipped: { label: 'Shipped', color: 'bg-green-500/10 text-green-700' },
  paid_nimbus_failed: { label: 'Processing', color: 'bg-orange-500/10 text-orange-700' },
};

// ── Account Shipment Card ──────────────────────────────────────────────────────
const ShipmentHistoryCard = ({
  shipment,
  onRebook,
}: {
  shipment: CompletedShipment;
  onRebook: (shipment: CompletedShipment) => void;
}) => {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 hover:border-border hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-green-500/10 shrink-0">
            {TYPE_ICONS[shipment.type] ?? <Package size={16} weight="bold" />}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-typewriter font-bold text-sm">{shipment.trackingNumber}</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 text-[10px] font-semibold">
                <CheckCircle size={10} weight="bold" />
                Delivered
              </span>
            </div>
            <p className="text-xs text-muted-foreground">→ {shipment.recipientName}</p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin size={10} weight="bold" />
              {shipment.destination}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-typewriter font-bold text-sm">₹{shipment.cost.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {format(shipment.deliveredAt, 'dd MMM yyyy')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Truck size={10} weight="bold" />
            {shipment.carrier}
          </span>
          <span className="capitalize">{shipment.type}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-7 rounded-xl border-border/60"
          onClick={() => onRebook(shipment)}
        >
          <Repeat size={12} weight="bold" />
          Rebook
        </Button>
      </div>
    </div>
  );
};

// ── Guest Shipment Card ────────────────────────────────────────────────────────
const GuestShipmentCard = ({ booking }: { booking: GuestShipment }) => {
  const router = useRouter();
  const statusInfo = GUEST_STATUS_LABEL[booking.status] ?? { label: booking.status, color: 'bg-muted text-muted-foreground' };
  const trackingRef = booking.awbNumber || booking.trackingNumber;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 hover:border-border hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 shrink-0">
            {TYPE_ICONS[booking.type] ?? <Package size={16} weight="bold" />}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-typewriter font-bold text-sm">{booking.trackingNumber}</p>
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', statusInfo.color)}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">→ {booking.receiverName}</p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin size={10} weight="bold" />
              {booking.receiverAddress}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-typewriter font-bold text-sm">₹{booking.amount.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {format(booking.createdAt, 'dd MMM yyyy')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Truck size={10} weight="bold" />
            {booking.courierName || 'Courier'}
          </span>
          <span className="capitalize">{TYPE_LABELS[booking.type] ?? booking.type}</span>
          {booking.awbNumber && (
            <span className="font-mono">AWB: {booking.awbNumber}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-7 rounded-xl border-border/60"
          onClick={() => router.push(`/public/track?awb=${encodeURIComponent(trackingRef)}`)}
        >
          <MagnifyingGlass size={12} weight="bold" />
          Track
        </Button>
      </div>

      {booking.labelUrl && (
        <div className="mt-2">
          <a
            href={booking.labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-coke-red underline underline-offset-2"
          >
            Download AWB Label
          </a>
        </div>
      )}
    </div>
  );
};

// ── Main History Page ──────────────────────────────────────────────────────────
const HistoryPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'shipments' | 'guest'>('shipments');
  const [typeFilter, setTypeFilter] = useState<ShipmentType | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [completedShipments, setCompletedShipments] = useState<CompletedShipment[]>([]);
  const [guestShipments, setGuestShipments] = useState<GuestShipment[]>([]);
  const [loading, setLoading] = useState(true);

  const linkAndFetch = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // Attempt to link any unlinked guest bookings by phone/email
      try {
        await fetch('/api/user/link-guest-bookings', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      } catch { /* non-fatal */ }

      await Promise.all([
        fetchCompletedShipments(session.user.id),
        fetchGuestShipments(session.user.id),
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    linkAndFetch();

    const channel = supabase
      .channel('history-shipments')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shipments' }, (payload) => {
        const updated = payload.new as any;
        if (updated?.current_status === 'INTL_DELIVERED' || updated?.current_status === 'DELIVERED') {
          linkAndFetch();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [linkAndFetch]);

  const fetchCompletedShipments = async (userId: string) => {
    const { data: shipments, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('user_id', userId)
      .in('current_status', ['INTL_DELIVERED', 'DELIVERED'])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching shipments:', error);
      toast({ title: 'Error', description: 'Failed to load shipment history', variant: 'destructive' });
      return;
    }

    const transformed: CompletedShipment[] = await Promise.all(
      (shipments || []).map(async (shipment) => {
        let items: any[] = [];
        if (shipment.shipment_type === 'medicine') {
          const { data } = await supabase.from('medicine_items').select('*').eq('shipment_id', shipment.id);
          items = data || [];
        } else if (shipment.shipment_type === 'document') {
          const { data } = await supabase.from('document_items').select('*').eq('shipment_id', shipment.id);
          items = data || [];
        } else if (shipment.shipment_type === 'gift') {
          const { data } = await supabase.from('gift_items').select('*').eq('shipment_id', shipment.id);
          items = data || [];
        }
        const { data: addons } = await supabase.from('shipment_addons').select('*').eq('shipment_id', shipment.id);

        return {
          id: shipment.id,
          trackingNumber: shipment.tracking_number || 'N/A',
          type: shipment.shipment_type as ShipmentType,
          origin: shipment.origin_address,
          destination: shipment.destination_address,
          destinationCountry: shipment.destination_country,
          carrier: getCarrierForCountry(shipment.destination_country),
          deliveredAt: new Date(shipment.updated_at),
          createdAt: new Date(shipment.created_at),
          recipientName: shipment.recipient_name,
          recipientPhone: shipment.recipient_phone || '',
          recipientEmail: shipment.recipient_email || '',
          cost: Number(shipment.total_amount),
          declaredValue: Number(shipment.declared_value),
          weight: Number(shipment.weight_kg),
          notes: shipment.notes || '',
          items,
          addons: addons || [],
        };
      })
    );

    setCompletedShipments(transformed);
  };

  const fetchGuestShipments = async (userId: string) => {
    const { data, error } = await supabase
      .from('guest_bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching guest bookings:', error);
      return;
    }

    const transformed: GuestShipment[] = (data || []).map((b) => ({
      id: b.id,
      orderId: b.order_id,
      trackingNumber: b.tracking_number || b.order_id,
      awbNumber: b.awb_number || null,
      type: b.shipment_type || 'gift',
      status: b.status,
      courierName: b.courier_name || '',
      amount: Number(b.amount) || 0,
      senderName: b.sender_name || '',
      receiverName: b.receiver_name || '',
      receiverAddress: b.receiver_address || '',
      createdAt: new Date(b.created_at),
      paidAt: b.paid_at ? new Date(b.paid_at) : null,
      labelUrl: b.label_url || null,
    }));

    setGuestShipments(transformed);
  };

  const getCarrierForCountry = (countryCode: string): string => {
    const gccCountries = ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'];
    return gccCountries.includes(countryCode) ? 'Aramex' : 'DHL Express';
  };

  const handleRebook = (shipment: CompletedShipment) => {
    try {
      const rebookData = {
        type: shipment.type,
        items: shipment.items,
        addons: shipment.addons,
        declaredValue: shipment.declaredValue,
        weight: shipment.weight,
        notes: shipment.notes,
        destinationCountry: shipment.destinationCountry,
        recipientName: '',
        recipientPhone: '',
        recipientEmail: '',
        originAddress: '',
        destinationAddress: '',
      };
      localStorage.setItem('rebookShipment', JSON.stringify(rebookData));
      toast({ title: 'Rebook Initiated', description: 'Shipment details loaded. Please update addresses.' });
      if (shipment.type === 'medicine') router.push('/book/medicine');
      else if (shipment.type === 'document') router.push('/book/document');
      else router.push('/book/gift');
    } catch {
      toast({ title: 'Error', description: 'Failed to rebook shipment', variant: 'destructive' });
    }
  };

  const filteredShipments = completedShipments.filter((s) => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    if (dateRange.from && dateRange.to) {
      if (!isWithinInterval(s.deliveredAt, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false;
    }
    return true;
  });

  const totalSpent = filteredShipments.reduce((sum, s) => sum + s.cost, 0);
  const typeBreakdown = {
    medicine: filteredShipments.filter((s) => s.type === 'medicine').length,
    document: filteredShipments.filter((s) => s.type === 'document').length,
    gift: filteredShipments.filter((s) => s.type === 'gift').length,
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setDateRange({ from: subDays(new Date(), 30), to: new Date() });
  };

  const hasActiveFilters = typeFilter !== 'all';

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <CourierXLoader />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="font-typewriter text-2xl font-bold">Shipment History</h1>
          <p className="text-sm text-muted-foreground">View all your completed deliveries and guest bookings</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('shipments')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === 'shipments'
                ? 'bg-coke-red text-white shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Package size={15} weight="bold" />
            Shipments
            {completedShipments.length > 0 && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', activeTab === 'shipments' ? 'bg-white/20' : 'bg-muted-foreground/20')}>
                {completedShipments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('guest')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === 'guest'
                ? 'bg-coke-red text-white shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Globe size={15} weight="bold" />
            Guest Shipments
            {guestShipments.length > 0 && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', activeTab === 'guest' ? 'bg-white/20' : 'bg-muted-foreground/20')}>
                {guestShipments.length}
              </span>
            )}
          </button>
        </div>

        {/* ── SHIPMENTS TAB ── */}
        {activeTab === 'shipments' && (
          <>
            {/* Filters */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal flex-1">
                        <CalendarBlank size={16} weight="bold" className="mr-2" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>{format(dateRange.from, 'dd MMM')} - {format(dateRange.to, 'dd MMM yyyy')}</>
                          ) : format(dateRange.from, 'dd MMM yyyy')
                        ) : <span>Pick date range</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                        onSelect={(range: any) => {
                          setDateRange({ from: range?.from, to: range?.to });
                          if (range?.from && range?.to) setIsDatePickerOpen(false);
                        }}
                        numberOfMonths={2}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ShipmentType | 'all')}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Funnel size={16} weight="bold" className="mr-2" />
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="medicine"><div className="flex items-center gap-2"><Pill size={16} weight="bold" />Medicine</div></SelectItem>
                      <SelectItem value="document"><div className="flex items-center gap-2"><FileText size={16} weight="bold" />Document</div></SelectItem>
                      <SelectItem value="gift"><div className="flex items-center gap-2"><Gift size={16} weight="bold" />Gift/Sample</div></SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="icon" onClick={clearFilters}>
                      <X size={16} weight="bold" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="font-typewriter text-2xl font-bold">{filteredShipments.length}</p>
                  <p className="text-xs text-muted-foreground">Shipments</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="font-typewriter text-2xl font-bold text-primary">₹{totalSpent.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                </CardContent>
              </Card>
              <Card className="hidden md:block">
                <CardContent className="py-4">
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1"><Pill size={12} weight="bold" className="text-destructive" /><span>{typeBreakdown.medicine}</span></div>
                    <div className="flex items-center gap-1"><FileText size={12} weight="bold" className="text-primary" /><span>{typeBreakdown.document}</span></div>
                    <div className="flex items-center gap-1"><Gift size={12} weight="bold" className="text-accent-foreground" /><span>{typeBreakdown.gift}</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-1">By Type</p>
                </CardContent>
              </Card>
              <Card className="hidden md:block">
                <CardContent className="py-4 text-center">
                  <Button variant="outline" size="sm" className="gap-2">
                    <DownloadSimple size={16} weight="bold" />
                    Export
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Download CSV</p>
                </CardContent>
              </Card>
            </div>

            {/* List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package size={16} weight="bold" />
                  Completed Deliveries
                  <Badge variant="outline" className="ml-auto font-typewriter">{filteredShipments.length} results</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredShipments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package size={48} weight="bold" className="mx-auto mb-2 opacity-20" />
                    <p>No shipments found for the selected filters</p>
                    <Button variant="link" onClick={clearFilters} className="mt-2">Clear filters</Button>
                  </div>
                ) : (
                  filteredShipments.map((shipment) => (
                    <ShipmentHistoryCard key={shipment.id} shipment={shipment} onRebook={handleRebook} />
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── GUEST SHIPMENTS TAB ── */}
        {activeTab === 'guest' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe size={16} weight="bold" />
                Guest Bookings
                <Badge variant="outline" className="ml-auto font-typewriter">{guestShipments.length} bookings</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {guestShipments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe size={48} weight="bold" className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No guest bookings linked to your account</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">
                    Bookings made with your registered phone or email will appear here automatically.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => router.push('/public/book')}
                  >
                    <Globe size={14} weight="bold" />
                    Book as Guest
                  </Button>
                </div>
              ) : (
                guestShipments.map((booking) => (
                  <GuestShipmentCard key={booking.id} booking={booking} />
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default HistoryPage;
