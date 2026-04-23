"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const AdminRoute = ({ children, requireAdmin = false }: AdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAdminAccess, isAdmin, isLoading: roleLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/admin/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && !roleLoading && user) {
      const hasRequiredRole = requireAdmin ? isAdmin : hasAdminAccess;
      if (!hasRequiredRole) {
        router.replace('/admin/login');
      }
    }
  }, [authLoading, roleLoading, user, requireAdmin, isAdmin, hasAdminAccess, router]);

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

  if (!user) {
    return null;
  }

  const hasRequiredRole = requireAdmin ? isAdmin : hasAdminAccess;

  if (!hasRequiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f12]">
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl font-typewriter font-bold text-white">Access Denied</h1>
          <p className="text-gray-400 max-w-md">
            You don&apos;t have permission to access this area. 
            Please contact an administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
