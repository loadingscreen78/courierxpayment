'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  LedgerEntry, 
  PaymentMethod, 
  PaymentStatus, 
  Receipt,
  TransactionFilters,
  WalletState,
  MIN_RECHARGE_AMOUNT,
  MIN_BALANCE_REQUIRED,
  GST_RATE,
  COMPANY_DETAILS,
} from '@/lib/wallet/types';
import {
  computeBalance,
  computeAvailableBalance,
  deductFunds as deductFundsFromLedger,
  processRefund as processRefundInLedger,
  getTransactionHistory,
  validateRecharge,
  validateDeduction,
  storeReceipt,
  getReceiptByLedgerEntryId,
} from '@/lib/wallet/supabaseWalletService';
import { loadCashfreeScript } from '@/lib/wallet/cashfreeLoader';
import { generateWalletReceiptPDF } from '@/lib/wallet/generateWalletReceiptPDF';
import type { VerifyPaymentResponse } from '@/lib/wallet/cashfreeConfig';

export interface UseWalletLedgerReturn {
  balance: number;
  availableBalance: number;
  heldAmount: number;
  transactions: LedgerEntry[];
  isLoading: boolean;
  error: string | null;
  isPaymentProcessing: boolean;
  paymentStatus: PaymentStatus;
  paymentMessage: string;
  addFunds: (amount: number, method: PaymentMethod, couponCode?: string) => Promise<{ success: boolean; receipt?: Receipt; error?: string; bonusAmount?: number }>;
  deductFunds: (amount: number, shipmentId: string, description?: string) => Promise<{ success: boolean; entry?: LedgerEntry; error?: string }>;
  processRefund: (amount: number, shipmentId: string, description?: string) => Promise<{ success: boolean; entry?: LedgerEntry; error?: string }>;
  refreshBalance: () => Promise<void>;
  getHistory: (filters?: TransactionFilters) => Promise<LedgerEntry[]>;
  downloadTransactionReceipt: (ledgerEntryId: string) => Promise<void>;
  hasMinimumBalance: (requiredAmount?: number) => boolean;
  resetPaymentState: () => void;
}

function generateReceiptNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `RCP${year}${month}${random}`;
}

export function useWalletLedger(): UseWalletLedgerReturn {
  const { user, profile } = useAuth();
  
  const [state, setState] = useState<WalletState>({
    balance: 0,
    availableBalance: 0,
    heldAmount: 0,
    transactions: [],
    isLoading: true,
    error: null,
  });
  
  const [paymentState, setPaymentState] = useState({
    isProcessing: false,
    status: 'pending' as PaymentStatus,
    message: '',
  });

  const refreshBalance = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }
    
    console.log('[Wallet] Refreshing balance for user:', user.id);
    
    try {
      const [balance, availableBalance, transactions] = await Promise.all([
        computeBalance(user.id),
        computeAvailableBalance(user.id),
        getTransactionHistory(user.id, { limit: 100 }),
      ]);
      
      console.log('[Wallet] Balance refreshed:', { balance, availableBalance, transactionCount: transactions.length });
      
      setState({
        balance,
        availableBalance,
        heldAmount: balance - availableBalance,
        transactions,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[Wallet] Error refreshing wallet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load wallet data';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  }, [user?.id]);

  useEffect(() => {
    refreshBalance();
    
    // Set up real-time subscription for wallet ledger changes
    if (!user?.id) return;
    
    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'wallet_ledger',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Wallet] Real-time update received:', payload);
          // Refresh balance when any change occurs
          refreshBalance();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshBalance, user?.id]);

  const addFunds = useCallback(async (amount: number, _method: PaymentMethod, couponCode?: string) => {
    if (!user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const validation = validateRecharge(amount);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    setPaymentState({ isProcessing: true, status: 'pending', message: 'Creating payment order...' });

    try {
      // Get auth token for API calls
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setPaymentState({ isProcessing: false, status: 'failed', message: 'Session expired. Please log in again.' });
        return { success: false, error: 'Session expired' };
      }

      // Step 1: Create Cashfree order
      setPaymentState(prev => ({ ...prev, message: 'Connecting to payment gateway...' }));
      const orderRes = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, couponCode: couponCode || undefined }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({ error: 'Failed to create order' }));
        setPaymentState({ isProcessing: false, status: 'failed', message: err.error || 'Failed to create order' });
        return { success: false, error: err.error };
      }

      const orderData: CreateOrderResponse = await orderRes.json();

      // Step 2: Load Cashfree JS SDK
      setPaymentState(prev => ({ ...prev, message: 'Loading payment interface...' }));
      await loadCashfreeScript();

      // Step 3: Initiate Cashfree hosted checkout — browser will redirect away.
      // Verification happens in Wallet.tsx via ?order_id= query param on return.
      setPaymentState(prev => ({ ...prev, status: 'processing', message: 'Redirecting to payment...' }));

      const cashfree = (window as any).Cashfree({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === 'sandbox' ? 'sandbox' : 'production',
      });

      const checkoutResult = await cashfree.checkout({
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: '_self',
      });

      // If we reach here, checkout returned an error (redirect didn't happen)
      if (checkoutResult?.error) {
        throw new Error(checkoutResult.error.message || 'Payment failed');
      }

      // Redirect is in progress — return a pending state.
      // The page will reload on return and Wallet.tsx handles verification.
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      const isCancelled = errorMessage === 'Payment cancelled';
      setPaymentState({
        isProcessing: false,
        status: 'failed',
        message: isCancelled ? 'Payment cancelled' : errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }, [user?.id, refreshBalance]);

  const deductFunds = useCallback(async (amount: number, shipmentId: string, description?: string) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };
    
    const validation = await validateDeduction(user.id, amount);
    if (!validation.valid) return { success: false, error: validation.error };

    try {
      const entry = await deductFundsFromLedger(user.id, amount, shipmentId, description);
      if (entry) {
        await refreshBalance();
        return { success: true, entry };
      }
      return { success: false, error: 'Failed to deduct funds' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Deduction failed' };
    }
  }, [user?.id, refreshBalance]);

  const processRefund = useCallback(async (amount: number, shipmentId: string, description?: string) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };
    
    try {
      const entry = await processRefundInLedger(user.id, amount, shipmentId, description);
      if (entry) {
        await refreshBalance();
        return { success: true, entry };
      }
      return { success: false, error: 'Failed to process refund' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Refund failed' };
    }
  }, [user?.id, refreshBalance]);

  const getHistory = useCallback(async (filters?: TransactionFilters) => {
    if (!user?.id) return [];
    return getTransactionHistory(user.id, filters);
  }, [user?.id]);

  const downloadTransactionReceipt = useCallback(async (ledgerEntryId: string) => {
    if (!user?.id) return;
    const receiptData = await getReceiptByLedgerEntryId(user.id, ledgerEntryId);
    if (receiptData) {
      const receipt: Receipt = {
        id: receiptData.id,
        receiptNumber: receiptData.receipt_number,
        transactionId: receiptData.transaction_id,
        ledgerEntryId: receiptData.ledger_entry_id,
        amount: parseFloat(receiptData.amount),
        gstAmount: parseFloat(receiptData.gst_amount),
        totalAmount: parseFloat(receiptData.total_amount),
        paymentMethod: receiptData.payment_method as PaymentMethod,
        date: receiptData.created_at,
        customerName: receiptData.customer_name,
        customerEmail: receiptData.customer_email,
        companyDetails: COMPANY_DETAILS,
      };
      generateWalletReceiptPDF(receipt);
    }
  }, [user?.id]);

  const hasMinimumBalance = useCallback((requiredAmount: number = MIN_BALANCE_REQUIRED) => {
    return state.availableBalance >= requiredAmount && state.availableBalance >= MIN_BALANCE_REQUIRED;
  }, [state.availableBalance]);

  const resetPaymentState = useCallback(() => {
    setPaymentState({ isProcessing: false, status: 'pending', message: '' });
  }, []);

  return {
    balance: state.balance,
    availableBalance: state.availableBalance,
    heldAmount: state.heldAmount,
    transactions: state.transactions,
    isLoading: state.isLoading,
    error: state.error,
    isPaymentProcessing: paymentState.isProcessing,
    paymentStatus: paymentState.status,
    paymentMessage: paymentState.message,
    addFunds,
    deductFunds,
    processRefund,
    refreshBalance,
    getHistory,
    downloadTransactionReceipt,
    hasMinimumBalance,
    resetPaymentState,
  };
}

export { MIN_RECHARGE_AMOUNT, MIN_BALANCE_REQUIRED };
