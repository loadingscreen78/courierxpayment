"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Construction } from 'lucide-react';
import Link from 'next/link';
import { useDevAccess } from '@/hooks/useDevAccess';

export default function OpenAccountPage() {
  const router = useRouter();
  const { hasDev, loading } = useDevAccess();

  // Dev team: redirect to /register (the real flow)
  useEffect(() => {
    if (!loading && hasDev) {
      router.replace('/register');
    }
  }, [loading, hasDev, router]);

  if (loading || hasDev) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Construction className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Account Opening Coming Soon</h1>
          <p className="text-muted-foreground">
            This feature is currently under development. We&apos;re working on it!
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
