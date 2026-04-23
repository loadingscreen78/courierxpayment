import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type CXBCPartner = Database['public']['Tables']['cxbc_partners']['Row'];

export interface UseCXBCAuthReturn {
  isLoading: boolean;
  isApprovedPartner: boolean;
  partner: CXBCPartner | null;
  applicationStatus: 'pending' | 'under_review' | 'rejected' | null;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useCXBCAuth = (): UseCXBCAuthReturn => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isApprovedPartner, setIsApprovedPartner] = useState(false);
  const [partner, setPartner] = useState<CXBCPartner | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<'pending' | 'under_review' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPartnerStatus = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setIsApprovedPartner(false);
      setPartner(null);
      setApplicationStatus(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get the current session token to pass to the API
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setIsApprovedPartner(false);
        setPartner(null);
        setApplicationStatus(null);
        return;
      }

      // Use server-side API to bypass RLS
      const res = await fetch('/api/cxbc/partner-status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setIsApprovedPartner(false);
        setPartner(null);
        setApplicationStatus(null);
        return;
      }

      const data = await res.json();

      if (data.isPartner && data.partner) {
        setIsApprovedPartner(true);
        setPartner(data.partner as CXBCPartner);
        setApplicationStatus(null);
      } else {
        setIsApprovedPartner(false);
        setPartner(null);
        setApplicationStatus(data.applicationStatus ?? null);
      }
    } catch (err) {
      console.error('Error in useCXBCAuth:', err);
      setError('Failed to verify partner status');
      setIsApprovedPartner(false);
      setPartner(null);
      setApplicationStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPartnerStatus();
  }, [fetchPartnerStatus]);

  return {
    isLoading,
    isApprovedPartner,
    partner,
    applicationStatus,
    error,
    refetch: fetchPartnerStatus,
  };
};
