"use client";

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle, CircleNotch, Warning, ArrowRight, UserPlus,
  Package, Copy, DownloadSimple, Clock, Info, Phone, Shield, X,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { sendFirebaseOtp, verifyFirebaseOtp, clearOtpSession } from '@/lib/firebase/phoneAuth';

const RESEND_SECONDS = 120;

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

// ---------------------------------------------------------------------------
// OTP Modal — reused from PublicTracking, 2-min timer
// ---------------------------------------------------------------------------
function OTPModal({
  phone,
  onVerify,
  onResend,
  onClose,
  error: externalError,
}: {
  phone: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onClose: () => void;
  error?: string;
}) {
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setResendTimer(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  const handleResend = () => { onResend(); setResendTimer(RESEND_SECONDS); setOtp(''); };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-foreground">Verify to Track</h3>
            <p className="text-sm text-muted-foreground mt-1">
              OTP sent to +91 {phone.slice(0, 2)}****{phone.slice(-2)}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {externalError && (
          <p className="text-sm text-destructive text-center mb-4">{externalError}</p>
        )}

        <Button
          className="w-full h-12 bg-coke-red hover:bg-coke-red/90"
          onClick={() => { setVerifying(true); onVerify(otp); }}
          disabled={otp.length !== 6 || verifying}
        >
          <Shield size={20} weight="bold" className="mr-2" />
          {verifying ? 'Verifying...' : 'Verify & Track'}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {resendTimer > 0 ? (
            <>Resend OTP in <span className="font-semibold">{fmt(resendTimer)}</span></>
          ) : (
            <button className="text-coke-red hover:underline font-medium" onClick={handleResend}>
              Resend OTP
            </button>
          )}
        </p>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main confirm content
// ---------------------------------------------------------------------------
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
  const [senderPhone, setSenderPhone] = useState('');

  // OTP modal state
  const [showOTP, setShowOTP] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [showManualPhone, setShowManualPhone] = useState(false);

  useEffect(() => {
    if (!orderId) { router.replace('/public/book'); return; }
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
          setSenderPhone(data.senderPhone || '');
          setPhase('success');
          if (data.error) setErrorMsg(data.error);
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

  // Determine which phone to use for OTP
  const activePhone = senderPhone || manualPhone;

  const handleTrackShipment = async () => {
    if (!activePhone || activePhone.length !== 10) {
      setShowManualPhone(true);
      return;
    }
    setOtpError('');
    const result = await sendFirebaseOtp(`+91${activePhone}`);
    if (!result.success) {
      toast({ title: 'Error', description: result.error || 'Failed to send OTP', variant: 'destructive' });
      return;
    }
    setShowOTP(true);
  };

  const handleOTPVerify = async (otp: string) => {
    setOtpError('');
    const result = await verifyFirebaseOtp(otp);
    if (!result.success) {
      setOtpError(result.error || 'Invalid OTP. Please try again.');
      return;
    }
    setShowOTP(false);
    clearOtpSession();
    // Navigate to tracking page with the tracking number
    router.push(`/public/track?tracking=${encodeURIComponent(trackingNumber)}`);
  };

  const handleOTPResend = async () => {
    setOtpError('');
    await sendFirebaseOtp(`+91${activePhone}`);
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
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
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
      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container" />

      <AnimatePresence>
        {showOTP && (
          <OTPModal
            phone={activePhone}
            onVerify={handleOTPVerify}
            onResend={handleOTPResend}
            onClose={() => { setShowOTP(false); clearOtpSession(); setOtpError(''); }}
            error={otpError}
          />
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <img alt="CourierX" src="/logo.svg" className="h-9 w-auto object-contain" />
          </Link>
        </div>
      </header>

      <main className="container max-w-lg py-8 sm:py-12 px-3 sm:px-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
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
          <div className="rounded-xl border border-amber-300/30 bg-amber-50/50 dark:bg-amber-900/10 p-4 text-left">
            <p className="text-sm text-muted-foreground">
              Account-based bookings with lower rates are coming soon. Stay tuned!
            </p>
          </div>

          {/* Manual phone input if senderPhone not available */}
          <AnimatePresence>
            {showManualPhone && !senderPhone && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-muted/50 border border-border text-left space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Phone size={16} className="text-coke-red" />
                    Enter your booking phone number
                  </p>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-3 rounded-l-lg bg-muted border border-r-0 border-border text-muted-foreground text-sm">
                      +91
                    </span>
                    <Input
                      placeholder="10-digit mobile"
                      value={manualPhone}
                      onChange={e => setManualPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="flex-1 rounded-l-none border-l-0 h-10"
                    />
                    <Button
                      size="sm"
                      className="bg-coke-red hover:bg-red-600 text-white h-10 px-4"
                      disabled={manualPhone.length !== 10}
                      onClick={async () => {
                        setShowManualPhone(false);
                        const result = await sendFirebaseOtp(`+91${manualPhone}`);
                        if (!result.success) {
                          toast({ title: 'Error', description: result.error || 'Failed to send OTP', variant: 'destructive' });
                          return;
                        }
                        setShowOTP(true);
                      }}
                    >
                      Send OTP
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={handleTrackShipment}
            >
              <Phone className="h-4 w-4" />
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
