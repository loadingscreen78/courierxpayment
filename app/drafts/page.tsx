"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Drafts from '@/views/Drafts';

export const metadata = undefined; // metadata not supported in client components

export default function DraftsPage() {
  return (
    <ProtectedRoute kycGated kycGatedSection="Saved Drafts">
      <Drafts />
    </ProtectedRoute>
  );
}
