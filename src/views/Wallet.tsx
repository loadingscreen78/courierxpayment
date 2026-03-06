'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout';
import { useWallet, MIN_RECHARGE_AMOUNT, Transaction } from '@/contexts/WalletContext';
import { useInvoices } from '@/hooks/useInvoices';
import { generateInvoicePDF, generateAllInvoicesPDF } from '@/lib/generateInvoicePDF';
import { PaymentLoadingOverlay } from '@/components/wallet/PaymentLoadingOverlay';
import { PaymentMethod } from '@/lib/wallet/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  Wallet as WalletIcon,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Clock,
  FileText,
  Download,
  Loader2,
  Smartphone,
  CreditCard,
  Building2,
  Receipt,
  ChevronRight,
  Shield,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import { motion } from 'framer-motion';

type FilterType = 'all' | 'credit' | 'debit' | 'refund';
type InvoiceStatus = Database['public']['Enums']['invoice_status'];

const TransactionIcon = ({ type }: { type: Transaction['type'] }) => {
  const styles = {
    credit: 'bg-green-500/10 text-green-600',
    debit: 'bg-red-500/10 text-red-500',
    refund: 'bg-blue-500/10 text-blue-600',
  };
  const icons = {
    credit: <ArrowDownLeft className="h-4 w-4" />,
    debit: <ArrowUpRight className="h-4 w-4" />,
    refund: <RotateCcw className="h-4 w-4" />,
  };
  return (
    <div className={cn("p-2.5 rounded-xl shrink-0", styles[type])}>
      {icons[type]}
    </div>
  );
};

const TransactionBadge = ({ type }: { type: Transaction['type'] }) => {
  const styles = {
    credit: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
    debit: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900',
    refund: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  };
  const labels = { credit: 'Credit', debit: 'Debit', refund: 'Refund' };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", styles[type])}>
      {labels[type]}
    </span>
  );
};

const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => {
  const styles = {
    paid: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
    pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    refunded: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  };
  const labels = { paid: 'Paid', pending: 'Pending', refunded: 'Refunded' };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", styles[status])}>
      {labels[status]}
    </span>
  );
};

const WalletPage = () => {
  const { 
    balance, 
    transactions, 
    isPaymentProcessing,
    paymentStatus,
    paymentMessage,
    addFundsWithPayment,
    resetPaymentState,
    downloadTransactionReceipt,
  } = useWallet();
  
  const { invoices, loading: invoicesLoading } = useInvoices();
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('upi');
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState('transactions');

  const handleRecharge = async () => {
    const amount = parseInt(rechargeAmount);
    if (isNaN(amount) || amount < MIN_RECHARGE_AMOUNT) {
      toast.error(`Minimum recharge amount is ₹${MIN_RECHARGE_AMOUNT}`);
      return;
    }
    setShowRechargeDialog(false);
    const result = await addFundsWithPayment(amount, selectedPaymentMethod);
    if (result.success && result.receipt) {
      toast.success(
        <div className="flex flex-col gap-1">
          <span>₹{amount.toLocaleString('en-IN')} added to wallet</span>
          <button 
            onClick={() => downloadTransactionReceipt(result.receipt!.ledgerEntryId)}
            className="text-xs text-primary underline text-left"
          >
            Download Receipt
          </button>
        </div>
      );
    } else if (!result.success) {
      toast.error(result.error || 'Payment failed');
    }
    setRechargeAmount('');
  };

  const quickRechargeAmounts = [500, 1000, 2000, 5000];
  const filteredTransactions = transactions.filter(t => filter === 'all' || t.type === filter);

  const totalCredits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebits = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const totalRefunds = transactions.filter(t => t.type === 'refund').reduce((s, t) => s + t.amount, 0);

  const handleDownloadInvoice = (invoice: Database['public']['Tables']['invoices']['Row']) => {
    try {
      generateInvoicePDF(invoice);
      toast.success('Invoice downloaded');
    } catch {
      toast.error('Failed to generate invoice');
    }
  };

  const handleExportAllInvoices = () => {
    if (invoices.length === 0) { toast.error('No invoices to export'); return; }
    try {
      generateAllInvoicesPDF(invoices);
      toast.success('All invoices exported');
    } catch {
      toast.error('Failed to export invoices');
    }
  };

  const filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'credit', label: 'Credits' },
    { key: 'debit', label: 'Debits' },
    { key: 'refund', label: 'Refunds' },
  ];

  return (
    <AppLayout>
      <div className="space-y-5 pb-24 md:pb-6 max-w-2xl mx-auto">
        {/* Page Header */}
        <div>
          <h1 className="font-typewriter text-2xl font-bold">Wallet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage balance, transactions & invoices</p>
        </div>

        {/* Balance Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a1a] to-[#2d1010] p-6 text-white shadow-xl shadow-black/20"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-coke-red/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-900/20 rounded-full translate-y-1/2 -translate-x-1/4 blur-xl" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <WalletIcon className="h-4 w-4 text-white/60" />
                  <span className="text-sm text-white/60">Available Balance</span>
                </div>
                <p className="font-typewriter text-4xl font-bold tracking-tight">
                  ₹{balance.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-white/40 mt-1.5">Min. ₹1,000 required for bookings</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 rounded-xl border border-white/10">
                <Shield className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs text-white/70 font-medium">Secured</span>
              </div>
            </div>

            <button
              onClick={() => setShowRechargeDialog(true)}
              className="flex items-center gap-2 px-5 py-3 bg-coke-red hover:bg-red-600 text-white rounded-2xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-coke-red/30 hover:shadow-coke-red/50 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" />
              Add Money
            </button>
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Credits', value: totalCredits, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-500/10' },
            { label: 'Debits', value: totalDebits, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Refunds', value: totalRefunds, icon: RotateCcw, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card border border-border/50 rounded-2xl p-3.5"
            >
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", stat.bg)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              <p className={cn("font-typewriter font-bold text-sm mt-0.5", stat.color)}>
                ₹{stat.value.toLocaleString('en-IN')}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-11 bg-muted/60 rounded-2xl p-1">
            <TabsTrigger value="transactions" className="flex-1 rounded-xl text-sm data-[state=active]:shadow-sm">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex-1 rounded-xl text-sm data-[state=active]:shadow-sm">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Invoices
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="mt-4 space-y-3">
            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {filterOptions.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200",
                    filter === f.key
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Transaction List */}
            <div className="bg-card border border-border/50 rounded-3xl overflow-hidden">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <IndianRupee className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-sm">No transactions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add money to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {filteredTransactions.map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <TransactionIcon type={transaction.type} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{transaction.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {format(transaction.date, 'dd MMM, hh:mm a')}
                          </span>
                          {transaction.referenceId && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="text-xs text-muted-foreground font-mono truncate max-w-[80px]">
                                {transaction.referenceId}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2 shrink-0">
                        <div>
                          <p className={cn(
                            "font-typewriter font-bold text-sm",
                            transaction.type === 'credit' && "text-green-600",
                            transaction.type === 'debit' && "text-red-500",
                            transaction.type === 'refund' && "text-blue-600"
                          )}>
                            {transaction.type === 'debit' ? '-' : '+'}₹{transaction.amount.toLocaleString('en-IN')}
                          </p>
                          <div className="flex justify-end mt-1">
                            <TransactionBadge type={transaction.type} />
                          </div>
                        </div>
                        {transaction.type === 'credit' && (
                          <button
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            onClick={() => downloadTransactionReceipt(transaction.id)}
                            title="Download Receipt"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Guidelines */}
            <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-2xl border border-border/40">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-sm">Wallet Guidelines</p>
                <p>Min. recharge: ₹{MIN_RECHARGE_AMOUNT} · Min. booking balance: ₹1,000</p>
                <p>Refunds processed in 24–48 hrs · Withdrawals on account closure only</p>
              </div>
            </div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 rounded-xl h-8 text-xs"
                onClick={handleExportAllInvoices}
                disabled={invoices.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                Export All
              </Button>
            </div>

            <div className="bg-card border border-border/50 rounded-3xl overflow-hidden">
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-sm">No invoices yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Invoices appear after your first shipment</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {invoices.map((invoice, index) => (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="p-2.5 rounded-xl bg-muted shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{invoice.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-mono text-muted-foreground">{invoice.invoice_number}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(invoice.created_at), 'dd MMM yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2 shrink-0">
                        <div>
                          <p className="font-typewriter font-bold text-sm">
                            ₹{Number(invoice.total_amount).toLocaleString('en-IN')}
                          </p>
                          <div className="flex justify-end mt-1">
                            <InvoiceStatusBadge status={invoice.status} />
                          </div>
                        </div>
                        <button
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          onClick={() => handleDownloadInvoice(invoice)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Money Sheet */}
      <Sheet open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <SheetContent
          side="bottom"
          className="p-0 rounded-t-3xl overflow-hidden border-0 max-h-[92vh] flex flex-col sm:max-w-sm sm:mx-auto sm:rounded-3xl sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:inset-x-auto sm:inset-y-auto [&>button]:hidden"
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 shrink-0 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Sheet Header */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d1010] px-5 py-5 text-white shrink-0">
            <p className="font-typewriter text-lg font-bold text-white">Add Money</p>
            <p className="text-white/50 text-xs mt-0.5">Min. ₹{MIN_RECHARGE_AMOUNT} · Secured by Razorpay</p>
            {rechargeAmount && parseInt(rechargeAmount) >= MIN_RECHARGE_AMOUNT && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="font-typewriter text-2xl font-bold mt-3"
              >
                ₹{parseInt(rechargeAmount).toLocaleString('en-IN')}
              </motion.p>
            )}
          </div>

          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Quick Amounts */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Select</p>
              <div className="grid grid-cols-4 gap-2">
                {quickRechargeAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setRechargeAmount(amount.toString())}
                    className={cn(
                      "py-2 rounded-xl text-sm font-semibold transition-all duration-200 border",
                      rechargeAmount === amount.toString()
                        ? "bg-foreground text-background border-foreground shadow-sm"
                        : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    ₹{amount >= 1000 ? `${amount/1000}k` : amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Custom Amount</p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">₹</span>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="pl-8 font-typewriter rounded-xl h-10 border-border/60 focus:border-coke-red"
                  min={MIN_RECHARGE_AMOUNT}
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Method</p>
              <div className="space-y-2">
                {[
                  { method: 'upi' as PaymentMethod, icon: Smartphone, label: 'UPI', description: 'GPay, PhonePe, Paytm' },
                  { method: 'card' as PaymentMethod, icon: CreditCard, label: 'Card', description: 'Visa, Mastercard, RuPay' },
                  { method: 'netbanking' as PaymentMethod, icon: Building2, label: 'Net Banking', description: 'All major banks' },
                ].map(({ method, icon: Icon, label, description }) => (
                  <button
                    key={method}
                    onClick={() => setSelectedPaymentMethod(method)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-200 text-left",
                      selectedPaymentMethod === method
                        ? "border-coke-red bg-coke-red/5"
                        : "border-border/60 bg-muted/30 hover:border-border"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-xl shrink-0 transition-colors",
                      selectedPaymentMethod === method ? "bg-coke-red/15 text-coke-red" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-semibold text-sm", selectedPaymentMethod === method ? "text-foreground" : "text-muted-foreground")}>
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{description}</p>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                      selectedPaymentMethod === method ? "border-coke-red bg-coke-red" : "border-muted-foreground/30"
                    )}>
                      {selectedPaymentMethod === method && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRecharge}
              disabled={!rechargeAmount || parseInt(rechargeAmount) < MIN_RECHARGE_AMOUNT}
              className="w-full flex items-center justify-center gap-2 py-3 bg-coke-red hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-sm transition-all duration-200 shadow-md shadow-coke-red/25"
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span>Pay Securely</span>
              {rechargeAmount && parseInt(rechargeAmount) >= MIN_RECHARGE_AMOUNT && (
                <span className="font-typewriter">· ₹{parseInt(rechargeAmount).toLocaleString('en-IN')}</span>
              )}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Loading Overlay */}
      <PaymentLoadingOverlay
        isOpen={isPaymentProcessing || paymentStatus === 'success' || paymentStatus === 'failed'}
        status={paymentStatus}
        message={paymentMessage}
        amount={parseInt(rechargeAmount) || 0}
        method={selectedPaymentMethod}
        onClose={resetPaymentState}
        onRetry={() => { resetPaymentState(); setShowRechargeDialog(true); }}
      />
    </AppLayout>
  );
};

export default WalletPage;
