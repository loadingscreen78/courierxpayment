import { useState, useEffect } from 'react';
import { CXBCLayout } from '@/components/cxbc/layout';
import { useCXBCAuth } from '@/hooks/useCXBCAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  IndianRupee,
  Clock,
  TrendingUp,
  TrendingDown,
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  reference_id: string | null;
}

const quickAmounts = [1000, 2000, 5000, 10000, 25000, 50000];

export default function CXBCWallet() {
  const { partner, refetch } = useCXBCAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState(5000);
  const [isRecharging, setIsRecharging] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Keep walletBalance in sync with partner prop
  useEffect(() => {
    if (partner) {
      setWalletBalance(partner.wallet_balance ?? 0);
    }
  }, [partner]);

  const fetchTransactions = async () => {
    if (!partner) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', partner.user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPartnerBalance = async () => {
    if (!partner) return;
    try {
      const { data, error } = await supabase
        .from('cxbc_partners')
        .select('wallet_balance')
        .eq('id', partner.id)
        .single();
      if (error) throw error;
      if (data) setWalletBalance(data.wallet_balance ?? 0);
    } catch (err) {
      console.error('[CXBCWallet] Error fetching partner balance:', err);
    }
  };

  // Initial fetch + Realtime subscriptions for transactions and partner balance
  useEffect(() => {
    if (!partner?.user_id || !partner?.id) return;

    fetchTransactions();

    // 9.1 — Realtime subscription for wallet transactions (INSERT)
    const txnChannel = supabase
      .channel(`cxbc_wallet_txns_${partner.user_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${partner.user_id}`,
        },
        (payload) => {
          const newTxn = payload.new as Transaction;
          if (newTxn) {
            setTransactions((prev) => [newTxn, ...prev]);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[CXBCWallet] Wallet transactions channel error, will refresh on reconnect');
        }
        if (status === 'SUBSCRIBED') {
          // Full refresh on (re)connect to catch missed events
          fetchTransactions();
        }
      });

    // 9.2 — Realtime subscription for partner balance (UPDATE)
    const partnerChannel = supabase
      .channel(`cxbc_partner_${partner.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cxbc_partners',
          filter: `id=eq.${partner.id}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, any>;
          if (updated && typeof updated.wallet_balance === 'number') {
            setWalletBalance(updated.wallet_balance);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[CXBCWallet] Partner balance channel error, will refresh on reconnect');
        }
        if (status === 'SUBSCRIBED') {
          // Full refresh on (re)connect to catch missed balance changes
          fetchPartnerBalance();
        }
      });

    // 9.3 — Cleanup: unsubscribe from both channels
    return () => {
      txnChannel.unsubscribe();
      partnerChannel.unsubscribe();
    };
  }, [partner?.user_id, partner?.id]);

  const handleRecharge = async () => {
    if (!partner) return;
    if (rechargeAmount < 500) {
      toast.error('Minimum recharge amount is ₹500');
      return;
    }

    try {
      setIsRecharging(true);
      
      // Create transaction record
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: partner.user_id,
          amount: rechargeAmount,
          type: 'credit',
          description: 'Wallet Recharge',
          reference_id: `RCH-${Date.now()}`,
        });

      if (txError) throw txError;

      // Update partner wallet balance
      const { error: updateError } = await supabase
        .from('cxbc_partners')
        .update({ wallet_balance: partner.wallet_balance + rechargeAmount })
        .eq('id', partner.id);

      if (updateError) throw updateError;

      toast.success(`₹${rechargeAmount.toLocaleString()} added to wallet`);
      setDialogOpen(false);
      refetch();
      fetchTransactions();
    } catch (error) {
      console.error('Error recharging:', error);
      toast.error('Failed to recharge wallet');
    } finally {
      setIsRecharging(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <ArrowDownLeft className="h-5 w-5 text-success" />;
      case 'debit':
        return <ArrowUpRight className="h-5 w-5 text-destructive" />;
      default:
        return <IndianRupee className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const totalCredits = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <CXBCLayout title="Wallet" subtitle="Manage your wallet balance and transactions">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/80 text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Available Balance
                </p>
                <p className="text-4xl font-bold mt-2">
                  {formatCurrency(walletBalance)}
                </p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" variant="secondary" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Add Money
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Money to Wallet</DialogTitle>
                    <DialogDescription>
                      Add funds to your CXBC partner wallet
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Quick Amount Buttons */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">Quick Select</p>
                      <div className="grid grid-cols-3 gap-2">
                        {quickAmounts.map((amount) => (
                          <Button
                            key={amount}
                            variant={rechargeAmount === amount ? 'default' : 'outline'}
                            onClick={() => setRechargeAmount(amount)}
                          >
                            {formatCurrency(amount)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Amount */}
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Or enter custom amount</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(Number(e.target.value))}
                          className="pl-8"
                          min={500}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Minimum ₹500</p>
                    </div>

                    <Button 
                      onClick={handleRecharge} 
                      className="w-full" 
                      size="lg"
                      disabled={isRecharging || rechargeAmount < 500}
                    >
                      {isRecharging ? 'Processing...' : `Add ${formatCurrency(rechargeAmount)}`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Credits</p>
                  <p className="text-xl font-bold text-success">{formatCurrency(totalCredits)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Debits</p>
                  <p className="text-xl font-bold text-destructive">{formatCurrency(totalDebits)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>Your recent wallet transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm mt-1">Add money to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-muted">
                        {getTransactionIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(tx.created_at), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${tx.type === 'credit' ? 'text-success' : 'text-destructive'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {tx.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CXBCLayout>
  );
}
