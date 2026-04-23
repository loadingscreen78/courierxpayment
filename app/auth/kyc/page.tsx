"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import KycVerification from '@/views/KycVerification';

export default function KycPage() {
  return (
    <ProtectedRoute>
      <KycVerification />
    </ProtectedRoute>
  );
}
