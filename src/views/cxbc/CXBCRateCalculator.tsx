"use client";

import { useState } from 'react';
import { CXBCLayout } from '@/components/cxbc/layout';
import { useCXBCAuth } from '@/hooks/useCXBCAuth';
import { useRateCalculator } from '@/hooks/useRateCalculator';
import { useCountries } from '@/hooks/useCountries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  CheckCircle,
  ArrowRight,
  Truck,
  Clock,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { Carrier } from '@/lib/shipping/rateCalculator';

type ShipmentType = 'medicine' | 'document' | 'gift';

const shipmentTypes: { value: ShipmentType; label: string; icon: typeof Pill }[] = [
  { value: 'medicine', label: 'Medicine', icon: Pill },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'gift', label: 'Gift/Parcel', icon: Gift },
];

export default function CXBCRateCalculator() {
  const { partner } = useCXBCAuth();
  const { servedCountries: countries } = useCountries();
  
  const [selectedCountry, setSelectedCountry] = useState('');
  const [shipmentType, setShipmentType] = useState<ShipmentType>('medicine');
  const [weightGrams, setWeightGrams] = useState(500);
  const [declaredValue, setDeclaredValue] = useState(5000);
  const [profitMargin, setProfitMargin] = useState(partner?.profit_margin_percent || 20);

  const rateData = useRateCalculator({
    destinationCountryCode: selectedCountry,
    shipmentType,
    weightGrams,
    declaredValue,
    dimensions: undefined,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCustomerPrice = (basePrice: number) => {
    const marginAmount = (basePrice * profitMargin) / 100;
    return basePrice + marginAmount;
  };

  const getProfit = (basePrice: number) => {
    return (basePrice * profitMargin) / 100;
  };

  return (
    <CXBCLayout title="Rate Calculator" subtitle="Calculate shipping rates with your profit margin">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Shipment Details
            </CardTitle>
            <CardDescription>Enter shipment details to calculate rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Country Selection */}
            <div className="space-y-2">
              <Label>Destination Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.filter(c => c.isServed).map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shipment Type */}
            <div className="space-y-2">
              <Label>Shipment Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {shipmentTypes.map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={shipmentType === type.value ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-3 gap-1"
                    onClick={() => setShipmentType(type.value)}
                  >
                    <type.icon className="h-5 w-5" />
                    <span className="text-xs">{type.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label>Weight (grams)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={weightGrams}
                onChange={(e) => setWeightGrams(Number(e.target.value))}
                min={1}
                max={30000}
              />
              <p className="text-xs text-muted-foreground">
                {(weightGrams / 1000).toFixed(2)} kg
              </p>
            </div>

            {/* Declared Value */}
            <div className="space-y-2">
              <Label>Declared Value (₹)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(Number(e.target.value))}
                min={0}
              />
              {!rateData.isCompliant && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {rateData.complianceMessage}
                </p>
              )}
            </div>

            {/* Profit Margin Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Your Profit Margin</Label>
                <Badge variant="outline" className="text-lg font-bold">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {profitMargin}%
                </Badge>
              </div>
              <Slider
                value={[profitMargin]}
                onValueChange={(value) => setProfitMargin(value[0])}
                min={0}
                max={200}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% (No Margin)</span>
                <span>100%</span>
                <span>200% (Max)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {/* Courier Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                All Courier Options
              </CardTitle>
              <CardDescription>Compare prices and transit times across all carriers</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedCountry ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a destination country to see rates</p>
                </div>
              ) : !rateData.isCountryServed ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
                  <p className="text-destructive">Country not served</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {rateData.countryNotServedReason}
                  </p>
                </div>
              ) : rateData.courierOptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No courier options available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Courier</TableHead>
                        <TableHead className="text-right">Base Price</TableHead>
                        <TableHead className="text-right">Your Profit</TableHead>
                        <TableHead className="text-right">Customer Price</TableHead>
                        <TableHead className="text-center">Transit</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rateData.courierOptions.map((option) => {
                        const customerPrice = getCustomerPrice(option.price);
                        const profit = getProfit(option.price);
                        
                        return (
                          <TableRow 
                            key={option.carrier}
                            className={option.isRecommended ? 'bg-success/5' : ''}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{option.carrier}</span>
                                {option.isRecommended && (
                                  <Badge className="bg-success text-success-foreground text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    Best
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                                {option.features.slice(0, 2).map((f, i) => (
                                  <span key={i} className="bg-muted px-1.5 py-0.5 rounded">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(option.price)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-success">
                              +{formatCurrency(profit)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {formatCurrency(customerPrice)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1 text-sm">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {option.transitDays.min}-{option.transitDays.max}d
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" asChild>
                                <Link href={`/cxbc/book?type=${shipmentType}&country=${selectedCountry}&weight=${weightGrams}&value=${declaredValue}&margin=${profitMargin}&carrier=${option.carrier}`}>
                                  Book
                                  <ArrowRight className="ml-1 h-3 w-3" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Summary */}
          {selectedCountry && rateData.isCountryServed && rateData.selectedCourier && (
            <Card className="bg-success/10 border-success/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-success text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Best Option Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Recommended Carrier</p>
                    <p className="font-bold text-lg">{rateData.selectedCourier.carrier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Profit</p>
                    <p className="font-bold text-lg text-success">
                      {formatCurrency(getProfit(rateData.selectedCourier.price))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Pays</p>
                    <p className="font-bold text-lg">
                      {formatCurrency(getCustomerPrice(rateData.selectedCourier.price))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ETA</p>
                    <p className="font-bold text-lg">{rateData.etaRange}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Button asChild className="w-full" size="lg">
                    <Link href={`/cxbc/book?type=${shipmentType}&country=${selectedCountry}&weight=${weightGrams}&value=${declaredValue}&margin=${profitMargin}`}>
                      Book with {rateData.selectedCourier.carrier}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </CXBCLayout>
  );
}


