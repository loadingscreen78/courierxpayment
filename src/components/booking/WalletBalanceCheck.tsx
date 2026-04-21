import { useWallet } from '@/contexts/WalletContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, AlertTriangle, CheckCircle2, Plus, Info } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export interface BillLineItem {
  label: string;
  amount: number;
}

interface WalletBalanceCheckProps {
  totalAmount: number;
  onProceed: () => void;
  /** Optional bill breakdown shown in the Add Funds popup */
  shippingCost?: number;
  addonsTotal?: number;
  billItems?: BillLineItem[];
  /** e.g. "FedEx International Priority" */
  carrierName?: string;
}

export const WalletBalanceCheck = ({
  totalAmount,
  onProceed,
  shippingCost,
  addonsTotal,
  billItems,
  carrierName,
}: WalletBalanceCheckProps) => {
  const { balance, hasMinimumBalance, addFunds } = useWallet();
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isRecharging, setIsRecharging] = useState(false);

  const canProceed = hasMinimumBalance(totalAmount);
  const shortfall = Math.max(0, totalAmount - balance);

  const handleOpenRecharge = () => {
    // Pre-fill with shortfall + minimum balance buffer
    const suggested = Math.max(shortfall, 500);
    setRechargeAmount(suggested.toString());
    setShowRechargeDialog(true);
  };

  const handleRecharge = async () => {
    const amount = parseInt(rechargeAmount);
    if (isNaN(amount) || amount < 500) {
      toast.error('Minimum recharge amount is ₹500');
      return;
    }
    setShowRechargeDialog(false);
    setIsRecharging(true);
    try {
      const result = await addFunds(amount);
      if (result.success) {
        toast.success(`₹${amount.toLocaleString('en-IN')} added to wallet`);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error('Payment failed');
    } finally {
      setIsRecharging(false);
      setRechargeAmount('');
    }
  };

  return (
    <>
      <Card className={canProceed ? 'border-accent bg-accent/10' : 'border-destructive bg-destructive/10'}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${canProceed ? 'bg-accent/20' : 'bg-destructive/20'}`}>
                <Wallet className={`h-5 w-5 ${canProceed ? 'text-accent-foreground' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="font-typewriter font-bold text-lg">₹{balance.toLocaleString('en-IN')}</p>
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
                  <span className="text-muted-foreground">Required Amount</span>
                  <span className="font-typewriter font-medium">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Shortfall</span>
                  <span className="font-typewriter font-medium text-destructive">₹{shortfall.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <Button
                onClick={handleOpenRecharge}
                className="w-full gap-2"
                variant="default"
              >
                <Plus className="h-4 w-4" />
                Add Funds to Wallet
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Ensure sufficient wallet balance to proceed
              </p>
            </div>
          )}

          {canProceed && (
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-background rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount to Deduct</span>
                  <span className="font-typewriter font-medium">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Balance After</span>
                  <span className="font-typewriter font-medium">₹{(balance - totalAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <Button onClick={onProceed} className="w-full">
                Confirm & Pay ₹{totalAmount.toLocaleString('en-IN')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Add Funds / Bill Summary Dialog ─── */}
      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-typewriter text-xl">Get AWB Number</DialogTitle>
            <DialogDescription>
              Once submitted, these orders cannot be edited.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Bill Summary Card */}
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-foreground">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M12 3C12 3 8.5 7 8.5 12C8.5 17 12 21 12 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M12 3C12 3 15.5 7 15.5 12C15.5 17 12 21 12 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M3.5 12H20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  <span className="text-sm font-semibold">International</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-xs font-medium text-destructive">
                    Wallet Balance: ₹{balance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Bill line items */}
              <div className="px-4 py-3 space-y-2.5">
                {billItems && billItems.length > 0 ? (
                  billItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-typewriter font-medium">{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))
                ) : (
                  <>
                    {carrierName && shippingCost !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Shipping ({carrierName})</span>
                        <span className="font-typewriter font-medium">₹{shippingCost.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {addonsTotal !== undefined && addonsTotal > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Add-ons</span>
                        <span className="font-typewriter font-medium">₹{addonsTotal.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {!carrierName && !billItems && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Shipping Cost</span>
                        <span className="font-typewriter font-medium">₹{totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Total Shipping Cost</span>
                  <span className="font-typewriter font-bold text-lg">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Low balance warning */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">
                    Low wallet balance. Need ₹{shortfall.toLocaleString('en-IN')} more to process this order.
                  </p>
                  <p className="text-amber-600 text-xs mt-0.5">
                    International Wallet needs to be recharged separately
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
                className="font-typewriter text-base"
              />
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>Total cost includes all boxes. We&apos;ll charge a partial amount at booking and the remainder at delivery.</p>
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRechargeDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecharge}
              className="flex-1"
              disabled={!rechargeAmount || isRecharging}
            >
              {isRecharging ? 'Processing...' : 'Recharge & Get AWB Number'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
