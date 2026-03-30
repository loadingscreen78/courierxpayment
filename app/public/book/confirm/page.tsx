"use client";

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle, CircleNotch, Warning, ArrowRight, UserPlus,
  Package, Copy, DownloadSimple, Clock, Info,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function GuestBookingConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CircleNotch className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const verifyCalledRef = useRef(false);

  const orderId = searchParams.get('order_id');
  const trackingFromUrl = searchParams.get('tracking') || '';

  const [phase, setPhase] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [trackingNumber, setTrackingNumber] = useState(trackingFromUrl);
  const [awbUrl, setAwbUrl] = useState('');
  const [awb, setAwb] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!orderId) {
      router.replace('/public/book');
      return;
    }

    // Prevent double-call in React strict mode
    if (verifyCalledRef.current) return;
    verifyCalledRef.current = true;

    async function verifyPayment() {
      try {
        const res = await fetch('/api/cashfree/verify-guest-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();

        if (data.success) {
          setTrackingNumber(data.trackingNumber || trackingFromUrl);
          setAwbUrl(data.awbUrl || '');
          setAwb(data.awb || '');
          setPhase('success');
          if (data.error) {
            // Partial success — shipment creation may have failed
            setErrorMsg(data.error);
          }
        } else {
          setErrorMsg(data.error || 'Payment verification failed');
          setPhase('failed');
        }
      } catch {
        setErrorMsg('Unable to verify payment. Please contact support.');
        setPhase('failed');
      }
    }

    verifyPayment();
  }, [orderId, trackingFromUrl, router]);

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(trackingNumber);
    toast({ title: 'Copied', description: 'Tracking number copied to clipboard.' });
  };

  // ── Verifying phase ──
  if (phase === 'verifying') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <img alt="CourierX" src="/logo.svg" className="h-9 w-auto object-contain" />
            </Link>
          </div>
        </header>
        <main className="container max-w-lg py-16 text-center space-y-6">
          <CircleNotch className="h-12 w-12 text-coke-red animate-spin mx-auto" />
          <div>
            <h1 className="text-xl font-bold">Verifying Payment...</h1>
            <p className="text-muted-foreground mt-2 text-sm">Please wait while we confirm your payment and create your shipment.</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Failed phase ──
  if (phase === 'failed') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <img alt="CourierX" src="/logo.svg" className="h-9 w-auto object-contain" />
            </Link>
          </div>
        </header>
        <main className="container max-w-lg py-8 sm:py-12 px-3 sm:px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl border border-border p-5 sm:p-8 text-center space-y-5 sm:space-y-6"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Warning className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" weight="fill" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Payment Issue</h1>
              <p className="text-muted-foreground mt-2">{errorMsg}</p>
              {orderId && (
                <p className="text-xs text-muted-foreground mt-3">
                  Order ID: <span className="font-mono">{orderId}</span>
                </p>
              )}
            </div>
            <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-left">
              <p className="text-sm">
                If money was deducted, don&apos;t worry — contact our support team with your Order ID and we&apos;ll resolve it within 24 hours.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => router.push('/contact')}>
                Contact Support
              </Button>
              <Button className="flex-1 bg-coke-red hover:bg-red-600 text-white" onClick={() => router.push('/public/book')}>
                Try Again
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // ── Success phase ──
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <img alt="CourierX" src="/logo.svg" className="h-9 w-auto object-contain" />
          </Link>
        </div>
      </header>

      <main className="container max-w-lg py-8 sm:py-12 px-3 sm:px-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-xl border border-border p-5 sm:p-8 text-center space-y-5 sm:space-y-6"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-candlestick-green/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-candlestick-green" weight="fill" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Shipment Booked!</h1>
            <p className="text-muted-foreground mt-2">
              Your shipment has been confirmed and is being processed.
            </p>
          </div>

          {/* Tracking number */}
          {trackingNumber && (
            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <p className="text-xs text-muted-foreground mb-1">Tracking Number</p>
              <div className="flex items-center gap-2 sm:gap-3">
                <p className="text-sm sm:text-lg font-mono font-bold flex-1 break-all">{trackingNumber}</p>
                <Button variant="outline" size="sm" onClick={handleCopyTracking} className="gap-1.5 shrink-0">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
              </div>
            </div>
          )}

          {/* AWB Download */}
          {awbUrl && (
            <div className="bg-card rounded-xl border-2 border-dashed border-coke-red/30 p-5 text-center space-y-3">
              <DownloadSimple className="h-8 w-8 text-coke-red mx-auto" weight="duotone" />
              <div>
                <h3 className="font-semibold">Download AWB Label</h3>
                <p className="text-sm text-muted-foreground mt-1">Print this label and paste it on the top of your package.</p>
              </div>
              <Button
                className="bg-coke-red hover:bg-red-600 text-white gap-2"
                onClick={() => window.open(awbUrl)}
              >
                <DownloadSimple className="h-4 w-4" /> Download AWB Label
              </Button>
            </div>
          )}

          {/* NimbusPost partial failure warning */}
          {errorMsg && (
            <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-left flex gap-3">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" weight="fill" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">Note</p>
                <p className="text-amber-700/80 dark:text-amber-400/70 mt-1">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Account upsell */}
          <div className="rounded-xl border border-candlestick-green/30 bg-candlestick-green/5 p-4 text-left">
            <p className="text-sm">
              <span className="font-semibold">Want lower rates next time?</span> Open a free account to save 52% on every shipment.
            </p>
            <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => router.push('/open-account')}>
              <UserPlus className="h-3.5 w-3.5" /> Open Account
            </Button>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/public/track')}>
              Track Shipment
            </Button>
            <Button className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-1.5" onClick={() => router.push('/public/book')}>
              <Package className="h-4 w-4" /> Ship Another
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
