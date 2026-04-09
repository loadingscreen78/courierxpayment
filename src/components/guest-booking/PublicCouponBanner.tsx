"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Sparkle, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { feedbackPresets } from '@/lib/haptics';

interface PublicCouponBannerProps {
  onApply: (code: string) => void;
  isApplied: boolean;
  isLoading: boolean;
}

export function PublicCouponBanner({ onApply, isApplied, isLoading }: PublicCouponBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || isApplied) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative overflow-hidden rounded-xl border-2 border-coke-red/30 bg-gradient-to-br from-coke-red/5 via-coke-red/10 to-orange-500/10 p-5"
      >
        {/* Animated background sparkles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-coke-red/10 to-orange-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              rotate: [360, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-orange-500/10 to-coke-red/10 rounded-full blur-3xl"
          />
        </div>

        {/* Close button */}
        <button
          onClick={() => {
            feedbackPresets.tap();
            setIsDismissed(true);
          }}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors z-10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" weight="bold" />
        </button>

        <div className="relative flex items-center gap-4">
          {/* Animated coupon icon */}
          <motion.div
            animate={{
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
            }}
            className="shrink-0"
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-coke-red to-orange-600 flex items-center justify-center shadow-lg">
                <Tag className="h-7 w-7 text-white" weight="fill" />
              </div>
              {/* Sparkle effects */}
              <motion.div
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
                className="absolute -top-1 -right-1"
              >
                <Sparkle className="h-4 w-4 text-yellow-400" weight="fill" />
              </motion.div>
              <motion.div
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                  delay: 0.3,
                }}
                className="absolute -bottom-1 -left-1"
              >
                <Sparkle className="h-3 w-3 text-yellow-400" weight="fill" />
              </motion.div>
            </div>
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2 flex-wrap">
                <span>Get 10% Off</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-coke-red/20 text-coke-red text-xs font-semibold">
                  <Sparkle className="h-3 w-3" weight="fill" />
                  Public Offer
                </span>
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Use code <span className="font-mono font-bold text-coke-red">WELCOME10</span> at checkout
              </p>
            </motion.div>
          </div>

          {/* Apply button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="shrink-0"
          >
            <Button
              onClick={() => {
                feedbackPresets.tap();
                onApply('WELCOME10');
              }}
              disabled={isLoading}
              className="bg-gradient-to-r from-coke-red to-orange-600 hover:from-coke-red/90 hover:to-orange-600/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Tag className="h-4 w-4" />
                </motion.div>
              ) : (
                'Apply Now'
              )}
            </Button>
          </motion.div>
        </div>

        {/* Decorative dashed border effect */}
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-coke-red/20 pointer-events-none" />
      </motion.div>
    </AnimatePresence>
  );
}
