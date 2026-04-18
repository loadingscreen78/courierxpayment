"use client";

import { Suspense } from 'react';
import UnifiedRegistration from '@/views/UnifiedRegistration';
import { CircleNotch } from '@phosphor-icons/react';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
          <CircleNotch size={32} weight="bold" className="animate-spin text-[#1A1A2E]" />
        </div>
      }
    >
      <UnifiedRegistration />
    </Suspense>
  );
}
