"use client";

import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Lock } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';

interface KycGateProps {
  /** Section name shown in the message */
  section?: string;
}

/**
 * Full-page KYC gate shown to account holders whose KYC is not yet verified.
 * Only the History section is accessible without KYC.
 */
export function KycGate({ section = 'this section' }: KycGateProps) {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full mx-auto text-center px-4"
        >
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
            <Lock className="h-9 w-9 text-amber-600" weight="bold" />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold font-typewriter mb-2">Verify Your KYC</h2>
          <p className="text-muted-foreground text-sm mb-6">
            To access <span className="font-semibold text-foreground">{section}</span>, you need to complete your KYC verification. This keeps your account secure and unlocks all features.
          </p>

          {/* Feature list */}
          <div className="bg-muted/40 border border-border/50 rounded-2xl p-4 mb-6 text-left space-y-2.5">
            {[
              'Book & track shipments',
              'Access wallet & billing',
              'Save addresses in vault',
              'Lower shipping rates',
              'Full account features',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" weight="bold" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => router.push('/auth/kyc')}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2 rounded-xl h-11"
          >
            Complete KYC Verification
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            You can still view your{' '}
            <button
              onClick={() => router.push('/history')}
              className="text-foreground underline underline-offset-2"
            >
              shipment history
            </button>{' '}
            while your KYC is pending.
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
