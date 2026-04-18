"use client";

import { useState, useEffect } from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroCTAForm } from './HeroCTAForm';

const rotatingWords = ['Essentials', 'Medicines', 'Documents', 'Gifts', 'Parcels'];

export const HeroSection = () => {
  const router = useRouter();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center overflow-hidden">
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
              x: [0, p.xOffset, 0]
            }}
            transition={{ 
              duration: 8 + i * 2, 
              repeat: Infinity, 
              delay: i * 0.8,
              ease: "easeInOut"
            }}
            className="absolute w-2 h-2 rounded-full bg-coke-red/30"
            style={{ 
              left: `${p.left}%`, 
              top: `${p.top}%` 
            }}
          />
        ))}
      </div>

      {/* Subtle Pattern — hidden on mobile */}
      <div className="absolute inset-0 opacity-[0.015] hidden sm:block" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      
      <div className="container relative z-10 py-16 sm:py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-6 sm:space-y-8">
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
              <span className="inline-flex items-center h-[1.2em] overflow-hidden align-bottom min-w-[180px] sm:min-w-[280px]" suppressHydrationWarning>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentWordIndex}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{ 
                      duration: 0.5, 
                      ease: [0.22, 1, 0.36, 1]
                    }}
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
              <span className="sm:hidden">India&apos;s only person to person courier booking. Send medicines, documents, gifts &amp; parcels across India &amp; worldwide.</span>
              <span className="hidden sm:inline">India&apos;s only person to person courier booking platform. Book domestic and international courier online — send medicines, documents, gifts and personal parcels door-to-door across India and to 150+ countries.</span>
            </motion.p>

            {/* Trust Badges — hidden on mobile, shown on sm+ */}

            {/* Account Benefit Note — hidden on mobile */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="hidden sm:block text-sm text-muted-foreground"
            >
              Account holders save up to <span className="font-semibold text-candlestick-green">25%</span> on every shipment.{' '}
              <button onClick={() => router.push('/register')} className="text-coke-red hover:underline font-medium">
                Open a free account →
              </button>
            </motion.p>

            {/* Carrier Logos — hidden on mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="hidden sm:block pt-8 border-t border-border/50"
            >
              <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">Trusted Carrier Partners — Domestic &amp; International</p>
              <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                {['DHL', 'FedEx', 'Aramex', 'BlueDart', 'DTDC', 'ShipGlobal'].map((carrier) => (
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

          {/* Right Visual - CTA Form */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative w-full"
          >
            <HeroCTAForm />
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
