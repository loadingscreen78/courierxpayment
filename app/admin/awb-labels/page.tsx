"use client";

import { AdminRoute } from '@/components/admin/AdminRoute';
import AWBLabels from '@/views/admin/AWBLabels';

export default function AWBLabelsPage() {
  return (
    <AdminRoute>
      <AWBLabels />
    </AdminRoute>
  );
}
