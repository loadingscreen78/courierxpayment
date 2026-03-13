"use client";

import { AdminRoute } from '@/components/admin/AdminRoute';
import { CouponManagement } from '@/views/admin';

export default function CouponsPage() {
  return (
    <AdminRoute requireAdmin>
      <CouponManagement />
    </AdminRoute>
  );
}
