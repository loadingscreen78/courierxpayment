// Cashfree Payments configuration and shared types

// Use explicit env var for API base — process.env.NODE_ENV is always 'production'
// after Next.js build, so we use a dedicated flag instead.
export const CASHFREE_API_BASE =
  process.env.CASHFREE_ENV === 'sandbox'
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg';

export const CASHFREE_SDK_MODE =
  process.env.CASHFREE_ENV === 'sandbox' ? 'sandbox' : 'production';

export const CASHFREE_API_VERSION = '2025-01-01';

export interface CreateOrderRequest {
  amount: number; // in rupees
  couponCode?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  paymentSessionId: string;
  amount: number; // in rupees
}

export interface VerifyPaymentRequest {
  orderId: string;
  couponCode?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  ledgerEntryId: string;
  amount: number;        // in rupees
  paymentMethod: string; // "upi" | "card" | "netbanking"
  bonusAmount?: number;
  bonusLedgerEntryId?: string;
}

export interface ErrorResponse {
  error: string;
}
