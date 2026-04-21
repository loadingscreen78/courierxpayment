"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Index from '@/views/Index';

export default function DashboardPage() {
  return (
    <ProtectedRoute kycGated kycGatedSection="the Dashboard">
      <Index />
    </ProtectedRoute>
  );
}
