"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight, CircleNotch, ShieldCheck, Package, MapPin, Airplane,
  CurrencyInr, CheckCircle, Warning, DownloadSimple, Copy,
  Clock, Scissors, SealCheck, Drop, ArrowLeft, Cube, Info,
  Ruler, IdentificationCard, House, Upload, FileText, Camera, X, Eye,
  Pill, Receipt, IdentificationBadge, FolderOpen,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { loadCashfreeScript } from '@/lib/wallet/cashfreeLoader';
import { calculateRate } from '@/lib/shipping/rateCalculator';
import { getCountryByCode } from '@/lib/shipping/countries';
import { motion, AnimatePresence } from 'framer-motion';
import { feedbackPresets } from '@/lib/haptics';
import RouteMap from '@/components/guest-booking/RouteMap';

// ── Types ────────────────────────────────────────────────────────────────────

interface SenderReceiver {
  senderName: string; senderPhone: string; senderEmail: string;
  senderAddress: string; senderCity: string; senderPincode: string;
  receiverName: string; receiverPhone: string; receiverEmail: string;
  receiverAddress: string; receiverCity: string; receiverZipcode: string;
  contentDescription: string;
}

interface GuestSummaryStepProps {
  mode: 'international' | 'domestic';
  rateFormData: any;
  selectedCourier: any;
  senderReceiver: SenderReceiver;
  onBack: () => void;
  extractedAadhaarNumber?: string;
  aadhaarFront?: File | null;
  aadhaarBack?: File | null;
}

type SummaryPhase = 'review' | 'aadhaar' | 'payment' | 'success';

// ── Aadhaar validation ───────────────────────────────────────────────────────

const verhoeffD = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const verhoeffP = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];

function validateVerhoeff(num: string): boolean {
  let c = 0;
  const rev = num.split('').reverse();
  for (let i = 0; i < rev.length; i++) {
    c = verhoeffD[c][verhoeffP[i % 8][parseInt(rev[i], 10)]];
  }
  return c === 0;
}

const formatAadhaar = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 12);
  const p: string[] = [];
  for (let i = 0; i < d.length; i += 4) p.push(d.slice(i, i + 4));
  return p.join(' ');
};

// ── Pickup time logic ────────────────────────────────────────────────────────

function getPickupInfo(): { message: string; isToday: boolean } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const hour = now.getHours();
  const isWeekday = day >= 1 && day <= 5;
  const isSaturday = day === 6;
  const beforeCutoff = hour < 12;

  if (isWeekday && beforeCutoff) {
    return { message: 'Your shipment will be picked up today by end of day.', isToday: true };
  }
  if (isWeekday && !beforeCutoff) {
    return { message: 'Booked after 12 PM cutoff. Pickup will be on the next working day.', isToday: false };
  }
  if (isSaturday && beforeCutoff) {
    return { message: 'Your shipment will be picked up today (Saturday) by end of day.', isToday: true };
  }
  // Saturday after cutoff or Sunday
  return { message: 'Pickup will be on the next working day (Monday).', isToday: false };
}

// ── Packing instructions ─────────────────────────────────────────────────────

const packingSteps = [
  { icon: Cube, title: 'Use a sturdy box', desc: 'Choose a corrugated box that fits your items snugly. Avoid oversized boxes.' },
  { icon: Scissors, title: 'Wrap items individually', desc: 'Wrap each item in bubble wrap or newspaper. Fill gaps with packing peanuts or crumpled paper.' },
  { icon: Drop, title: 'Seal liquids properly', desc: 'For medicines/liquids: seal in zip-lock bags, then wrap in bubble wrap.' },
  { icon: SealCheck, title: 'Seal the box securely', desc: 'Use strong packing tape on all seams. Apply the H-taping method (top, bottom, and sides).' },
];

const documentPackingSteps = [
  { icon: FileText, title: 'Use a rigid envelope or folder', desc: 'Place documents in a stiff cardboard envelope or document folder to prevent bending.' },
  { icon: Drop, title: 'Protect from moisture', desc: 'Seal documents in a zip-lock plastic bag before placing in the envelope to guard against moisture.' },
  { icon: SealCheck, title: 'Seal securely', desc: 'Use strong adhesive tape to seal all edges of the envelope. Do not use staples on the outside.' },
  { icon: Scissors, title: 'Label clearly', desc: 'Attach the shipping label on a flat surface. Ensure the address is fully visible and not covered by tape.' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function GuestSummaryStep({ mode, rateFormData, selectedCourier, senderReceiver, onBack, extractedAadhaarNumber, aadhaarFront, aadhaarBack }: GuestSummaryStepProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = useState<SummaryPhase>('review');
  const [aadhaarInput, setAadhaarInput] = useState(extractedAadhaarNumber || '');
  const [formattedAadhaar, setFormattedAadhaar] = useState(extractedAadhaarNumber ? formatAadhaar(extractedAadhaarNumber) : '');
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [showManualCoupon, setShowManualCoupon] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [awbUrl, setAwbUrl] = useState('');

  // ── Domestic KYC document upload state ──
  const [kycDocType, setKycDocType] = useState<string>('');
  const [kycDocs, setKycDocs] = useState<Record<string, { file: File; previewUrl: string }>>({});
  const [showDocPreview, setShowDocPreview] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDomestic = mode === 'domestic';

  // ── Abandoned booking notification ──
  // Track whether booking was completed to avoid false positives
  const bookingCompletedRef = useRef(false);
  const abandonNotifiedRef = useRef(false);

  // Helper to send abandoned booking notification
  const notifyAbandonedBooking = useCallback((reason?: string) => {
    if (bookingCompletedRef.current || abandonNotifiedRef.current) return;
    abandonNotifiedRef.current = true;

    const effectivePrice = (mode === 'international' && selectedCourier?.price)
      ? selectedCourier.price
      : selectedCourier?.price || selectedCourier?.customer_price || 0;

    fetch('/api/public/guest-booking-abandoned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderReceiver,
        rateFormData,
        selectedCourier,
        amount: effectivePrice,
        mode,
        reason: reason || 'Customer left the summary/payment page without completing the booking.',
      }),
    }).catch(() => { /* fire-and-forget */ });
  }, [senderReceiver, rateFormData, selectedCourier, mode]);

  // Send abandoned notification on unmount if booking wasn't completed
  useEffect(() => {
    return () => {
      if (!bookingCompletedRef.current) {
        notifyAbandonedBooking();
      }
    };
  }, [notifyAbandonedBooking]);

  // ── KYC doc helpers ──
  const kycDocLabel = kycDocType === 'aadhaar' ? 'Aadhaar Card' : kycDocType === 'driving_license' ? 'Driving License' : kycDocType === 'passport' ? 'Passport' : kycDocType === 'voter_id' ? 'Voter ID Card' : '';

  // Current doc for selected type
  const currentKycDoc = kycDocType ? kycDocs[kycDocType] : undefined;
  const kycDocFile = currentKycDoc?.file || null;
  const kycDocPreviewUrl = currentKycDoc?.previewUrl || '';

  const handleKycFile = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 5 MB.', variant: 'destructive' });
      return;
    }
    if (!kycDocType) return;
    // Revoke old preview URL for this type
    const old = kycDocs[kycDocType];
    if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    setKycDocs(prev => ({ ...prev, [kycDocType]: { file, previewUrl } }));
  }, [kycDocType, kycDocs, toast]);

  const clearKycDoc = useCallback(() => {
    if (!kycDocType) return;
    const old = kycDocs[kycDocType];
    if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
    setKycDocs(prev => {
      const next = { ...prev };
      delete next[kycDocType];
      return next;
    });
  }, [kycDocType, kycDocs]);

  const courierName = selectedCourier?.carrier || selectedCourier?.courier_name || 'Courier';
  const basePrice = selectedCourier?.price || selectedCourier?.customer_price || 0;
  const shipmentType = rateFormData?.shipmentType || 'gift';
  const destinationCountryInfo = !isDomestic && rateFormData?.destinationCountry
    ? getCountryByCode(rateFormData.destinationCountry) : null;

  const pickupInfo = useMemo(() => getPickupInfo(), []);

  // ── Auto-verify Aadhaar if extracted from OCR ──
  // When extractedAadhaarNumber is provided (from Tesseract OCR), auto-fill and auto-verify
  useEffect(() => {
    if (extractedAadhaarNumber && !aadhaarVerified && !aadhaarLoading) {
      const raw = extractedAadhaarNumber.replace(/\D/g, '');
      if (raw.length === 12) {
        // Always fill the field so user can see/correct it
        setAadhaarInput(raw);
        setFormattedAadhaar(formatAadhaar(raw));
        // Auto-verify only if Verhoeff checksum passes
        if (validateVerhoeff(raw)) {
          setAadhaarVerified(true);
        }
      }
    }
  }, [extractedAadhaarNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Aadhaar handlers ──

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarInput(raw);
    setFormattedAadhaar(formatAadhaar(raw));
    setAadhaarError('');
  };

  const handleVerifyAadhaar = async () => {
    if (aadhaarInput.length !== 12) {
      setAadhaarError('Enter a valid 12-digit Aadhaar number');
      return;
    }
    if (!validateVerhoeff(aadhaarInput)) {
      setAadhaarError('Invalid Aadhaar number');
      return;
    }
    setAadhaarLoading(true);
    setAadhaarError('');
    try {
      // For guest flow: we validate the Aadhaar format client-side
      // Full DigiLocker verification requires auth — guest gets format validation + declaration
      await new Promise(r => setTimeout(r, 1500)); // Simulate verification
      setAadhaarVerified(true);
      toast({ title: 'Aadhaar Verified', description: 'Your Aadhaar number has been validated.' });
    } catch {
      setAadhaarError('Verification failed. Please try again.');
    } finally {
      setAadhaarLoading(false);
    }
  };

  // ── Coupon handler ──

  const handleApplyCoupon = async (codeToValidate?: string) => {
    const codeToApply = (codeToValidate || couponCode).trim().toUpperCase();
    if (!codeToApply) return;
    // Prevent applying a second coupon if one is already active
    if (couponApplied) return;
    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToApply, amount: effectiveBasePrice }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponCode(codeToApply);
        // Cap discount at effectiveBasePrice so 100% coupon always gives ₹0 total
        const discount = Math.min(data.discountAmount || 0, effectiveBasePrice);
        setCouponDiscount(discount);
        setCouponApplied(true);
        toast({ title: 'Coupon Applied', description: `You saved ₹${discount}` });
      } else {
        toast({ title: 'Invalid Coupon', description: data.error || 'This coupon is not valid.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not validate coupon.', variant: 'destructive' });
    } finally {
      setCouponLoading(false);
    }
  };

  // ── Payment handler ──

  const handlePayNow = async () => {
    if (!isDomestic && !aadhaarVerified) {
      toast({ title: 'Aadhaar Required', description: 'Please verify your Aadhaar number first.', variant: 'destructive' });
      return;
    }
    if (isDomestic && shipmentType === 'document' && !aadhaarVerified) {
      toast({ title: 'Aadhaar Required', description: 'Aadhaar verification is required for document shipments.', variant: 'destructive' });
      return;
    }
    if (!termsAccepted) {
      toast({ title: 'Terms Required', description: 'Please accept the terms and conditions.', variant: 'destructive' });
      return;
    }

    setPaymentLoading(true);
    try {
      // Step 1: Create guest payment order
      const formData = new FormData();
      formData.append('amount', String(finalPrice));
      formData.append('senderReceiver', JSON.stringify(senderReceiver));
      formData.append('rateFormData', JSON.stringify(rateFormData));
      formData.append('selectedCourier', JSON.stringify(selectedCourier));
      formData.append('couponCode', couponApplied ? couponCode : '');
      if (isDomestic && kycDocFile) {
        formData.append('kycDocument', kycDocFile);
        formData.append('kycDocType', kycDocType);
      } else if (!isDomestic) {
        formData.append('aadhaarNumber', aadhaarInput);
      }

      const res = await fetch('/api/cashfree/create-guest-order', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!data.orderId) {
        notifyAbandonedBooking(`Order creation failed: ${data.error || 'Unknown error'}`);
        toast({ title: 'Error', description: data.error || 'Failed to create order.', variant: 'destructive' });
        setPaymentLoading(false);
        return;
      }

      // Store tracking number from server
      const serverTracking = data.trackingNumber || `CRX-${Date.now().toString(36).toUpperCase()}`;

      if (data.paymentSessionId) {
        // Step 2: Load Cashfree JS SDK
        try {
          await loadCashfreeScript();
        } catch {
          notifyAbandonedBooking('Failed to load Cashfree payment gateway script.');
          toast({ title: 'Error', description: 'Failed to load payment gateway. Please try again.', variant: 'destructive' });
          setPaymentLoading(false);
          return;
        }

        // Step 3: Open Cashfree checkout modal + poll for payment
        const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'sandbox' ? 'sandbox' : 'production';
        const cf = (window as any).Cashfree({ mode: cashfreeMode });

        // Use a flag to track if polling detected payment (don't update React state during modal)
        let pollingDetectedPayment = false;
        let pollingStopped = false;
        const pollInterval = setInterval(async () => {
          if (pollingStopped || pollingDetectedPayment) return;
          try {
            const pollRes = await fetch('/api/cashfree/check-payment-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderId }),
            });
            const pollData = await pollRes.json();
            if (pollData.paid) {
              pollingDetectedPayment = true;
              clearInterval(pollInterval);
              // Don't update state here — wait for modal to close
            }
          } catch { /* ignore */ }
        }, 5000);

        let checkoutResult: any = null;
        try {
          checkoutResult = await cf.checkout({
            paymentSessionId: data.paymentSessionId,
            redirectTarget: '_modal',
          });
        } catch (checkoutErr: any) {
          console.error('[GuestSummary] Cashfree checkout error:', checkoutErr);
        }

        // Modal closed — safe to update React state now
        pollingStopped = true;
        clearInterval(pollInterval);

        if (checkoutResult?.error && !pollingDetectedPayment) {
          notifyAbandonedBooking(`Payment failed at Cashfree checkout: ${checkoutResult.error.message || 'Payment was not completed'}`);
          toast({ title: 'Payment Failed', description: checkoutResult.error.message || 'Payment was not completed.', variant: 'destructive' });
          setPaymentLoading(false);
          return;
        }

        // Verify payment (either polling detected it or modal reported success)
        try {
          const verifyRes = await fetch('/api/cashfree/verify-guest-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderId }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            bookingCompletedRef.current = true;
            setTrackingNumber(serverTracking);
            setAwbUrl(verifyData.awbUrl || data.awbUrl || '');
            setPhase('success');
            toast({ title: 'Payment Successful', description: 'Your shipment has been booked.' });
          } else if (pollingDetectedPayment) {
            // Polling said paid but verify failed — still show success
            bookingCompletedRef.current = true;
            setTrackingNumber(serverTracking);
            setAwbUrl(data.awbUrl || '');
            setPhase('success');
            toast({ title: 'Payment Successful', description: 'Your shipment has been booked.' });
          } else {
            notifyAbandonedBooking('Payment verification failed after Cashfree checkout.');
            toast({ title: 'Payment Verification Failed', description: 'Please contact support with your order ID.', variant: 'destructive' });
          }
        } catch {
          bookingCompletedRef.current = true;
          setTrackingNumber(serverTracking);
          setAwbUrl(data.awbUrl || '');
          setPhase('success');
        }
      } else {
        // No Cashfree session (dev mode OR amount=0 fully covered by coupon)
        // Must still call verify-guest-payment to trigger NimbusPost shipment creation
        try {
          const verifyRes = await fetch('/api/cashfree/verify-guest-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderId }),
          });
          const verifyData = await verifyRes.json();
          bookingCompletedRef.current = true;
          setTrackingNumber(verifyData.trackingNumber || serverTracking);
          setAwbUrl(verifyData.awbUrl || '');
          setPhase('success');
          toast({ title: 'Booking Confirmed', description: 'Your shipment has been booked successfully.' });
        } catch {
          // Fallback — still show success, shipment will be processed
          bookingCompletedRef.current = true;
          setTrackingNumber(serverTracking);
          setAwbUrl('');
          setPhase('success');
          toast({ title: 'Booking Confirmed', description: 'Your shipment has been booked successfully.' });
        }
      }
    } catch {
      notifyAbandonedBooking('Payment process failed — possible gateway error or network issue.');
      toast({ title: 'Error', description: 'Payment failed. Please try again.', variant: 'destructive' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(trackingNumber);
    toast({ title: 'Copied', description: 'Tracking number copied to clipboard.' });
  };

  // ── Rate breakdown for international (must be before any conditional return to satisfy Rules of Hooks) ──
  const rateBreakdown = useMemo(() => {
    if (mode !== 'international' || !rateFormData?.destinationCountry) return null;
    try {
      return calculateRate({
        destinationCountryCode: rateFormData.destinationCountry,
        shipmentType: rateFormData.shipmentType,
        weightGrams: rateFormData.weightGrams,
        dimensions: { length: rateFormData.lengthCm, width: rateFormData.widthCm, height: rateFormData.heightCm },
        declaredValue: rateFormData.declaredValue,
      }, true);
    } catch { return null; }
  }, [mode, rateFormData]);

  // For international, use rateBreakdown total as the authoritative price so breakdown matches total
  const effectiveBasePrice = (mode === 'international' && rateBreakdown?.total) ? rateBreakdown.total : basePrice;
  const finalPrice = Math.max(0, effectiveBasePrice - couponDiscount);

  // Aadhaar thumbnail URLs
  const frontThumb = useMemo(() => aadhaarFront ? URL.createObjectURL(aadhaarFront) : null, [aadhaarFront]);
  const backThumb = useMemo(() => aadhaarBack ? URL.createObjectURL(aadhaarBack) : null, [aadhaarBack]);

  // Dimensions
  const dims = rateFormData ? { l: rateFormData.lengthCm, w: rateFormData.widthCm, h: rateFormData.heightCm } : null;
  const weight = rateFormData?.weightGrams ? `${rateFormData.weightGrams}g` : rateFormData?.weightKg ? `${rateFormData.weightKg} kg` : '';

  // ═══════════════════════════════════════════════════════════════════════════
  // SUCCESS PHASE
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === 'success') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
        {/* Success header */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="text-center space-y-3"
        >
          <div className="w-20 h-20 rounded-full bg-candlestick-green/10 flex items-center justify-center mx-auto">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6, delay: 0.5 }}>
              <CheckCircle className="h-10 w-10 text-candlestick-green" weight="fill" />
            </motion.div>
          </div>
          <h2 className="text-2xl font-bold">Shipment Booked!</h2>
          <p className="text-muted-foreground">Your {shipmentType} shipment via {courierName} is confirmed.</p>
        </motion.div>

        {/* Tracking number */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-5"
        >
          <p className="text-xs text-muted-foreground mb-1">Tracking Number</p>
          <div className="flex items-center gap-2 sm:gap-3">
            <p className="text-sm sm:text-lg font-mono font-bold flex-1 break-all">{trackingNumber}</p>
            <Button variant="outline" size="sm" onClick={handleCopyTracking} className="gap-1.5 shrink-0">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        </motion.div>

        {/* AWB Download */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-xl border-2 border-dashed border-coke-red/30 p-5 text-center space-y-3"
        >
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
            <DownloadSimple className="h-8 w-8 text-coke-red mx-auto" weight="duotone" />
          </motion.div>
          <div>
            <h3 className="font-semibold">Download AWB Label</h3>
            <p className="text-sm text-muted-foreground mt-1">Print this label and paste it on the top of your package. Make sure it&apos;s clearly visible and not covered.</p>
          </div>
          <Button className="bg-coke-red hover:bg-red-600 text-white gap-2" onClick={() => awbUrl ? window.open(awbUrl) : toast({ title: 'AWB will be available shortly', description: 'Check your email for the label.' })}>
            <DownloadSimple className="h-4 w-4" /> Download AWB Label
          </Button>
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-left">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" weight="fill" /> How to paste the AWB label
            </p>
            <ol className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-1.5 space-y-1 list-decimal list-inside">
              <li>Print the label on A4 paper (do not resize)</li>
              <li>Cut along the border lines</li>
              <li>Paste on the largest flat surface of your package</li>
              <li>Cover with clear tape to protect from moisture</li>
              <li>Do not fold or cover the barcode</li>
            </ol>
          </div>
        </motion.div>

        {/* ── Documents Required (International medicine & gift only) ── */}
        {mode === 'international' && shipmentType !== 'document' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-card rounded-xl border-2 border-blue-200 dark:border-blue-800/40 p-5 space-y-4"
          >
            <h3 className="font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-blue-600" weight="duotone" />
              Documents Required for Customs
            </h3>
            <p className="text-sm text-muted-foreground">
              Keep the following documents ready digitally. Customs may request these during clearance.
            </p>

            {shipmentType === 'medicine' ? (
              <div className="space-y-3">
                <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Pill className="h-4.5 w-4.5 text-blue-600" weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Doctor&apos;s Prescription</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Must be on a doctor&apos;s letterhead/pad with the doctor&apos;s registration number clearly visible. The prescription must not be older than 90 days.</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Receipt className="h-4.5 w-4.5 text-blue-600" weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Medicine Purchase Bill</p>
                    <p className="text-xs text-muted-foreground mt-0.5">The pharmacy bill must be in the name of the recipient/patient. It should list all medicines being shipped.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Receipt className="h-4.5 w-4.5 text-blue-600" weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Purchase Bills</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Purchase receipts or invoices for all items being shipped. This helps customs verify the declared value.</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <IdentificationBadge className="h-4.5 w-4.5 text-blue-600" weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Recipient&apos;s Passport Copy</p>
                    <p className="text-xs text-muted-foreground mt-0.5">A clear copy of the recipient&apos;s passport (front page with photo and details) for customs verification.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Warning className="h-3.5 w-3.5 shrink-0" weight="fill" />
                Keep these documents saved on your phone. Our team or customs may contact you for these during transit.
              </p>
            </div>
          </motion.div>
        )}

        {/* Pickup info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`rounded-xl border p-4 flex items-start gap-3 ${pickupInfo.isToday ? 'border-candlestick-green/30 bg-candlestick-green/5' : 'border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20'}`}
        >
          <Clock className={`h-5 w-5 shrink-0 mt-0.5 ${pickupInfo.isToday ? 'text-candlestick-green' : 'text-amber-500'}`} weight="fill" />
          <div>
            <p className="text-sm font-medium">{pickupInfo.message}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pickup cutoff time is 12:00 PM on working days.</p>
          </div>
        </motion.div>

        {/* Packing instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card rounded-xl border border-border p-4 space-y-3"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-coke-red" weight="duotone" />
            Packing Checklist
          </h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {(isDomestic && rateFormData?.shipmentType === 'document' ? [
              'Use a rigid envelope or stiff cardboard folder — no bending.',
              'Seal in a zip-lock bag first to protect from moisture.',
              'Tape all edges firmly. Attach label on a flat, visible surface.',
            ] : [
              'Use a sturdy corrugated box that fits your items snugly.',
              'Wrap each item individually in bubble wrap; fill gaps with packing material.',
              'For liquids/medicines: seal in zip-lock bags, then wrap in bubble wrap.',
              'Seal all seams with strong tape using the H-taping method.',
              'Attach the AWB label on the largest flat surface — do not cover the barcode.',
            ]).map((tip, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-coke-red/10 text-coke-red flex items-center justify-center shrink-0 text-[9px] font-bold">{i + 1}</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-col xs:flex-row gap-3">
          <Button variant="outline" className="flex-1 min-h-[48px] text-sm" onClick={() => router.push(`/public/track?tracking=${encodeURIComponent(trackingNumber)}`)}>
            Track Shipment
          </Button>
          <Button className="flex-1 min-h-[48px] text-sm bg-coke-red hover:bg-red-600 text-white" onClick={() => router.push('/public/book')}>
            Ship Another
          </Button>
        </div>
      </motion.div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEW PHASE (default)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      {/* ── Booking Summary ── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 sm:px-5 py-3 border-b border-border">
          <h2 className="font-semibold text-sm sm:text-base flex items-center gap-2">
            <Package className="h-4.5 w-4.5 text-coke-red" weight="duotone" />
            Booking Summary
          </h2>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          {/* Courier + Price */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-base sm:text-lg truncate">{courierName}</p>
              <p className="text-xs sm:text-sm text-muted-foreground capitalize">
                {mode} · {shipmentType}
                {destinationCountryInfo && (
                  <span> · {destinationCountryInfo.flag} {destinationCountryInfo.name}</span>
                )}
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <p className="text-xl sm:text-2xl font-bold">₹{effectiveBasePrice.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground">all-inclusive</p>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Address columns: stack on mobile, 2-col for domestic, 3-col for international on desktop */}
          {isDomestic ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <House className="h-3 w-3" /> Pickup Address
                </p>
                <p className="text-sm font-medium">{senderReceiver.senderName}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderAddress}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderCity} - {senderReceiver.senderPincode}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderPhone}</p>
                {senderReceiver.senderEmail && <p className="text-xs text-muted-foreground">{senderReceiver.senderEmail}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Recipient Address
                </p>
                <p className="text-sm font-medium">{senderReceiver.receiverName}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.receiverAddress}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.receiverCity} - {senderReceiver.receiverZipcode}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.receiverPhone}</p>
                {senderReceiver.receiverEmail && <p className="text-xs text-muted-foreground">{senderReceiver.receiverEmail}</p>}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <House className="h-3 w-3" /> Pickup Address
                </p>
                <p className="text-sm font-medium">{senderReceiver.senderName}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderAddress}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderCity} - {senderReceiver.senderPincode}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderPhone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Sender (KYC)
                </p>
                <p className="text-sm font-medium">{senderReceiver.senderName}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderAddress}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderCity} - {senderReceiver.senderPincode}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderEmail}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Airplane className="h-3 w-3" /> Receiver {destinationCountryInfo && <span>· {destinationCountryInfo.flag} {destinationCountryInfo.name}</span>}
                </p>
                <p className="text-sm font-medium">{senderReceiver.receiverName}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.receiverAddress}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.receiverCity} - {senderReceiver.receiverZipcode}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.receiverPhone} · {senderReceiver.receiverEmail}</p>
              </div>
            </div>
          )}

          <div className="h-px bg-border" />

          {/* Package + Dimensions — content left, weight/dims right */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Package className="h-3 w-3" /> Package Contents</p>
              <p className="text-sm">{senderReceiver.contentDescription.replace(/\s*\[HSN:[^\]]*\]/g, '')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Ruler className="h-3 w-3" /> Weight &amp; Dimensions</p>
              {weight && <p className="text-sm font-medium">{weight}</p>}
              {dims && (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5">{dims.l} × {dims.w} × {dims.h} cm</p>
                  {dims.l && dims.w && dims.h && (rateFormData?.weightGrams || rateFormData?.weightKg) && (
                    <p className="text-xs text-muted-foreground mt-0.5">Vol. weight: {((dims.l * dims.w * dims.h) / 5000).toFixed(1)} kg</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Aadhaar thumbnails */}
          {(frontThumb || backThumb) && (
            <>
              <div className="h-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><IdentificationCard className="h-3 w-3" /> Aadhaar Documents</p>
                <div className="flex gap-3">
                  {frontThumb && (
                    <div className="w-24 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                      <img src={frontThumb} alt="Aadhaar Front" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {backThumb && (
                    <div className="w-24 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                      <img src={backThumb} alt="Aadhaar Back" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Route Map ── */}
      <RouteMap
        pickupAddress={senderReceiver.senderAddress}
        pickupCity={senderReceiver.senderCity}
        pickupPincode={senderReceiver.senderPincode}
        destinationAddress={senderReceiver.receiverAddress}
        destinationCity={senderReceiver.receiverCity}
        destinationZipcode={senderReceiver.receiverZipcode}
        destinationCountry={isDomestic ? 'India' : rateFormData?.destinationCountry}
        destinationCountryName={destinationCountryInfo?.name}
        mode={mode}
      />

      {/* ── Identity Verification — Aadhaar for international shipments + all document shipments ── */}
      {(!isDomestic || shipmentType === 'document') && (
      <div className="bg-card rounded-xl border-2 border-blue-400/50 dark:border-blue-600/40 overflow-hidden shadow-sm shadow-blue-500/10">
        <div className="bg-blue-50/80 dark:bg-blue-950/30 px-5 py-3 border-b border-blue-200/60 dark:border-blue-800/40">
          <h2 className="font-semibold text-base flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <ShieldCheck className="h-4.5 w-4.5 text-blue-600" weight="fill" />
            Sender Identity Verification
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white">Required</span>
          </h2>
        </div>
        <div className="p-5 space-y-4">

          {/* ── Why we need Aadhaar — compact legal context ── */}
          <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20 p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 text-blue-600" weight="fill" />
              Why is KYC required?
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              Under the <span className="font-medium">Courier Imports &amp; Exports (Clearance) Regulations</span> and CBIC guidelines, all courier providers must verify sender identity before processing international shipments. Aadhaar is the government-approved KYC document under the <span className="font-medium">Prevention of Money Laundering Act (PMLA)</span> and UIDAI framework.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-blue-700 dark:text-blue-400">
              <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />Only last 4 digits stored — UIDAI compliant</span>
              <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />One-time per booking, not linked to any account</span>
              <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />Required by Indian customs for export clearance</span>
            </div>
          </div>

          {/* ── Aadhaar input / verified state ── */}
          {aadhaarVerified ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 p-3 rounded-lg bg-candlestick-green/5 border border-candlestick-green/20">
              <CheckCircle className="h-5 w-5 text-candlestick-green" weight="fill" />
              <div>
                <p className="text-sm font-medium text-candlestick-green">Aadhaar Verified</p>
                <p className="text-xs text-muted-foreground font-mono">XXXX XXXX {aadhaarInput.slice(-4)}</p>
              </div>
            </motion.div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {extractedAadhaarNumber
                  ? 'Aadhaar number auto-filled from your uploaded document. Please confirm and click Verify.'
                  : 'Enter your 12-digit Aadhaar number to verify your identity and proceed.'}
              </p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  placeholder="XXXX XXXX XXXX"
                  className="font-mono tracking-widest text-center flex-1"
                  value={formattedAadhaar}
                  onChange={handleAadhaarChange}
                />
                <Button
                  onClick={() => { feedbackPresets.tap(); handleVerifyAadhaar(); }}
                  disabled={aadhaarLoading || aadhaarInput.length !== 12}
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                >
                  {aadhaarLoading ? <CircleNotch className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
              </div>
              {aadhaarError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <Warning className="h-3 w-3" weight="fill" /> {aadhaarError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Verified via UIDAI checksum. We never store your full Aadhaar number.
              </p>
            </>
          )}
        </div>
      </div>
      )}

      {/* ── Coupon Code ── */}
      {couponApplied ? (
        <div className="bg-card rounded-xl border border-candlestick-green/30 p-5">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-candlestick-green/5 border border-candlestick-green/20">
            <CheckCircle className="h-5 w-5 text-candlestick-green" weight="fill" />
            <div className="flex-1">
              <p className="text-sm font-medium text-candlestick-green">{couponCode.toUpperCase()} Applied</p>
              <p className="text-xs text-muted-foreground">You saved ₹{couponDiscount.toLocaleString('en-IN')}</p>
            </div>
            <button
              onClick={() => {
                setCouponApplied(false);
                setCouponDiscount(0);
                setCouponCode('');
                setShowManualCoupon(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          {/* WELCOME10 banner — only show if not in manual mode */}
          {!showManualCoupon && (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  Use code{' '}
                  <span className="font-mono font-semibold">WELCOME10</span>
                  {' '}for 10% off
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { feedbackPresets.tap(); handleApplyCoupon('WELCOME10'); }}
                disabled={couponLoading}
                className="shrink-0 h-8 text-xs"
              >
                {couponLoading ? <CircleNotch className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
              </Button>
            </div>
          )}
          {/* Toggle to manual input */}
          {!showManualCoupon ? (
            <button
              type="button"
              onClick={() => setShowManualCoupon(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Have a different code?
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 uppercase h-9 text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { feedbackPresets.tap(); handleApplyCoupon(); }}
                  disabled={couponLoading || !couponCode.trim()}
                  className="h-9"
                >
                  {couponLoading ? <CircleNotch className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => { setShowManualCoupon(false); setCouponCode(''); }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Price Breakdown ── */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-2">
        {/* Show detailed breakdown for international if available */}
        {rateBreakdown?.breakdown ? (
          rateBreakdown.breakdown.map(item => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span>₹{item.amount.toLocaleString('en-IN')}</span>
            </div>
          ))
        ) : (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping ({courierName})</span>
            <span>₹{basePrice.toLocaleString('en-IN')}</span>
          </div>
        )}
        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-candlestick-green">
            <span>Coupon Discount</span>
            <span>-₹{couponDiscount.toLocaleString('en-IN')}</span>
          </div>
        )}
        <div className="h-px bg-border my-1" />
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>₹{finalPrice.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* ── Terms & Conditions ── */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
        <Checkbox
          id="terms"
          checked={termsAccepted}
          onCheckedChange={(v) => setTermsAccepted(v === true)}
          className="mt-0.5"
        />
        <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
          I confirm that all information provided is true and accurate. I understand that I am solely responsible for the contents of this shipment and any legal consequences arising from shipping prohibited or illegal items. I agree to the{' '}
          <a href="/terms" target="_blank" className="text-coke-red hover:underline">Terms & Conditions</a>,{' '}
          <a href="/shipping-policy" target="_blank" className="text-coke-red hover:underline">Shipping Policy</a>, and{' '}
          <a href="/refund-policy" target="_blank" className="text-coke-red hover:underline">Refund Policy</a>.
        </label>
      </div>

      {/* ── Pay Button ── */}
      <Button
        onClick={() => { feedbackPresets.tap(); handlePayNow(); }}
        disabled={paymentLoading || ((!isDomestic || shipmentType === 'document') && !aadhaarVerified) || !termsAccepted}
        className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 min-h-[56px] py-3 text-sm sm:text-base shadow-lg shadow-coke-red/20"
      >
        {paymentLoading ? (
          <><CircleNotch className="h-5 w-5 animate-spin shrink-0" /> <span className="truncate">Processing Payment...</span></>
        ) : (
          <>
            <ShieldCheck className="h-5 w-5 shrink-0" weight="bold" />
            <span className="truncate">Complete Booking — ₹{finalPrice.toLocaleString('en-IN')}</span>
          </>
        )}
      </Button>

      {(!isDomestic || shipmentType === 'document') && !aadhaarVerified && (
        <p className="text-xs text-center text-muted-foreground">Please verify your Aadhaar number to proceed with payment.</p>
      )}

      {/* ── Full-screen Document Preview Modal ── */}
      <AnimatePresence>
        {showDocPreview && kycDocPreviewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowDocPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowDocPreview(false)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-6 w-6" weight="bold" />
              </button>
              <div className="rounded-xl overflow-hidden bg-white shadow-2xl">
                <img
                  src={kycDocPreviewUrl}
                  alt={kycDocLabel}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              </div>
              <p className="text-center text-white/60 text-xs mt-3">{kycDocLabel} · Tap outside to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
