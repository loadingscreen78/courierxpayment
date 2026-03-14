'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, CreditCard, Smartphone, Building2, Shield, RefreshCw } from 'lucide-react';
import { PaymentStatus, PaymentMethod } from '@/lib/wallet/types';
import { cn } from '@/lib/utils';

interface PaymentLoadingOverlayProps {
  isOpen: boolean;
  status: PaymentStatus;
  message: string;
  amount: number;
  method: PaymentMethod;
  onClose?: () => void;
  onRetry?: () => void;
}

const methodConfig: Record<PaymentMethod, { icon: React.ElementType; label: string; color: string }> = {
  upi: { icon: Smartphone, label: 'UPI Payment', color: 'text-purple-500' },
  card: { icon: CreditCard, label: 'Card Payment', color: 'text-blue-500' },
  netbanking: { icon: Building2, label: 'Net Banking', color: 'text-green-500' },
};

export function PaymentLoadingOverlay({
  isOpen,
  status,
  message,
  amount,
  method,
  onClose,
  onRetry,
}: PaymentLoadingOverlayProps) {
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => onClose?.(), 2200);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  const isProcessing = status === 'pending' || status === 'processing';
  const isSuccess = status === 'success';
  const isFailed = status === 'failed';

  const { icon: MethodIcon, label: methodLabel } = methodConfig[method] || methodConfig.upi;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative z-10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Top gradient header */}
            <div className={cn(
              "px-6 py-5 transition-colors duration-500",
              isSuccess ? "bg-gradient-to-br from-green-900 to-green-950" :
              isFailed ? "bg-gradient-to-br from-red-950 to-[#1a0a0a]" :
              "bg-gradient-to-br from-[#1a1a1a] to-[#2d1010]"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl",
                  isSuccess ? "bg-green-500/20" : isFailed ? "bg-red-500/20" : "bg-white/10"
                )}>
                  <MethodIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">{methodLabel}</p>
                  <p className="font-typewriter text-2xl font-bold text-white">
                    ₹{amount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Status body */}
            <div className="bg-card px-6 py-8 flex flex-col items-center">
              {/* Animated status icon */}
              <div className="relative mb-5">
                {isProcessing && (
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    {/* Spinning ring */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border-4 border-transparent border-t-coke-red"
                    />
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-2 rounded-full border-4 border-transparent border-t-red-400/40"
                    />
                    <Shield className="h-7 w-7 text-coke-red" />
                  </div>
                )}

                {isSuccess && (
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                    className="relative"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                    </div>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.8 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full bg-green-500/20"
                    />
                  </motion.div>
                )}

                {isFailed && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                    className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center"
                  >
                    <XCircle className="h-10 w-10 text-destructive" />
                  </motion.div>
                )}
              </div>

              {/* Message */}
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "text-center font-semibold text-base",
                  isSuccess && 'text-green-600',
                  isFailed && 'text-destructive',
                  isProcessing && 'text-foreground'
                )}
              >
                {message}
              </motion.p>

              {/* Processing dots */}
              {isProcessing && (
                <div className="flex gap-1.5 mt-3">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-coke-red"
                      animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                    />
                  ))}
                </div>
              )}

              {/* Retry / Cancel for failed */}
              {isFailed && (
                <div className="flex gap-3 mt-6 w-full">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground border border-border/60 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onRetry}
                    className="flex-1 py-3 text-sm font-semibold bg-coke-red hover:bg-red-600 text-white rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-coke-red/25"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Security footer */}
            {isProcessing && (
              <div className="bg-muted/50 border-t border-border/40 px-6 py-3 flex items-center justify-center gap-2">
                <Shield className="h-3.5 w-3.5 text-green-500 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Secured by Cashfree · Do not close this window
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PaymentLoadingOverlay;
