// Razorpay configuration and shared types

export const RAZORPAY_API_BASE = 'https://api.razorpay.com';

export interface CreateOrderRequest {
  amount: number; // in rupees
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;   // in paise
  currency: string;  // "INR"
  keyId: string;
}

export interface VerifyPaymentRequest {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  ledgerEntryId: string;
  amount: number;         // in rupees
  paymentMethod: string;  // "upi" | "card" | "netbanking"
  bonusAmount?: number;   // coupon bonus in rupees
  bonusLedgerEntryId?: string;
}

export interface ErrorResponse {
  error: string;
}
