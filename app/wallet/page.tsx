"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Wallet from '@/views/Wallet';

export default function WalletPage() {
  return (
    <ProtectedRoute kycGated kycGatedSection="Wallet & Billing">
      <Wallet />
    </ProtectedRoute>
  );
}
