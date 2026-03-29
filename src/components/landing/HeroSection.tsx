"use client";

import { useState, useEffect } from 'react';
import { ArrowRight as ArrowRightLucide } from 'lucide-react';
import { Package, ShieldCheck, Clock, Globe, Sparkle, ArrowRight, UserPlus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { RealtimeShipmentTracker } from './RealtimeShipmentTracker';

const rotatingWords = ['Essentials', 'Medicines', 'Documents', 'Gifts'];

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
    <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      
      {/* Floating Particles - deterministic positions */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

      {/* Subtle Pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      
      <div className="container relative z-10 py-12 sm:py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium"
            >
              <Sparkle className="h-4 w-4 text-coke-red" />
              <span>Shipping to 150+ Countries</span>
            </motion.div>
            
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-typewriter leading-tight tracking-tight"
              suppressHydrationWarning
            >
              Ship Your{' '}
              <span className="inline-flex items-center h-[1.2em] overflow-hidden align-bottom min-w-[200px] sm:min-w-[280px]" suppressHydrationWarning>
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
              Across the <span className="text-primary">Globe</span>
            </motion.h1>
            
            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed"
            >
              India&apos;s trusted international courier aggregator for medicines, documents, and personal gifts. 
              Fast, compliant, and secure shipping worldwide.
            </motion.p>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-wrap gap-4 sm:gap-6 text-sm"
            >
              {[
                { icon: ShieldCheck, text: 'CSB-IV Compliant', color: 'text-candlestick-green' },
                { icon: Clock, text: '3-7 Days Delivery', color: 'text-candlestick-green' },
                { icon: Package, text: '1,400+ Shipments', color: 'text-candlestick-green' },
              ].map((badge, i) => (
                <motion.div
                  key={badge.text}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <badge.icon className={`h-5 w-5 ${badge.color}`} />
                  <span>{badge.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-wrap gap-3 sm:gap-4"
            >
              <Button 
                size="lg" 
                className="group gap-2 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-coke-red hover:bg-coke-red/90 shadow-lg shadow-coke-red/25 transition-all duration-300 hover:shadow-xl hover:shadow-coke-red/30 hover:-translate-y-0.5 flex-1 sm:flex-none"
                onClick={() => router.push('/public/book')}
              >
                Ship Now
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" weight="bold" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="group gap-2 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 border-2 hover:bg-primary/5 transition-all duration-300 hover:-translate-y-0.5 flex-1 sm:flex-none"
                onClick={() => router.push('/open-account')}
              >
                <UserPlus className="h-5 w-5" />
                Open Account
              </Button>
            </motion.div>

            {/* Account Benefit Note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="text-sm text-muted-foreground"
            >
              Account holders save up to <span className="font-semibold text-candlestick-green">52%</span> on every shipment.{' '}
              <button onClick={() => router.push('/open-account')} className="text-coke-red hover:underline font-medium">
                Open a free account →
              </button>
            </motion.p>

            {/* Carrier Logos */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="pt-8 border-t border-border/50"
            >
              <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">Trusted Carrier Partners</p>
              <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                {['DHL', 'FedEx', 'Aramex', 'ShipGlobal'].map((carrier) => (
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

          {/* Right Visual - Real-time Shipment Tracker */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ duration: 1, delay: 0.6 }}
              >
                <RealtimeShipmentTracker />
              </motion.div>
              
              {/* Floating ETA Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.7, type: "spring" }}
                whileHover={{ scale: 1.05 }}
                className="absolute -bottom-4 -left-4 bg-card border border-border rounded-lg p-3 shadow-lg cursor-default"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-candlestick-green" />
                  <span className="text-sm font-medium">ETA: 2-7 days</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
