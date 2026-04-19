"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Globe, MagnifyingGlass, ArrowRight, CircleNotch, MapPin, Package } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getAllCountriesForDropdown } from '@/lib/shipping/countries';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

type ShipType = 'domestic' | 'international';

interface PincodeMeta {
  state: string;
  district: string;
  areas: string[];
  loading: boolean;
  error: string | null;
}

const EMPTY_PIN: PincodeMeta = { state: '', district: '', areas: [], loading: false, error: null };

// ── Pincode lookup helper ────────────────────────────────────────────────────

function usePinLookup(pincode: string): PincodeMeta {
  const [meta, setMeta] = useState<PincodeMeta>(EMPTY_PIN);

  useEffect(() => {
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setMeta(EMPTY_PIN);
      return;
    }
    let cancelled = false;
    setMeta(prev => ({ ...prev, loading: true, error: null }));

    fetch(`/api/public/pincode-lookup?pincode=${pincode}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.success) {
          setMeta({
            state: data.state || '',
            district: data.district || '',
            areas: data.areas || (data.district ? [data.district] : []),
            loading: false,
            error: null,
          });
        } else {
          setMeta({ ...EMPTY_PIN, error: 'Invalid pincode' });
        }
      })
      .catch(() => {
        if (!cancelled) setMeta({ ...EMPTY_PIN, error: 'Lookup failed' });
      });

    return () => { cancelled = true; };
  }, [pincode]);

  return meta;
}

// ── Country list (memoised at module level) ──────────────────────────────────

const countryOptions = (() => {
  try {
    return getAllCountriesForDropdown()
      .filter(c => c.isServed)
      .map(c => ({ code: c.code, name: c.name, flag: c.flag }));
  } catch {
    return [];
  }
})();

// ── Pin Input (defined outside to keep stable identity across renders) ───────

const PinInput = ({ value, onChange, meta, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  meta: PincodeMeta;
  placeholder: string;
}) => (
  <div className="space-y-1">
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" weight="bold" />
      <Input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="pl-9 h-12 rounded-xl border-border bg-background text-sm focus:border-coke-red focus:ring-coke-red/20"
      />
      {meta.loading && (
        <CircleNotch className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
    {meta.district && !meta.error && (
      <p className="text-xs text-muted-foreground pl-1">{meta.district}, {meta.state}</p>
    )}
    {meta.error && (
      <p className="text-xs text-destructive pl-1">{meta.error}</p>
    )}
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────────

export const HeroCTAForm = () => {
  const router = useRouter();

  // ── Ship Now state ──
  const [shipType, setShipType] = useState<ShipType>('international');
  const [pickupPin, setPickupPin] = useState('');
  const [dropPin, setDropPin] = useState('');
  const [destCountry, setDestCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  // pin lookups
  const pickupMeta = usePinLookup(pickupPin);
  const dropMeta = usePinLookup(dropPin);

  // Close country dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Prefetch booking pages so Ship Now navigates instantly
  useEffect(() => {
    router.prefetch('/public/book/domestic');
    router.prefetch('/public/book/international');
  }, [router]);

  // ── Track state ──
  const [trackPhone, setTrackPhone] = useState('');
  const [trackAwb, setTrackAwb] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  const isDomestic = shipType === 'domestic';

  const filteredCountries = countrySearch.length > 0
    ? countryOptions.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : countryOptions.slice(0, 30);

  // ── Ship Now — navigate directly to guest workflow with data ──
  const handleShipNow = () => {
    const params = new URLSearchParams();

    if (isDomestic) {
      if (pickupPin.length !== 6 || dropPin.length !== 6) return;
      if (pickupMeta.error || dropMeta.error) return;
      params.set('pickupPincode', pickupPin);
      params.set('deliveryPincode', dropPin);
      if (pickupMeta.state) params.set('pickupState', pickupMeta.state);
      if (pickupMeta.district) params.set('pickupCity', pickupMeta.district);
      if (dropMeta.state) params.set('deliveryState', dropMeta.state);
      if (dropMeta.district) params.set('deliveryCity', dropMeta.district);
      router.push(`/public/book/domestic?${params.toString()}`);
    } else {
      if (!destCountry || pickupPin.length !== 6 || pickupMeta.error) return;
      params.set('pickupPincode', pickupPin);
      if (pickupMeta.state) params.set('pickupState', pickupMeta.state);
      if (pickupMeta.district) params.set('pickupCity', pickupMeta.district);
      params.set('country', destCountry);
      router.push(`/public/book/international?${params.toString()}`);
    }
  };

  // ── Track — redirect to tracking page ──
  const handleTrack = () => {
    if (!trackAwb.trim()) return;
    setTrackLoading(true);
    const params = new URLSearchParams();
    params.set('tracking', trackAwb.trim());
    if (trackPhone) params.set('phone', trackPhone);
    router.push(`/public/track?${params.toString()}`);
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm shadow-2xl shadow-black/10 overflow-visible">
        <Tabs defaultValue="ship" className="w-full">
          {/* Tab Headers */}
          <TabsList className="w-full h-auto p-0 bg-muted/50 rounded-none rounded-t-2xl overflow-hidden border-b border-border grid grid-cols-2">
            <TabsTrigger
              value="ship"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-coke-red data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none py-4 text-base font-semibold gap-2"
            >
              <Package className="h-5 w-5" weight="bold" />
              Ship Now
            </TabsTrigger>
            <TabsTrigger
              value="track"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-coke-red data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none py-4 text-base font-semibold gap-2"
            >
              <MagnifyingGlass className="h-5 w-5" weight="bold" />
              Track Order
            </TabsTrigger>
          </TabsList>

          {/* ── Ship Now Tab ── */}
          <TabsContent value="ship" className="mt-0 p-6 sm:p-7 space-y-5">
            {/* Domestic / International toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              <button
                onClick={() => setShipType('domestic')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  isDomestic
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Truck className="h-4 w-4" weight="bold" />
                Domestic
              </button>
              <button
                onClick={() => setShipType('international')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  !isDomestic
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Globe className="h-4 w-4" weight="bold" />
                International
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isDomestic ? (
                /* ── Domestic Form ── */
                <motion.div
                  key="domestic"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-3"
                >
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pickup</p>
                  <PinInput value={pickupPin} onChange={setPickupPin} meta={pickupMeta} placeholder="Pickup pin code" />

                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider pt-1">Drop</p>
                  <PinInput value={dropPin} onChange={setDropPin} meta={dropMeta} placeholder="Drop pin code" />

                  <Button
                    className="w-full h-12 bg-coke-red hover:bg-coke-red/90 text-white font-semibold rounded-xl shadow-lg shadow-coke-red/20 text-base gap-2 mt-2"
                    onClick={handleShipNow}
                    disabled={pickupPin.length !== 6 || dropPin.length !== 6 || !!pickupMeta.error || !!dropMeta.error || pickupMeta.loading || dropMeta.loading}
                  >
                    Ship Now <ArrowRight className="h-4 w-4" weight="bold" />
                  </Button>
                </motion.div>
              ) : (
                /* ── International Form ── */
                <motion.div
                  key="international"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-3"
                >
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pickup (India)</p>
                  <PinInput value={pickupPin} onChange={setPickupPin} meta={pickupMeta} placeholder="Pickup pin code" />

                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider pt-1">Destination Country</p>
                  <div className="relative" ref={countryRef}>
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" weight="bold" />
                    <Input
                      type="text"
                      placeholder="Search country..."
                      value={destCountry ? countryOptions.find(c => c.code === destCountry)?.name || countrySearch : countrySearch}
                      onChange={e => {
                        setCountrySearch(e.target.value);
                        setDestCountry('');
                        setShowCountryDropdown(true);
                      }}
                      onFocus={() => setShowCountryDropdown(true)}
                      className="pl-9 h-12 rounded-xl border-border bg-background text-sm focus:border-coke-red focus:ring-coke-red/20"
                    />
                    {showCountryDropdown && filteredCountries.length > 0 && (
                      <div className="absolute z-[9999] top-full mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                        {filteredCountries.map(c => (
                          <button
                            key={c.code}
                            onClick={() => {
                              setDestCountry(c.code);
                              setCountrySearch(c.name);
                              setShowCountryDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left"
                          >
                            <span className="text-base">{c.flag}</span>
                            <span className="text-foreground">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full h-12 bg-coke-red hover:bg-coke-red/90 text-white font-semibold rounded-xl shadow-lg shadow-coke-red/20 text-base gap-2 mt-2"
                    onClick={handleShipNow}
                    disabled={!destCountry || pickupPin.length !== 6 || !!pickupMeta.error || pickupMeta.loading}
                  >
                    Ship Now <ArrowRight className="h-4 w-4" weight="bold" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-xs text-muted-foreground text-center pt-1">
              No account needed. Get instant rates and book as a guest.
            </p>
          </TabsContent>

          {/* ── Track Order Tab ── */}
          <TabsContent value="track" className="mt-0 p-6 sm:p-7 space-y-5">
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tracking Number</p>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" weight="bold" />
                <Input
                  type="text"
                  placeholder="Enter AWB or tracking number"
                  value={trackAwb}
                  onChange={e => setTrackAwb(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTrack()}
                  className="pl-9 h-12 rounded-xl border-border bg-background text-sm focus:border-coke-red focus:ring-coke-red/20"
                />
              </div>

              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider pt-1">Mobile Number <span className="text-muted-foreground/60">(optional)</span></p>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-xl bg-muted border border-r-0 border-border text-xs text-muted-foreground font-medium">
                  +91
                </span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={trackPhone}
                  onChange={e => setTrackPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="rounded-l-none border-l-0 h-12 text-sm"
                />
              </div>

              <Button
                className="w-full h-12 bg-coke-red hover:bg-coke-red/90 text-white font-semibold rounded-xl shadow-lg shadow-coke-red/20 text-base gap-2 mt-1"
                onClick={handleTrack}
                disabled={!trackAwb.trim() || trackLoading}
              >
                {trackLoading ? (
                  <CircleNotch className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <MagnifyingGlass className="h-4 w-4" weight="bold" />
                    Track Shipment
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
