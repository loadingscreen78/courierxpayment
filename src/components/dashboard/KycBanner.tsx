"use client";

import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export function KycBanner() {
  const { profile } = useAuth();
  const router = useRouter();

  // Don't show if KYC is already completed
  if (profile?.kyc_completed_at) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="p-2.5 rounded-xl bg-amber-500/10 shrink-0">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Complete your KYC to unlock lower rates</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verify your identity and upload documents to get 25% lower shipping rates and full account features.
          </p>
        </div>
        <Button
          onClick={() => router.push('/auth/kyc')}
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shrink-0"
        >
          Complete KYC <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
