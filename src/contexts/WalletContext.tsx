'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useWalletLedger, MIN_RECHARGE_AMOUNT, MIN_BALANCE_REQUIRED } from '@/hooks/useWalletLedger';
import { LedgerEntry, PaymentMethod, PaymentStatus, Receipt, TransactionFilters } from '@/lib/wallet/types';

export type TransactionType = 'credit' | 'debit' | 'refund';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: Date;
  referenceId?: string;
}

function ledgerEntryToTransaction(entry: LedgerEntry): Transaction {
  let type: TransactionType = 'credit';
  if (entry.type === 'debit' || entry.type === 'hold') {
    type = 'debit';
  } else if (entry.type === 'refund') {
    type = 'refund';
  }
  return {
    id: entry.id,
    type,
    amount: entry.amount,
    description: entry.description,
    date: new Date(entry.createdAt),
    referenceId: entry.referenceId,
  };
}

interface WalletContextType {
  balance: number;
  transactions: Transaction[];
  addFunds: (amount: number, description?: string) => Promise<{ success: boolean; receipt?: Receipt; error?: string }>;
  deductFunds: (amount: number, description?: string) => boolean;
  addRefund: (amount: number, description: string, referenceId?: string) => void;
  hasMinimumBalance: (requiredAmount?: number) => boolean;
  availableBalance: number;
  heldAmount: number;
  isLoading: boolean;
  error: string | null;
  isPaymentProcessing: boolean;
  paymentStatus: PaymentStatus;
  paymentMessage: string;
  addFundsWithPayment: (amount: number, method: PaymentMethod, couponCode?: string) => Promise<{ success: boolean; receipt?: Receipt; error?: string; bonusAmount?: number }>;
  deductFundsForShipment: (amount: number, shipmentId: string, description?: string) => Promise<{ success: boolean; error?: string }>;
  processRefund: (amount: number, shipmentId: string, description?: string) => Promise<{ success: boolean; error?: string }>;
  refreshBalance: () => Promise<void>;
  getHistory: (filters?: TransactionFilters) => Promise<LedgerEntry[]>;
  downloadTransactionReceipt: (ledgerEntryId: string) => Promise<void>;
  resetPaymentState: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);


export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const wallet = useWalletLedger();
  const transactions: Transaction[] = wallet.transactions.map(ledgerEntryToTransaction);
  
  const addFunds = async (amount: number) => {
    return wallet.addFunds(amount, 'upi');
  };
  
  const deductFunds = (amount: number, description?: string): boolean => {
    const shipmentId = `SHP-${Date.now()}`;
    wallet.deductFunds(amount, shipmentId, description);
    return wallet.availableBalance >= amount;
  };
  
  const addRefund = (amount: number, description: string, referenceId?: string) => {
    if (referenceId) {
      wallet.processRefund(amount, referenceId, description);
    }
  };
  
  const hasMinimumBalance = (requiredAmount: number = MIN_BALANCE_REQUIRED): boolean => {
    return wallet.hasMinimumBalance(requiredAmount);
  };

  const contextValue: WalletContextType = {
    balance: wallet.balance,
    transactions,
    addFunds,
    deductFunds,
    addRefund,
    hasMinimumBalance,
    availableBalance: wallet.availableBalance,
    heldAmount: wallet.heldAmount,
    isLoading: wallet.isLoading,
    error: wallet.error,
    isPaymentProcessing: wallet.isPaymentProcessing,
    paymentStatus: wallet.paymentStatus,
    paymentMessage: wallet.paymentMessage,
    addFundsWithPayment: wallet.addFunds,
    deductFundsForShipment: async (amount, shipmentId, description) => {
      const result = await wallet.deductFunds(amount, shipmentId, description);
      return { success: result.success, error: result.error };
    },
    processRefund: async (amount, shipmentId, description) => {
      const result = await wallet.processRefund(amount, shipmentId, description);
      return { success: result.success, error: result.error };
    },
    refreshBalance: wallet.refreshBalance,
    getHistory: wallet.getHistory,
    downloadTransactionReceipt: wallet.downloadTransactionReceipt,
    resetPaymentState: wallet.resetPaymentState,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export { MIN_BALANCE_REQUIRED, MIN_RECHARGE_AMOUNT };
