import { memo, useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Loader2, Truck, RefreshCw, AlertCircle,
  Plane, Ship,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DomesticBookingData, CourierOption, CourierMode } from '@/lib/domestic/types';
import { DomesticCourierGrid } from '@/components/domestic/DomesticCourierGrid';

interface Props {
  data: DomesticBookingData;
  onUpdate: (updates: Partial<DomesticBookingData>) => void;
}

type FilterTab = 'all' | 'air' | 'surface';

const DomesticCourierStepComponent = ({ data, onUpdate }: Props) => {
  const { session } = useAuth();
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDocument = data.shipmentType === 'document';
  const [activeTab, setActiveTab] = useState<FilterTab>(isDocument ? 'air' : 'all');

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    // Clear selection if the selected courier isn't visible in the new tab
    if (data.selectedCourier && tab !== 'all' && data.selectedCourier.mode !== tab) {
      onUpdate({ selectedCourier: null });
    }
  };

  const fetchRates = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/domestic/rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          pickupPincode: data.pickupAddress.pincode,
          deliveryPincode: data.deliveryAddress.pincode,
          weightKg: data.weightKg,
          lengthCm: data.lengthCm,
          widthCm: data.widthCm,
          heightCm: data.heightCm,
          declaredValue: data.declaredValue,
          shipmentType: data.shipmentType,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        setError(result.error || 'Failed to fetch rates');
        return;
      }
      const fetchedCouriers: CourierOption[] = result.couriers || [];
      setCouriers(fetchedCouriers);

      // For documents: default to air, but fall back to surface if no air available
      if (data.shipmentType === 'document') {
        const hasAir = fetchedCouriers.some(c => c.mode === 'air');
        setActiveTab(hasAir ? 'air' : 'surface');
      } else {
        setActiveTab('all');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (courier: CourierOption) => {
    onUpdate({ selectedCourier: courier });
  };

  // Count by mode
  const airCount = useMemo(() => couriers.filter(c => c.mode === 'air').length, [couriers]);
  const surfaceCount = useMemo(() => couriers.filter(c => c.mode === 'surface').length, [couriers]);

  // For documents: determine what to show and whether to show a fallback note
  const documentFallback: 'surface' | 'all' | null = useMemo(() => {
    if (!isDocument) return null;
    if (airCount > 0) return null;
    if (surfaceCount > 0) return 'surface';
    return 'all';
  }, [isDocument, airCount, surfaceCount]);

  const filtered = useMemo(() => {
    if (isDocument) {
      if (airCount > 0) return couriers.filter(c => c.mode === 'air');
      if (surfaceCount > 0) return couriers.filter(c => c.mode === 'surface');
      return couriers;
    }
    if (activeTab === 'all') return couriers;
    return couriers.filter(c => c.mode === activeTab);
  }, [couriers, activeTab, isDocument, airCount, surfaceCount]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-coke-red/10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-coke-red" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-semibold">Finding best courier options...</p>
          <p className="text-sm text-muted-foreground mt-1">
            Checking {data.pickupAddress.pincode} → {data.deliveryAddress.pincode}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="text-center">
          <Button onClick={fetchRates} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (couriers.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <Truck className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium">No couriers available for this route</p>
        <p className="text-sm text-muted-foreground">
          Try a different pickup or delivery pincode
        </p>
        <Button onClick={fetchRates} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const tabs: { key: FilterTab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', count: couriers.length, icon: <Truck className="h-3.5 w-3.5" /> },
    { key: 'air', label: 'Air', count: airCount, icon: <Plane className="h-3.5 w-3.5" /> },
    { key: 'surface', label: 'Surface', count: surfaceCount, icon: <Ship className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Available Couriers</h3>
          <p className="text-sm text-muted-foreground">
            {couriers.length} option{couriers.length !== 1 ? 's' : ''} for {data.pickupAddress.pincode} → {data.deliveryAddress.pincode}
          </p>
        </div>
        <Button onClick={fetchRates} variant="ghost" size="sm" className="gap-1 text-xs">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs — hidden for documents */}
      {!isDocument && (
        <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-background text-coke-red shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                activeTab === tab.key
                  ? 'bg-coke-red/10 text-coke-red'
                  : 'bg-muted text-muted-foreground'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Fallback note for documents when no air service available */}
      {isDocument && documentFallback === 'surface' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600">
          <Ship className="h-3.5 w-3.5 shrink-0" />
          No air service available for this route. Showing surface couriers instead.
        </div>
      )}
      {isDocument && documentFallback === 'all' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600">
          <Truck className="h-3.5 w-3.5 shrink-0" />
          Air service not available for this route. Showing all available couriers.
        </div>
      )}

      {/* Courier Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No {activeTab} couriers available for this route
          </p>
        </div>
      ) : (
        <DomesticCourierGrid
          couriers={filtered}
          selectedId={data.selectedCourier?.courier_company_id}
          onSelect={(courier) => handleSelect(courier as CourierOption)}
          maxItems={15}
        />
      )}

      {/* Info note */}
      <p className="text-xs text-center text-muted-foreground pt-2">
        Prices include pickup charges. Pickup will be raised automatically after booking.
      </p>
    </div>
  );
};

export const DomesticCourierStep = memo(DomesticCourierStepComponent);
