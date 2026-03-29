import { format } from 'date-fns';
import { MedicineBookingData } from '@/views/MedicineBooking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { WalletBalanceCheck } from '@/components/booking/WalletBalanceCheck';
import { toast } from 'sonner';
import { 
  Pill, 
  MapPin, 
  FileText, 
  Shield, 
  Package, 
  Clock, 
  IndianRupee,
  Truck,
  Globe,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface ReviewStepProps {
  data: MedicineBookingData;
  aggregatedSupplyDays: number;
  aggregatedTotalValue: number;
  onConfirmBooking?: () => void;
}

// Mock courier options based on destination
const COMING_SOON_COURIERS = ['Aramex', 'ShipGlobal Economy'];

const getCourierOptions = (country: string) => {
  const options = [
    { name: 'DHL Express', price: 2450, days: '3-5', recommended: country.startsWith('DE') || country.startsWith('GB') || country.startsWith('FR') || country.startsWith('NL') },
    { name: 'FedEx International', price: 2200, days: '4-6', recommended: country.startsWith('US') || country.startsWith('CA') },
    { name: 'Aramex', price: 1850, days: '5-7', recommended: false, comingSoon: true },
    { name: 'ShipGlobal Economy', price: 1450, days: '7-10', recommended: false, comingSoon: true },
  ];
  return options;
};

const COUNTRY_NAMES: Record<string, string> = {
  'US': 'United States',
  'GB': 'United Kingdom',
  'DE': 'Germany',
  'FR': 'France',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'SG': 'Singapore',
  'AU': 'Australia',
  'CA': 'Canada',
  'NL': 'Netherlands',
  'QA': 'Qatar',
  'KW': 'Kuwait',
  'OM': 'Oman',
  'BH': 'Bahrain',
};

const INSURANCE_PRICE = 150;
const SPECIAL_PACKAGING_PRICE = 200;

export const ReviewStep = ({ data, aggregatedSupplyDays, aggregatedTotalValue, onConfirmBooking }: ReviewStepProps) => {
  const courierOptions = getCourierOptions(data.consigneeAddress.country);
  const recommendedCourier = courierOptions.find(c => c.recommended && !c.comingSoon) || courierOptions.find(c => !c.comingSoon) || courierOptions[0];

  const addonsTotal = (data.insurance ? INSURANCE_PRICE : 0) + (data.specialPackaging ? SPECIAL_PACKAGING_PRICE : 0);
  const shippingCost = recommendedCourier.price;
  const grandTotal = shippingCost + addonsTotal;

  const hasControlledSubstance = data.medicines.some(m => m.isControlled);

  const handleConfirmBooking = () => {
    toast.success('Booking confirmed successfully!', {
      description: 'Your medicine shipment has been booked.',
    });
    onConfirmBooking?.();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-typewriter text-lg font-bold">Review Your Shipment</h3>
        <p className="text-sm text-muted-foreground">
          Please review all details before confirming your booking.
        </p>
      </div>

      {/* Medicines Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4 text-destructive" />
            Medicines ({data.medicines.length} item{data.medicines.length > 1 ? 's' : ''})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Individual Medicines */}
          <div className="space-y-3">
            {data.medicines.map((medicine, index) => {
              const supplyDays = medicine.dailyDosage > 0 
                ? Math.ceil(medicine.unitCount / medicine.dailyDosage) 
                : 0;
              const value = medicine.unitCount * medicine.unitPrice;

              return (
                <div 
                  key={medicine.id} 
                  className="p-3 bg-muted/50 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                      <span className="font-medium">{medicine.medicineName}</span>
                      {medicine.isControlled && (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning text-xs">
                          Controlled
                        </Badge>
                      )}
                    </div>
                    <span className="font-typewriter font-medium">
                      ₹{value.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <span>Type: <span className="text-foreground capitalize">{medicine.medicineType}</span></span>
                    <span>Form: <span className="text-foreground capitalize">{medicine.form}</span></span>
                    <span>Qty: <span className="text-foreground">{medicine.unitCount} units</span></span>
                    <span>Supply: <span className="text-foreground">{supplyDays} days</span></span>
                  </div>
                  {(medicine.mfgDate || medicine.expiryDate) && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {medicine.mfgDate && <span>MFG: {format(medicine.mfgDate, 'dd MMM yyyy')}</span>}
                      {medicine.expiryDate && <span>EXP: {format(medicine.expiryDate, 'dd MMM yyyy')}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <Separator />
          
          {/* Aggregated Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-accent/30 rounded-lg">
              <Clock className="h-4 w-4" />
              <div>
                <p className="text-xs text-muted-foreground">Max Supply Duration</p>
                <p className="font-typewriter font-bold">{aggregatedSupplyDays} days</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-accent/30 rounded-lg">
              <IndianRupee className="h-4 w-4" />
              <div>
                <p className="text-xs text-muted-foreground">Total Declared Value</p>
                <p className="font-typewriter font-bold">₹{aggregatedTotalValue.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {hasControlledSubstance && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm">This shipment contains controlled substances</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-destructive" />
              Pickup Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p className="font-medium">{data.pickupAddress.fullName}</p>
              <p className="text-muted-foreground">{data.pickupAddress.phone}</p>
              <p className="text-muted-foreground">
                {data.pickupAddress.addressLine1}
                {data.pickupAddress.addressLine2 && `, ${data.pickupAddress.addressLine2}`}
              </p>
              <p className="text-muted-foreground">
                {data.pickupAddress.city}, {data.pickupAddress.state} - {data.pickupAddress.pincode}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-destructive" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p className="font-medium">{data.consigneeAddress.fullName}</p>
              <p className="text-muted-foreground">{data.consigneeAddress.phone}</p>
              <p className="text-muted-foreground">
                {data.consigneeAddress.addressLine1}
                {data.consigneeAddress.addressLine2 && `, ${data.consigneeAddress.addressLine2}`}
              </p>
              <p className="text-muted-foreground">
                {data.consigneeAddress.city}, {data.consigneeAddress.zipcode}
              </p>
              <p className="font-medium">
                {COUNTRY_NAMES[data.consigneeAddress.country] || data.consigneeAddress.country}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-destructive" />
            Uploaded Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Prescription', file: data.prescription },
              { label: 'Pharmacy Bill', file: data.pharmacyBill },
              { label: 'Consignee ID', file: data.consigneeId },
            ].map((doc) => (
              <div key={doc.label} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{doc.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {doc.file?.name || 'Not uploaded'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shipping Option */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4 text-destructive" />
            Recommended Shipping
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-accent/20 rounded-lg border border-accent">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center font-typewriter font-bold text-sm">
                {recommendedCourier.name.split(' ')[0].slice(0, 3).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{recommendedCourier.name}</p>
                <p className="text-sm text-muted-foreground">
                  Est. delivery: {recommendedCourier.days} business days
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-typewriter font-bold text-lg">₹{recommendedCourier.price}</p>
              <Badge className="bg-accent text-accent-foreground">Recommended</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add-ons */}
      {(data.insurance || data.specialPackaging) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selected Add-ons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.insurance && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Shipment Insurance</span>
                </div>
                <span className="font-typewriter font-medium">₹{INSURANCE_PRICE}</span>
              </div>
            )}
            {data.specialPackaging && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">Special Packaging</span>
                </div>
                <span className="font-typewriter font-medium">₹{SPECIAL_PACKAGING_PRICE}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cost Summary */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm opacity-80">
              <span>Shipping ({recommendedCourier.name})</span>
              <span>₹{shippingCost.toLocaleString('en-IN')}</span>
            </div>
            {addonsTotal > 0 && (
              <div className="flex justify-between text-sm opacity-80">
                <span>Add-ons</span>
                <span>₹{addonsTotal.toLocaleString('en-IN')}</span>
              </div>
            )}
            <Separator className="bg-primary-foreground/20" />
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total to Pay</span>
              <span className="font-typewriter text-2xl font-bold">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Balance Check */}
      <WalletBalanceCheck totalAmount={grandTotal} onProceed={handleConfirmBooking} />
    </div>
  );
};

