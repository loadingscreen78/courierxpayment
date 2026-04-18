import { GiftBookingData } from '@/views/GiftBooking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { WalletBalanceCheck } from '@/components/booking/WalletBalanceCheck';
import { toast } from 'sonner';
import { calculateInternationalShippingCost } from '@/lib/shipping/rateCalculator';
import { getCountryByCode } from '@/lib/shipping/countries';
import { Gift, MapPin, Shield, Truck, Globe, Package, AlertTriangle } from 'lucide-react';

interface GiftReviewStepProps {
  data: GiftBookingData;
  totalValue: number;
  onConfirmBooking?: () => void;
}

const INSURANCE_PRICE = 150;
const GIFT_WRAPPING_PRICE = 100;

const getRealGiftShippingRate = (data: GiftBookingData) => {
  const weightKg = data.items.reduce((sum, item) => sum + item.units * 0.5, 0);
  const countryCode = data.consigneeAddress.country;
  const country = getCountryByCode(countryCode);
  const result = calculateInternationalShippingCost(countryCode, Math.max(weightKg, 0.5));

  if (result && country) {
    const carrierName = country.carrier === 'Aramex' ? 'Aramex Express' : 'FedEx International Priority';
    const transitDays = country.zone <= 2 ? '3-5' : country.zone <= 4 ? '5-8' : '7-12';
    return { name: carrierName, carrier: country.carrier, shippingCost: result.shippingCost, gstAmount: result.gstAmount, totalAmount: result.totalAmount, days: transitDays };
  }
  return { name: 'FedEx International Priority', carrier: 'Fedex' as const, shippingCost: 2500, gstAmount: 450, totalAmount: 2950, days: '5-8' };
};

export const GiftReviewStep = ({ data, totalValue, onConfirmBooking }: GiftReviewStepProps) => {
  const shippingRate = getRealGiftShippingRate(data);
  const countryInfo = getCountryByCode(data.consigneeAddress.country);
  const shippingPrice = shippingRate.totalAmount;
  const addonsTotal = (data.insurance ? INSURANCE_PRICE : 0) + (data.giftWrapping ? GIFT_WRAPPING_PRICE : 0);
  const grandTotal = shippingPrice + addonsTotal;

  const hasWarnings = Object.values(data.safetyChecklist).some(v => v);

  const handleConfirmBooking = () => {
    toast.success('Booking confirmed successfully!', {
      description: 'Your gift shipment has been booked.',
    });
    onConfirmBooking?.();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-typewriter text-lg font-bold">Review Your Shipment</h3>
        <p className="text-sm text-muted-foreground">Confirm all details before booking.</p>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4 text-destructive" />
            Gift Items ({data.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.items.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">{item.name || `Item ${index + 1}`}</p>
                <p className="text-xs text-muted-foreground">
                  HSN: {item.hsnCode} • Qty: {item.units}
                </p>
              </div>
              <span className="font-typewriter font-medium">
                ₹{(item.units * item.unitPrice).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-medium">Total Declared Value</span>
            <span className="font-typewriter font-bold text-lg">₹{totalValue.toLocaleString('en-IN')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Safety Warnings */}
      {hasWarnings && (
        <Card className="border-warning bg-warning/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Special Handling Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.safetyChecklist.containsBattery && <Badge variant="outline">Contains Battery</Badge>}
              {data.safetyChecklist.containsChemical && <Badge variant="outline">Contains Chemicals</Badge>}
              {data.safetyChecklist.containsLiquid && <Badge variant="outline">Contains Liquid</Badge>}
              {data.safetyChecklist.containsImitationJewellery && <Badge variant="outline">Imitation Jewellery</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-destructive" />
              Pickup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p className="font-medium">{data.pickupAddress.fullName}</p>
              <p className="text-muted-foreground">{data.pickupAddress.phone}</p>
              <p className="text-muted-foreground">{data.pickupAddress.addressLine1}</p>
              <p className="text-muted-foreground">{data.pickupAddress.city}, {data.pickupAddress.state} - {data.pickupAddress.pincode}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-destructive" />
              Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p className="font-medium">{data.consigneeAddress.fullName}</p>
              <p className="text-muted-foreground">{data.consigneeAddress.phone}</p>
              <p className="text-muted-foreground">{data.consigneeAddress.addressLine1}</p>
              <p className="text-muted-foreground">{data.consigneeAddress.city}, {data.consigneeAddress.zipcode}</p>
              <p className="font-medium">{countryInfo?.name || data.consigneeAddress.country}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipping */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4 text-destructive" />
            Shipping Option
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-accent/20 rounded-lg border border-accent">
            <div>
              <p className="font-medium">{shippingRate.name}</p>
              <p className="text-sm text-muted-foreground">Est. delivery: {shippingRate.days} business days</p>
            </div>
            <div className="text-right">
              <p className="font-typewriter font-bold text-lg">₹{shippingPrice.toLocaleString('en-IN')}</p>
              <Badge className="bg-accent text-accent-foreground">Best Value</Badge>
            </div>
          </div>
          <div className="mt-3 p-3 bg-muted/30 rounded-lg space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Base rate + Fuel surcharge</span>
              <span>₹{shippingRate.shippingCost.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST (18%)</span>
              <span>₹{shippingRate.gstAmount.toLocaleString('en-IN')}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between font-medium">
              <span>Shipping total</span>
              <span>₹{shippingRate.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add-ons */}
      {(data.insurance || data.giftWrapping) && (
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
            {data.giftWrapping && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">Gift Wrapping</span>
                </div>
                <span className="font-typewriter font-medium">₹{GIFT_WRAPPING_PRICE}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Total */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm opacity-80">
              <span>Shipping</span>
              <span>₹{shippingPrice}</span>
            </div>
            {addonsTotal > 0 && (
              <div className="flex justify-between text-sm opacity-80">
                <span>Add-ons</span>
                <span>₹{addonsTotal}</span>
              </div>
            )}
            <Separator className="bg-primary-foreground/20" />
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total to Pay</span>
              <span className="font-typewriter text-2xl font-bold">₹{grandTotal}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Balance Check */}
      <WalletBalanceCheck
        totalAmount={grandTotal}
        onProceed={handleConfirmBooking}
        shippingCost={shippingPrice}
        addonsTotal={addonsTotal}
        carrierName={shippingRate.name}
        billItems={[
          { label: `Shipping (${shippingRate.name})`, amount: shippingPrice },
          ...(data.insurance ? [{ label: 'Shipment Insurance', amount: INSURANCE_PRICE }] : []),
          ...(data.giftWrapping ? [{ label: 'Gift Wrapping', amount: GIFT_WRAPPING_PRICE }] : []),
        ]}
      />
    </div>
  );
};

