"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import NewShipment from '@/views/NewShipment';

export default function NewShipmentPage() {
  return (
    <ProtectedRoute kycGated kycGatedSection="New Shipment">
      <NewShipment />
    </ProtectedRoute>
  );
}
