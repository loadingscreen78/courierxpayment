import { memo, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, User, Phone, Home, Loader2, CheckCircle2 } from 'lucide-react';
import { lookupPincode, INDIAN_STATES, CITIES_BY_STATE } from '@/lib/pincode-lookup';
import { cn } from '@/lib/utils';
import type { DomesticBookingData, DomesticAddress } from '@/lib/domestic/types';

interface Props {
  data: DomesticBookingData;
  onUpdate: (updates: Partial<DomesticBookingData>) => void;
}

type AddressKey = 'pickupAddress' | 'deliveryAddress';

const DomesticAddressStepComponent = ({ data, onUpdate }: Props) => {
  // Local state — prevents parent re-renders on every keystroke
  const [localPickup, setLocalPickup] = useState<DomesticAddress>(data.pickupAddress);
  const [localDelivery, setLocalDelivery] = useState<DomesticAddress>(data.deliveryAddress);
  const [pincodeLoading, setPincodeLoading] = useState<Record<string, boolean>>({});
  const [pincodeError, setPincodeError] = useState<Record<string, string | null>>({});

  // Refs for timer-based sync — closures read from refs, never cause re-renders
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const pickupRef = useRef(localPickup);
  const deliveryRef = useRef(localDelivery);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  pickupRef.current = localPickup;
  deliveryRef.current = localDelivery;

  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      onUpdateRef.current({
        pickupAddress: pickupRef.current,
        deliveryAddress: deliveryRef.current,
      });
    }, 600);
  }, []);

  const flushSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    onUpdateRef.current({
      pickupAddress: pickupRef.current,
      deliveryAddress: deliveryRef.current,
    });
  }, []);

  const updateAddress = useCallback((key: AddressKey, field: keyof DomesticAddress, value: string) => {
    if (key === 'pickupAddress') {
      setLocalPickup(prev => ({ ...prev, [field]: value }));
    } else {
      setLocalDelivery(prev => ({ ...prev, [field]: value }));
    }
    scheduleSync();
  }, [scheduleSync]);

  const handlePincodeLookup = useCallback(async (key: AddressKey, pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) return;

    setPincodeLoading(prev => ({ ...prev, [key]: true }));
    setPincodeError(prev => ({ ...prev, [key]: null }));

    try {
      const result = await lookupPincode(pincode);
      if (result) {
        if (key === 'pickupAddress') {
          setLocalPickup(prev => ({ ...prev, pincode, city: result.city, state: result.state }));
        } else {
          setLocalDelivery(prev => ({ ...prev, pincode, city: result.city, state: result.state }));
        }
        // Flush immediately after auto-fill
        setTimeout(() => flushSync(), 0);
      } else {
        setPincodeError(prev => ({ ...prev, [key]: 'Invalid pincode' }));
      }
    } catch {
      setPincodeError(prev => ({ ...prev, [key]: 'Lookup failed' }));
    } finally {
      setPincodeLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [flushSync]);

  const renderAddressForm = (key: AddressKey, title: string, icon: React.ReactNode) => {
    const addr = key === 'pickupAddress' ? localPickup : localDelivery;
    const cities = addr.state ? CITIES_BY_STATE[addr.state] || [] : [];
    const isLoading = pincodeLoading[key];
    const pinError = pincodeError[key];

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3" onBlur={flushSync}>
          {/* Name & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <User className="h-3 w-3" /> Full Name
              </Label>
              <Input
                value={addr.fullName}
                onChange={e => updateAddress(key, 'fullName', e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone
              </Label>
              <Input
                value={addr.phone}
                onChange={e => updateAddress(key, 'phone', e.target.value)}
                placeholder="10-digit mobile"
                maxLength={13}
              />
            </div>
          </div>

          {/* Address Lines */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Home className="h-3 w-3" /> Address Line 1
            </Label>
            <Input
              value={addr.addressLine1}
              onChange={e => updateAddress(key, 'addressLine1', e.target.value)}
              placeholder="House/Flat no., Building, Street"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Address Line 2 (Optional)</Label>
            <Input
              value={addr.addressLine2}
              onChange={e => updateAddress(key, 'addressLine2', e.target.value)}
              placeholder="Landmark, Area"
            />
          </div>

          {/* Pincode with auto-fill */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" /> PIN Code
            </Label>
            <div className="relative">
              <Input
                value={addr.pincode}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  updateAddress(key, 'pincode', val);
                  if (val.length === 6) handlePincodeLookup(key, val);
                }}
                placeholder="6-digit PIN code"
                inputMode="numeric"
                maxLength={6}
                className={cn(pinError && 'border-destructive')}
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {addr.city && addr.state && !isLoading && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {pinError && <p className="text-xs text-destructive">{pinError}</p>}
          </div>

          {/* State & City */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">State</Label>
              <Select
                value={addr.state}
                onValueChange={val => {
                  updateAddress(key, 'state', val);
                  updateAddress(key, 'city', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              {cities.length > 0 ? (
                <Select
                  value={addr.city}
                  onValueChange={val => updateAddress(key, 'city', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={addr.city}
                  onChange={e => updateAddress(key, 'city', e.target.value)}
                  placeholder="City name"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {renderAddressForm(
        'pickupAddress',
        'Pickup Address (Sender)',
        <MapPin className="h-5 w-5 text-coke-red" />
      )}
      {renderAddressForm(
        'deliveryAddress',
        'Delivery Address (Receiver)',
        <MapPin className="h-5 w-5 text-blue-500" />
      )}
    </div>
  );
};

export const DomesticAddressStep = memo(DomesticAddressStepComponent);
