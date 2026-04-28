"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Globe, MagnifyingGlass, ArrowRight, CircleNotch, MapPin, Package, CaretDown, Info } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getAllCountriesForDropdown } from '@/lib/shipping/countries';
import { CountrySelector } from '@/components/shipping/CountrySelector';
import { STATES, DISTRICTS_BY_STATE } from '@/lib/indian-districts';
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

function usePinLookup(pincode: string): [PincodeMeta, (m: PincodeMeta) => void] {
  const [meta, setMeta] = useState<PincodeMeta>(EMPTY_PIN);
  const overrideRef = useRef(false);
  useEffect(() => {
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) { setMeta(EMPTY_PIN); overrideRef.current = false; return; }
    // If meta was set directly from the finder, skip the API call
    if (overrideRef.current) { overrideRef.current = false; return; }
    let cancelled = false;
    setMeta(prev => ({ ...prev, loading: true, error: null }));
    fetch(`/api/public/pincode-lookup?pincode=${pincode}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.success) {
          setMeta({ state: data.state || '', district: data.district || '', areas: data.areas || [], loading: false, error: null });
        } else {
          setMeta({ ...EMPTY_PIN, error: 'This pincode is incorrect. Please enter a valid Indian pincode.' });
        }
      })
      .catch(() => { if (!cancelled) setMeta({ ...EMPTY_PIN, error: 'This pincode is incorrect. Please enter a valid Indian pincode.' }); });
    return () => { cancelled = true; };
  }, [pincode]);

  const setMetaFromFinder = (m: PincodeMeta) => { overrideRef.current = true; setMeta(m); };
  return [meta, setMetaFromFinder];
}

// ── Sanctioned / restricted country codes ────────────────────────────────────

const SANCTIONED_CODES = new Set(['CU','IR','KP','SY','SD','BY','RU']);

const countryOptions = (() => {
  try {
    return getAllCountriesForDropdown().map(c => ({
      code: c.code, name: c.name, flag: c.flag,
      isServed: c.isServed, isSanctioned: SANCTIONED_CODES.has(c.code),
      notServedReason: c.notServedReason,
    }));
  } catch { return []; }
})();

// ── Pincode Finder Modal (State → District → Pincodes) ──────────────────────

interface PincodeResult { pincode: string; offices: string[]; district: string; state: string; }

const PincodeFinder = ({ onSelect, onClose }: { onSelect: (pin: string, district?: string, state?: string) => void; onClose: () => void }) => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [pincodes, setPincodes] = useState<PincodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');

  const districts = selectedState ? (DISTRICTS_BY_STATE[selectedState] || []) : [];

  useEffect(() => {
    if (!selectedState || !selectedDistrict) { setPincodes([]); return; }
    setLoading(true);
    fetch(`/api/public/pincode-by-district?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(selectedDistrict)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.pincodes?.length) {
          setPincodes(data.pincodes);
        } else {
          setPincodes([]);
        }
      })
      .catch(() => setPincodes([]))
      .finally(() => setLoading(false));
  }, [selectedState, selectedDistrict]);

  const filtered = filterText
    ? pincodes.filter(p => p.pincode.includes(filterText) || p.offices.some(o => o.toLowerCase().includes(filterText.toLowerCase())))
    : pincodes;

  return (
    <>
      {/* Mobile: full-screen overlay */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40 sm:hidden"
        onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        onTouchEnd={e => { if (e.target === e.currentTarget) onClose(); }}
      />
      {/* Card — mobile: fixed bottom sheet, desktop: sized card (parent positions it) */}
      <div
        data-pincode-finder
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        className="fixed bottom-0 left-0 right-0 rounded-t-2xl border border-border/60 bg-card shadow-2xl overflow-hidden sm:fixed-none sm:relative sm:bottom-auto sm:left-auto sm:right-auto sm:rounded-2xl sm:w-72 sm:shadow-xl"
      >
        <div className="px-4 pt-4 pb-3 border-b border-border/40 bg-muted/30">
          {/* Mobile drag handle */}
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Find Pincode</p>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">✕</button>
          </div>
          {/* State dropdown */}
          <div className="relative mb-2">
            <select
              value={selectedState}
              onChange={e => { setSelectedState(e.target.value); setSelectedDistrict(''); setPincodes([]); }}
              className="w-full h-10 px-3 pr-8 rounded-lg border border-border bg-background text-sm appearance-none cursor-pointer focus:outline-none focus:border-coke-red"
            >
              <option value="">Select State</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <CaretDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
          {/* District dropdown */}
          <div className="relative">
            <select
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
              className="w-full h-10 px-3 pr-8 rounded-lg border border-border bg-background text-sm appearance-none cursor-pointer focus:outline-none focus:border-coke-red disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select District</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <CaretDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        {/* Results */}
        <div className="max-h-64 sm:max-h-56 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <CircleNotch className="h-4 w-4 animate-spin" /> Loading pincodes...
            </div>
          )}
          {!loading && selectedDistrict && pincodes.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 sticky top-0 bg-card z-10">
                <Input
                  type="text"
                  placeholder="Filter by pincode or area..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
                <p className="text-[11px] text-muted-foreground mt-1">{filtered.length} pincode{filtered.length !== 1 ? 's' : ''} found</p>
              </div>
              {filtered.map(p => (
                <button
                  key={p.pincode}
                  onClick={() => onSelect(p.pincode, selectedDistrict, selectedState)}
                  className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0"
                >
                  <span className="text-sm font-semibold text-coke-red">{p.pincode}</span>
                  <span className="text-xs text-muted-foreground ml-2 truncate">{p.offices.slice(0, 3).join(', ')}{p.offices.length > 3 ? ` +${p.offices.length - 3} more` : ''}</span>
                </button>
              ))}
            </>
          )}
          {!loading && selectedDistrict && pincodes.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">No pincodes found for this district.</p>
              <p className="text-[11px] text-muted-foreground mt-1">Try a different district or enter the pincode directly.</p>
            </div>
          )}
          {!loading && !selectedDistrict && (
            <div className="px-4 py-6 text-center">
              <Info className="h-5 w-5 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Select a state and district to see all pincodes.</p>
            </div>
          )}
        </div>
        {/* Safe area padding for mobile */}
        <div className="h-safe-bottom sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </div>
    </>
  );
};

// ── Pin Input ────────────────────────────────────────────────────────────────

const PinInput = ({ value, onChange, onMetaOverride, meta, placeholder, showAssistance }: {
  value: string; onChange: (v: string) => void; onMetaOverride?: (district: string, state: string) => void; meta: PincodeMeta; placeholder: string; showAssistance?: boolean;
}) => {
  const [finderOpen, setFinderOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!finderOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFinderOpen(false);
      }
    };
    // Use setTimeout so the click that opened it doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [finderOpen]);

  return (
    <div className="space-y-1">
      <div className="relative flex gap-1.5">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" weight="bold" />
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="pl-9 h-11 rounded-xl border-border/60 bg-background text-sm focus:border-coke-red focus:ring-coke-red/20 placeholder:text-muted-foreground/50"
          />
          {meta.loading && (
            <CircleNotch className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {showAssistance && (
          <div ref={wrapperRef} className="relative" style={{ zIndex: finderOpen ? 50 : 'auto' }}>
            <button
              type="button"
              onClick={() => setFinderOpen(v => !v)}
              className={cn(
                "h-11 px-2.5 rounded-xl border text-xs font-medium shrink-0 flex items-center gap-1 transition-all",
                finderOpen
                  ? "border-coke-red bg-coke-red/5 text-coke-red"
                  : "border-border/60 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
              title="Find pincode by state & district"
            >
              <MagnifyingGlass className="h-3.5 w-3.5" weight="bold" />
              <span className="hidden sm:inline">Find</span>
            </button>
            <AnimatePresence>
              {finderOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="hidden sm:block absolute right-0 top-full mt-1.5"
                  style={{ zIndex: 9999 }}
                >
                  <PincodeFinder
                    onSelect={(pin, district, state) => { if (district && state && onMetaOverride) onMetaOverride(district, state); onChange(pin); setFinderOpen(false); }}
                    onClose={() => setFinderOpen(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {/* Mobile: render outside motion wrapper so fixed positioning works */}
            {finderOpen && (
              <div className="sm:hidden">
                <PincodeFinder
                  onSelect={(pin, district, state) => { if (district && state && onMetaOverride) onMetaOverride(district, state); onChange(pin); setFinderOpen(false); }}
                  onClose={() => setFinderOpen(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <AnimatePresence>
        {(meta.state || meta.district) && !meta.error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-emerald-600 pl-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {meta.areas?.[0] && meta.areas[0] !== meta.district && meta.areas[0] !== meta.state
              ? `${meta.areas[0]}, ${meta.district && meta.district !== meta.state ? `${meta.district}, ` : ''}${meta.state}`
              : meta.district && meta.district !== meta.state
                ? `${meta.district}, ${meta.state}`
                : meta.state
            }
          </motion.p>
        )}
        {meta.error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-destructive pl-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
            {meta.error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

export const HeroCTAForm = ({ defaultTab = 'ship' }: { defaultTab?: 'ship' | 'track' }) => {
  const router = useRouter();

  const [shipType, setShipType] = useState<ShipType>('international');
  const [pickupPin, setPickupPin] = useState('');
  const [dropPin, setDropPin] = useState('');
  const [destCountry, setDestCountry] = useState('');

  const [pickupMeta, setPickupMetaFromFinder] = usePinLookup(pickupPin);
  const [dropMeta, setDropMetaFromFinder] = usePinLookup(dropPin);

  const [trackPhone, setTrackPhone] = useState('');
  const [trackAwb, setTrackAwb] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  const isDomestic = shipType === 'domestic';

  useEffect(() => {
    router.prefetch('/public/book/domestic');
    router.prefetch('/public/book/international');
  }, [router]);

  const handleShipNow = () => {
    const params = new URLSearchParams();
    if (isDomestic) {
      if (pickupPin.length !== 6 || dropPin.length !== 6) return;
      // Show inline error via meta — don't block silently
      if (pickupMeta.error || dropMeta.error) return;
      params.set('pickupPincode', pickupPin);
      params.set('deliveryPincode', dropPin);
      if (pickupMeta.state) params.set('pickupState', pickupMeta.state);
      if (pickupMeta.district) params.set('pickupCity', pickupMeta.district);
      if (dropMeta.state) params.set('deliveryState', dropMeta.state);
      if (dropMeta.district) params.set('deliveryCity', dropMeta.district);
      router.push(`/public/book/domestic?${params.toString()}`);
    } else {
      if (!destCountry || pickupPin.length !== 6) return;
      // Show inline error via meta — don't block silently
      if (pickupMeta.error) return;
      params.set('pickupPincode', pickupPin);
      if (pickupMeta.state) params.set('pickupState', pickupMeta.state);
      if (pickupMeta.district) params.set('pickupCity', pickupMeta.district);
      params.set('country', destCountry);
      router.push(`/public/book/international?${params.toString()}`);
    }
  };

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
      <div className="rounded-2xl bg-card border border-border/40 shadow-xl shadow-black/[0.08] overflow-visible">
        <Tabs defaultValue={defaultTab} className="w-full">
          {/* ── Tab bar ── */}
          <TabsList className="w-full h-auto p-0 bg-transparent rounded-none rounded-t-2xl overflow-hidden grid grid-cols-2">
            <TabsTrigger
              value="ship"
              className="rounded-none rounded-tl-2xl py-3.5 text-sm font-semibold gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-transparent data-[state=active]:bg-coke-red data-[state=active]:text-white data-[state=active]:shadow-none data-[state=inactive]:bg-muted/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60"
            >
              <Package className="h-4 w-4" weight="bold" />
              Ship Now
            </TabsTrigger>
            <TabsTrigger
              value="track"
              className="rounded-none rounded-tr-2xl py-3.5 text-sm font-semibold gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-transparent data-[state=active]:bg-coke-red data-[state=active]:text-white data-[state=active]:shadow-none data-[state=inactive]:bg-muted/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60"
            >
              <MagnifyingGlass className="h-4 w-4" weight="bold" />
              Track Order
            </TabsTrigger>
          </TabsList>

          {/* ── Ship Now ── */}
          <TabsContent value="ship" className="mt-0 p-5 sm:p-6 space-y-4 min-h-[370px] overflow-visible">
            {/* Contextual separator */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium whitespace-nowrap">Where are you shipping?</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>

            {/* Mode toggle */}
            <div className="flex p-0.5 bg-muted/50 rounded-lg">
              <button
                onClick={() => setShipType('international')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all",
                  !isDomestic ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Globe className="h-3.5 w-3.5" weight="bold" />
                International
              </button>
              <button
                onClick={() => setShipType('domestic')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all",
                  isDomestic ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Truck className="h-3.5 w-3.5" weight="bold" />
                Domestic
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isDomestic ? (
                <motion.div key="domestic" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Pickup</label>
                  <PinInput value={pickupPin} onChange={setPickupPin} onMetaOverride={(d, s) => setPickupMetaFromFinder({ state: s, district: d, areas: [], loading: false, error: null })} meta={pickupMeta} placeholder="Pincode" showAssistance />
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block pt-1">Delivery</label>
                  <PinInput value={dropPin} onChange={setDropPin} onMetaOverride={(d, s) => setDropMetaFromFinder({ state: s, district: d, areas: [], loading: false, error: null })} meta={dropMeta} placeholder="Pincode" showAssistance />
                  <Button
                    className="w-full h-11 bg-coke-red hover:bg-red-700 text-white font-semibold rounded-xl text-sm gap-2 mt-1 shadow-md shadow-coke-red/15 transition-all hover:shadow-lg hover:shadow-coke-red/25"
                    onClick={handleShipNow}
                    disabled={pickupPin.length !== 6 || dropPin.length !== 6 || !!pickupMeta.error || !!dropMeta.error || pickupMeta.loading || dropMeta.loading}
                  >
                    Ship Now <ArrowRight className="h-4 w-4" weight="bold" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="international" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Pickup (India)</label>
                  <PinInput value={pickupPin} onChange={setPickupPin} onMetaOverride={(d, s) => setPickupMetaFromFinder({ state: s, district: d, areas: [], loading: false, error: null })} meta={pickupMeta} placeholder="Pincode" showAssistance />
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block pt-1">Destination Country</label>
                  <CountrySelector
                    value={destCountry}
                    onValueChange={setDestCountry}
                    placeholder="Search country..."
                    className="h-11 rounded-xl border-border/60 text-sm"
                  />
                  <Button
                    className="w-full h-11 bg-coke-red hover:bg-red-700 text-white font-semibold rounded-xl text-sm gap-2 mt-1 shadow-md shadow-coke-red/15 transition-all hover:shadow-lg hover:shadow-coke-red/25"
                    onClick={handleShipNow}
                    disabled={!destCountry || pickupPin.length !== 6 || !!pickupMeta.error || pickupMeta.loading}
                  >
                    Ship Now <ArrowRight className="h-4 w-4" weight="bold" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <p className="text-[11px] text-muted-foreground/70 text-center">No account needed. Get instant rates and book as a guest.</p>
          </TabsContent>

          {/* ── Track Order ── */}
          <TabsContent value="track" className="mt-0 p-5 sm:p-6 space-y-4 min-h-[370px]">
            {/* Contextual separator */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium whitespace-nowrap">Enter your shipment details</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>

            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Tracking Number</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" weight="bold" />
              <Input
                type="text"
                placeholder="Enter AWB or tracking number"
                value={trackAwb}
                onChange={e => setTrackAwb(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTrack()}
                className="pl-9 h-11 rounded-xl border-border/60 bg-background text-sm focus:border-coke-red focus:ring-coke-red/20 placeholder:text-muted-foreground/50"
              />
            </div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block pt-1">Mobile <span className="text-muted-foreground/50 normal-case">(optional)</span></label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl bg-muted/50 border border-r-0 border-border/60 text-xs text-muted-foreground font-medium">+91</span>
              <Input
                type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile"
                value={trackPhone}
                onChange={e => setTrackPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="rounded-l-none border-l-0 h-11 text-sm border-border/60"
              />
            </div>
            <Button
              className="w-full h-11 bg-coke-red hover:bg-red-700 text-white font-semibold rounded-xl text-sm gap-2 mt-1 shadow-md shadow-coke-red/15 transition-all hover:shadow-lg hover:shadow-coke-red/25"
              onClick={handleTrack}
              disabled={!trackAwb.trim() || trackLoading}
            >
              {trackLoading ? <CircleNotch className="h-4 w-4 animate-spin" /> : <><MagnifyingGlass className="h-4 w-4" weight="bold" /> Track Shipment</>}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
