"use client";

import { useState, useMemo } from 'react';
import { CXBCLayout } from '@/components/cxbc/layout';
import { useCXBCAuth } from '@/hooks/useCXBCAuth';
import { useRateCalculator } from '@/hooks/useRateCalculator';
import { useCountries } from '@/hooks/useCountries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calculator,
  Package,
  FileText,
  Gift,
  Pill,
  TrendingUp,
  IndianRupee,
  AlertCircle,
  ArrowRight,
  Truck,
  Clock,
  Star,
  Laptop,
  MapPin,
  Globe,
  Scale,
  Ruler,
  Info,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Carrier } from '@/lib/shipping/rateCalculator';
import type { DomesticShipmentType } from '@/lib/domestic/types';
import { DOMESTIC_LIMITS, DOCUMENT_WEIGHT_SLABS } from '@/lib/domestic/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type IntlShipmentType = 'medicine' | 'document' | 'gift';
type CalcMode = 'domestic' | 'international';

interface DomesticCourier {
  courier_company_id: number;
  courier_name: string;
  customer_price: number;
  shipping_charge: number;
  gst_amount: number;
  estimated_delivery_days: number;
  mode: 'air' | 'surface';
  is_recommended?: boolean;
  rating?: number;
}

// ─── Domestic Rate Calculator ─────────────────────────────────────────────────

function DomesticRateCalculator({ partner }: { partner: any }) {
  const [shipmentType, setShipmentType] = useState<DomesticShipmentType>('document');
  const [weightKg, setWeightKg] = useState(0.5);
  const [lengthCm, setLengthCm] = useState(25);
  const [widthCm, setWidthCm] = useState(20);
  const [heightCm, setHeightCm] = useState(5);
  const [pickupPincode, setPickupPincode] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [couriers, setCouriers] = useState<DomesticCourier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profitMargin, setProfitMargin] = useState(partner?.profit_margin_percent || 20);

  const limits = DOMESTIC_LIMITS[shipmentType];

  const volWeightKg = useMemo(() => (lengthCm * widthCm * heightCm) / 5000, [lengthCm, widthCm, heightCm]);
  const chargeableWeight = Math.max(weightKg, volWeightKg);
  const isVolumetric = volWeightKg > weightKg;

  const handleTypeChange = (type: DomesticShipmentType) => {
    const newLimits = DOMESTIC_LIMITS[type];
    setShipmentType(type);
    setWeightKg(Math.min(weightKg, newLimits.maxWeightKg));
  };

  const fetchRates = async () => {
    if (!/^\d{6}$/.test(pickupPincode) || !/^\d{6}$/.test(deliveryPincode)) return;
    setLoading(true);
    setError(null);
    setCouriers([]);
    try {
      const res = await fetch('/api/public/domestic-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupPincode, deliveryPincode,
          weightKg: chargeableWeight,
          lengthCm, widthCm, heightCm,
          declaredValue: 5000,
          shipmentType,
        }),
      });
      const result = await res.json();
      if (!result.success) { setError(result.error || 'Failed to fetch rates'); return; }
      setCouriers(result.couriers || []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCustomerPrice = (base: number) => base + (base * profitMargin) / 100;
  const getProfit = (base: number) => (base * profitMargin) / 100;
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const SHIPMENT_TYPES = [
    { type: 'document' as const, icon: FileText, label: 'Documents', desc: 'Up to 1 kg', emoji: '📄' },
    { type: 'gift' as const, icon: Gift, label: 'Gift / Parcel', desc: 'Up to 60 kg', emoji: '🎁' },
    { type: 'laptop' as const, icon: Laptop, label: 'Laptop', desc: 'Up to 5 kg', emoji: '💻' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-5">
          {/* Shipment Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Shipment Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {SHIPMENT_TYPES.map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => handleTypeChange(opt.type)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center',
                      shipmentType === opt.type
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/30'
                    )}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div>
                      <p className={cn('font-semibold text-xs', shipmentType === opt.type ? 'text-primary' : 'text-foreground')}>{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pincodes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Pickup & Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Pickup Pincode</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 400001"
                    value={pickupPincode}
                    onChange={e => setPickupPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={cn('font-mono', pickupPincode.length === 6 && 'border-emerald-500')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Delivery Pincode</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 110001"
                    value={deliveryPincode}
                    onChange={e => setDeliveryPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={cn('font-mono', deliveryPincode.length === 6 && 'border-emerald-500')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weight */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Package Weight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shipmentType === 'document' ? (
                <div className="grid grid-cols-4 gap-2">
                  {DOCUMENT_WEIGHT_SLABS.map(slab => (
                    <button
                      key={slab.value}
                      onClick={() => setWeightKg(slab.value)}
                      className={cn(
                        'p-3 rounded-xl border-2 text-center transition-all',
                        weightKg === slab.value ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'
                      )}
                    >
                      <p className={cn('font-bold font-mono text-base', weightKg === slab.value ? 'text-primary' : 'text-foreground')}>{slab.label}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center py-2 bg-muted/30 rounded-lg">
                    <span className="text-3xl font-bold font-mono text-primary">{weightKg}</span>
                    <span className="text-sm text-muted-foreground ml-1">kg</span>
                  </div>
                  <Slider
                    value={[weightKg]}
                    onValueChange={([v]) => setWeightKg(v)}
                    min={0.5}
                    max={shipmentType === 'laptop' ? 5 : 60}
                    step={0.5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.5 kg</span>
                    <span>{shipmentType === 'laptop' ? '5 kg' : '60 kg'}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(shipmentType === 'laptop' ? [1, 1.5, 2, 2.5] : [1, 5, 10, 25]).map(w => (
                      <button
                        key={w}
                        onClick={() => setWeightKg(w)}
                        className={cn(
                          'py-2 rounded-lg border text-sm font-medium transition-all',
                          weightKg === w ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
                        )}
                      >
                        {w} kg
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dimensions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                Dimensions (cm)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: 'Length', val: lengthCm, set: setLengthCm },
                  { label: 'Width', val: widthCm, set: setWidthCm },
                  { label: 'Height', val: heightCm, set: setHeightCm },
                ] as const).map(dim => (
                  <div key={dim.label} className="space-y-1.5">
                    <Label className="text-xs">{dim.label}</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={150}
                      value={dim.val}
                      onChange={e => dim.set(Math.max(1, Number(e.target.value) || 1))}
                      className="font-mono"
                    />
                  </div>
                ))}
              </div>
              {isVolumetric && (
                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <AlertDescription className="text-xs text-amber-600">
                    Volumetric weight ({volWeightKg.toFixed(2)} kg) exceeds actual — charged at {volWeightKg.toFixed(2)} kg
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Profit Margin */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Your Profit Margin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margin applied to base rate</span>
                <Badge variant="outline" className="text-base font-bold font-mono">{profitMargin}%</Badge>
              </div>
              <Slider value={[profitMargin]} onValueChange={([v]) => setProfitMargin(v)} min={0} max={200} step={5} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span><span>100%</span><span>200%</span>
              </div>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full gap-2"
            onClick={fetchRates}
            disabled={!/^\d{6}$/.test(pickupPincode) || !/^\d{6}$/.test(deliveryPincode) || loading}
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking Rates...</> : <><Calculator className="h-4 w-4" /> Check Rates</>}
          </Button>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {couriers.length === 0 && !loading && !error && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                  <Truck className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-semibold">Ready to Calculate</p>
                <p className="text-sm text-muted-foreground">Enter pincodes and hit Check Rates to compare carriers</p>
              </CardContent>
            </Card>
          )}

          {couriers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{couriers.length} carriers found</p>
                <p className="text-xs text-muted-foreground">{pickupPincode} → {deliveryPincode} · {chargeableWeight} kg</p>
              </div>
              {couriers.map((c, i) => {
                const customerPrice = getCustomerPrice(c.customer_price);
                const profit = getProfit(c.customer_price);
                return (
                  <Card key={c.courier_company_id} className={cn(
                    'transition-all hover:shadow-md',
                    c.is_recommended && 'border-primary/40 bg-primary/5'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{c.courier_name}</span>
                            {c.is_recommended && (
                              <Badge className="bg-primary text-primary-foreground text-[10px] gap-1">
                                <Star className="h-2.5 w-2.5" /> Best
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] capitalize">{c.mode}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Base</p>
                              <p className="font-mono font-medium">{fmt(c.customer_price)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Your Profit</p>
                              <p className="font-mono font-medium text-emerald-600">+{fmt(profit)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Customer Pays</p>
                              <p className="font-mono font-bold">{fmt(customerPrice)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{c.estimated_delivery_days} day{c.estimated_delivery_days !== 1 ? 's' : ''} est. delivery</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/cxbc/book?type=domestic&shipmentType=${shipmentType}&pickup=${pickupPincode}&delivery=${deliveryPincode}&weight=${chargeableWeight}`}>
                            Book <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── International Rate Calculator ───────────────────────────────────────────

function InternationalRateCalculator({ partner }: { partner: any }) {
  const { servedCountries: countries } = useCountries();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [shipmentType, setShipmentType] = useState<IntlShipmentType>('medicine');
  const [weightGrams, setWeightGrams] = useState(500);
  const [declaredValue, setDeclaredValue] = useState(5000);
  const [profitMargin, setProfitMargin] = useState(partner?.profit_margin_percent || 20);

  // Medicine unit calculator state
  const [unitCount, setUnitCount] = useState(0);
  const [dailyDosage, setDailyDosage] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const supplyDays = dailyDosage > 0 ? Math.ceil(unitCount / dailyDosage) : 0;
  const totalMedValue = unitCount * unitPrice;
  const isOver90Days = supplyDays > 90;
  const isOverValueCap = totalMedValue > 25000;

  const rateData = useRateCalculator({
    destinationCountryCode: selectedCountry,
    shipmentType,
    weightGrams,
    declaredValue,
  });

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const getCustomerPrice = (base: number) => base + (base * profitMargin) / 100;
  const getProfit = (base: number) => (base * profitMargin) / 100;

  const INTL_TYPES = [
    { value: 'medicine' as const, icon: Pill, label: 'Medicine', desc: 'Prescription medicines', emoji: '💊' },
    { value: 'document' as const, icon: FileText, label: 'Document', desc: 'Docs & certificates', emoji: '📄' },
    { value: 'gift' as const, icon: Gift, label: 'Gift / Parcel', desc: 'Gifts, clothing, food', emoji: '🎁' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-5">
          {/* Shipment Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                What are you shipping?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {INTL_TYPES.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setShipmentType(opt.value);
                      if (opt.value === 'document' && weightGrams > 1000) setWeightGrams(1000);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center',
                      shipmentType === opt.value ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'
                    )}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div>
                      <p className={cn('font-semibold text-xs', shipmentType === opt.value ? 'text-primary' : 'text-foreground')}>{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Medicine Unit Calculator — shown only for medicine type */}
          {shipmentType === 'medicine' && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  Medicine Unit Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Instructions */}
                <Alert className="border-blue-500/30 bg-blue-500/5">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  <AlertDescription className="text-xs text-blue-700 space-y-1">
                    <p className="font-semibold">Shipping Rules for Medicines:</p>
                    <ul className="list-disc list-inside space-y-0.5 mt-1">
                      <li>Maximum <strong>90-day supply</strong> per medicine (CSB IV regulation)</li>
                      <li>Maximum declared value of <strong>₹25,000</strong> per shipment</li>
                      <li>Medicines must have at least <strong>6 months shelf life</strong> remaining</li>
                      <li>Prescription, pharmacy bill & consignee ID are mandatory</li>
                      <li>Controlled/narcotic drugs are <strong>not permitted</strong></li>
                    </ul>
                  </AlertDescription>
                </Alert>

                {/* Unit inputs */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Total Units</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="e.g. 60"
                      value={unitCount || ''}
                      onChange={e => setUnitCount(parseInt(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Price / Unit (₹)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0.01}
                      step={0.01}
                      placeholder="e.g. 15.50"
                      value={unitPrice || ''}
                      onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Daily Dosage (units)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="e.g. 2"
                      value={dailyDosage || ''}
                      onChange={e => setDailyDosage(parseInt(e.target.value) || 1)}
                      className="font-mono"
                    />
                  </div>
                </div>

                {/* Supply & Value indicators */}
                {unitCount > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border text-sm',
                      isOver90Days ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                    )}>
                      <Clock className="h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-xs opacity-70">Supply Duration</p>
                        <p className="font-mono font-bold">{supplyDays} days {isOver90Days && <span className="text-xs font-normal">(Max 90)</span>}</p>
                      </div>
                      {isOver90Days ? <AlertTriangle className="h-4 w-4 ml-auto shrink-0" /> : <CheckCircle2 className="h-4 w-4 ml-auto shrink-0" />}
                    </div>
                    <div className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border text-sm',
                      isOverValueCap ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                    )}>
                      <IndianRupee className="h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-xs opacity-70">Total Value</p>
                        <p className="font-mono font-bold">₹{totalMedValue.toLocaleString('en-IN')} {isOverValueCap && <span className="text-xs font-normal">(Max ₹25K)</span>}</p>
                      </div>
                      {isOverValueCap ? <AlertTriangle className="h-4 w-4 ml-auto shrink-0" /> : <CheckCircle2 className="h-4 w-4 ml-auto shrink-0" />}
                    </div>
                  </div>
                )}

                {(isOver90Days || isOverValueCap) && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {isOver90Days && <p>Supply exceeds 90-day limit. Reduce unit count or increase daily dosage.</p>}
                      {isOverValueCap && <p>Total value exceeds ₹25,000 CSB IV limit. Reduce units or unit price.</p>}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Weight hint */}
                {unitCount > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Enter the actual package weight below after packing all medicines
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Destination */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Destination Country
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.filter(c => c.isServed).map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Weight */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Package Weight (grams)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="number"
                inputMode="numeric"
                value={weightGrams}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (shipmentType === 'document' && v > 1000) setWeightGrams(1000);
                  else setWeightGrams(v);
                }}
                min={1}
                max={30000}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">{(weightGrams / 1000).toFixed(2)} kg</p>
              {shipmentType === 'document' && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Documents max 1 kg
                </p>
              )}
            </CardContent>
          </Card>

          {/* Declared Value */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                Declared Value (₹)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                type="number"
                inputMode="numeric"
                value={declaredValue}
                onChange={e => setDeclaredValue(Number(e.target.value))}
                min={0}
                className="font-mono"
              />
              {!rateData.isCompliant && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {rateData.complianceMessage}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Profit Margin */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Your Profit Margin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Applied to base rate</span>
                <Badge variant="outline" className="text-base font-bold font-mono">{profitMargin}%</Badge>
              </div>
              <Slider value={[profitMargin]} onValueChange={([v]) => setProfitMargin(v)} min={0} max={200} step={5} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span><span>100%</span><span>200%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {!selectedCountry && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-semibold">Select a Destination</p>
                <p className="text-sm text-muted-foreground">Choose a country to see available carriers and rates</p>
              </CardContent>
            </Card>
          )}

          {selectedCountry && !rateData.isCountryServed && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{rateData.countryNotServedReason || 'This country is not currently served.'}</AlertDescription>
            </Alert>
          )}

          {selectedCountry && rateData.isCountryServed && rateData.courierOptions.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground text-sm">No courier options available for this route</p>
              </CardContent>
            </Card>
          )}

          {selectedCountry && rateData.isCountryServed && rateData.courierOptions.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">{rateData.courierOptions.length} carriers available</p>
              {rateData.courierOptions.map(option => {
                const customerPrice = getCustomerPrice(option.price);
                const profit = getProfit(option.price);
                return (
                  <Card key={option.carrier} className={cn(
                    'transition-all hover:shadow-md',
                    option.isRecommended && 'border-primary/40 bg-primary/5'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{option.carrier}</span>
                            {option.isRecommended && (
                              <Badge className="bg-primary text-primary-foreground text-[10px] gap-1">
                                <Star className="h-2.5 w-2.5" /> Best
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Base</p>
                              <p className="font-mono font-medium">{fmt(option.price)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Your Profit</p>
                              <p className="font-mono font-medium text-emerald-600">+{fmt(profit)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Customer Pays</p>
                              <p className="font-mono font-bold">{fmt(customerPrice)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{option.transitDays.min}–{option.transitDays.max} days transit</span>
                          </div>
                          {option.features.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {option.features.slice(0, 3).map((f, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{f}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/cxbc/book?type=${shipmentType}&country=${selectedCountry}&weight=${weightGrams}&value=${declaredValue}&margin=${profitMargin}&carrier=${option.carrier}`}>
                            Book <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Best option summary */}
              {rateData.selectedCourier && (
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Best Option</p>
                        <p className="font-bold">{rateData.selectedCourier.carrier}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Customer pays {fmt(getCustomerPrice(rateData.selectedCourier.price))} · Your profit {fmt(getProfit(rateData.selectedCourier.price))}
                        </p>
                      </div>
                      <Button asChild>
                        <Link href={`/cxbc/book?type=${shipmentType}&country=${selectedCountry}&weight=${weightGrams}&value=${declaredValue}&margin=${profitMargin}`}>
                          Book Now <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CXBCRateCalculator() {
  const { partner } = useCXBCAuth();
  const [mode, setMode] = useState<CalcMode>('international');

  return (
    <CXBCLayout title="Rate Calculator" subtitle="Calculate shipping rates with your profit margin">
      {/* Mode Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border">
          {([
            { key: 'domestic' as const, icon: Truck, label: 'Domestic', desc: 'Pan-India' },
            { key: 'international' as const, icon: Globe, label: 'International', desc: 'Worldwide' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={cn(
                'flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
                mode === tab.key
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className={cn('h-4 w-4', mode === tab.key ? 'text-primary' : '')} />
              <span>{tab.label}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-normal',
                mode === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>{tab.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === 'domestic' && <DomesticRateCalculator partner={partner} />}
      {mode === 'international' && <InternationalRateCalculator partner={partner} />}
    </CXBCLayout>
  );
}
