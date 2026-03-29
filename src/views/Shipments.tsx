import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Truck,
  Package,
  MagnifyingGlass,
  Clock,
  Warning,
  Airplane,
  Globe,
  FileText,
  Pill,
  Gift,
  CaretRight,
  CircleNotch,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useShipments, getShipmentDetails, type Shipment as DBShipment, type ShipmentWithItems } from '@/hooks/useShipments';
import { useShipmentTimeline } from '@/hooks/useShipmentTimeline';
import { ShipmentTimeline } from '@/components/shipment/ShipmentTimeline';
import {
  STATUS_LABEL_MAP,
  LEG_LABEL_MAP,
  getStatusLabel,
  getStatusDotColor,
  getLegLabel,
} from '@/lib/shipment-lifecycle/statusLabelMap';
import type { ShipmentStatus, ShipmentLeg } from '@/lib/shipment-lifecycle/types';

type ShipmentType = 'medicine' | 'document' | 'gift';

interface UIShipment {
  id: string;
  trackingNumber: string;
  type: ShipmentType;
  currentStatus: ShipmentStatus;
  currentLeg: ShipmentLeg;
  domesticAwb: string | null;
  internationalAwb: string | null;
  origin: string;
  destination: string;
  destinationCountry: string;
  carrier: string;
  estimatedDelivery: Date;
  createdAt: Date;
  recipientName: string;
  totalAmount: number;
  declaredValue: number;
  weight: number | null;
}

// Helper to get carrier name based on destination
function getCarrierName(country: string): string {
  const carriers: Record<string, string> = {
    'AE': 'Aramex',
    'SA': 'Aramex',
    'US': 'FedEx',
    'GB': 'DHL Express',
    'CA': 'FedEx',
    'AU': 'DHL Express',
    'SG': 'DHL Express',
  };
  return carriers[country] || 'FedEx';
}

// Transform DB shipment to UI shipment using lifecycle fields
function transformShipment(dbShipment: DBShipment): UIShipment {
  const createdAt = new Date(dbShipment.created_at);
  const estimatedDelivery = new Date(createdAt);
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

  return {
    id: dbShipment.id,
    trackingNumber: dbShipment.tracking_number,
    type: dbShipment.shipment_type,
    currentStatus: (dbShipment.current_status || 'PENDING') as ShipmentStatus,
    currentLeg: (dbShipment.current_leg || 'DOMESTIC') as ShipmentLeg,
    domesticAwb: dbShipment.domestic_awb,
    internationalAwb: dbShipment.international_awb,
    origin: dbShipment.origin_address,
    destination: dbShipment.destination_address,
    destinationCountry: dbShipment.destination_country,
    carrier: getCarrierName(dbShipment.destination_country),
    estimatedDelivery,
    createdAt,
    recipientName: dbShipment.recipient_name,
    totalAmount: dbShipment.total_amount,
    declaredValue: dbShipment.declared_value,
    weight: dbShipment.weight_kg,
  };
}

const TYPE_ICONS: Record<ShipmentType, React.ReactNode> = {
  medicine: <Pill size={20} weight="bold" />,
  document: <FileText size={20} weight="bold" />,
  gift: <Gift size={20} weight="bold" />,
};

const ShipmentCard = ({ shipment, onClick }: { shipment: UIShipment; onClick: () => void }) => {
  if (!shipment) return null;

  const statusInfo = STATUS_LABEL_MAP[shipment.currentStatus];
  const legLabel = getLegLabel(shipment.currentLeg);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border/50 rounded-2xl p-4 hover:border-border hover:shadow-md transition-all duration-200 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
          {TYPE_ICONS[shipment.type] || <Package size={20} weight="bold" className="text-muted-foreground" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="font-typewriter font-bold text-sm truncate">{shipment.trackingNumber}</p>
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0",
              statusInfo?.dotColor ? "bg-muted" : "bg-muted"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusInfo?.dotColor ?? 'bg-gray-400')} />
              <span className="text-foreground/70">{statusInfo?.label ?? shipment.currentStatus}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            → <span className="font-medium text-foreground/80">{shipment.recipientName}</span>, {shipment.destination}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1.5">
            <span className="flex items-center gap-1">
              <Truck size={12} weight="bold" />
              {legLabel}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} weight="bold" />
              ETA {format(shipment.estimatedDelivery, 'dd MMM')}
            </span>
          </div>
        </div>

        <CaretRight size={16} weight="bold" className="text-muted-foreground/40 shrink-0" />
      </div>
    </button>
  );
};

const ShipmentDetailSheet = ({
  shipment,
  shipmentDetails,
  loadingDetails,
  onClose,
}: {
  shipment: UIShipment;
  shipmentDetails: ShipmentWithItems | null;
  loadingDetails: boolean;
  onClose: () => void;
}) => {
  const { entries: timelineEntries, loading: timelineLoading } = useShipmentTimeline(
    shipment.id,
    shipment.currentStatus,
    shipment.createdAt instanceof Date ? shipment.createdAt.toISOString() : shipment.createdAt,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const handleRefreshTracking = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setRefreshMsg('Not authenticated'); return; }
      const res = await fetch(`/api/shipments/track?id=${shipment.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.nimbusRefreshed) setRefreshMsg('Tracking updated from NimbusPost');
      else if (json.nimbusError) setRefreshMsg(`Nimbus: ${json.nimbusError}`);
      else setRefreshMsg('Already up to date');
    } catch {
      setRefreshMsg('Refresh failed');
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(null), 4000);
    }
  };

  const statusInfo = STATUS_LABEL_MAP[shipment.currentStatus];
  const legLabel = getLegLabel(shipment.currentLeg);
  const showInternationalAwb =
    (shipment.currentLeg === 'INTERNATIONAL' || shipment.currentLeg === 'COMPLETED') &&
    !!shipment.internationalAwb;

  return (
    <>
      <SheetHeader className="pb-4">
        <SheetTitle className="flex items-center gap-2">
          {TYPE_ICONS[shipment.type]}
          <span className="font-typewriter">{shipment.trackingNumber}</span>
        </SheetTitle>
      </SheetHeader>

      {loadingDetails ? (
        <div className="flex items-center justify-center py-12">
          <CircleNotch size={32} weight="bold" className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status and Leg */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-sm", statusInfo?.dotColor ? `${statusInfo.dotColor.replace('bg-', 'bg-')}/20 text-foreground` : 'bg-muted text-muted-foreground')}>
              <span className={cn("w-2 h-2 rounded-full mr-1.5 shrink-0", statusInfo?.dotColor ?? 'bg-gray-500')} />
              {statusInfo?.label ?? shipment.currentStatus}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {legLabel}
            </Badge>
          </div>

          {/* Route Info */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="font-medium text-sm">{shipment.origin}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-muted-foreground/30" />
                  <Airplane size={16} weight="bold" className="text-muted-foreground" />
                  <div className="w-8 h-0.5 bg-muted-foreground/30" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="font-medium text-sm">{shipment.destination}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Recipient</p>
              <p className="font-medium">{shipment.recipientName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Carrier</p>
              <p className="font-medium">{shipment.carrier}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Booked On</p>
              <p className="font-typewriter">{format(shipment.createdAt, 'dd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Est. Delivery</p>
              <p className="font-typewriter">{format(shipment.estimatedDelivery, 'dd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Amount</p>
              <p className="font-typewriter font-bold">₹{shipment.totalAmount.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Weight</p>
              <p className="font-typewriter">{shipment.weight ? `${shipment.weight.toFixed(2)} kg` : 'N/A'}</p>
            </div>
          </div>

          {/* AWB Section */}
          {(shipment.domesticAwb || showInternationalAwb) && (
            <Card>
              <CardContent className="py-4 space-y-3">
                {shipment.domesticAwb && (
                  <div>
                    <p className="text-xs text-muted-foreground">Domestic AWB</p>
                    <p className="font-typewriter font-medium text-sm">{shipment.domesticAwb}</p>
                  </div>
                )}
                {showInternationalAwb && (
                  <div>
                    <p className="text-xs text-muted-foreground">International AWB</p>
                    <p className="font-typewriter font-medium text-sm">{shipment.internationalAwb}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shipment Type Specific Details */}
          {shipmentDetails && (
            <>
              {shipment.type === 'medicine' && shipmentDetails.medicine_items && shipmentDetails.medicine_items.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Medicine Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {shipmentDetails.medicine_items.map((item: any, index: number) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-sm">{item.medicine_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.medicine_type} • {item.form} • Qty: {item.unit_count}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {shipmentDetails.shipment_addons && shipmentDetails.shipment_addons.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Add-ons</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {shipmentDetails.shipment_addons.map((addon: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span className="text-sm">{addon.addon_name}</span>
                        <span className="font-typewriter text-sm">₹{addon.addon_cost}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <Separator />

          {/* Real Timeline from shipment_timeline table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Shipment Timeline</h4>
              {shipment.currentLeg === 'DOMESTIC' && shipment.domesticAwb && (
                <button
                  onClick={handleRefreshTracking}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <CircleNotch size={14} weight="bold" className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              )}
            </div>
            {refreshMsg && (
              <p className="text-xs text-muted-foreground mb-3 px-1">{refreshMsg}</p>
            )}
            <ShipmentTimeline entries={timelineEntries} loading={timelineLoading} />
          </div>
        </div>
      )}
    </>
  );
};

const ShipmentsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<UIShipment | null>(null);
  const [shipmentDetails, setShipmentDetails] = useState<ShipmentWithItems | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const { shipments: dbShipments, loading, error } = useShipments();

  // Transform DB shipments to UI shipments
  const shipments = dbShipments.map(transformShipment);

  const filteredShipments = shipments.filter(shipment =>
    shipment.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shipment.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shipment.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeShipments = filteredShipments.filter(s => s.currentLeg !== 'COMPLETED');
  const inTransit = filteredShipments.filter(s =>
    s.currentLeg === 'INTERNATIONAL' ||
    s.currentStatus === 'IN_TRANSIT' ||
    s.currentStatus === 'IN_INTERNATIONAL_TRANSIT'
  );
  const atCustoms = filteredShipments.filter(s => s.currentStatus === 'CUSTOMS_CLEARANCE');
  const needsAttention = filteredShipments.filter(s => s.currentStatus === 'FAILED');

  // Load shipment details when selected
  useEffect(() => {
    if (selectedShipment) {
      setLoadingDetails(true);
      getShipmentDetails(selectedShipment.id).then(details => {
        setShipmentDetails(details);
        setLoadingDetails(false);
      });
    } else {
      setShipmentDetails(null);
    }
  }, [selectedShipment]);

  return (
    <AppLayout>
      <div className="space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <div>
          <h1 className="font-typewriter text-2xl font-bold">Track Shipments</h1>
          <p className="text-sm text-muted-foreground">
            Monitor your active shipments in real-time
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <CircleNotch size={32} weight="bold" className="animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="py-6 text-center">
              <Warning size={32} weight="bold" className="text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <Card className="card-hover">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">In Transit</p>
                      <p className="font-typewriter text-xl sm:text-2xl font-bold mt-1">
                        {inTransit.length}
                      </p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Airplane size={20} weight="bold" className="text-primary sm:hidden" />
                      <Airplane size={24} weight="bold" className="text-primary hidden sm:block" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">At Customs</p>
                      <p className="font-typewriter text-xl sm:text-2xl font-bold mt-1">
                        {atCustoms.length}
                      </p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Globe size={20} weight="bold" className="text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Need Action</p>
                      <p className="font-typewriter text-xl sm:text-2xl font-bold mt-1 text-destructive">
                        {needsAttention.length}
                      </p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <Warning size={20} weight="bold" className="text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by tracking number, recipient, or destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Needs Attention */}
            {needsAttention.length > 0 && (
              <Card className="border-destructive bg-destructive/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <Warning size={20} weight="bold" />
                    Needs Your Attention ({needsAttention.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {needsAttention.map(shipment => (
                    <ShipmentCard
                      key={shipment.id}
                      shipment={shipment}
                      onClick={() => setSelectedShipment(shipment)}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Active Shipments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package size={20} weight="bold" />
                  Active Shipments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeShipments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Truck size={32} weight="bold" className="opacity-50" />
                    </div>
                    <h3 className="font-semibold mb-1">No active shipments</h3>
                    <p className="text-sm mb-4">Start shipping your medicines, documents, or gifts internationally</p>
                    <Button variant="default" className="bg-coke-red hover:bg-coke-red/90" asChild>
                      <a href="/">Book a new shipment</a>
                    </Button>
                  </div>
                ) : (
                  activeShipments
                    .filter(s => s.currentStatus !== 'FAILED')
                    .map(shipment => (
                      <ShipmentCard
                        key={shipment.id}
                        shipment={shipment}
                        onClick={() => setSelectedShipment(shipment)}
                      />
                    ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Shipment Detail Sheet */}
      <Sheet open={!!selectedShipment} onOpenChange={() => setSelectedShipment(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedShipment && (
            <ShipmentDetailSheet
              shipment={selectedShipment}
              shipmentDetails={shipmentDetails}
              loadingDetails={loadingDetails}
              onClose={() => setSelectedShipment(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
};

export default ShipmentsPage;
