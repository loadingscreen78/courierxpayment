"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { KycGate } from './KycGate';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Redirect to KYC page if not verified (old behaviour) */
  requireKyc?: boolean;
  /**
   * Show an in-page KYC gate instead of redirecting.
   * Use this for sections that should be visible but locked until KYC is done.
   */
  kycGated?: boolean;
  /** Human-readable section name shown in the KYC gate message */
  kycGatedSection?: string;
}

export const ProtectedRoute = ({
  children,
  requireKyc = false,
  kycGated = false,
  kycGatedSection,
}: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  // Extra grace period after initial load to handle post-external-redirect session restore
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Give Supabase a tick to restore session from storage after external redirects
      const t = setTimeout(() => setSettled(true), 300);
      return () => clearTimeout(t);
    }
  }, [loading]);

  useEffect(() => {
    if (settled && !user) {
      router.replace(`/auth?from=${encodeURIComponent(pathname)}`);
    }
  }, [settled, user, pathname, router]);

  useEffect(() => {
    if (!loading && requireKyc && profile && !profile.aadhaar_verified) {
      router.replace(`/auth/kyc?from=${encodeURIComponent(pathname)}`);
    }
  }, [loading, requireKyc, profile, pathname, router]);

  if (loading || !settled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-typewriter">Loading...</p>
        </div>
      </div>
    );
  }

  if (!settled || !user) {
    return null;
  }

  if (requireKyc && profile && !profile.aadhaar_verified) {
    return null;
  }

  // KYC gate: show in-page lock screen instead of redirecting
  if (kycGated && profile && !profile.aadhaar_verified) {
    return <KycGate section={kycGatedSection} />;
  }

  return <>{children}</>;
};
