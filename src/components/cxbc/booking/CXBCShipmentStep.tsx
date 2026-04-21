import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pill, FileText, Gift, Star, Truck, AlertCircle } from 'lucide-react';
import { useCountries } from '@/hooks/useCountries';
import { useRateCalculator } from '@/hooks/useRateCalculator';
import { Carrier } from '@/lib/shipping/rateCalculator';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ShipmentType = 'medicine' | 'document' | 'gift';

const shipmentTypes: { value: ShipmentType; label: string; icon: typeof Pill; description: string }[] = [
  { value: 'medicine', label: 'Medicine', icon: Pill, description: 'Prescription medicines (QC required)' },
  { value: 'document', label: 'Document', icon: FileText, description: 'Documents & papers (Direct shipping)' },
  { value: 'gift', label: 'Gift/Parcel', icon: Gift, description: 'Gifts & general items (QC required)' },
];

interface CXBCShipmentStepProps {
  shipmentType: ShipmentType;
  setShipmentType: (type: ShipmentType) => void;
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  weightGrams: number;
  setWeightGrams: (weight: number) => void;
  declaredValue: number;
  setDeclaredValue: (value: number) => void;
  selectedCarrier: Carrier | null;
  setSelectedCarrier: (carrier: Carrier) => void;
  profitMarginPercent: number;
  isGstRegistered: boolean;
}

export const CXBCShipmentStep = ({
  shipmentType,
  setShipmentType,
  selectedCountry,
  setSelectedCountry,
  weightGrams,
  setWeightGrams,
  declaredValue,
  setDeclaredValue,
  selectedCarrier,
  setSelectedCarrier,
  profitMarginPercent,
  isGstRegistered,
}: CXBCShipmentStepProps) => {
  const { servedCountries } = useCountries();

  const rateData = useRateCalculator({
    destinationCountryCode: selectedCountry,
    shipmentType,
    weightGrams,
    declaredValue,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shipment Details</CardTitle>
          <CardDescription>Select shipment type and enter package details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Shipment Type */}
          <div className="space-y-3">
            <Label>Shipment Type *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {shipmentTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setShipmentType(type.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    shipmentType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <type.icon className={`h-6 w-6 mb-2 ${shipmentType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-medium">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Country Selection */}
          <div className="space-y-2">
            <Label>Destination Country *</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination country" />
              </SelectTrigger>
              <SelectContent>
                {servedCountries.filter(c => c.isServed).map((country) => (
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

          {/* Weight & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weight (grams) *</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={weightGrams}
                onChange={(e) => setWeightGrams(Number(e.target.value))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Declared Value (₹) *</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(Number(e.target.value))}
                min={0}
              />
              {declaredValue > 25000 && (
                <p className="text-xs text-destructive">Max ₹25,000 under CSB IV</p>
              )}
            </div>
          </div>

          {/* Value Cap Warning */}
          {declaredValue > 25000 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Declared value exceeds CSB IV limit of ₹25,000. Please reduce the value or contact support.
              </AlertDescription>
            </Alert>
          )}

          {/* Courier Options Table */}
          {selectedCountry && rateData.isCountryServed && rateData.courierOptions.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Select Courier
              </Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Courier</TableHead>
                      <TableHead className="text-right">Base Price</TableHead>
                      <TableHead className="text-right">Customer Price</TableHead>
                      <TableHead className="text-right">Your Profit</TableHead>
                      <TableHead className="text-center">Transit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateData.courierOptions.map((option) => {
                      const marginAmount = (option.price * profitMarginPercent) / 100;
                      const subtotal = option.price + marginAmount;
                      const gstAmount = isGstRegistered ? subtotal * 0.18 : 0;
                      const customerPrice = subtotal + gstAmount;
                      const isSelected = selectedCarrier === option.carrier || (!selectedCarrier && option.isRecommended);
                      
                      return (
                        <TableRow 
                          key={option.carrier}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                          onClick={() => setSelectedCarrier(option.carrier)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                checked={isSelected} 
                                onChange={() => setSelectedCarrier(option.carrier)}
                                className="h-4 w-4"
                              />
                              <span className="font-medium">{option.carrier}</span>
                              {option.isRecommended && (
                                <Badge className="bg-success text-success-foreground text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Best
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatCurrency(option.price)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatCurrency(customerPrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-success">
                            +{formatCurrency(marginAmount)}
                          </TableCell>
                          <TableCell className="text-center">
                            {option.transitDays.min}-{option.transitDays.max}d
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Your profit margin ({profitMarginPercent}%) is applied from settings. 
                {isGstRegistered && ' GST (18%) added to customer price.'}
              </p>
            </div>
          )}

          {!rateData.isCountryServed && selectedCountry && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {rateData.countryNotServedReason || 'This country is not currently served.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
