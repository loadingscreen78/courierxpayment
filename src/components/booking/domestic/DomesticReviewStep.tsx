import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, MapPin, Truck, Wallet, FileText, Gift } from 'lucide-react';
import { WalletBalanceCheck } from '@/components/booking/WalletBalanceCheck';
import type { DomesticBookingData } from '@/lib/domestic/types';

interface Props {
  data: DomesticBookingData;
}

const DomesticReviewStepComponent = ({ data }: Props) => {
  const courier = data.selectedCourier;
  if (!courier) return null;

  const TypeIcon = data.shipmentType === 'document' ? FileText : Gift;

  return (
    <div className="space-y-4">
      {/* Package Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-coke-red" />
            Package Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="p-2 rounded-lg bg-coke-red/10">
              <TypeIcon className="h-5 w-5 text-coke-red" />
            </div>
            <div>
              <p className="font-semibold capitalize">{data.shipmentType} Shipment</p>
              <p className="text-sm text-muted-foreground">{data.contentDescription}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-2 bg-muted/20 rounded-lg text-center">
              <p className="text-muted-foreground text-xs">Weight</p>
              <p className="font-bold font-typewriter">{data.weightKg} kg</p>
            </div>
            <div className="p-2 bg-muted/20 rounded-lg text-center">
              <p className="text-muted-foreground text-xs">Dimensions</p>
              <p className="font-bold font-typewriter text-xs">{data.lengthCm}×{data.widthCm}×{data.heightCm}</p>
            </div>
            <div className="p-2 bg-muted/20 rounded-lg text-center">
              <p className="text-muted-foreground text-xs">Value</p>
              <p className="font-bold font-typewriter">₹{data.declaredValue.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addresses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-coke-red" />
            Addresses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddressBlock label="Pickup (Sender)" addr={data.pickupAddress} color="text-coke-red" />
          <Separator />
          <AddressBlock label="Delivery (Receiver)" addr={data.deliveryAddress} color="text-blue-500" />
        </CardContent>
      </Card>

      {/* Courier */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-coke-red" />
            Selected Courier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-coke-red/5 border border-coke-red/20 rounded-lg">
            <div>
              <p className="font-semibold">{courier.courier_name}</p>
              <p className="text-sm text-muted-foreground">
                Est. delivery: {courier.estimated_delivery_days} day{courier.estimated_delivery_days !== 1 ? 's' : ''}
                {' · '}
                <span className="capitalize">{courier.mode}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-typewriter text-coke-red">
                ₹{courier.customer_price.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-muted-foreground">Total payable</p>
            </div>
          </div>
          <div className="mt-2 px-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Shipping Charges</span>
              <span>₹{courier.shipping_charge.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>GST (18%)</span>
              <span>₹{courier.gst_amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Check */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Payment</span>
        </div>
        <WalletBalanceCheck
          totalAmount={courier.customer_price}
          onProceed={() => {/* handled by parent submit button */}}
          shippingCost={courier.shipping_charge}
          carrierName={courier.courier_name}
          billItems={[
            { label: 'Shipping Charges', amount: courier.shipping_charge },
            { label: 'GST (18%)', amount: courier.gst_amount },
          ]}
        />
      </div>
    </div>
  );
};

function AddressBlock({ label, addr, color }: {
  label: string;
  addr: DomesticBookingData['pickupAddress'];
  color: string;
}) {
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider ${color} mb-1`}>{label}</p>
      <p className="font-medium">{addr.fullName}</p>
      <p className="text-sm text-muted-foreground">{addr.phone}</p>
      <p className="text-sm text-muted-foreground">
        {addr.addressLine1}
        {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
      </p>
      <p className="text-sm text-muted-foreground">
        {addr.city}, {addr.state} — {addr.pincode}
      </p>
    </div>
  );
}

export const DomesticReviewStep = memo(DomesticReviewStepComponent);
