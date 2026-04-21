"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkle, Package, MagnifyingGlass } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroCTAForm } from './HeroCTAForm';

const rotatingWords = ['Essentials', 'Medicines', 'Documents', 'Gifts', 'Parcels'];

// ── Mobile CTA Lightbox ──────────────────────────────────────────────────────

const MobileCTALightbox = ({
  open,
  defaultTab,
  onClose,
}: {
  open: boolean;
  defaultTab: 'ship' | 'track';
  onClose: () => void;
}) => {
  const scrollStartY = useRef<number | null>(null);
  const SCROLL_THRESHOLD = 60; // px of scroll to dismiss

  // Track scroll to dismiss lightbox
  useEffect(() => {
    if (!open) return;

    const handleTouchStart = (e: TouchEvent) => {
      scrollStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (scrollStartY.current === null) return;
      const delta = scrollStartY.current - e.touches[0].clientY;
      if (delta > SCROLL_THRESHOLD) {
        onClose();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 30) onClose();
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Blurred backdrop — covers full screen */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[60] backdrop-blur-xl"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
          />

          {/* Centred wrapper — true vertical + horizontal centre */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8 pointer-events-none">
            <motion.div
              key="lightbox"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto w-full"
              style={{ maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
            >
              {/* Neumorphism card */}
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #f2f2f2, #c8c8c8)',
                  boxShadow:
                    '24px 24px 64px rgba(0,0,0,0.28), -12px -12px 40px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
                }}
              >
                {/* Dark mode neumorphism overlay */}
                <div
                  className="absolute inset-0 rounded-3xl pointer-events-none dark:block hidden"
                  style={{
                    background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                    boxShadow:
                      'inset 4px 4px 8px rgba(0,0,0,0.4), inset -4px -4px 8px rgba(255,255,255,0.05)',
                  }}
                />

                {/* Scroll-to-dismiss hint */}
                <p className="text-center text-xs text-muted-foreground pt-4 pb-1 px-4">
                  Scroll down to dismiss
                </p>

                {/* CTA Form */}
                <div className="p-4 relative z-[1]">
                  <HeroCTAForm defaultTab={defaultTab} />
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Hero Section ─────────────────────────────────────────────────────────────

export const HeroSection = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxTab, setLightboxTab] = useState<'ship' | 'track'>('ship');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const openLightbox = useCallback((tab: 'ship' | 'track') => {
    setLightboxTab(tab);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  return (
    <section className="relative min-h-[60vh] sm:min-h-[67.5vh] flex items-center overflow-x-clip">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />

      {/* Floating Particles - hidden on mobile for cleanliness */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
        {[
          { left: 15, top: 60, xOffset: 10 },
          { left: 30, top: 70, xOffset: -15 },
          { left: 45, top: 80, xOffset: 8 },
          { left: 60, top: 65, xOffset: -12 },
          { left: 75, top: 75, xOffset: 15 },
          { left: 90, top: 70, xOffset: -8 },
        ].map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 100 }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              y: [-20, -100, -20],
              x: [0, p.xOffset, 0],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              delay: i * 0.8,
              ease: 'easeInOut',
            }}
            className="absolute w-2 h-2 rounded-full bg-coke-red/30"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
          />
        ))}
      </div>

      {/* Subtle Pattern — hidden on mobile */}
      <div
        className="absolute inset-0 opacity-[0.015] hidden sm:block"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container relative z-10 py-12 sm:py-12 md:py-[60px]">
        <div className="grid lg:grid-cols-2 gap-[30px] lg:gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-[18px] sm:space-y-6">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs sm:text-sm font-medium"
            >
              <Sparkle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-coke-red" />
              <span>India&apos;s Only Person to Person Courier Booking Platform</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-6xl font-bold font-typewriter sm:leading-tight tracking-tight"
              suppressHydrationWarning
            >
              Send{' '}
              <span
                className="inline-flex items-center h-[1.2em] overflow-hidden align-bottom min-w-[180px] sm:min-w-[280px]"
                suppressHydrationWarning
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentWordIndex}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="text-coke-red inline-block"
                  >
                    {rotatingWords[currentWordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
              <br />
              <span className="text-primary">to Your Close Ones</span>
            </motion.h1>

            {/* Description — shorter on mobile */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-[15px] sm:text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed"
            >
              <span className="sm:hidden">
                India&apos;s only person to person courier booking. Send medicines, documents, gifts &amp; parcels across India &amp; worldwide.
              </span>
              <span className="hidden sm:inline">
                India&apos;s only person to person courier booking platform. Book domestic and international courier online — send medicines, documents, gifts and personal parcels door-to-door across India and to 150+ countries.
              </span>
            </motion.p>

            {/* ── Mobile / Tablet CTA Buttons (hidden on lg+) ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="flex gap-3 lg:hidden"
            >
              {/* Ship Now */}
              <button
                onClick={() => openLightbox('ship')}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-sm font-semibold text-white transition-all duration-200 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #e8192c 0%, #c0141f 100%)',
                  boxShadow:
                    '0 4px 15px rgba(232,25,44,0.4), 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <Package className="h-4 w-4" weight="bold" />
                Ship Now
              </button>

              {/* Track Order */}
              <button
                onClick={() => openLightbox('track')}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-sm font-semibold transition-all duration-200 active:scale-95"
                style={{
                  background: 'linear-gradient(145deg, #f0f0f0, #d8d8d8)',
                  boxShadow:
                    '6px 6px 12px rgba(0,0,0,0.12), -6px -6px 12px rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,0.9)',
                  color: '#1a1a1a',
                }}
              >
                <MagnifyingGlass className="h-4 w-4" weight="bold" />
                Track Order
              </button>
            </motion.div>

            {/* Carrier Logos — hidden on mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="hidden sm:block pt-6 border-t border-border/50"
            >
              <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
                Trusted Carrier Partners — Domestic &amp; International
              </p>
              <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                {['DHL', 'FedEx', 'Aramex', 'BlueDart', 'DTDC', 'Delhivery', 'ShipGlobal'].map((carrier) => (
                  <span
                    key={carrier}
                    className="font-bold text-lg tracking-tight cursor-default opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-75"
                  >
                    {carrier}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Visual - CTA Form (desktop only) */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative w-full hidden lg:block"
          >
            <HeroCTAForm />
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      {/* Mobile / Tablet Lightbox */}
      <MobileCTALightbox
        open={lightboxOpen}
        defaultTab={lightboxTab}
        onClose={closeLightbox}
      />
    </section>
  );
};
