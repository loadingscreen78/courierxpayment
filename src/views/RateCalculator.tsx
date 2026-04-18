"use client";

import { useState, useMemo, useCallback, memo } from 'react';
import { Calculator, Package, MapPin, Scales, Clock, Truck, Warning, Info, Check, X, Star, Pill, FileText as FileDoc, Gift as GiftIcon } from '@phosphor-icons/react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CountrySelector } from '@/components/shipping/CountrySelector';
import { CountryRegulations } from '@/components/shipping/CountryRegulations';
import { ETADisplay } from '@/components/shipping/ETADisplay';
import { ProhibitedItemsAlert } from '@/components/shipping/ProhibitedItemsAlert';
import { ShippingModeToggle } from '@/components/ui/ShippingModeToggle';
import { useCountries } from '@/hooks/useCountries';
import { useSeo } from '@/hooks/useSeo';
import { getCourierOptions, Carrier } from '@/lib/shipping/rateCalculator';
import { calculateETA } from '@/lib/shipping/etaCalculator';
import { getCarrierInfo } from '@/lib/shipping/courierSelection';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';

// All carrier features for comparison
const carrierFeatures = [
  { id: 'tracking', label: 'Real-time tracking', dhl: true, fedex: true, aramex: true, shipglobal: false },
  { id: 'express', label: 'Express delivery', dhl: true, fedex: true, aramex: false, shipglobal: false },
  { id: 'temperature', label: 'Temperature controlled', dhl: true, fedex: false, aramex: false, shipglobal: false },
  { id: 'insurance', label: 'Insurance included', dhl: true, fedex: true, aramex: true, shipglobal: true },
  { id: 'customs', label: 'Customs support', dhl: true, fedex: true, aramex: true, shipglobal: false },
  { id: 'guarantee', label: 'Money-back guarantee', dhl: false, fedex: true, aramex: false, shipglobal: false },
  { id: 'doorstep', label: 'Door-to-door', dhl: true, fedex: true, aramex: true, shipglobal: true },
  { id: 'weekend', label: 'Weekend delivery', dhl: true, fedex: false, aramex: false, shipglobal: false },
];

const COMING_SOON_CARRIERS: string[] = ['ShipGlobal'];

const RateCalculator = () => {
  const router = useRouter();
  const { getCountry } = useCountries();

  useSeo({
    title: 'Shipping Rate Calculator | CourierX',
    description:
      'Shipping rate calculator for international shipping from India. Compare DHL, FedEx, Aramex and ShipGlobal rates and delivery times.',
    canonicalPath: '/rate-calculator',
  });

  // Simplified form state - only country, weight, and shipment type
  const [destinationCountry, setDestinationCountry] = useState('');
  const [weightGrams, setWeightGrams] = useState<number>(500);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [shipmentType, setShipmentType] = useState<'medicine' | 'document' | 'gift'>('gift');

  const selectedCountry = useMemo(() => {
    if (!destinationCountry) return null;
    return getCountry(destinationCountry);
  }, [destinationCountry, getCountry]);

  const isCountryServed = selectedCountry?.isServed ?? false;

  // Calculate rates for all carriers
  const courierOptions = useMemo(() => {
    if (!destinationCountry || !isCountryServed || weightGrams <= 0) return [];
    
    return getCourierOptions({
      destinationCountryCode: destinationCountry,
      shipmentType: shipmentType, // Use selected shipment type
      weightGrams,
      declaredValue: 10000, // Default value for rate calculation
    });
  }, [destinationCountry, isCountryServed, weightGrams, shipmentType]);

  // Get ETA for selected carrier
  const eta = useMemo(() => {
    if (!destinationCountry || !isCountryServed) return null;
    const carrier = selectedCarrier || 'DHL';
    return calculateETA(destinationCountry, carrier);
  }, [destinationCountry, selectedCarrier, isCountryServed]);

  const selectedOption = useMemo(() => {
    if (!selectedCarrier) return courierOptions.find(o => o.isRecommended && !COMING_SOON_CARRIERS.includes(o.carrier)) || courierOptions.find(o => !COMING_SOON_CARRIERS.includes(o.carrier));
    return courierOptions.find(o => o.carrier === selectedCarrier) || courierOptions[0];
  }, [courierOptions, selectedCarrier]);

  const handleBookNow = () => {
    // Save rate calculator data to localStorage for pre-filling booking form
    const rateCalculatorData = {
      destinationCountry,
      weightGrams,
      shipmentType, // Save the selected shipment type
      selectedCarrier: selectedOption?.carrier || 'DHL',
      estimatedPrice: selectedOption?.price || 0,
      transitDays: selectedOption?.transitDays || { min: 3, max: 5 },
      timestamp: Date.now()
    };
    
    localStorage.setItem('rateCalculatorBooking', JSON.stringify(rateCalculatorData));
    
    // Check if user is authenticated
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // User is logged in, go directly to the specific booking form
        const bookingRoutes = {
          medicine: '/book/medicine',
          document: '/book/document',
          gift: '/book/gift'
        };
        console.log('[RateCalculator] User logged in, redirecting to:', bookingRoutes[shipmentType]);
        router.push(bookingRoutes[shipmentType]);
      } else {
        // User not logged in, save return URL with shipment type and go to auth
        const bookingRoutes = {
          medicine: '/book/medicine',
          document: '/book/document',
          gift: '/book/gift'
        };
        const returnUrl = bookingRoutes[shipmentType];
        console.log('[RateCalculator] User NOT logged in, saving return URL:', returnUrl);
        localStorage.setItem('authReturnUrl', returnUrl);
        console.log('[RateCalculator] Saved authReturnUrl to localStorage:', localStorage.getItem('authReturnUrl'));
        console.log('[RateCalculator] Redirecting to /auth?panel=customer');
        router.push('/auth?panel=customer');
      }
    });
  };

  return (
    <AppLayout>
      <div className="container max-w-6xl py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Calculator size={20} weight="bold" />
            <span className="font-semibold">Rate & Transit Time</span>
          </div>
          <h1 className="text-3xl font-bold font-typewriter">Calculate Rate & Transit Time</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get instant quotes and delivery estimates. Select destination and weight.
          </p>
          <div className="flex justify-center">
            <ShippingModeToggle />
          </div>
        </div>

        {/* Simple Input Form */}
        <Card className="no-flicker">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-6 isolate-render">
              {/* Shipment Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package size={16} weight="bold" />
                  Shipment Type
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'medicine' as const, label: 'Medicine', Icon: Pill },
                    { value: 'document' as const, label: 'Document', Icon: FileDoc },
                    { value: 'gift' as const, label: 'Gift', Icon: GiftIcon }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setShipmentType(type.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                        shipmentType === type.value
                          ? "bg-primary/10 border-primary shadow-md"
                          : "bg-card border-border hover:border-primary/50"
                      )}
                    >
                      <type.Icon size={28} weight="bold" className={cn(
                        shipmentType === type.value ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        shipmentType === type.value ? "text-primary" : "text-foreground"
                      )}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin size={16} weight="bold" />
                  Destination Country
                </Label>
                <CountrySelector
                  value={destinationCountry}
                  onValueChange={setDestinationCountry}
                  placeholder="Where are you shipping to?"
                />

                <div className="flex flex-wrap gap-2">
                  {['US', 'GB', 'AE', 'CA', 'AU'].map((code) => {
                    const c = getCountry(code);
                    if (!c) return null;

                    return (
                      <Button
                        key={code}
                        type="button"
                        variant={destinationCountry === code ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDestinationCountry(code)}
                        className="gap-2"
                      >
                        <span className="text-base">{c.flag}</span>
                        <span className="text-xs">{c.name}</span>
                      </Button>
                    );
                  })}
                </div>

                {selectedCountry && isCountryServed && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span>
                      Zone {selectedCountry.zone} • {selectedCountry.region.replace('-', ' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Weight */}
              <div className="space-y-4 isolate-render" style={{ contain: 'layout style' }}>
                <Label className="flex items-center gap-2">
                  <Scales size={16} weight="bold" />
                  Package Weight
                </Label>
                
                {/* Weight Display */}
                <div className="text-center py-4 bg-muted/30 rounded-lg no-flicker">
                  <div className="text-5xl font-bold font-typewriter text-primary">
                    {weightGrams}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">grams</div>
                </div>

                {/* Weight Slider */}
                <div className="space-y-3 px-2 no-flicker">
                  <div className="relative">
                    <input
                      type="range"
                      min={100}
                      max={30000}
                      step={100}
                      value={weightGrams}
                      onChange={(e) => setWeightGrams(Number(e.target.value))}
                      className="weight-slider w-full"
                      style={{
                        '--slider-progress': `${((weightGrams - 100) / (30000 - 100)) * 100}%`
                      } as React.CSSProperties}
                    />
                  </div>
                  
                  {/* Min/Max Labels */}
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>100g</span>
                    <span className="text-primary font-bold">{weightGrams}g</span>
                    <span>30kg</span>
                  </div>
                </div>

                {/* Quick Weight Presets */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 500, label: '500g', icon: '' },
                    { value: 1000, label: '1kg', icon: '' },
                    { value: 2000, label: '2kg', icon: '' },
                    { value: 5000, label: '5kg', icon: '' }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setWeightGrams(preset.value)}
                      className={cn(
                        "rounded-xl p-4 transition-colors duration-200 border-2 no-flicker",
                        weightGrams === preset.value
                          ? "bg-primary/10 border-primary shadow-md"
                          : "bg-card border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <Scales size={28} weight="bold" className={cn(
                          weightGrams === preset.value ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className={cn(
                        "text-sm font-bold font-typewriter",
                        weightGrams === preset.value ? "text-primary" : "text-foreground"
                      )}>
                        {preset.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Country not served warning */}
        {destinationCountry && !isCountryServed && (
          <Alert variant="destructive">
            <Warning size={16} weight="bold" />
            <AlertTitle>Country not available</AlertTitle>
            <AlertDescription>
              {selectedCountry?.notServedReason || 'We do not currently ship to this destination.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Country regulations */}
        {destinationCountry && isCountryServed && (
          <CountryRegulations countryCode={destinationCountry} />
        )}

        {/* Results Section */}
        {destinationCountry && isCountryServed && courierOptions.length > 0 && (
          <>
            {/* Carrier Comparison Table - BLACK & RED MASTERPIECE */}
            <Card className="bg-gradient-to-br from-charcoal via-[#1a1a1a] to-charcoal border-coke-red/30 shadow-2xl shadow-coke-red/10 overflow-hidden">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="flex items-center gap-3 text-white">
                  <div className="p-2 rounded-lg bg-coke-red/20 border border-coke-red/30">
                    <Truck size={20} weight="bold" className="text-coke-red" />
                  </div>
                  Carrier Comparison
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Compare rates and features across all carriers
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-800 hover:bg-transparent">
                      <TableHead className="w-[180px] text-gray-400 font-semibold bg-black/40">Feature</TableHead>
                      {courierOptions.map((option) => {
                        const info = getCarrierInfo(option.carrier);
                        const isSelected = selectedCarrier === option.carrier;
                        return (
                          <TableHead 
                            key={option.carrier} 
                            className={cn(
                              "text-center min-w-[140px] cursor-pointer transition-all duration-300 border-l border-gray-800",
                              isSelected 
                                ? "bg-gradient-to-b from-coke-red/20 to-coke-red/10 border-l-coke-red/50" 
                                : "bg-black/20 hover:bg-black/40"
                            )}
                            onClick={() => setSelectedCarrier(option.carrier)}
                          >
                            <div className="space-y-2 py-2">
                              <div className="flex items-center justify-center gap-2">
                                <span className={cn(
                                  "font-bold text-base",
                                  isSelected ? "text-coke-red" : "text-white"
                                )}>{info.name}</span>
                                {option.isRecommended && (
                                  <Star size={16} weight="fill" className="text-amber-500 animate-pulse" />
                                )}
                              </div>
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-xs font-medium",
                                  isSelected 
                                    ? "bg-coke-red/30 text-coke-red border-coke-red/50" 
                                    : "bg-gray-800 text-gray-300 border-gray-700"
                                )}
                              >
                                {info.fullName.split(' ')[1] || 'Express'}
                              </Badge>
                            </div>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Price Row */}
                    <TableRow className="border-b border-gray-800 hover:bg-black/20 transition-colors">
                      <TableCell className="font-semibold text-white bg-black/40">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-coke-red"></div>
                          Price
                        </div>
                      </TableCell>
                      {courierOptions.map((option) => {
                        const isSelected = selectedCarrier === option.carrier;
                        return (
                          <TableCell 
                            key={option.carrier} 
                            className={cn(
                              "text-center border-l border-gray-800 transition-all duration-300",
                              isSelected 
                                ? "bg-gradient-to-b from-coke-red/15 to-coke-red/5 border-l-coke-red/50" 
                                : "bg-black/10"
                            )}
                          >
                            <span className={cn(
                              "text-xl font-bold font-typewriter",
                              isSelected ? "text-coke-red" : "text-white"
                            )}>
                              ₹{option.price.toLocaleString()}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>

                    {/* Transit Time Row */}
                    <TableRow className="border-b border-gray-800 hover:bg-black/20 transition-colors">
                      <TableCell className="font-semibold text-white bg-black/40">
                        <div className="flex items-center gap-2">
                          <Clock size={16} weight="bold" className="text-coke-red" />
                          Transit Time
                        </div>
                      </TableCell>
                      {courierOptions.map((option) => {
                        const isSelected = selectedCarrier === option.carrier;
                        return (
                          <TableCell 
                            key={option.carrier} 
                            className={cn(
                              "text-center border-l border-gray-800 transition-all duration-300",
                              isSelected 
                                ? "bg-gradient-to-b from-coke-red/15 to-coke-red/5 border-l-coke-red/50" 
                                : "bg-black/10"
                            )}
                          >
                            <span className={cn(
                              "font-medium",
                              isSelected ? "text-white" : "text-gray-300"
                            )}>
                              {option.transitDays.min}-{option.transitDays.max} days
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>

                    {/* Feature Rows */}
                    {carrierFeatures.map((feature, idx) => (
                      <TableRow 
                        key={feature.id} 
                        className={cn(
                          "border-b border-gray-800 hover:bg-black/20 transition-colors",
                          idx % 2 === 0 ? "bg-black/5" : "bg-transparent"
                        )}
                      >
                        <TableCell className="font-medium text-sm text-gray-300 bg-black/40">
                          {feature.label}
                        </TableCell>
                        {courierOptions.map((option) => {
                          const hasFeature = feature[option.carrier.toLowerCase() as keyof typeof feature] as boolean;
                          const isSelected = selectedCarrier === option.carrier;
                          return (
                            <TableCell 
                              key={option.carrier} 
                              className={cn(
                                "text-center border-l border-gray-800 transition-all duration-300",
                                isSelected 
                                  ? "bg-gradient-to-b from-coke-red/10 to-coke-red/5 border-l-coke-red/50" 
                                  : ""
                              )}
                            >
                              {hasFeature ? (
                                <div className="flex justify-center">
                                  <div className={cn(
                                    "p-1.5 rounded-full",
                                    isSelected ? "bg-candlestick-green/20" : "bg-candlestick-green/10"
                                  )}>
                                    <Check size={16} weight="bold" className="text-candlestick-green" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <div className="p-1.5 rounded-full bg-gray-800/50">
                                    <X size={16} weight="bold" className="text-gray-600" />
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}

                    {/* Select Button Row */}
                    <TableRow className="border-t-2 border-gray-800 bg-black/40">
                      <TableCell className="font-semibold text-white">Select Carrier</TableCell>
                      {courierOptions.map((option) => {
                        const isSelected = selectedCarrier === option.carrier;
                        const isComingSoon = COMING_SOON_CARRIERS.includes(option.carrier);
                        return (
                          <TableCell 
                            key={option.carrier} 
                            className={cn(
                              "text-center border-l border-gray-800 py-4",
                              isComingSoon && "opacity-60",
                              isSelected && !isComingSoon && "bg-gradient-to-b from-coke-red/20 to-coke-red/10 border-l-coke-red/50"
                            )}
                          >
                            {isComingSoon ? (
                              <Badge className="bg-charcoal text-white border-gray-700 px-3 py-1.5 text-xs">
                                Available Soon
                              </Badge>
                            ) : (
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedCarrier(option.carrier)}
                              className={cn(
                                "font-semibold transition-all duration-300",
                                isSelected 
                                  ? "bg-gradient-to-r from-coke-red to-red-600 hover:from-red-600 hover:to-coke-red text-white shadow-lg shadow-coke-red/30 scale-105" 
                                  : "border-gray-700 bg-gray-900 hover:bg-gray-800 hover:border-coke-red/50 text-gray-300 hover:text-white"
                              )}
                            >
                              {isSelected ? (
                                <>
                                  <Check size={16} weight="bold" className="mr-1" />
                                  Selected
                                </>
                              ) : (
                                'Select'
                              )}
                            </Button>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Summary Cards - REDESIGNED BLACK & RED MASTERPIECE */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Selected Rate - Black & Red Design */}
              <Card className="md:col-span-2 bg-gradient-to-br from-charcoal via-[#1a1a1a] to-charcoal border-coke-red/30 shadow-2xl shadow-coke-red/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">Selected Carrier</p>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-coke-red/20 border border-coke-red/30">
                          <Truck size={20} weight="bold" className="text-coke-red" />
                        </div>
                        <span className="text-2xl font-bold text-white font-typewriter">
                          {selectedOption ? getCarrierInfo(selectedOption.carrier).fullName : '—'}
                        </span>
                        {selectedOption?.isRecommended && (
                          <Badge className="gap-1 bg-coke-red/20 text-coke-red border-coke-red/50 hover:bg-coke-red/30">
                            <Star size={12} weight="fill" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                      {selectedOption && (
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-3">
                          <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-gray-800">
                            <Clock size={16} weight="bold" className="text-coke-red" />
                            {selectedOption.transitDays.min}-{selectedOption.transitDays.max} business days
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400 uppercase tracking-wider font-medium mb-1">Estimated Total</p>
                      <div className="relative">
                        <div className="absolute inset-0 bg-coke-red/20 blur-xl rounded-full"></div>
                        <p className="relative text-4xl font-bold text-coke-red font-typewriter">
                          ₹{selectedOption?.price.toLocaleString() || '—'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">incl. GST & all fees</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-800 flex gap-3">
                    <Button 
                      size="lg" 
                      className="flex-1 gap-2 bg-gradient-to-r from-coke-red to-red-600 hover:from-red-600 hover:to-coke-red text-white font-bold shadow-lg shadow-coke-red/30 hover:shadow-coke-red/50 transition-all duration-300 hover:scale-[1.02]" 
                      onClick={handleBookNow}
                    >
                      <Package size={20} weight="bold" />
                      Book Shipment
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="border-gray-700 hover:bg-gray-900 hover:border-coke-red/50 text-gray-300 hover:text-white transition-all duration-300"
                      onClick={() => router.push('/')}
                    >
                      Back to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ETA Card */}
              {eta && <ETADisplay eta={eta} />}
            </div>

            {/* Prohibited Items Reference */}
            <ProhibitedItemsAlert countryName={selectedCountry?.name} />
          </>
        )}

        {/* Empty State */}
        {(!destinationCountry || courierOptions.length === 0) && (
          <Card className="bg-muted/30">
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Calculator className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium">Select a destination to get started</p>
                <p className="text-muted-foreground">
                  Choose your destination country and package weight to see instant quotes
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Section - BLACK & RED REDESIGN */}
        <Card className="bg-gradient-to-br from-charcoal via-[#1a1a1a] to-charcoal border-coke-red/20 shadow-xl">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { icon: Check, title: 'CSB IV Compliant', desc: 'Personal use shipments' },
                { icon: Truck, title: 'Door-to-door', desc: 'Pickup to delivery' },
                { icon: Clock, title: 'Real-time Tracking', desc: 'Track your shipment 24/7' },
                { icon: Info, title: 'All-inclusive', desc: 'Customs & GST included' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-coke-red/20 to-coke-red/10 border border-coke-red/30 group-hover:border-coke-red/60 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-coke-red/30">
                    <item.icon className="h-5 w-5 text-coke-red" />
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-coke-red transition-colors duration-300">{item.title}</p>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default RateCalculator;

