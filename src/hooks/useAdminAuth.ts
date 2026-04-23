import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'warehouse_operator' | 'user';

interface AdminAuthState {
  isAdmin: boolean;
  isWarehouseOperator: boolean;
  hasAdminAccess: boolean;
  isLoading: boolean;
  roles: AppRole[];
}

export const useAdminAuth = (): AdminAuthState => {
  const { user } = useAuth();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isWarehouseOperator: false,
    hasAdminAccess: false,
    isLoading: true,
    roles: [],
  });

  useEffect(() => {
    const checkRoles = async () => {
      if (!user) {
        setState({
          isAdmin: false,
          isWarehouseOperator: false,
          hasAdminAccess: false,
          isLoading: false,
          roles: [],
        });
        return;
      }

      try {
        // Get session token to pass to server-side API (bypasses RLS)
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          setState(prev => ({ ...prev, isLoading: false, hasAdminAccess: false }));
          return;
        }

        const res = await fetch('/api/admin/check-access', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setState(prev => ({ ...prev, isLoading: false, hasAdminAccess: false }));
          return;
        }

        const data = await res.json();
        setState({
          isAdmin: data.isAdmin ?? false,
          isWarehouseOperator: data.isWarehouseOperator ?? false,
          hasAdminAccess: data.hasAccess ?? false,
          isLoading: false,
          roles: data.roles ?? [],
        });
      } catch (error) {
        console.error('Error checking admin roles:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkRoles();
  }, [user]);

  return state;
};
