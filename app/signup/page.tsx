"use client";

import Link from 'next/link';
import { Construction } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Construction className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Sign Up Coming Soon</h1>
          <p className="text-muted-foreground">
            This feature is currently under development.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-coke-red hover:bg-red-600 text-white font-semibold transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/public/book"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-border hover:bg-muted/60 font-semibold transition-colors"
          >
            Book as Guest
          </Link>
        </div>
      </div>
    </div>
  );
}
