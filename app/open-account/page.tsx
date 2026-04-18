"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect legacy /open-account to the new unified /register flow
export default function OpenAccountPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/register');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
