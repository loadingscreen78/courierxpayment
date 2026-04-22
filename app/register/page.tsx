"use client";

import { Suspense } from 'react';
import { Construction } from 'lucide-react';
import { CircleNotch } from '@phosphor-icons/react';
import Link from 'next/link';
import UnifiedRegistration from '@/views/UnifiedRegistration';
import { useDevAccess } from '@/hooks/useDevAccess';

function RegLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <CircleNotch size={32} weight="bold" className="animate-spin text-[#1A1A2E]" />
    </div>
  );
}

function UnderDevelopment() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Construction className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Account Registration Coming Soon</h1>
          <p className="text-muted-foreground">
            This feature is currently under development. We&apos;re building something great — stay tuned!
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          You can still book shipments as a guest — no account needed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-coke-red hover:bg-red-600 text-white font-semibold transition-colors">
            Go Home
          </Link>
          <Link href="/public/book" className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-border hover:bg-muted/60 font-semibold transition-colors">
            Book as Guest
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { hasDev, loading } = useDevAccess();

  if (loading) return <RegLoading />;

  if (!hasDev) return <UnderDevelopment />;

  return (
    <Suspense fallback={<RegLoading />}>
      <UnifiedRegistration />
    </Suspense>
  );
}
