"use client";

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, PaperPlaneTilt, Wallet, Compass, X } from '@phosphor-icons/react';
import { useOnboardingTour, TourStep } from '@/contexts/OnboardingTourContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const STEPS: {
  title: string;
  description: string;
  cta: string;
  icon: React.ElementType;
  href: string;
}[] = [
  {
    title: 'KYC Verification',
    description: 'Verify your identity to unlock full shipping capabilities. This only takes a few minutes.',
    cta: 'Complete KYC Now',
    icon: Shield,
    href: '/auth/kyc',
  },
  {
    title: 'New Shipment',
    description: 'Book your first domestic or international shipment directly from the dashboard.',
    cta: 'Create a Shipment',
    icon: PaperPlaneTilt,
    href: '/new-shipment',
  },
  {
    title: 'Wallet Recharge',
    description: 'Add funds to your Courier X wallet to enable seamless booking without payment interruptions.',
    cta: 'Recharge Wallet',
    icon: Wallet,
    href: '/wallet',
  },
  {
    title: 'Explore the Panel',
    description: 'Discover tracking, reports, support, and account settings — everything is a click away.',
    cta: 'Get Started',
    icon: Compass,
    href: '/dashboard',
  },
];

/* ─── Step Tracker ─── */
const StepTracker = ({ current, kycDone }: { current: TourStep; kycDone: boolean }) => (
  <div className="flex items-center justify-center gap-0 w-full px-2">
    {STEPS.map((_, i) => {
      const completed = i < current || (i === 0 && kycDone);
      const active = i === current;
      return (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          {/* Node */}
          <div className="relative flex items-center justify-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 z-10',
                completed && 'bg-[#1A1A2E] text-white',
                active && !completed && 'bg-[#1A1A2E] text-white',
                !completed && !active && 'bg-transparent border-2 border-gray-300 text-gray-400',
              )}
            >
              {completed ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {/* Pulse ring for active */}
            {active && !completed && (
              <span className="absolute inset-0 rounded-full animate-ping bg-[#1A1A2E]/30" style={{ animationDuration: '1.8s' }} />
            )}
          </div>
          {/* Connector line */}
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-0.5 mx-1">
              <div
                className={cn(
                  'h-full rounded-full transition-colors duration-300',
                  i < current || (i === 0 && kycDone) ? 'bg-[#1A1A2E]' : 'bg-gray-200',
                )}
              />
            </div>
          )}
        </div>
      );
    })}
  </div>
);

/* ─── Main Panel ─── */
export const OnboardingTourPanel = () => {
  const { isOpen, currentStep, nextStep, skipTour } = useOnboardingTour();
  const { profile } = useAuth();
  const router = useRouter();

  const step = STEPS[currentStep];
  const StepIcon = step.icon;
  const displayName = profile?.full_name?.split(' ')[0] || 'there';
  const isLastStep = currentStep === 3;
  const kycDone = !!(profile?.aadhaar_verified || profile?.kyc_verified);

  const handleCta = () => {
    if (isLastStep) {
      nextStep(); // closes panel
    } else {
      router.push(step.href);
      nextStep();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: 340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 340, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="fixed right-4 top-4 bottom-4 w-[320px] z-50 hidden lg:flex flex-col"
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}
        >
          {/* Close button */}
          <button
            onClick={skipTour}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors z-10"
            aria-label="Close tour"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>

          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-[#1A1A2E] flex items-center justify-center">
                <span className="text-white text-xs font-bold">CX</span>
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Courier X</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight font-sans">
              Welcome{displayName !== 'there' ? `, ${displayName}` : ''}! <br />
              <span className="text-[#1A1A2E]/70">Let&apos;s get you set up</span>
            </h2>
          </div>

          {/* Step Tracker */}
          <div className="px-6 pb-5">
            <StepTracker current={currentStep} kycDone={kycDone} />
          </div>

          {/* Divider */}
          <div className="mx-6 h-px bg-[#F3F4F6]" />

          {/* Step Content */}
          <div className="flex-1 flex flex-col px-6 pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col"
              >
                {/* Step label */}
                <p className="text-xs font-semibold text-[#1A1A2E]/50 uppercase tracking-wider mb-3">
                  Step {currentStep + 1} of {STEPS.length}
                </p>

                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl bg-[#1A1A2E]/5 flex items-center justify-center mb-4">
                  <StepIcon className="h-6 w-6 text-[#1A1A2E]" weight="duotone" />
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-gray-900 font-sans mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-4 space-y-3">
            {/* CTA Button */}
            <motion.button
              whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(26,26,46,0.2)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCta}
              className="w-full h-12 rounded-lg bg-[#1A1A2E] text-white text-sm font-semibold transition-all duration-200 hover:bg-[#1A1A2E]/90"
            >
              {step.cta}
            </motion.button>

            {/* Skip Tour */}
            {!isLastStep && (
              <button
                onClick={skipTour}
                className="w-full text-center text-xs text-[#6B7280] hover:text-gray-900 transition-colors py-1"
              >
                Skip Tour
              </button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
