"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type TourStep = 0 | 1 | 2 | 3;

interface OnboardingTourContextType {
  /** Whether the tour panel is currently visible */
  isOpen: boolean;
  /** Current step index (0-3) */
  currentStep: TourStep;
  /** Advance to the next step; on the last step this completes the tour */
  nextStep: () => void;
  /** Skip / dismiss the tour permanently */
  skipTour: () => void;
  /** The sidebar href that should be highlighted for the current step */
  highlightedHref: string | null;
}

const OnboardingTourContext = createContext<OnboardingTourContextType | undefined>(undefined);

const TOUR_STEPS = [
  { href: '/auth/kyc' },
  { href: '/new-shipment' },
  { href: '/wallet' },
  { href: null }, // "Explore" step — no specific sidebar item
] as const;

export const OnboardingTourProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<TourStep>(0);

  // Show tour only for authenticated users who haven't completed it
  useEffect(() => {
    if (!user || !profile) return;

    // Check localStorage first (fast), then fall back to profile field
    const localKey = `courierx_tour_done_${user.id}`;
    const localDone = typeof window !== 'undefined' && localStorage.getItem(localKey) === '1';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileDone = !!(profile as any).onboarding_tour_completed;

    if (!localDone && !profileDone) {
      // Auto-skip KYC step if already verified
      const startStep: TourStep = profile.aadhaar_verified ? 1 : 0;
      setIsOpen(true);
      setCurrentStep(startStep);
    }
  }, [user, profile]);

  const markComplete = useCallback(async () => {
    if (!user) return;
    // Persist locally immediately
    const localKey = `courierx_tour_done_${user.id}`;
    localStorage.setItem(localKey, '1');

    // Persist to DB (best-effort)
    await supabase
      .from('profiles')
      .update({ onboarding_tour_completed: true } as Record<string, unknown>)
      .eq('user_id', user.id);
  }, [user]);

  const nextStep = useCallback(() => {
    if (currentStep < 3) {
      setCurrentStep((s) => (s + 1) as TourStep);
    } else {
      // Final step — close and mark complete
      setIsOpen(false);
      markComplete();
    }
  }, [currentStep, markComplete]);

  const skipTour = useCallback(() => {
    setIsOpen(false);
    markComplete();
  }, [markComplete]);

  const highlightedHref = isOpen ? (TOUR_STEPS[currentStep].href ?? null) : null;

  const value = useMemo(() => ({
    isOpen,
    currentStep,
    nextStep,
    skipTour,
    highlightedHref,
  }), [isOpen, currentStep, nextStep, skipTour, highlightedHref]);

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}
    </OnboardingTourContext.Provider>
  );
};

export const useOnboardingTour = () => {
  const ctx = useContext(OnboardingTourContext);
  if (!ctx) throw new Error('useOnboardingTour must be used within OnboardingTourProvider');
  return ctx;
};
