"use client";

import { AdminRoute } from '@/components/admin/AdminRoute';
import { BlogManagement } from '@/views/admin';

export default function BlogPage() {
  return (
    <AdminRoute requireAdmin>
      <BlogManagement />
    </AdminRoute>
  );
}
