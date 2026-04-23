import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Package, User, Globe, MapPin, CreditCard, Banknote, Smartphone, 
  FileText, CheckCircle, AlertTriangle, Wallet, CheckCircle2, Plus, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SenderDetails } from './CXBCSenderStep';
import { ConsigneeDetails } from './CXBCConsigneeStep';
import { Carrier } from '@/lib/shipping/rateCalculator';

type PaymentMethod = 'cash' | 'upi' | 'card';

const paymentMethods: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
];

interface CXBCReviewStepProps {
  shipmentType: string;
  selectedCountry: string;
  selectedCountryName: string;
  weightGrams: number;
  declaredValue: number;
  selectedCarrier: Carrier | null;
  sender: SenderDetails;
  consignee: ConsigneeDetails;
  notes: string;
  setNotes: (notes: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  basePrice: number;
  profitMargin: number;
  marginAmount: number;
  gstAmount: number;
  totalCustomerPrice: number;
  walletBalance: number;
  isGstRegistered: boolean;
  partnerAddress: string;
  partnerId: string;
  partnerUserId: string;
  onRechargeComplete: () => void;
}

export const CXBCReviewStep = ({
  shipmentType,
  selectedCountryName,
  weightGrams,
  declaredValue,
  selectedCarrier,
  sender,
  consignee,
  notes,
  setNotes,
  paymentMethod,
  setPaymentMethod,
  basePrice,
  profitMargin,
  marginAmount,
  gstAmount,
  totalCustomerPrice,
  walletBalance,
  isGstRegistered,
  partnerAddress,
  partnerId,
  partnerUserId,
  onRechargeComplete,
}: CXBCReviewStepProps) => {
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isRecharging, setIsRecharging] = useState(false);

  const MIN_WALLET_BALANCE = 1000;
  const requiredAmount = basePrice + MIN_WALLET_BALANCE;
  const canProceed = walletBalance >= requiredAmount;
  const shortfall = Math.max(0, requiredAmount - walletBalance);

  const handleOpenRecharge = () => {
    setRechargeAmount(Math.max(shortfall, 500).toString());
    setShowRechargeDialog(true);
  };

  const handleRecharge = async () => {
    const amount = parseInt(rechargeAmount);
    if (isNaN(amount) || amount < 500) {
      toast.error('Minimum recharge amount is ₹500');
      return;
    }
    setIsRecharging(true);
    try {
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: partnerUserId,
          amount,
          type: 'credit',
          description: 'Wallet Recharge',
          reference_id: `RCH-${Date.now()}`,
        });
      if (txError) throw txError;

      const { error: updateError } = await supabase
        .from('cxbc_partners')
        .update({ wallet_balance: walletBalance + amount })
        .eq('id', partnerId);
      if (updateError) throw updateError;

      toast.success(`₹${amount.toLocaleString('en-IN')} added to wallet`);
      setShowRechargeDialog(false);
      setRechargeAmount('');
      onRechargeComplete();
    } catch (err) {
      console.error('[CXBCReviewStep] Recharge error:', err);
      toast.error('Failed to recharge wallet');
    } finally {
      setIsRecharging(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <Card className={canProceed ? 'border-accent bg-accent/10' : 'border-destructive bg-destructive/10'}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${canProceed ? 'bg-accent/20' : 'bg-destructive/20'}`}>
                <Wallet className={`h-5 w-5 ${canProceed ? 'text-accent-foreground' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="font-bold text-lg">{formatCurrency(walletBalance)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canProceed ? (
                <div className="flex items-center gap-1 text-accent-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Sufficient</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Insufficient</span>
                </div>
              )}
            </div>
          </div>

          {!canProceed && (
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-background rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Required (cost + ₹1,000 min.)</span>
                  <span className="font-medium">{formatCurrency(requiredAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Shortfall</span>
                  <span className="font-medium text-destructive">{formatCurrency(shortfall)}</span>
                </div>
              </div>
              <Button onClick={handleOpenRecharge} className="w-full gap-2" variant="default">
                <Plus className="h-4 w-4" />
                Add Funds to Wallet
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                A minimum balance of ₹1,000 must remain after booking
              </p>
            </div>
          )}

          {canProceed && (
            <div className="mt-4">
              <div className="p-3 bg-background rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount to Deduct</span>
                  <span className="font-medium">{formatCurrency(basePrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Balance After</span>
                  <span className="font-medium">{formatCurrency(walletBalance - basePrice)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Funds Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Funds to Wallet</DialogTitle>
            <DialogDescription>Recharge your CXBC partner wallet to proceed with this booking.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Bill Summary */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm font-semibold">CXBC Partner Wallet</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-xs font-medium text-destructive">
                    Balance: {formatCurrency(walletBalance)}
                  </span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Booking Cost</span>
                  <span className="font-medium">{formatCurrency(basePrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Minimum Reserve</span>
                  <span className="font-medium">{formatCurrency(MIN_WALLET_BALANCE)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Total Required</span>
                  <span className="font-bold text-lg">{formatCurrency(requiredAmount)}</span>
                </div>
              </div>
            </div>

            {/* Low balance warning */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">
                    Need {formatCurrency(shortfall)} more to process this booking.
                  </p>
                  <p className="text-amber-600 text-xs mt-0.5">
                    ₹1,000 minimum balance must remain after every booking.
                  </p>
                </div>
              </div>
            </div>

            {/* Recharge Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Recharge Amount</label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Enter amount"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                min={500}
                className="text-base"
              />
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>Minimum recharge is ₹500. Funds are added instantly to your wallet.</p>
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowRechargeDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleRecharge}
              className="flex-1"
              disabled={!rechargeAmount || isRecharging}
            >
              {isRecharging ? 'Processing...' : 'Add Funds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Shipment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{shipmentType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Destination</p>
              <p className="font-medium">{selectedCountryName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weight</p>
              <p className="font-medium">{weightGrams}g ({(weightGrams / 1000).toFixed(2)} kg)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Declared Value</p>
              <p className="font-medium">{formatCurrency(declaredValue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Courier</p>
              <p className="font-medium">{selectedCarrier || 'Best Available'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">QC Required</p>
              <Badge variant={shipmentType === 'document' ? 'secondary' : 'default'}>
                {shipmentType === 'document' ? 'No' : 'Yes'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sender Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Sender Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{sender.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{sender.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{sender.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID Type</p>
              <p className="font-medium capitalize">{sender.idType.replace('_', ' ')}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="font-medium">
              {sender.addressLine1}
              {sender.addressLine2 && `, ${sender.addressLine2}`}
              <br />
              {sender.city}, {sender.state} - {sender.pincode}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ID Number</p>
            <p className="font-mono font-medium">{sender.idNumber}</p>
          </div>
          {sender.idDocument && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" />
              ID Document uploaded: {sender.idDocument.name}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consignee Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Consignee Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{consignee.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{consignee.phone}</p>
            </div>
            {consignee.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{consignee.email}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Country</p>
              <p className="font-medium">{selectedCountryName}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Delivery Address</p>
            <p className="font-medium">
              {consignee.addressLine1}
              {consignee.addressLine2 && `, ${consignee.addressLine2}`}
              <br />
              {consignee.city}{consignee.state && `, ${consignee.state}`} - {consignee.zipcode}
            </p>
          </div>
          {consignee.idType && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">ID Proof</p>
              <p className="font-medium capitalize">{consignee.idType.replace('_', ' ')}: {consignee.idNumber || 'Not provided'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pickup Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Pickup Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{partnerAddress}</p>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            className="flex gap-4"
          >
            {paymentMethods.map((method) => (
              <div key={method.value} className="flex items-center space-x-2">
                <RadioGroupItem value={method.value} id={method.value} />
                <Label htmlFor={method.value} className="flex items-center gap-2 cursor-pointer">
                  <method.icon className="h-4 w-4" />
                  {method.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Additional Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions or notes for this shipment..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Pricing Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base Shipping Cost</span>
            <span className="font-mono">{formatCurrency(basePrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your Margin ({profitMargin}%)</span>
            <span className="font-mono text-success">+{formatCurrency(marginAmount)}</span>
          </div>
          {isGstRegistered && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST (18%)</span>
              <span className="font-mono">+{formatCurrency(gstAmount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Customer Pays</span>
            <span className="font-mono">{formatCurrency(totalCustomerPrice)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Deducted from your wallet</span>
            <span className="font-mono">{formatCurrency(basePrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your profit</span>
            <span className="font-mono text-success">+{formatCurrency(marginAmount)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
