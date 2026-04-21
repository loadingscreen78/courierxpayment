"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Shipments from '@/views/Shipments';

export default function ShipmentsPage() {
  return (
    <ProtectedRoute kycGated kycGatedSection="Track Shipments">
      <Shipments />
    </ProtectedRoute>
  );
}
