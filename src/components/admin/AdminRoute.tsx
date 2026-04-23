"use client";

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AdminRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const AdminRoute = ({ children, requireAdmin = false }: AdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAdminAccess, isAdmin, isLoading: roleLoading } = useAdminAuth();
  const router = useRouter();

  // Only redirect to login if auth is fully loaded and user is not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/admin/login');
    }
  }, [authLoading, user, router]);

  // Show spinner while loading
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f12]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          <p className="text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) return null;

  const hasRequiredRole = requireAdmin ? isAdmin : hasAdminAccess;

  // No role — show access denied, don't redirect (avoids loop)
  if (!hasRequiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f12]">
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl font-typewriter font-bold text-white">Access Denied</h1>
          <p className="text-gray-400 max-w-md">You don&apos;t have admin privileges.</p>
          <button
            onClick={() => router.replace('/admin/login')}
            className="mt-4 px-6 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
