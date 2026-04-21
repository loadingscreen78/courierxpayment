"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Drafts from '@/views/Drafts';

export default function DraftsPage() {
  return (
    <ProtectedRoute kycGated kycGatedSection="Saved Drafts">
      <Drafts />
    </ProtectedRoute>
  );
}
