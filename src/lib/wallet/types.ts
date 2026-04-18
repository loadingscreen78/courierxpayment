// Ledger-based wallet types for CourierX

export type TransactionType = 'credit' | 'debit' | 'refund' | 'hold' | 'release' | 'adjustment';
export type PaymentMethod = 'upi' | 'card' | 'netbanking';
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface LedgerEntry {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  referenceId?: string;
  referenceType?: 'payment' | 'shipment' | 'refund';
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO string for localStorage compatibility
}

export interface PaymentSession {
  sessionId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  method: PaymentMethod;
  timestamp: string;
  errorMessage?: string;
}

export interface CompanyDetails {
  name: string;
  address: string;
  gstNumber: string;
  email: string;
  phone: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  transactionId: string;
  ledgerEntryId: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  date: string;
  customerName: string;
  customerEmail?: string;
  companyDetails: CompanyDetails;
}

export interface TransactionFilters {
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface WalletState {
  balance: number;
  availableBalance: number;
  heldAmount: number;
  transactions: LedgerEntry[];
  isLoading: boolean;
  error: string | null;
}

// Constants
export const MIN_RECHARGE_AMOUNT = 500;
export const MIN_BALANCE_REQUIRED = 0;
export const GST_RATE = 0.18; // 18% GST

export const COMPANY_DETAILS: CompanyDetails = {
  name: 'CourierX International Pvt. Ltd.',
  address: '123 Business Park, Andheri East, Mumbai - 400069, Maharashtra, India',
  gstNumber: '27AABCU9603R1ZM',
  email: 'support@courierx.in',
  phone: '+91 1800-123-4567',
};
