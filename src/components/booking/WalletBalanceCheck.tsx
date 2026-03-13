import { useWallet, MIN_BALANCE_REQUIRED } from '@/contexts/WalletContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface WalletBalanceCheckProps {
  totalAmount: number;
  onProceed: () => void;
}

export const WalletBalanceCheck = ({ totalAmount, onProceed }: WalletBalanceCheckProps) => {
  const { balance, hasMinimumBalance, addFunds } = useWallet();
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');

  const [isRecharging, setIsRecharging] = useState(false);

  const canProceed = hasMinimumBalance(totalAmount);
  const shortfall = Math.max(0, totalAmount - balance, MIN_BALANCE_REQUIRED - balance);

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

  const quickRechargeAmounts = [500, 1000, 2000, 5000];

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
                  <span className="font-typewriter font-medium">₹{Math.max(totalAmount, MIN_BALANCE_REQUIRED).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Shortfall</span>
                  <span className="font-typewriter font-medium text-destructive">₹{shortfall.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <Button 
                onClick={() => setShowRechargeDialog(true)} 
                className="w-full gap-2"
                variant="default"
              >
                <Plus className="h-4 w-4" />
                Add Funds to Wallet
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Minimum wallet balance of ₹{MIN_BALANCE_REQUIRED.toLocaleString('en-IN')} required
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

      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-typewriter">Add Funds to Wallet</DialogTitle>
            <DialogDescription>
              Add money to your CourierX wallet. Minimum recharge: ₹500
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {quickRechargeAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setRechargeAmount(amount.toString())}
                  className={rechargeAmount === amount.toString() ? 'border-primary' : ''}
                >
                  ₹{amount}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Amount</label>
              <Input
                type="number"
                placeholder="Enter amount (min ₹500)"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                min={500}
              />
            </div>
            <Button onClick={handleRecharge} className="w-full" disabled={!rechargeAmount || isRecharging}>
              {isRecharging ? 'Processing...' : `Add ₹${rechargeAmount || '0'} to Wallet`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
