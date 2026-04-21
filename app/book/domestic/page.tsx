'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import DomesticBooking from '@/views/DomesticBooking';

export default function DomesticBookingPage() {
  return (
    <ProtectedRoute kycGated kycGatedSection="Domestic Booking">
      <DomesticBooking />
    </ProtectedRoute>
  );
}
