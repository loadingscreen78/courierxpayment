"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Package, MapPin, Scales, Clock, Truck, Warning, Check,
  ArrowRight, Sparkle, Shield, Globe, CaretRight, Cube,
  House, Lock, FileText, Gift, MagnifyingGlass, CaretDown, MapPinLine,
  AirplaneTilt, CircleNotch, Lightning, Star,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CountrySelector } from '@/components/shipping/CountrySelector';
import { CountryRegulations } from '@/components/shipping/CountryRegulations';
import { ETADisplay } from '@/components/shipping/ETADisplay';
import { ProhibitedItemsAlert } from '@/components/shipping/ProhibitedItemsAlert';
import { LandingHeader, LandingFooter } from '@/components/landing';
import { useCountries } from '@/hooks/useCountries';
import { useSeo } from '@/hooks/useSeo';
import { getCourierOptions, Carrier } from '@/lib/shipping/rateCalculator';
import { calculateETA } from '@/lib/shipping/etaCalculator';
import { getCarrierInfo } from '@/lib/shipping/courierSelection';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { CourierOption } from '@/lib/domestic/types';
import { getCourierFacts } from '@/lib/shipping/courierFacts';
import { STATES, DISTRICTS_BY_STATE } from '@/lib/indian-districts';

type ShippingMode = 'international' | 'domestic';
type RateTier = 'express' | 'economy' | 'saver';
const COMING_SOON_CARRIERS = ['ShipGlobal'];

const WEIGHT_OPTIONS_KG = [
  { label: '500 g', value: 0.5 }, { label: '1 kg', value: 1 },
  { label: '1.5 kg', value: 1.5 }, { label: '2 kg', value: 2 },
  { label: '2.5 kg', value: 2.5 }, { label: '3 kg', value: 3 },
  { label: '4 kg', value: 4 }, { label: '5 kg', value: 5 },
  { label: '6 kg', value: 6 }, { label: '7 kg', value: 7 },
  { label: '8 kg', value: 8 }, { label: '9 kg', value: 9 },
  { label: '10 kg', value: 10 },
];
const WEIGHT_OPTIONS_G = [
  { label: '500 g', value: 500 }, { label: '1 kg', value: 1000 },
  { label: '1.5 kg', value: 1500 }, { label: '2 kg', value: 2000 },
  { label: '2.5 kg', value: 2500 }, { label: '3 kg', value: 3000 },
  { label: '4 kg', value: 4000 }, { label: '5 kg', value: 5000 },
  { label: '6 kg', value: 6000 }, { label: '7 kg', value: 7000 },
  { label: '8 kg', value: 8000 }, { label: '9 kg', value: 9000 },
  { label: '10 kg', value: 10000 },
];

// ── Classify couriers into Express / Economy / Saver ──────────────────
// Express: air couriers (BlueDart Air, Delhivery Air, DTDC Air, Xpressbees Air, etc.)
// Economy: surface couriers with ≤5 day delivery (Delhivery Surface, DTDC Surface)
// Saver: surface couriers with >5 day delivery or cheapest surface options
function classifyCouriers(couriers: CourierOption[]): Record<RateTier, CourierOption[]> {
  const express: CourierOption[] = [];
  const economy: CourierOption[] = [];
  const saver: CourierOption[] = [];

  for (const c of couriers) {
    if (c.mode === 'air') {
      express.push(c);
    } else {
      // Surface: split by delivery speed
      const days = c.estimated_delivery_days || 7;
      if (days <= 5) {
        economy.push(c);
      } else {
        saver.push(c);
      }
    }
  }

  // If no saver couriers, move the cheapest economy ones to saver
  if (saver.length === 0 && economy.length > 1) {
    const sorted = [...economy].sort((a, b) => a.customer_price - b.customer_price);
    const half = Math.ceil(sorted.length / 2);
    const cheapHalf = sorted.slice(0, half);
    const restHalf = sorted.slice(half);
    if (restHalf.length > 0) {
      return { express, economy: restHalf, saver: cheapHalf };
    }
  }

  // If no economy, move slower express to economy
  if (economy.length === 0 && express.length > 1) {
    const sorted = [...express].sort((a, b) => a.customer_price - b.customer_price);
    return { express: [sorted[sorted.length - 1]], economy: sorted.slice(0, -1), saver };
  }

  return { express, economy, saver };
}

// ── Compute estimated arrival date from business days ─────────────────
function getEstimatedArrival(days: number, mode: 'air' | 'surface'): string {
  // If API didn't return days, use realistic defaults per mode
  const effectiveDays = (!days || days <= 0)
    ? (mode === 'air' ? 2 : 5)
    : days;
  const d = new Date();
  let added = 0;
  while (added < effectiveDays) {
    d.setDate(d.getDate() + 1);
    // Skip Sundays (Indian couriers mostly deliver on Saturdays)
    if (d.getDay() !== 0) added++;
  }
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── Animated BG ───────────────────────────────────────────────────────
const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div className="absolute -top-40 -right-40 w-96 h-96 bg-coke-red/5 rounded-full blur-3xl"
      animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
    <motion.div className="absolute -bottom-40 -left-40 w-96 h-96 bg-coke-red/5 rounded-full blur-3xl"
      animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.3, 0.15] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />
  </div>
);

// ── Pincode Finder (State → District → Pincodes) ─────────────────────
interface PincodeResult { pincode: string; offices: string[]; district: string; state: string; }

const PincodeFinder = ({ onSelect, onClose }: { onSelect: (p: string) => void; onClose: () => void }) => {
  const [selState, setSelState] = useState('');
  const [selDistrict, setSelDistrict] = useState('');
  const [pincodes, setPincodes] = useState<PincodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const districts = selState ? (DISTRICTS_BY_STATE[selState] || []) : [];

  useEffect(() => {
    if (!selState || !selDistrict) { setPincodes([]); return; }
    setLoading(true);
    fetch(`/api/public/pincode-by-district?state=${encodeURIComponent(selState)}&district=${encodeURIComponent(selDistrict)}`)
      .then(r => r.json())
      .then(d => setPincodes(d.success && d.pincodes?.length ? d.pincodes : []))
      .catch(() => setPincodes([]))
      .finally(() => setLoading(false));
  }, [selState, selDistrict]);

  const filtered = filter
    ? pincodes.filter(p => p.pincode.includes(filter) || p.offices.some(o => o.toLowerCase().includes(filter.toLowerCase())))
    : pincodes;

  return (
    <div ref={ref} className="absolute z-[9999] left-0 top-full mt-2 w-72 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Find Pincode</p>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground w-6 h-6 flex items-center justify-center rounded-full border border-border">✕</button>
        </div>
        <div className="relative mb-2">
          <select value={selState} onChange={e => { setSelState(e.target.value); setSelDistrict(''); }}
            className="w-full h-9 px-3 pr-8 rounded-lg border border-border bg-background text-sm appearance-none cursor-pointer focus:outline-none focus:border-coke-red">
            <option value="">Select State</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <CaretDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select value={selDistrict} onChange={e => setSelDistrict(e.target.value)} disabled={!selState}
            className="w-full h-9 px-3 pr-8 rounded-lg border border-border bg-background text-sm appearance-none cursor-pointer focus:outline-none focus:border-coke-red disabled:opacity-50">
            <option value="">Select District</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <CaretDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {loading && <div className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground"><CircleNotch className="h-4 w-4 animate-spin" /> Loading...</div>}
        {!loading && selDistrict && pincodes.length > 0 && (
          <>
            <div className="px-3 pt-2 pb-1 sticky top-0 bg-card z-10">
              <input type="text" placeholder="Filter area or pincode..." value={filter} onChange={e => setFilter(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:border-coke-red" />
            </div>
            {filtered.map((p, i) => (
              <button key={i} onClick={() => { onSelect(p.pincode); onClose(); }}
                className="w-full text-left px-4 py-2.5 hover:bg-coke-red/5 transition-colors border-b border-border/30 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-coke-red">{p.pincode}</span>
                  <span className="text-[10px] text-muted-foreground">{p.district}</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{p.offices.slice(0, 2).join(', ')}</p>
              </button>
            ))}
          </>
        )}
        {!loading && selDistrict && pincodes.length === 0 && <p className="text-center text-xs text-muted-foreground py-5">No pincodes found</p>}
        {!selDistrict && <p className="text-center text-xs text-muted-foreground py-5">Select state & district</p>}
      </div>
    </div>
  );
};

// ── Pincode Input ─────────────────────────────────────────────────────
const PincodeInput = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => {
  const [showFinder, setShowFinder] = useState(false);
  const [locationInfo, setLocationInfo] = useState<{ state: string; district: string } | null>(null);

  useEffect(() => {
    if (/^\d{6}$/.test(value)) {
      fetch(`/api/public/pincode-lookup?pincode=${value}`)
        .then(r => r.json())
        .then(d => { if (d.success) setLocationInfo({ state: d.state, district: d.district }); })
        .catch(() => {});
    } else { setLocationInfo(null); }
  }, [value]);

  return (
    <div className="space-y-1.5 relative">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</Label>
      <Input type="text" inputMode="numeric" maxLength={6} placeholder="e.g. 110001" value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="h-12 text-lg font-bold font-typewriter" />
      {locationInfo && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPinLine size={12} weight="bold" className="text-coke-red" />
          {locationInfo.district}, {locationInfo.state}
        </p>
      )}
      <button type="button" onClick={() => setShowFinder(v => !v)}
        className="flex items-center gap-1.5 text-xs text-coke-red font-medium px-3 py-1.5 rounded-lg border border-coke-red/20 hover:bg-coke-red/5 transition-all">
        <MagnifyingGlass size={12} weight="bold" /> Find pincode
      </button>
      {showFinder && <PincodeFinder onSelect={p => { onChange(p); setShowFinder(false); }} onClose={() => setShowFinder(false)} />}
    </div>
  );
};

// ── Weight Dropdown ───────────────────────────────────────────────────
const WeightDropdown = ({ value, onChange, options }: { value: number; onChange: (v: number) => void; options: { label: string; value: number }[] }) => (
  <div className="relative">
    <select value={value} onChange={e => onChange(Number(e.target.value))}
      className="w-full h-12 px-4 pr-10 rounded-lg border border-border bg-background text-base font-semibold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-coke-red/20 focus:border-coke-red transition-all">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
  </div>
);

// ── Domestic/International Toggle ─────────────────────────────────────
const ShippingModeToggle = ({ mode, onChange }: { mode: ShippingMode; onChange: (m: ShippingMode) => void }) => (
  <div className="flex items-center justify-center">
    <div className="relative inline-flex items-center bg-muted/60 rounded-2xl p-1.5 border border-border shadow-sm">
      <motion.div className="absolute top-1.5 bottom-1.5 rounded-xl bg-coke-red shadow-lg"
        initial={false}
        animate={{ left: mode === 'domestic' ? '6px' : '50%', right: mode === 'international' ? '6px' : '50%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }} />
      <button onClick={() => onChange('domestic')}
        className={cn("relative z-10 flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-colors",
          mode === 'domestic' ? "text-white" : "text-muted-foreground hover:text-foreground")}>
        <House size={18} weight="bold" />
        <div className="text-left">
          <p className="leading-none">Domestic</p>
          <p className={cn("text-[10px] font-normal", mode === 'domestic' ? "text-white/70" : "text-muted-foreground")}>Within India</p>
        </div>
      </button>
      <button onClick={() => onChange('international')}
        className={cn("relative z-10 flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-colors",
          mode === 'international' ? "text-white" : "text-muted-foreground hover:text-foreground")}>
        <Globe size={18} weight="bold" />
        <div className="text-left">
          <p className="leading-none">International</p>
          <p className={cn("text-[10px] font-normal", mode === 'international' ? "text-white/70" : "text-muted-foreground")}>150+ Countries</p>
        </div>
      </button>
    </div>
  </div>
);

// ── Domestic Courier Card ─────────────────────────────────────────────
const DomCourierCard = ({ courier, isSelected, onSelect, index, onBook }: {
  courier: CourierOption; isSelected: boolean; onSelect: () => void; index: number; onBook: () => void;
}) => {
  const isAir = courier.mode === 'air';
  const ModeIcon = isAir ? AirplaneTilt : Truck;
  const arrivalDate = getEstimatedArrival(courier.estimated_delivery_days, courier.mode);
  const daysText = courier.estimated_delivery_days > 0
    ? `${courier.estimated_delivery_days} business day${courier.estimated_delivery_days !== 1 ? 's' : ''}`
    : (isAir ? '1–3 business days' : '4–7 business days');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl border-2 p-4 sm:p-5 transition-all duration-200 flex flex-col h-full cursor-pointer",
        isSelected
          ? "border-coke-red bg-coke-red/5 shadow-lg shadow-coke-red/10"
          : "border-border bg-card hover:border-coke-red/30 hover:shadow-md"
      )}>
      {courier.is_recommended && (
        <div className="absolute -top-2.5 -right-2.5 z-10">
          <Badge className="bg-coke-red text-white border-0 shadow-md px-2.5 py-0.5 text-[10px]">
            <Star size={10} weight="fill" className="mr-1" /> Best Value
          </Badge>
        </div>
      )}
      {isSelected && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute top-3 left-3 w-5 h-5 rounded-full bg-coke-red flex items-center justify-center">
          <Check size={12} weight="bold" className="text-white" />
        </motion.div>
      )}
      <div className="text-center space-y-3 flex-1 flex flex-col">
        <div className={cn("w-10 h-10 mx-auto rounded-xl flex items-center justify-center",
          isSelected ? "bg-coke-red text-white" : "bg-muted")}>
          <ModeIcon size={20} weight="bold" />
        </div>
        <div>
          <h3 className="font-bold text-sm font-typewriter leading-tight">{courier.courier_name}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{courier.mode}</p>
        </div>
        <div className="py-2 border-y border-border/50">
          <p className={cn("text-2xl font-bold", isSelected ? "text-coke-red" : "text-foreground")}>
            ₹{courier.customer_price.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-muted-foreground">incl. all taxes</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={12} weight="bold" />
            <span>By {arrivalDate}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{daysText}</p>
        </div>
        {courier.rating > 0 && (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Star size={10} weight="fill" className="text-amber-400" />
            <span>{courier.rating.toFixed(1)}</span>
          </div>
        )}
        <div className="flex-1" />
        <Button size="sm" onClick={e => { e.stopPropagation(); onBook(); }}
          className={cn("w-full min-h-[40px] text-xs transition-all",
            isSelected ? "bg-coke-red hover:bg-coke-red/90 text-white" : "bg-charcoal hover:bg-charcoal/90 text-white")}>
          Book Now <CaretRight size={14} weight="bold" className="ml-1" />
        </Button>
      </div>
    </motion.div>
  );
};

// ── International Carrier Card ────────────────────────────────────────
const CarrierCard = ({ option, isSelected, onSelect, index }: {
  option: ReturnType<typeof getCourierOptions>[0]; isSelected: boolean; onSelect: () => void; index: number;
}) => {
  const info = getCarrierInfo(option.carrier);
  const isComingSoon = COMING_SOON_CARRIERS.includes(option.carrier);
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }} whileHover={isComingSoon ? {} : { y: -6 }}
      onClick={isComingSoon ? undefined : onSelect}
      className={cn("relative rounded-2xl border-2 p-6 transition-all duration-200 cursor-pointer",
        isComingSoon ? "border-border bg-muted/40 opacity-60 cursor-not-allowed"
          : isSelected ? "border-coke-red bg-coke-red/5 shadow-lg shadow-coke-red/10"
          : "border-border bg-card hover:border-coke-red/30 hover:shadow-md")}>
      {isComingSoon && (
        <div className="absolute inset-0 z-20 rounded-2xl flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
          <Badge className="bg-charcoal text-white border-0 shadow-lg px-4 py-2 text-sm gap-2">
            <Lock size={14} weight="bold" /> COMING SOON
          </Badge>
        </div>
      )}
      {option.isRecommended && !isComingSoon && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-3 -right-3 z-10">
          <Badge className="bg-coke-red text-white border-0 shadow-md px-3 py-1 text-xs">★ Best Value</Badge>
        </motion.div>
      )}
      {isSelected && !isComingSoon && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute top-4 left-4 w-6 h-6 rounded-full bg-coke-red flex items-center justify-center">
          <Check size={14} weight="bold" className="text-white" />
        </motion.div>
      )}
      <div className="text-center space-y-4">
        <div className={cn("w-14 h-14 mx-auto rounded-2xl flex items-center justify-center",
          isSelected ? "bg-coke-red text-white" : "bg-muted")}>
          <Truck size={28} weight="bold" />
        </div>
        <div>
          <h3 className="font-bold text-base font-typewriter">{info.name}</h3>
          <p className="text-xs text-muted-foreground">{info.fullName}</p>
        </div>
        <div className="py-3 border-y border-border/50">
          <p className={cn('text-3xl font-bold', isComingSoon ? 'text-muted-foreground' : 'text-coke-red')}>₹{option.price.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">incl. all taxes</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock size={14} weight="bold" /><span>{option.transitDays.min}–{option.transitDays.max} days</span>
        </div>
        {(() => {
          const facts = getCourierFacts(option.carrier);
          if (!facts) return null;
          return (
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2 text-xs"><Globe size={11} weight="bold" className="text-coke-red shrink-0" /><span>{facts.countriesOrPincodes}</span></div>
              <div className="flex items-center gap-2 text-xs"><Check size={11} weight="bold" className="text-candlestick-green shrink-0" /><span>Real-time tracking</span></div>
              <div className="flex items-center gap-2 text-xs"><Check size={11} weight="bold" className="text-candlestick-green shrink-0" /><span>{facts.speciality.split(',')[0]}</span></div>
            </div>
          );
        })()}
        {isComingSoon ? (
          <Button variant="outline" className="w-full opacity-50" disabled><Lock size={14} weight="bold" className="mr-1" /> Coming Soon</Button>
        ) : (
          <Button variant={isSelected ? "default" : "outline"}
            className={cn("w-full transition-all", isSelected && "bg-coke-red hover:bg-coke-red/90 text-white")}>
            {isSelected ? <><Check size={14} weight="bold" className="mr-1" /> Selected</> : <>Select <CaretRight size={14} weight="bold" className="ml-1" /></>}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

// ── Summary Card ──────────────────────────────────────────────────────
const SummaryCard = ({ title, price, transitLabel, onBook }: { title: string; price: number; transitLabel: string; onBook: () => void }) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
    className="relative overflow-hidden rounded-2xl bg-charcoal text-white p-8">
    <div className="absolute top-0 right-0 w-48 h-48 bg-coke-red/20 rounded-full blur-3xl pointer-events-none" />
    <div className="relative z-10 space-y-5">
      <div>
        <p className="text-white/50 text-sm">Your Selection</p>
        <h3 className="text-xl font-bold font-typewriter mt-1">{title}</h3>
      </div>
      <div className="py-4 border-y border-white/10">
        <p className="text-white/50 text-sm">Estimated Total</p>
        <p className="text-4xl font-bold mt-1">₹{price.toLocaleString('en-IN')}</p>
        <p className="text-white/30 text-xs mt-1">All fees included</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 bg-white/5">
          <Clock size={16} weight="bold" className="text-coke-red mb-1" />
          <p className="text-white/50 text-xs">Transit Time</p>
          <p className="font-semibold text-sm">{transitLabel}</p>
        </div>
        <div className="rounded-xl p-3 bg-white/5">
          <Shield size={16} weight="bold" className="text-candlestick-green mb-1" />
          <p className="text-white/50 text-xs">Insurance</p>
          <p className="font-semibold text-sm">Included</p>
        </div>
      </div>
      <Button size="lg" onClick={onBook} className="w-full h-14 text-base bg-coke-red hover:bg-coke-red/90 shadow-lg shadow-coke-red/30">
        <Package size={18} weight="bold" className="mr-2" /> Book This Shipment <ArrowRight size={18} weight="bold" className="ml-2" />
      </Button>
      <p className="text-center text-white/30 text-xs">Sign up or log in to complete your booking</p>
    </div>
  </motion.div>
);

// ── Main Component ────────────────────────────────────────────────────
const PublicRateCalculator = () => {
  const router = useRouter();
  const { getCountry } = useCountries();
  const heroRef = useRef<HTMLDivElement>(null);
  const isHeroInView = useInView(heroRef, { once: true });
  useSeo({ title: 'Calculate Rate & Transit Time | CourierX', description: 'Calculate domestic and international shipping rates from India.', canonicalPath: '/public/rate-calculator' });

  const [shippingMode, setShippingMode] = useState<ShippingMode>('domestic');
  // International
  const [destinationCountry, setDestinationCountry] = useState('');
  const [weightGrams, setWeightGrams] = useState(1000);
  const [intlShipmentType, setIntlShipmentType] = useState<'medicine' | 'document' | 'gift'>('gift');
  const [intlLength, setIntlLength] = useState(20);
  const [intlWidth, setIntlWidth] = useState(15);
  const [intlHeight, setIntlHeight] = useState(10);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  // Domestic
  const [pickupPincode, setPickupPincode] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [domesticWeightKg, setDomesticWeightKg] = useState(1);
  const [domesticLength, setDomesticLength] = useState(10);
  const [domesticWidth, setDomesticWidth] = useState(10);
  const [domesticHeight, setDomesticHeight] = useState(10);
  const [domesticCouriers, setDomesticCouriers] = useState<CourierOption[]>([]);
  const [domesticLoading, setDomesticLoading] = useState(false);
  const [domesticError, setDomesticError] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<RateTier>('express');
  const [selectedDomCourier, setSelectedDomCourier] = useState<CourierOption | null>(null);

  // International computed
  const selectedCountry = useMemo(() => destinationCountry ? getCountry(destinationCountry) : null, [destinationCountry, getCountry]);
  const isCountryServed = selectedCountry?.isServed ?? false;
  const courierOptions = useMemo(() => {
    if (!destinationCountry || !isCountryServed || weightGrams <= 0) return [];
    return getCourierOptions({ destinationCountryCode: destinationCountry, shipmentType: intlShipmentType, weightGrams, dimensions: { length: intlLength, width: intlWidth, height: intlHeight }, declaredValue: 10000 });
  }, [destinationCountry, isCountryServed, weightGrams, intlShipmentType, intlLength, intlWidth, intlHeight]);
  const eta = useMemo(() => {
    if (!destinationCountry || !isCountryServed) return null;
    return calculateETA(destinationCountry, selectedCarrier || 'DHL');
  }, [destinationCountry, selectedCarrier, isCountryServed]);
  const selectedOption = useMemo(() => {
    if (!selectedCarrier) return courierOptions.find(o => o.isRecommended && !COMING_SOON_CARRIERS.includes(o.carrier)) || courierOptions.find(o => !COMING_SOON_CARRIERS.includes(o.carrier));
    return courierOptions.find(o => o.carrier === selectedCarrier) || courierOptions[0];
  }, [courierOptions, selectedCarrier]);
  const popularCountries = ['US', 'GB', 'AE', 'CA', 'AU', 'SG'];

  // Domestic fetch
  const fetchDomesticRates = async () => {
    if (!/^\d{6}$/.test(pickupPincode) || !/^\d{6}$/.test(deliveryPincode)) return;
    setDomesticLoading(true); setDomesticError(null); setDomesticCouriers([]); setSelectedDomCourier(null);
    try {
      const res = await fetch('/api/public/domestic-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupPincode, deliveryPincode, weightKg: domesticWeightKg, lengthCm: domesticLength, widthCm: domesticWidth, heightCm: domesticHeight, declaredValue: 5000, shipmentType: 'gift' }) });
      const result = await res.json();
      if (!result.success) { setDomesticError(result.error || 'Failed to fetch rates'); return; }
      setDomesticCouriers(result.couriers || []);
      setActiveTier('express');
    } catch { setDomesticError('Network error. Please try again.'); }
    finally { setDomesticLoading(false); }
  };

  const classified = useMemo(() => classifyCouriers(domesticCouriers), [domesticCouriers]);
  const activeCouriers = classified[activeTier] || [];

  const handleBookDomCourier = (courier: CourierOption) => {
    localStorage.setItem('publicRateCalcData', JSON.stringify({
      mode: 'domestic', pickupPincode, deliveryPincode, weightKg: domesticWeightKg,
      lengthCm: domesticLength, widthCm: domesticWidth, heightCm: domesticHeight,
      shipmentType: 'gift', selectedCourier: courier, timestamp: Date.now(),
    }));
    router.push('/public/book/domestic');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingHeader />
      <main className="flex-1 relative">
        <AnimatedBackground />
        {/* Hero */}
        <section ref={heroRef} className="relative py-14 md:py-20">
          <div className="container max-w-5xl relative z-10">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={isHeroInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center space-y-5">
              <motion.div initial={{ scale: 0 }} animate={isHeroInView ? { scale: 1 } : {}} transition={{ type: 'spring', delay: 0.2 }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-coke-red/10 text-coke-red text-sm font-semibold">
                <Sparkle className="h-4 w-4" /> Rate Calculator
              </motion.div>
              <h1 className="text-3xl md:text-5xl font-bold font-typewriter">
                Calculate <span className="text-coke-red">Shipping Rates</span>
              </h1>
              <p className="text-base text-muted-foreground max-w-xl mx-auto">Instant quotes for domestic & international shipments from India</p>
              <ShippingModeToggle mode={shippingMode} onChange={setShippingMode} />
            </motion.div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container max-w-5xl relative z-10">
            {/* ═══ DOMESTIC ═══ */}
            {shippingMode === 'domestic' && (
              <motion.div key="dom" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
                <div className="rounded-2xl border-2 border-border bg-card shadow-lg p-6 md:p-8">
                  <div className="grid lg:grid-cols-2 gap-8">
                    {/* Left: Pincodes */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <div className="w-8 h-8 rounded-lg bg-coke-red/10 flex items-center justify-center">
                          <MapPin size={16} weight="bold" className="text-coke-red" />
                        </div>
                        Pickup & Delivery
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <PincodeInput value={pickupPincode} onChange={setPickupPincode} label="Pickup Pincode" />
                        <PincodeInput value={deliveryPincode} onChange={setDeliveryPincode} label="Delivery Pincode" />
                      </div>
                    </div>
                    {/* Right: Weight & Dimensions */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <div className="w-8 h-8 rounded-lg bg-coke-red/10 flex items-center justify-center">
                          <Scales size={16} weight="bold" className="text-coke-red" />
                        </div>
                        Package Details
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Weight</Label>
                        <WeightDropdown value={domesticWeightKg} onChange={setDomesticWeightKg} options={WEIGHT_OPTIONS_KG} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ l: 'L (cm)', v: domesticLength, s: setDomesticLength }, { l: 'W (cm)', v: domesticWidth, s: setDomesticWidth }, { l: 'H (cm)', v: domesticHeight, s: setDomesticHeight }].map(d => (
                          <div key={d.l} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{d.l}</Label>
                            <Input type="number" inputMode="numeric" min={1} max={150} value={d.v}
                              onChange={e => d.s(Math.max(1, Number(e.target.value) || 1))} className="font-typewriter h-10" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Check Rates */}
                  <div className="mt-6 flex justify-center">
                    <Button size="lg" onClick={fetchDomesticRates}
                      disabled={!/^\d{6}$/.test(pickupPincode) || !/^\d{6}$/.test(deliveryPincode) || domesticLoading}
                      className="h-14 px-10 text-base bg-coke-red hover:bg-coke-red/90 shadow-lg shadow-coke-red/20 gap-2">
                      {domesticLoading ? <><CircleNotch size={20} className="animate-spin" /> Checking...</> : <><Truck size={20} weight="bold" /> Check Rates</>}
                    </Button>
                  </div>
                </div>

                {domesticError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
                    <Alert variant="destructive"><Warning size={16} weight="bold" /><AlertDescription>{domesticError}</AlertDescription></Alert>
                  </motion.div>
                )}

                {/* Rate Results with Express/Economy/Saver tabs */}
                {domesticCouriers.length > 0 && (
                  <div className="mt-10 space-y-6">
                    <div className="text-center">
                      <h2 className="text-2xl md:text-3xl font-bold font-typewriter">Choose Your <span className="text-coke-red">Plan</span></h2>
                      <p className="text-muted-foreground mt-2">{pickupPincode} → {deliveryPincode} · {domesticWeightKg} kg</p>
                    </div>

                    {/* Express / Economy / Saver Tabs */}
                    <div className="flex justify-center">
                      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border">
                        {([
                          { key: 'express' as RateTier, label: 'Express', Icon: AirplaneTilt, count: classified.express.length },
                          { key: 'economy' as RateTier, label: 'Economy', Icon: Truck, count: classified.economy.length },
                          { key: 'saver' as RateTier, label: 'Saver', Icon: Package, count: classified.saver.length },
                        ]).map(tab => (
                          <button key={tab.key} onClick={() => { setActiveTier(tab.key); setSelectedDomCourier(null); }}
                            disabled={tab.count === 0}
                            className={cn(
                              "flex items-center gap-1.5 py-2.5 px-5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                              activeTier === tab.key
                                ? "bg-coke-red text-white shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}>
                            <tab.Icon size={14} weight="bold" />
                            {tab.label}
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full",
                              activeTier === tab.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                              {tab.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tier description */}
                    <div className="text-center">
                      {activeTier === 'express' && <p className="text-sm text-muted-foreground">Air delivery — fastest option, typically 1–3 business days</p>}
                      {activeTier === 'economy' && <p className="text-sm text-muted-foreground">Surface delivery — balanced speed & price, typically 3–5 business days</p>}
                      {activeTier === 'saver' && <p className="text-sm text-muted-foreground">Budget surface delivery — most affordable, typically 5–8 business days</p>}
                    </div>

                    {/* Courier Cards Grid */}
                    {activeCouriers.length > 0 ? (
                      <div className={cn(
                        "grid gap-4",
                        activeCouriers.length === 1 ? "grid-cols-1 max-w-sm mx-auto"
                          : activeCouriers.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
                          : activeCouriers.length === 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-4xl mx-auto"
                          : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                      )}>
                        {activeCouriers.map((c, i) => (
                          <DomCourierCard key={c.courier_company_id} courier={c}
                            isSelected={selectedDomCourier?.courier_company_id === c.courier_company_id}
                            onSelect={() => setSelectedDomCourier(c)} index={i}
                            onBook={() => handleBookDomCourier(c)} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        No {activeTier} options available for this route. Try another tier.
                      </div>
                    )}

                    {/* Summary */}
                    {selectedDomCourier && (
                      <div className="max-w-3xl mx-auto">
                        <SummaryCard title={selectedDomCourier.courier_name} price={selectedDomCourier.customer_price}
                          transitLabel={`By ${getEstimatedArrival(selectedDomCourier.estimated_delivery_days, selectedDomCourier.mode)}`}
                          onBook={() => handleBookDomCourier(selectedDomCourier)} />
                      </div>
                    )}
                    <p className="text-xs text-center text-muted-foreground">Prices include pickup charges. Pickup will be raised automatically after booking.</p>
                  </div>
                )}

                {/* Empty state */}
                {domesticCouriers.length === 0 && !domesticLoading && !domesticError && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
                    <div className="rounded-2xl border-2 border-dashed border-border bg-card py-14 text-center space-y-5">
                      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-20 h-20 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                        <House size={40} weight="bold" className="text-muted-foreground" />
                      </motion.div>
                      <div>
                        <h3 className="font-bold text-lg font-typewriter">Ready to Calculate?</h3>
                        <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">Enter pickup & delivery pincodes, select weight, and hit Check Rates.</p>
                      </div>
                      <div className="flex items-center justify-center gap-6 pt-2">
                        {[{ icon: House, label: 'Pan-India' }, { icon: Truck, label: 'Multiple Carriers' }, { icon: Lightning, label: 'Instant Quotes' }].map(item => (
                          <div key={item.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <item.icon size={14} weight="bold" className="text-coke-red" /><span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ═══ INTERNATIONAL ═══ */}
            {shippingMode === 'international' && (
              <motion.div key="intl" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
                <div className="rounded-2xl border-2 border-border bg-card shadow-lg p-6 md:p-8">
                  <div className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <div className="w-8 h-8 rounded-lg bg-coke-red/10 flex items-center justify-center">
                          <Package size={16} weight="bold" className="text-coke-red" />
                        </div>
                        What are you shipping?
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          { value: 'medicine' as const, label: 'Medicine', icon: Package, desc: 'Prescription medicines' },
                          { value: 'document' as const, label: 'Document', icon: FileText, desc: 'Documents & certificates' },
                          { value: 'gift' as const, label: 'Gift / Personal', icon: Gift, desc: 'Gifts, clothing, food' },
                        ]).map(opt => (
                          <motion.button key={opt.value} whileTap={{ scale: 0.97 }}
                            onClick={() => { setIntlShipmentType(opt.value); if (opt.value === 'document' && weightGrams > 1000) setWeightGrams(1000); }}
                            className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all",
                              intlShipmentType === opt.value ? "border-coke-red bg-coke-red/5 shadow-sm" : "border-border hover:border-coke-red/30")}>
                            <opt.icon size={22} weight="bold" className={intlShipmentType === opt.value ? 'text-coke-red' : 'text-muted-foreground'} />
                            <div>
                              <p className={cn('font-semibold text-sm', intlShipmentType === opt.value ? 'text-coke-red' : 'text-foreground')}>{opt.label}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-base font-semibold pt-2">
                        <div className="w-8 h-8 rounded-lg bg-coke-red/10 flex items-center justify-center">
                          <MapPin size={16} weight="bold" className="text-coke-red" />
                        </div>
                        Where are you shipping to?
                      </div>
                      <CountrySelector value={destinationCountry} onValueChange={setDestinationCountry} placeholder="Select destination country" />
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Popular destinations:</p>
                        <div className="flex flex-wrap gap-2">
                          {popularCountries.map(code => {
                            const c = getCountry(code);
                            if (!c) return null;
                            return (
                              <motion.button key={code} whileTap={{ scale: 0.95 }} onClick={() => setDestinationCountry(code)}
                                className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all",
                                  destinationCountry === code ? "border-coke-red bg-coke-red/10" : "border-border hover:border-coke-red/30")}>
                                <span className="text-lg">{c.flag}</span><span>{c.name}</span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <div className="w-8 h-8 rounded-lg bg-coke-red/10 flex items-center justify-center">
                          <Scales size={16} weight="bold" className="text-coke-red" />
                        </div>
                        Package Weight
                      </div>
                      <WeightDropdown value={weightGrams} onChange={v => { if (intlShipmentType === 'document' && v > 1000) setWeightGrams(1000); else setWeightGrams(v); }} options={WEIGHT_OPTIONS_G} />
                      {intlShipmentType === 'document' && <p className="text-xs text-amber-600 flex items-center gap-1"><Warning size={12} weight="bold" /> Documents max 1 kg</p>}
                      <div className="flex items-center gap-2 text-base font-semibold pt-2">
                        <div className="w-8 h-8 rounded-lg bg-coke-red/10 flex items-center justify-center">
                          <Cube size={16} weight="bold" className="text-coke-red" />
                        </div>
                        Dimensions (cm)
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ l: 'L', v: intlLength, s: setIntlLength }, { l: 'W', v: intlWidth, s: setIntlWidth }, { l: 'H', v: intlHeight, s: setIntlHeight }].map(d => (
                          <div key={d.l} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{d.l} (cm)</Label>
                            <Input type="number" inputMode="numeric" min={1} max={150} value={d.v}
                              onChange={e => d.s(Math.max(1, Number(e.target.value) || 1))} className="font-typewriter h-10" />
                          </div>
                        ))}
                      </div>
                      {(() => {
                        const vol = (intlLength * intlWidth * intlHeight) / 5000;
                        const actual = weightGrams / 1000;
                        return vol > actual ? <p className="text-xs text-amber-600 flex items-center gap-1"><Warning size={12} weight="bold" /> Volumetric weight ({vol.toFixed(1)} kg) exceeds actual — charged at {vol.toFixed(1)} kg</p> : null;
                      })()}
                    </div>
                  </div>
                </div>

                {destinationCountry && !isCountryServed && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
                    <Alert variant="destructive"><Warning size={16} weight="bold" /><AlertDescription>{selectedCountry?.notServedReason || 'We do not currently ship to this destination.'}</AlertDescription></Alert>
                  </motion.div>
                )}
                {destinationCountry && isCountryServed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6"><CountryRegulations countryCode={destinationCountry} /></motion.div>}
                {destinationCountry && isCountryServed && courierOptions.length > 0 && (
                  <div className="mt-10 space-y-8">
                    <div className="text-center">
                      <h2 className="text-2xl md:text-3xl font-bold font-typewriter">Choose Your <span className="text-coke-red">Carrier</span></h2>
                      <p className="text-muted-foreground mt-2">Compare rates and select the best option</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                      {courierOptions.map((option, i) => (
                        <CarrierCard key={option.carrier} option={option}
                          isSelected={(selectedCarrier === option.carrier || (!selectedCarrier && option.isRecommended && !COMING_SOON_CARRIERS.includes(option.carrier))) && !COMING_SOON_CARRIERS.includes(option.carrier)}
                          onSelect={() => { if (!COMING_SOON_CARRIERS.includes(option.carrier)) setSelectedCarrier(option.carrier); }} index={i} />
                      ))}
                    </div>
                    {selectedOption && !COMING_SOON_CARRIERS.includes(selectedOption.carrier) && (
                      <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                          <SummaryCard title={getCarrierInfo(selectedOption.carrier).fullName} price={selectedOption.price}
                            transitLabel={`${selectedOption.transitDays.min}–${selectedOption.transitDays.max} days`}
                            onBook={() => {
                              localStorage.setItem('publicRateCalcData', JSON.stringify({
                                mode: 'international', destinationCountry, weightGrams, shipmentType: intlShipmentType,
                                lengthCm: intlLength, widthCm: intlWidth, heightCm: intlHeight,
                                selectedCarrier: selectedOption?.carrier, estimatedPrice: selectedOption?.price,
                                transitDays: selectedOption?.transitDays, timestamp: Date.now(),
                              }));
                              router.push('/public/book/international');
                            }} />
                        </div>
                        <div>{eta && <ETADisplay eta={eta} />}</div>
                      </div>
                    )}
                    <ProhibitedItemsAlert countryName={selectedCountry?.name} />
                  </div>
                )}
                {(!destinationCountry || courierOptions.length === 0) && isCountryServed !== false && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
                    <div className="rounded-2xl border-2 border-dashed border-border bg-card py-14 text-center space-y-5">
                      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-20 h-20 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                        <Cube size={40} weight="bold" className="text-muted-foreground" />
                      </motion.div>
                      <div>
                        <h3 className="font-bold text-lg font-typewriter">Ready to Calculate?</h3>
                        <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">Select a destination country and package weight to see instant rates.</p>
                      </div>
                      <div className="flex items-center justify-center gap-6 pt-2">
                        {[{ icon: Globe, label: '150+ Countries' }, { icon: Truck, label: 'Top Carriers' }, { icon: Lightning, label: 'Instant Quotes' }].map(item => (
                          <div key={item.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <item.icon size={14} weight="bold" className="text-coke-red" /><span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default PublicRateCalculator;
