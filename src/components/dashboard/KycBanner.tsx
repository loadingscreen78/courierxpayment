"use client";

import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, ArrowRight, IdentificationCard, CheckCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const KYC_STEPS = ['Aadhaar Number', 'DigiLocker Verify', 'Confirmation'];

export function KycBanner() {
  const { profile } = useAuth();
  const router = useRouter();

  // Don't show if KYC is already completed
  if (profile?.kyc_completed_at || profile?.aadhaar_verified) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 mb-4"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-2.5 rounded-xl bg-amber-500/10 shrink-0">
          <IdentificationCard className="h-5 w-5 text-amber-600" weight="bold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Complete your KYC verification</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            Verify your identity to unlock full account features and lower shipping rates.
          </p>
          {/* 3-step progress */}
          <div className="flex items-center gap-2">
            {KYC_STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-amber-700">{i + 1}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">{label}</span>
                </div>
                {i < KYC_STEPS.length - 1 && (
                  <div className="w-4 h-px bg-amber-500/30" />
                )}
              </div>
            ))}
          </div>
        </div>
        <Button
          onClick={() => router.push('/auth/kyc')}
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shrink-0"
        >
          Start KYC <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
