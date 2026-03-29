'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLoader } from '@/components/ui/AppLoader';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/open-account');
  }, [router]);

  return <AppLoader />;
}
