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
  Pill, Receipt, IdentificationBadge, FolderOpen, Check,
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
  passportIdentity?: File | null;
  passportAddress?: File | null;
  passportUploadLater?: boolean;
  prescriptionUploadLater?: boolean;
  pharmacyBillUploadLater?: boolean;
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

export default function GuestSummaryStep({ mode, rateFormData, selectedCourier, senderReceiver, onBack, extractedAadhaarNumber, aadhaarFront, aadhaarBack, passportIdentity, passportAddress, passportUploadLater, prescriptionUploadLater, pharmacyBillUploadLater }: GuestSummaryStepProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = useState<SummaryPhase>('review');
  const [aadhaarInput, setAadhaarInput] = useState(extractedAadhaarNumber || '');

  // ── Inline edit state for summary sections ──
  type EditModal = 'pickup' | 'recipient' | 'contents' | 'weightdims' | null;
  const [editModal, setEditModal] = useState<EditModal>(null);
  const [editData, setEditData] = useState<Partial<SenderReceiver>>({});

  // ── Mutable weight/dims/items (override rateFormData after edits) ──
  const [editedWeightKg, setEditedWeightKg] = useState<number>(rateFormData?.weightKg ?? 0);
  const [editedLength, setEditedLength] = useState<number>(rateFormData?.lengthCm ?? 0);
  const [editedWidth, setEditedWidth] = useState<number>(rateFormData?.widthCm ?? 0);
  const [editedHeight, setEditedHeight] = useState<number>(rateFormData?.heightCm ?? 0);
  const [editedItems, setEditedItems] = useState<Array<{ name: string; type: string; qty: number; unitPrice: number }>>(() => {
    // Parse existing contentDescription back into items
    const desc = senderReceiver?.contentDescription || '';
    const parts = desc.split(';').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return [{ name: '', type: '', qty: 1, unitPrice: 0 }];
    return parts.map(p => {
      const m = p.match(/^(.+?)\s*\((.+?)\)\s*x(\d+)\s*@\s*₹(\d+)/);
      if (m) return { name: m[1].trim(), type: m[2].trim(), qty: parseInt(m[3]), unitPrice: parseInt(m[4]) };
      return { name: p, type: '', qty: 1, unitPrice: 0 };
    });
  });
  // Adjusted price after weight/dims edit
  const [adjustedPrice, setAdjustedPrice] = useState<number | null>(null);
  const [priceAlertMsg, setPriceAlertMsg] = useState<string>('');
  const [refetchingPrice, setRefetchingPrice] = useState(false);

  const openEdit = (section: EditModal) => {
    setEditData({ ...senderReceiver });
    setEditErrors({});
    setEditModal(section);
  };

  // ── Edit field validation ──
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const validateAndSaveEdit = () => {
    const errs: Record<string, string> = {};
    if (editModal === 'pickup') {
      if (!editData.senderName?.trim()) errs.senderName = 'Name is required';
      if (!editData.senderPhone?.trim()) errs.senderPhone = 'Phone is required';
      if (!editData.senderAddress?.trim()) errs.senderAddress = 'Address is required';
      if (!editData.senderCity?.trim()) errs.senderCity = 'City is required';
      if (!editData.senderPincode?.trim()) errs.senderPincode = 'Pincode is required';
      else if (!/^\d{6}$/.test(editData.senderPincode)) errs.senderPincode = 'Enter valid 6-digit pincode';
    }
    if (editModal === 'recipient') {
      if (!editData.receiverName?.trim()) errs.receiverName = 'Name is required';
      if (!editData.receiverPhone?.trim()) errs.receiverPhone = 'Phone is required';
      if (!editData.receiverAddress?.trim()) errs.receiverAddress = 'Address is required';
      if (!editData.receiverCity?.trim()) errs.receiverCity = 'City is required';
      if (!editData.receiverZipcode?.trim()) errs.receiverZipcode = 'Zipcode is required';
    }
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    Object.assign(senderReceiver, editData);
    setEditModal(null);
    setEditErrors({});
  };

  const saveContents = () => {
    const errs: Record<string, string> = {};
    editedItems.forEach((item, idx) => {
      if (!item.name.trim()) errs[`name_${idx}`] = 'Item name is required';
      if (!item.type) errs[`type_${idx}`] = 'Type is required';
      if (!item.qty || item.qty < 1) errs[`qty_${idx}`] = 'Min 1';
      if (!item.unitPrice || item.unitPrice <= 0) errs[`price_${idx}`] = 'Price is required';
    });
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    const desc = editedItems.filter(i => i.name.trim()).map(i => `${i.name} (${i.type || 'other'}) x${i.qty} @ ₹${i.unitPrice}`).join('; ');
    senderReceiver.contentDescription = desc;
    setEditModal(null);
    setEditErrors({});
  };

  const saveWeightDims = async () => {
    const errs: Record<string, string> = {};
    if (!editedWeightKg || editedWeightKg <= 0) errs.weightKg = 'Weight is required';
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    setEditErrors({});
    // Update rateFormData in-place
    if (rateFormData) {
      rateFormData.weightKg = editedWeightKg;
      rateFormData.lengthCm = editedLength;
      rateFormData.widthCm = editedWidth;
      rateFormData.heightCm = editedHeight;
    }
    setEditModal(null);
    // Re-fetch rates
    if (!isDomestic) return;
    setRefetchingPrice(true);
    setPriceAlertMsg('');
    try {
      const res = await fetch('/api/domestic/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupPincode: rateFormData?.pickupPincode,
          deliveryPincode: rateFormData?.deliveryPincode,
          weightKg: editedWeightKg,
          lengthCm: editedLength || 10,
          widthCm: editedWidth || 10,
          heightCm: editedHeight || 10,
          declaredValue: rateFormData?.declaredValue || 0,
          shipmentType: rateFormData?.shipmentType || 'gift',
          isGuest: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.couriers?.length > 0) {
        // Find same courier or cheapest
        const courierId = selectedCourier?.courier_company_id;
        const match = data.couriers.find((c: any) => c.courier_company_id === courierId) || data.couriers[0];
        const newPrice = match.customer_price;
        const oldPrice = basePrice;
        if (newPrice !== oldPrice) {
          setAdjustedPrice(newPrice);
          const diff = newPrice - oldPrice;
          setPriceAlertMsg(diff > 0
            ? `Price increased by ₹${diff.toLocaleString('en-IN')} due to updated weight/dimensions. New total: ₹${newPrice.toLocaleString('en-IN')}.`
            : `Price decreased by ₹${Math.abs(diff).toLocaleString('en-IN')} due to updated weight/dimensions. New total: ₹${newPrice.toLocaleString('en-IN')}.`
          );
        } else {
          setAdjustedPrice(null);
          setPriceAlertMsg('');
        }
      }
    } catch { /* silent */ }
    finally { setRefetchingPrice(false); }
  };
  const [formattedAadhaar, setFormattedAadhaar] = useState(extractedAadhaarNumber ? formatAadhaar(extractedAadhaarNumber) : '');
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState('');

  // ── Multi-doc KYC state ──
  type GuestDocType = 'aadhaar' | 'pan' | 'passport' | 'voter_id';
  type KycMethod = 'digilocker' | 'kyc_form' | 'sandbox_otp';
  const [selectedDocType, setSelectedDocType] = useState<GuestDocType>('aadhaar');
  const [kycMethod, setKycMethod] = useState<KycMethod>('sandbox_otp');
  // doc inputs
  const [panInput, setPanInput] = useState('');
  const [passportInput, setPassportInput] = useState('');
  const [passportDob, setPassportDob] = useState('');
  const [voterIdInput, setVoterIdInput] = useState('');
  const [docInputError, setDocInputError] = useState('');
  // phone (needed for kyc_form)
  const [kycPhone, setKycPhone] = useState(senderReceiver?.senderPhone?.replace(/^\+91/, '').slice(-10) || '');
  // digilocker state
  const [digilockerUrl, setDigilockerUrl] = useState('');
  const [digilockerVerificationId, setDigilockerVerificationId] = useState('');
  const [digilockerReferenceId, setDigilockerReferenceId] = useState('');
  const [digilockerStep, setDigilockerStep] = useState<'idle' | 'redirect' | 'verifying'>('idle');
  // kyc form state
  const [kycFormLink, setKycFormLink] = useState('');
  const [kycFormVerificationId, setKycFormVerificationId] = useState('');
  const [kycFormStep, setKycFormStep] = useState<'idle' | 'sent' | 'polling'>('idle');
  // sandbox otp state
  const [sandboxReferenceId, setSandboxReferenceId] = useState('');
  const [sandboxOtp, setSandboxOtp] = useState('');
  const [sandboxStep, setSandboxStep] = useState<'idle' | 'otp_sent' | 'verifying'>('idle');
  // verified state
  const [docVerified, setDocVerified] = useState(false);
  const [docVerifiedLabel, setDocVerifiedLabel] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  // ── Agreement modal (2-step: KYC → Agreement) ──
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementStep, setAgreementStep] = useState<1 | 2>(1);
  const [verifiedName, setVerifiedName] = useState('');
  const [verifiedDocId, setVerifiedDocId] = useState('');
  const [verifiedAddress, setVerifiedAddress] = useState('');
  const [verifiedDob, setVerifiedDob] = useState('');
  const [verifiedGender, setVerifiedGender] = useState('');
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

  // ── Auto-fill Aadhaar from OCR — but do NOT auto-verify, user must choose method ──
  useEffect(() => {
    if (extractedAadhaarNumber && !docVerified) {
      const raw = extractedAadhaarNumber.replace(/\D/g, '');
      if (raw.length === 12) {
        setAadhaarInput(raw);
        setFormattedAadhaar(formatAadhaar(raw));
      }
    }
  }, [extractedAadhaarNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── KYC handlers ──

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarInput(raw);
    setFormattedAadhaar(formatAadhaar(raw));
    setAadhaarError('');
  };

  // Validate doc number format before calling any API
  const validateDocInput = (): boolean => {
    setDocInputError('');
    if (selectedDocType === 'aadhaar') {
      if (aadhaarInput.length !== 12) { setDocInputError('Enter a valid 12-digit Aadhaar number'); return false; }
      if (!validateVerhoeff(aadhaarInput)) { setDocInputError('Invalid Aadhaar number (checksum failed)'); return false; }
    } else if (selectedDocType === 'pan') {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panInput.toUpperCase())) { setDocInputError('Invalid PAN format (e.g. ABCDE1234F)'); return false; }
    } else if (selectedDocType === 'passport') {
      if (!/^[A-Z][0-9]{7}$/.test(passportInput.toUpperCase())) { setDocInputError('Invalid passport number (e.g. A1234567)'); return false; }
      if (!passportDob) { setDocInputError('Date of birth is required'); return false; }
    } else if (selectedDocType === 'voter_id') {
      if (voterIdInput.trim().length < 6) { setDocInputError('Enter a valid EPIC number'); return false; }
    }
    return true;
  };

  const markVerified = (label: string, name?: string, address?: string, dob?: string, gender?: string) => {
    setDocVerified(true);
    setAadhaarVerified(true);
    setDocVerifiedLabel(label);
    setVerifiedName(name || senderReceiver?.senderName || '');
    setVerifiedDocId(label);
    setVerifiedAddress(address || '');
    setVerifiedDob(dob || '');
    setVerifiedGender(gender || '');
    // Advance to agreement step
    setAgreementStep(2);
  };

  // ── DigiLocker (Aadhaar, PAN, Driving License via Cashfree) ──────────────
  // DigiLocker only supports: aadhaar, pan, driving_license
  const digilockerDocType = selectedDocType === 'pan' ? 'pan' : 'aadhaar';
  const digilockerSupported = ['aadhaar', 'pan'].includes(selectedDocType);

  const handleStartDigiLocker = async () => {
    if (!validateDocInput()) return;
    setAadhaarLoading(true); setAadhaarError('');
    try {
      const sessionId = `guest_${Date.now().toString(36)}`;
      const res = await fetch('/api/kyc/guest-digilocker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType: digilockerDocType, aadhaarNumber: selectedDocType === 'aadhaar' ? aadhaarInput : undefined, sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.digilockerUrl) { setAadhaarError(data.error || 'Failed to initiate DigiLocker'); return; }
      setDigilockerUrl(data.digilockerUrl);
      setDigilockerVerificationId(data.verificationId || '');
      setDigilockerReferenceId(data.referenceId || '');
      setDigilockerStep('redirect');
    } catch { setAadhaarError('Failed to start DigiLocker'); }
    finally { setAadhaarLoading(false); }
  };

  const handleCompleteDigiLocker = useCallback(async () => {
    setDigilockerStep('verifying'); setAadhaarLoading(true);
    try {
      const params = new URLSearchParams();
      if (digilockerReferenceId) params.set('reference_id', digilockerReferenceId);
      else params.set('verification_id', digilockerVerificationId);
      params.set('docType', digilockerDocType);
      const res = await fetch(`/api/kyc/guest-digilocker?${params.toString()}`);
      const data = await res.json();
      if (data.verified) {
        const label = selectedDocType === 'aadhaar' ? (data.maskedAadhaar || `XXXX XXXX ${aadhaarInput.slice(-4)}`) :
          selectedDocType === 'pan' ? `PAN: ${panInput.slice(0,3)}XXXXXXX` : `DL verified`;
        markVerified(label);
        setDigilockerStep('idle');
        toast({ title: 'Verified via DigiLocker', description: data.verifiedName ? `Name: ${data.verifiedName}` : 'Identity verified' });
      } else {
        setAadhaarError(data.error || 'DigiLocker not completed. Try again.');
        setDigilockerStep('idle');
      }
    } catch { setAadhaarError('Failed to fetch DigiLocker result'); setDigilockerStep('idle'); }
    finally { setAadhaarLoading(false); }
  }, [digilockerReferenceId, digilockerVerificationId, digilockerDocType, selectedDocType, aadhaarInput, panInput, toast]);

  // ── KYC Form (Cashfree hosted) ─────────────────────────────────────────────
  const handleStartKycForm = async () => {
    if (!validateDocInput()) return;
    if (!kycPhone || kycPhone.length < 10) { setDocInputError('Enter your 10-digit mobile number'); return; }
    setAadhaarLoading(true); setAadhaarError('');
    try {
      const res = await fetch('/api/kyc/kyc-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: selectedDocType,
          phone: kycPhone,
          name: senderReceiver?.senderName || '',
          email: senderReceiver?.senderEmail || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.formLink) { setAadhaarError(data.error || 'Failed to generate KYC form'); return; }
      setKycFormLink(data.formLink);
      setKycFormVerificationId(data.verificationId || '');
      setKycFormStep('sent');
    } catch { setAadhaarError('Failed to generate KYC form'); }
    finally { setAadhaarLoading(false); }
  };

  const handleCheckKycForm = useCallback(async () => {
    if (!kycFormVerificationId) return;
    setKycFormStep('polling'); setAadhaarLoading(true);
    try {
      const res = await fetch(`/api/kyc/kyc-form?verification_id=${kycFormVerificationId}`);
      const data = await res.json();
      if (data.verified) {
        const docLabel = selectedDocType === 'aadhaar' ? `XXXX XXXX ${aadhaarInput.slice(-4)}` :
          selectedDocType === 'pan' ? `PAN: ${panInput.slice(0,3)}XXXXXXX` :
          selectedDocType === 'passport' ? `Passport: ${passportInput.slice(0,2)}XXXXX` :
          `Voter ID: ${voterIdInput.slice(0,3)}XXXXX`;
        markVerified(docLabel, data.verifiedName);
        setKycFormStep('idle');
        toast({ title: 'KYC Verified', description: `${data.verifiedName ? `Verified: ${data.verifiedName}` : 'Identity verified successfully'}` });
      } else {
        setAadhaarError(`Form status: ${data.formStatus || 'PENDING'} — Complete the form sent to your mobile.`);
        setKycFormStep('sent');
      }
    } catch { setAadhaarError('Failed to check form status'); setKycFormStep('sent'); }
    finally { setAadhaarLoading(false); }
  }, [kycFormVerificationId, selectedDocType, aadhaarInput, panInput, passportInput, voterIdInput, toast]);

  // ── Sandbox OTP (Aadhaar only) ─────────────────────────────────────────────
  const handleSendSandboxOtp = async () => {
    if (!validateDocInput()) return;
    setAadhaarLoading(true); setAadhaarError('');
    try {
      const res = await fetch('/api/kyc/sandbox-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', aadhaarNumber: aadhaarInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setAadhaarError(data.error || 'Failed to send OTP'); return; }
      setSandboxReferenceId(data.referenceId);
      setSandboxStep('otp_sent');
      toast({ title: 'OTP Sent', description: 'Enter the 6-digit OTP sent to your Aadhaar-registered mobile.' });
    } catch { setAadhaarError('Failed to send OTP'); }
    finally { setAadhaarLoading(false); }
  };

  const handleVerifySandboxOtp = async () => {
    if (!sandboxOtp || sandboxOtp.length !== 6) { setAadhaarError('Enter the 6-digit OTP'); return; }
    setAadhaarLoading(true); setAadhaarError(''); setSandboxStep('verifying');
    try {
      const res = await fetch('/api/kyc/sandbox-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', referenceId: sandboxReferenceId, otp: sandboxOtp, aadhaarNumber: aadhaarInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setAadhaarError(data.error || 'OTP verification failed'); setSandboxStep('otp_sent'); return; }
      markVerified(data.maskedAadhaar || `XXXX XXXX ${aadhaarInput.slice(-4)}`, data.verifiedName, data.verifiedAddress, data.dob, data.gender);
      setSandboxStep('idle');
      toast({ title: 'Aadhaar Verified', description: `Verified: ${data.verifiedName || ''}` });
    } catch { setAadhaarError('OTP verification failed'); setSandboxStep('otp_sent'); }
    finally { setAadhaarLoading(false); }
  };

  // Legacy alias
  const handleVerifyAadhaar = handleSendSandboxOtp;

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
    if (!aadhaarVerified && !docVerified) {
      toast({ title: 'Identity Verification Required', description: 'Please verify your identity document to proceed.', variant: 'destructive' });
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
      // Always send identity doc info for verification
      formData.append('aadhaarNumber', selectedDocType === 'aadhaar' ? aadhaarInput : '');
      formData.append('kycDocTypeGuest', selectedDocType);
      if (selectedDocType === 'pan') formData.append('kycDocValueGuest', panInput.toUpperCase());
      if (selectedDocType === 'passport') { formData.append('kycDocValueGuest', passportInput.toUpperCase()); formData.append('kycDocDobGuest', passportDob); }
      if (selectedDocType === 'voter_id') formData.append('kycDocValueGuest', voterIdInput.toUpperCase());
      if (isDomestic && kycDocFile) {
        formData.append('kycDocument', kycDocFile);
        formData.append('kycDocType', kycDocType);
      }
      // International medicine: attach passport files if provided
      if (!isDomestic && passportIdentity) {
        formData.append('passportIdentity', passportIdentity);
      }
      if (!isDomestic && passportAddress) {
        formData.append('passportAddress', passportAddress);
      }
      if (!isDomestic) {
        formData.append('passportUploadLater', passportUploadLater ? 'true' : 'false');
        formData.append('prescriptionUploadLater', prescriptionUploadLater ? 'true' : 'false');
        formData.append('pharmacyBillUploadLater', pharmacyBillUploadLater ? 'true' : 'false');
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
  const effectiveBasePrice = adjustedPrice ?? ((mode === 'international' && rateBreakdown?.total) ? rateBreakdown.total : basePrice);
  const finalPrice = Math.max(0, effectiveBasePrice - couponDiscount);

  // Aadhaar thumbnail URLs
  const frontThumb = useMemo(() => aadhaarFront ? URL.createObjectURL(aadhaarFront) : null, [aadhaarFront]);
  const backThumb = useMemo(() => aadhaarBack ? URL.createObjectURL(aadhaarBack) : null, [aadhaarBack]);

  // Dimensions — use edited values
  const dims = { l: editedLength, w: editedWidth, h: editedHeight };
  const weight = rateFormData?.weightGrams ? `${rateFormData.weightGrams}g` : editedWeightKg ? `${editedWeightKg} kg` : '';

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
            ] : isDomestic && rateFormData?.shipmentType === 'laptop' ? [
              'Power off the laptop completely — not sleep mode.',
              'Remove the charger and accessories; pack them separately in a padded pouch.',
              'Wrap the laptop in anti-static bubble wrap (at least 3 layers).',
              'Place in a rigid box with foam padding on all 6 sides — no movement inside.',
              'Seal all seams with strong tape. Attach the AWB label on the top surface.',
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
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1 justify-between">
                  <span className="flex items-center gap-1"><House className="h-3 w-3" /> Pickup Address</span>
                  <button onClick={() => openEdit('pickup')} className="text-[10px] text-coke-red hover:underline font-medium flex items-center gap-0.5">Edit</button>
                </p>
                <p className="text-sm font-medium">{senderReceiver.senderName}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderAddress}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderCity} - {senderReceiver.senderPincode}</p>
                <p className="text-xs text-muted-foreground">{senderReceiver.senderPhone}</p>
                {senderReceiver.senderEmail && <p className="text-xs text-muted-foreground">{senderReceiver.senderEmail}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1 justify-between">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Recipient Address</span>
                  <button onClick={() => openEdit('recipient')} className="text-[10px] text-coke-red hover:underline font-medium flex items-center gap-0.5">Edit</button>
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
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1 justify-between">
                <span className="flex items-center gap-1"><Package className="h-3 w-3" /> Package Contents</span>
                <button onClick={() => openEdit('contents')} className="text-[10px] text-coke-red hover:underline font-medium">Edit</button>
              </p>
              <p className="text-sm">{senderReceiver.contentDescription.replace(/\s*\[HSN:[^\]]*\]/g, '')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1 justify-between">
                <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> Weight &amp; Dimensions</span>
                {isDomestic && <button onClick={() => setEditModal('weightdims')} className="text-[10px] text-coke-red hover:underline font-medium">Edit</button>}
              </p>
              {weight && <p className="text-sm font-medium">{weight}</p>}
              {dims && (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5">{dims.l} × {dims.w} × {dims.h} cm</p>
                  {dims.l && dims.w && dims.h && (rateFormData?.weightGrams || editedWeightKg) && (
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

      {/* ── Price adjustment alert ── */}
      {refetchingPrice && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4 flex items-center gap-3">
          <CircleNotch className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-300">Recalculating price based on updated weight/dimensions…</p>
        </div>
      )}
      {!refetchingPrice && priceAlertMsg && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-4 flex items-start gap-3 ${adjustedPrice && adjustedPrice > basePrice ? 'border-amber-300/60 bg-amber-50 dark:bg-amber-950/20' : 'border-candlestick-green/30 bg-candlestick-green/5'}`}>
          <Warning className={`h-5 w-5 shrink-0 mt-0.5 ${adjustedPrice && adjustedPrice > basePrice ? 'text-amber-600' : 'text-candlestick-green'}`} weight="fill" />
          <div className="space-y-0.5">
            <p className={`text-sm font-semibold ${adjustedPrice && adjustedPrice > basePrice ? 'text-amber-900 dark:text-amber-200' : 'text-candlestick-green'}`}>
              {adjustedPrice && adjustedPrice > basePrice ? 'Price Updated — Additional Charge' : 'Price Updated — Reduced Charge'}
            </p>
            <p className="text-xs text-muted-foreground">{priceAlertMsg}</p>
          </div>
        </motion.div>
      )}

      {/* ── Passport Upload Later reminder (medicine flow) ── */}
      {passportUploadLater && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" weight="duotone" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Passport upload pending</p>
            <p className="text-xs text-amber-800 dark:text-amber-300">You chose to upload the receiver&apos;s passport later. Our team will reach out via email or WhatsApp before dispatch to collect it. Shipment will not be dispatched until the passport copy is received.</p>
          </div>
        </div>
      )}

      {/* ── KYC verified status (shown after agreement modal completes) ── */}
      {(aadhaarVerified || docVerified) && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-candlestick-green/30 bg-candlestick-green/5">
          <CheckCircle className="h-5 w-5 text-candlestick-green shrink-0" weight="fill" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-candlestick-green">Identity Verified</p>
            <p className="text-xs text-muted-foreground font-mono">{docVerifiedLabel}</p>
          </div>
          <button className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
            onClick={() => { setDocVerified(false); setAadhaarVerified(false); setDocVerifiedLabel(''); setVerifiedName(''); setVerifiedAddress(''); setVerifiedDob(''); setVerifiedGender(''); setTermsAccepted(false); setSandboxStep('idle'); setKycFormStep('idle'); setDigilockerStep('idle'); setAadhaarError(''); }}>
            Change
          </button>
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
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${termsAccepted ? 'border-candlestick-green/40 bg-candlestick-green/5' : 'border-border bg-card hover:border-coke-red/30'}`}
        onClick={() => { if (!termsAccepted) { setAgreementStep(docVerified ? 2 : 1); setShowAgreementModal(true); } else setTermsAccepted(false); }}
      >
        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${termsAccepted ? 'bg-candlestick-green border-candlestick-green' : 'border-muted-foreground'}`}>
          {termsAccepted && <Check className="h-2.5 w-2.5 text-white" weight="bold" />}
        </div>
        <div className="space-y-0.5 leading-none">
          <p className="text-sm font-medium">I agree to the Terms & Conditions</p>
          <p className="text-xs text-muted-foreground">Click to verify your identity and review the shipping agreement before confirming.</p>
        </div>
      </div>

      {/* ── Pay Button ── */}
      <Button
        onClick={() => { feedbackPresets.tap(); handlePayNow(); }}
        disabled={paymentLoading || !termsAccepted}
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

      {!termsAccepted && (
        <p className="text-xs text-center text-muted-foreground">Click the checkbox above to verify your identity and agree to the terms before paying.</p>
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

      {/* ── Edit Modals ── */}
      <AnimatePresence>
        {editModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setEditModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
                e.preventDefault();
                if (editModal === 'contents') saveContents();
                else if (editModal === 'weightdims') saveWeightDims();
                else validateAndSaveEdit();
              }}
              className="bg-card rounded-2xl border border-border shadow-xl max-w-md w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base">
                  {editModal === 'pickup' ? 'Edit Pickup Address' : editModal === 'recipient' ? 'Edit Recipient Address' : editModal === 'weightdims' ? 'Edit Weight & Dimensions' : 'Edit Package Contents'}
                </h3>
                <button onClick={() => setEditModal(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {editModal === 'pickup' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">Full Name</label>
                    <Input value={editData.senderName || ''} onChange={(e) => setEditData(d => ({ ...d, senderName: e.target.value }))} className="h-10 mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Phone</label>
                    <Input value={editData.senderPhone || ''} onChange={(e) => setEditData(d => ({ ...d, senderPhone: e.target.value }))} className="h-10 mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Email</label>
                    <Input value={editData.senderEmail || ''} onChange={(e) => setEditData(d => ({ ...d, senderEmail: e.target.value }))} className="h-10 mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Address</label>
                    <Input value={editData.senderAddress || ''} onChange={(e) => setEditData(d => ({ ...d, senderAddress: e.target.value }))} className="h-10 mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">City</label>
                      <Input value={editData.senderCity || ''} onChange={(e) => setEditData(d => ({ ...d, senderCity: e.target.value }))} className="h-10 mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Pincode</label>
                      <Input value={editData.senderPincode || ''} onChange={(e) => setEditData(d => ({ ...d, senderPincode: e.target.value }))} className="h-10 mt-1" />
                    </div>
                  </div>
                </div>
              )}

              {editModal === 'recipient' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">Full Name</label>
                    <Input value={editData.receiverName || ''} onChange={(e) => setEditData(d => ({ ...d, receiverName: e.target.value }))} className="h-10 mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Phone</label>
                    <Input value={editData.receiverPhone || ''} onChange={(e) => setEditData(d => ({ ...d, receiverPhone: e.target.value }))} className="h-10 mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Email</label>
                    <Input value={editData.receiverEmail || ''} onChange={(e) => setEditData(d => ({ ...d, receiverEmail: e.target.value }))} className="h-10 mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Address</label>
                    <Input value={editData.receiverAddress || ''} onChange={(e) => setEditData(d => ({ ...d, receiverAddress: e.target.value }))} className="h-10 mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">City</label>
                      <Input value={editData.receiverCity || ''} onChange={(e) => setEditData(d => ({ ...d, receiverCity: e.target.value }))} className="h-10 mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Zipcode</label>
                      <Input value={editData.receiverZipcode || ''} onChange={(e) => setEditData(d => ({ ...d, receiverZipcode: e.target.value }))} className="h-10 mt-1" />
                    </div>
                  </div>
                </div>
              )}

              {editModal === 'contents' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Add or edit items in your shipment.</p>
                  {editedItems.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-border p-3 space-y-2.5 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Item {idx + 1}</span>
                        {editedItems.length > 1 && (
                          <button type="button" onClick={() => setEditedItems(prev => prev.filter((_, i) => i !== idx))} className="text-destructive p-1">
                            <X className="h-3.5 w-3.5" weight="bold" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-medium">Item Name *</label>
                          <Input value={item.name} onChange={(e) => { const a = [...editedItems]; a[idx].name = e.target.value; setEditedItems(a); }} placeholder="e.g. Cotton T-Shirt" className="h-9 mt-0.5 text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium">Type *</label>
                          <select value={item.type} onChange={(e) => { const a = [...editedItems]; a[idx].type = e.target.value; setEditedItems(a); }}
                            className="w-full h-9 mt-0.5 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                            <option value="">Select type</option>
                            <option value="clothing">Clothing & Apparel</option>
                            <option value="electronics">Electronics</option>
                            <option value="food">Branded Packaged Food</option>
                            <option value="cosmetics">Cosmetics & Personal Care</option>
                            <option value="handicraft">Handicraft & Art</option>
                            <option value="books">Books & Stationery</option>
                            <option value="toys">Toys & Games</option>
                            <option value="jewelry">Imitation Jewelry</option>
                            <option value="household">Household Items</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-medium">Quantity *</label>
                          <Input type="number" inputMode="numeric" value={item.qty} onChange={(e) => { const a = [...editedItems]; a[idx].qty = Number(e.target.value) || 1; setEditedItems(a); }} className="h-9 mt-0.5 text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium">Unit Price (₹) *</label>
                          <Input type="number" inputMode="numeric" value={item.unitPrice || ''} onChange={(e) => { const a = [...editedItems]; a[idx].unitPrice = parseInt(e.target.value) || 0; setEditedItems(a); }} placeholder="Enter value" className="h-9 mt-0.5 text-sm" />
                        </div>
                      </div>
                      {item.name && item.unitPrice > 0 && (
                        <p className="text-[11px] text-muted-foreground text-right">Item total: ₹{(item.qty * item.unitPrice).toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setEditedItems(prev => [...prev, { name: '', type: '', qty: 1, unitPrice: 0 }])}
                    className="w-full py-2 rounded-lg border border-coke-red/30 bg-coke-red/5 text-coke-red text-xs font-semibold hover:bg-coke-red/10 transition-colors flex items-center justify-center gap-1.5">
                    + Add Another Item
                  </button>
                  {editedItems.length > 0 && (
                    <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                      <span>Total Declared Value</span>
                      <span>₹{editedItems.reduce((s, i) => s + i.qty * i.unitPrice, 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              )}

              {editModal === 'weightdims' && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <Warning className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" weight="fill" />
                    Changing weight or dimensions will recalculate the shipping price. You will see an alert if the price changes.
                  </div>
                  <div>
                    <label className="text-xs font-medium">Actual Weight (kg) *</label>
                    <Input type="number" inputMode="decimal" value={editedWeightKg || ''} onChange={(e) => setEditedWeightKg(parseFloat(e.target.value) || 0)} placeholder="e.g. 1.5" className="h-10 mt-1" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-medium">Length (cm)</label>
                      <Input type="number" inputMode="numeric" value={editedLength || ''} onChange={(e) => setEditedLength(parseFloat(e.target.value) || 0)} placeholder="30" className="h-10 mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Width (cm)</label>
                      <Input type="number" inputMode="numeric" value={editedWidth || ''} onChange={(e) => setEditedWidth(parseFloat(e.target.value) || 0)} placeholder="20" className="h-10 mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Height (cm)</label>
                      <Input type="number" inputMode="numeric" value={editedHeight || ''} onChange={(e) => setEditedHeight(parseFloat(e.target.value) || 0)} placeholder="10" className="h-10 mt-1" />
                    </div>
                  </div>
                  {editedLength > 0 && editedWidth > 0 && editedHeight > 0 && (
                    <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs space-y-0.5">
                      <div className="flex justify-between"><span className="text-muted-foreground">Volumetric weight</span><span className="font-medium">{((editedLength * editedWidth * editedHeight) / 5000).toFixed(2)} kg</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Chargeable weight</span><span className="font-semibold">{Math.max(editedWeightKg, (editedLength * editedWidth * editedHeight) / 5000).toFixed(2)} kg</span></div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setEditModal(null)} className="flex-1">Cancel</Button>
                <Button className="flex-1 bg-coke-red hover:bg-red-600 text-white" onClick={
                  editModal === 'contents' ? saveContents :
                  editModal === 'weightdims' ? saveWeightDims :
                  validateAndSaveEdit
                }>Save Changes</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════
          2-STEP AGREEMENT MODAL
          Step 1: KYC verification
          Step 2: Agreement with KYC-populated details
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAgreementModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setShowAgreementModal(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-border shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]"
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-coke-red/10 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-coke-red" weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">Shipping Agreement</h3>
                    <p className="text-[11px] text-muted-foreground">{agreementStep === 1 ? 'Step 1 of 2 — Verify your identity' : 'Step 2 of 2 — Review & agree'}</p>
                  </div>
                </div>
                <button onClick={() => setShowAgreementModal(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* ── Step indicator ── */}
              <div className="flex px-5 pt-3 pb-0 gap-2 shrink-0">
                {[1, 2].map(s => (
                  <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-500 ${s <= agreementStep ? 'bg-coke-red' : 'bg-muted'}`} />
                ))}
              </div>

              {/* ── Scrollable body ── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* ════ STEP 1: KYC ════ */}
                {agreementStep === 1 && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20 p-3">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0 text-blue-600" weight="fill" />
                        Why is identity verification required?
                      </p>
                      <p className="text-xs text-blue-800 dark:text-blue-300 mt-1 leading-relaxed">
                        {isDomestic ? 'As per courier regulations, sender identity must be verified before dispatch.' : 'Under CBIC Courier Regulations and PMLA, sender identity must be verified before international dispatch.'}
                      </p>
                    </div>

                    {/* Already verified */}
                    {(aadhaarVerified || docVerified) ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 p-3 rounded-lg bg-candlestick-green/5 border border-candlestick-green/20">
                        <CheckCircle className="h-5 w-5 text-candlestick-green shrink-0" weight="fill" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-candlestick-green">Identity Verified</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">{docVerifiedLabel}</p>
                          {verifiedName && <p className="text-xs text-muted-foreground">Name: {verifiedName}</p>}
                        </div>
                        <button className="text-xs text-muted-foreground hover:text-foreground underline shrink-0" onClick={() => { setDocVerified(false); setAadhaarVerified(false); setDocVerifiedLabel(''); setVerifiedName(''); setVerifiedAddress(''); setVerifiedDob(''); setVerifiedGender(''); setSandboxStep('idle'); setKycFormStep('idle'); setDigilockerStep('idle'); setAadhaarError(''); }}>
                          Change
                        </button>
                      </motion.div>
                    ) : (
                      <>
                        {/* Doc type */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Choose document</p>
                          <div className="grid grid-cols-2 gap-2">
                            {([{ type: 'aadhaar', label: 'Aadhaar' }, { type: 'pan', label: 'PAN Card' }, { type: 'passport', label: 'Passport' }, { type: 'voter_id', label: 'Voter ID' }] as { type: typeof selectedDocType; label: string }[]).map(doc => (
                              <button key={doc.type} onClick={() => { setSelectedDocType(doc.type); setDocInputError(''); setAadhaarError(''); setSandboxStep('idle'); setKycFormStep('idle'); setDigilockerStep('idle'); }}
                                className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all text-left ${selectedDocType === doc.type ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-border bg-muted/30 text-muted-foreground hover:border-blue-300'}`}>
                                {doc.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Doc number */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Enter document details</p>
                          {selectedDocType === 'aadhaar' && <Input type="text" inputMode="numeric" maxLength={14} placeholder="XXXX XXXX XXXX" className="font-mono tracking-widest text-center" value={formattedAadhaar} onChange={handleAadhaarChange} />}
                          {selectedDocType === 'pan' && <Input placeholder="ABCDE1234F" maxLength={10} className="font-mono tracking-widest uppercase" value={panInput} onChange={e => { setPanInput(e.target.value.toUpperCase()); setDocInputError(''); }} />}
                          {selectedDocType === 'passport' && (
                            <div className="space-y-2">
                              <Input placeholder="Passport number (e.g. A1234567)" maxLength={8} className="font-mono tracking-widest uppercase" value={passportInput} onChange={e => { setPassportInput(e.target.value.toUpperCase()); setDocInputError(''); }} />
                              <Input type="date" value={passportDob} onChange={e => { setPassportDob(e.target.value); setDocInputError(''); }} />
                            </div>
                          )}
                          {selectedDocType === 'voter_id' && <Input placeholder="EPIC number (e.g. ABC1234567)" className="font-mono tracking-widest uppercase" value={voterIdInput} onChange={e => { setVoterIdInput(e.target.value.toUpperCase()); setDocInputError(''); }} />}
                          {docInputError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><Warning className="h-3 w-3" weight="fill" /> {docInputError}</p>}
                        </div>

                        {/* Verification method */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Choose verification method</p>

                          {/* Trust bar */}
                          <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-muted/40 border border-border/60 flex-wrap">
                            <span className="text-[10px] text-muted-foreground font-medium">Secured by</span>
                            {[
                              { label: 'UIDAI', bg: '#1A3A6B' },
                              { label: 'DigiLocker', bg: '#0066CC' },
                              { label: 'Cashfree', bg: '#00B050' },
                              { label: 'MeitY', bg: '#FF6600' },
                            ].map((b, i) => (
                              <div key={b.label} className="flex items-center gap-1">
                                {i > 0 && <span className="text-border">·</span>}
                                <span className="inline-flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 rounded-sm" style={{ background: b.bg }} />
                                  <span className="text-[10px] font-semibold text-foreground/70">{b.label}</span>
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { m: 'sandbox_otp', label: 'Aadhaar OTP', desc: 'OTP to registered mobile', onlyAadhaar: true },
                              { m: 'digilocker',  label: 'DigiLocker',  desc: 'Govt-approved consent',   notFor: ['passport', 'voter_id'] },
                              { m: 'kyc_form',    label: 'KYC Form',    desc: 'Secure link via SMS',      notFor: [] },
                            ] as { m: typeof kycMethod; label: string; desc: string; onlyAadhaar?: boolean; notFor?: string[] }[]).map(opt => {
                              const disabled = (opt.onlyAadhaar && selectedDocType !== 'aadhaar') || (opt.notFor?.includes(selectedDocType));
                              return (
                                <button key={opt.m} disabled={disabled} onClick={() => { if (!disabled) { setKycMethod(opt.m); setAadhaarError(''); setSandboxStep('idle'); setKycFormStep('idle'); setDigilockerStep('idle'); } }}
                                  className={`py-2.5 px-2 rounded-lg border text-left transition-all ${disabled ? 'opacity-30 cursor-not-allowed border-border bg-muted/20' : kycMethod === opt.m ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-border bg-background hover:border-blue-300'}`}>
                                  <div className={`text-xs font-semibold ${disabled ? 'text-muted-foreground' : kycMethod === opt.m ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'}`}>{opt.label}</div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.desc}</div>
                                </button>
                              );
                            })}
                          </div>
                          {(selectedDocType === 'passport' || selectedDocType === 'voter_id') && (
                            <p className="text-[11px] text-muted-foreground mt-1.5">Aadhaar OTP and DigiLocker are not available for this document. KYC Form is recommended.</p>
                          )}
                        </div>

                        {/* OTP flow */}
                        {kycMethod === 'sandbox_otp' && selectedDocType === 'aadhaar' && (
                          <div className="space-y-2">
                            {sandboxStep === 'idle' && <Button onClick={() => { feedbackPresets.tap(); handleSendSandboxOtp(); }} disabled={aadhaarLoading || aadhaarInput.length !== 12} className="w-full bg-blue-600 hover:bg-blue-700 text-white">{aadhaarLoading ? <CircleNotch className="h-4 w-4 animate-spin mr-2" /> : null}Send OTP to Aadhaar-registered mobile</Button>}
                            {sandboxStep === 'otp_sent' && (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Enter the 6-digit OTP sent to your Aadhaar-registered mobile.</p>
                                <div className="flex gap-2">
                                  <Input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit OTP" className="font-mono tracking-widest text-center flex-1" value={sandboxOtp} onChange={e => { setSandboxOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setAadhaarError(''); }} />
                                  <Button onClick={() => { feedbackPresets.tap(); handleVerifySandboxOtp(); }} disabled={aadhaarLoading || sandboxOtp.length !== 6} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">{aadhaarLoading ? <CircleNotch className="h-4 w-4 animate-spin" /> : 'Verify'}</Button>
                                </div>
                                <button className="text-xs text-muted-foreground underline" onClick={() => { setSandboxStep('idle'); setSandboxOtp(''); }}>Resend OTP</button>
                              </div>
                            )}
                            {sandboxStep === 'verifying' && <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground"><CircleNotch className="h-4 w-4 animate-spin" /> Verifying OTP...</div>}
                          </div>
                        )}

                        {/* DigiLocker flow */}
                        {kycMethod === 'digilocker' && digilockerSupported && (
                          <div className="space-y-2">
                            {digilockerStep === 'idle' && <Button onClick={() => { feedbackPresets.tap(); handleStartDigiLocker(); }} disabled={aadhaarLoading || (selectedDocType === 'aadhaar' && aadhaarInput.length !== 12)} className="w-full bg-blue-600 hover:bg-blue-700 text-white">{aadhaarLoading ? <CircleNotch className="h-4 w-4 animate-spin mr-2" /> : null}Continue with DigiLocker</Button>}
                            {digilockerStep === 'redirect' && (
                              <div className="space-y-2 p-3 rounded-lg bg-muted/40 border border-border">
                                <p className="text-xs text-muted-foreground">Complete verification in DigiLocker, then return here and click below.</p>
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => window.open(digilockerUrl, '_blank')}>Open DigiLocker</Button>
                                <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleCompleteDigiLocker} disabled={aadhaarLoading}>{aadhaarLoading ? <CircleNotch className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}I have completed DigiLocker — Fetch Result</Button>
                                <button className="text-xs text-muted-foreground underline w-full text-center" onClick={() => setDigilockerStep('idle')}>Cancel</button>
                              </div>
                            )}
                            {digilockerStep === 'verifying' && <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground"><CircleNotch className="h-4 w-4 animate-spin" /> Fetching verified data...</div>}
                          </div>
                        )}

                        {/* KYC Form flow */}
                        {kycMethod === 'kyc_form' && (
                          <div className="space-y-2">
                            {kycFormStep === 'idle' && (
                              <>
                                <Input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" className="font-mono" value={kycPhone} onChange={e => setKycPhone(e.target.value.replace(/\D/g,'').slice(0,10))} />
                                <Button onClick={() => { feedbackPresets.tap(); handleStartKycForm(); }} disabled={aadhaarLoading || kycPhone.length < 10} className="w-full bg-blue-600 hover:bg-blue-700 text-white">{aadhaarLoading ? <CircleNotch className="h-4 w-4 animate-spin mr-2" /> : null}Send KYC Form Link via SMS</Button>
                              </>
                            )}
                            {kycFormStep === 'sent' && (
                              <div className="space-y-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
                                <p className="text-xs text-blue-800 dark:text-blue-300">Form sent to <span className="font-mono font-semibold">{kycPhone}</span>. Complete it, then click below.</p>
                                {kycFormLink && <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => window.open(kycFormLink, '_blank')}>Open KYC Form ↗</Button>}
                                <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleCheckKycForm} disabled={aadhaarLoading}>{aadhaarLoading ? <CircleNotch className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}I've completed the form — Check Status</Button>
                              </div>
                            )}
                            {kycFormStep === 'polling' && <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground"><CircleNotch className="h-4 w-4 animate-spin" /> Checking status...</div>}
                          </div>
                        )}

                        {aadhaarError && <p className="text-xs text-destructive flex items-start gap-1"><Warning className="h-3 w-3 mt-0.5 shrink-0" weight="fill" /><span>{aadhaarError.includes('secret not configured') ? 'Aadhaar OTP service not configured. Please use DigiLocker or KYC Form.' : aadhaarError}</span></p>}
                      </>
                    )}

                    {/* Proceed to step 2 if already verified */}
                    {(aadhaarVerified || docVerified) && (
                      <Button className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 min-h-[48px]" onClick={() => setAgreementStep(2)}>
                        Continue to Agreement <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                {/* ════ STEP 2: AGREEMENT ════ */}
                {agreementStep === 2 && (
                  <div className="space-y-4">
                    {/* KYC verified badge */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-candlestick-green/5 border border-candlestick-green/20">
                      <CheckCircle className="h-5 w-5 text-candlestick-green shrink-0" weight="fill" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-candlestick-green">Identity Verified</p>
                        <p className="text-xs text-muted-foreground font-mono">{verifiedDocId}</p>
                      </div>
                    </div>

                    {/* Sender details from KYC */}
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sender Details (from KYC)</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Full Name</span>
                          <p className="font-medium mt-0.5">{verifiedName || senderReceiver?.senderName || '—'}</p>
                        </div>
                        {verifiedDob && (
                          <div>
                            <span className="text-muted-foreground">Date of Birth</span>
                            <p className="font-medium mt-0.5">{verifiedDob}</p>
                          </div>
                        )}
                        {verifiedGender && (
                          <div>
                            <span className="text-muted-foreground">Gender</span>
                            <p className="font-medium mt-0.5">{verifiedGender === 'M' ? 'Male' : verifiedGender === 'F' ? 'Female' : verifiedGender}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Phone</span>
                          <p className="font-medium mt-0.5">{senderReceiver?.senderPhone || '—'}</p>
                        </div>
                        {senderReceiver?.senderEmail && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Email</span>
                            <p className="font-medium mt-0.5">{senderReceiver.senderEmail}</p>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Address (from Aadhaar)</span>
                          <p className="font-medium mt-0.5">{verifiedAddress || `${senderReceiver?.senderAddress}, ${senderReceiver?.senderCity} - ${senderReceiver?.senderPincode}`}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Document ID</span>
                          <p className="font-mono font-medium mt-0.5">{verifiedDocId}</p>
                        </div>
                      </div>
                    </div>

                    {/* Shipment details */}
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shipment Details</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div><span className="text-muted-foreground">Courier</span><p className="font-medium mt-0.5">{selectedCourier?.carrier || selectedCourier?.courier_name || '—'}</p></div>
                        <div><span className="text-muted-foreground">Amount</span><p className="font-semibold mt-0.5 text-coke-red">₹{finalPrice.toLocaleString('en-IN')}</p></div>
                        <div><span className="text-muted-foreground">Recipient</span><p className="font-medium mt-0.5">{senderReceiver?.receiverName}</p></div>
                        <div><span className="text-muted-foreground">Destination</span><p className="font-medium mt-0.5">{senderReceiver?.receiverCity} - {senderReceiver?.receiverZipcode}</p></div>
                      </div>
                    </div>

                    {/* Agreement text */}
                    <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <p className="font-semibold text-foreground text-sm">Shipping Agreement</p>
                      <p>I, <span className="font-semibold text-foreground">{verifiedName || senderReceiver?.senderName}</span>{verifiedDob ? `, DOB: ${verifiedDob}` : ''}, confirm that:</p>
                      <ul className="space-y-1.5 list-disc pl-4">
                        <li>All information provided is <span className="font-medium text-foreground">true and accurate</span>.</li>
                        <li>This shipment does <span className="font-medium text-foreground">not contain any prohibited, illegal, or restricted items</span> as per Indian law.</li>
                        <li>I am solely responsible for the contents and any legal consequences arising from this shipment.</li>
                        <li>I authorise CourierX to process this shipment and share necessary details with the courier partner.</li>
                        <li>I have read and agree to the policies linked below.</li>
                      </ul>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-border/60">
                        <a href="/terms" target="_blank" className="text-coke-red hover:underline font-medium">Terms & Conditions ↗</a>
                        <a href="/shipping-policy" target="_blank" className="text-coke-red hover:underline font-medium">Shipping Policy ↗</a>
                        <a href="/refund-policy" target="_blank" className="text-coke-red hover:underline font-medium">Refund Policy ↗</a>
                        <a href="/privacy-policy" target="_blank" className="text-coke-red hover:underline font-medium">Privacy Policy ↗</a>
                        <a href="/prohibited-items" target="_blank" className="text-coke-red hover:underline font-medium">Prohibited Items ↗</a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="px-5 py-4 border-t border-border shrink-0 space-y-2">
                {agreementStep === 2 && (
                  <Button className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 min-h-[52px] text-sm font-semibold shadow-lg shadow-coke-red/20" onClick={() => { setTermsAccepted(true); setShowAgreementModal(false); feedbackPresets.tap(); }}>
                    <CheckCircle className="h-5 w-5" weight="fill" /> I Agree & Confirm
                  </Button>
                )}
                <button onClick={() => setShowAgreementModal(false)} className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors">
                  {agreementStep === 1 ? 'Cancel' : 'Back'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
