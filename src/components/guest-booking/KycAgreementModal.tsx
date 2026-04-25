"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowRight, CircleNotch, ShieldCheck, CheckCircle, Warning, Info, X,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { feedbackPresets } from '@/lib/haptics';

// ── Types ────────────────────────────────────────────────────────────────────

type GuestDocType = 'aadhaar' | 'pan' | 'passport' | 'voter_id';
type KycMethod = 'digilocker' | 'sandbox_otp';
type KycTab = 'aadhaar_otp' | 'digilocker' | 'kyc_form';

interface SenderReceiver {
  senderName: string; senderPhone: string; senderEmail: string;
  senderAddress: string; senderCity: string; senderPincode: string;
  receiverName: string; receiverPhone: string; receiverEmail: string;
  receiverAddress: string; receiverCity: string; receiverZipcode: string;
  contentDescription: string;
}

interface KycAgreementModalProps {
  show: boolean;
  onClose: () => void;
  agreementStep: 1 | 2;
  setAgreementStep: (s: 1 | 2) => void;
  isDomestic: boolean;
  // KYC state
  aadhaarVerified: boolean;
  docVerified: boolean;
  docVerifiedLabel: string;
  verifiedName: string;
  verifiedAddress: string;
  verifiedDob: string;
  verifiedGender: string;
  verifiedDocId: string;
  // Doc inputs
  selectedDocType: GuestDocType;
  setSelectedDocType: (t: GuestDocType) => void;
  kycMethod: KycMethod;
  setKycMethod: (m: KycMethod) => void;
  formattedAadhaar: string;
  handleAadhaarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  aadhaarInput: string;
  panInput: string;
  setPanInput: (v: string) => void;
  passportInput: string;
  setPassportInput: (v: string) => void;
  passportDob: string;
  setPassportDob: (v: string) => void;
  voterIdInput: string;
  setVoterIdInput: (v: string) => void;
  docInputError: string;
  setDocInputError: (v: string) => void;
  aadhaarError: string;
  setAadhaarError: (v: string) => void;
  aadhaarLoading: boolean;
  // Sandbox OTP
  sandboxStep: 'idle' | 'otp_sent' | 'verifying';
  setSandboxStep: (s: 'idle' | 'otp_sent' | 'verifying') => void;
  sandboxOtp: string;
  setSandboxOtp: (v: string) => void;
  handleSendSandboxOtp: () => void;
  handleVerifySandboxOtp: (otpOverride?: string) => void;
  // DigiLocker
  digilockerStep: 'idle' | 'redirect' | 'verifying';
  setDigilockerStep: (s: 'idle' | 'redirect' | 'verifying') => void;
  digilockerUrl: string;
  digilockerSupported: boolean;
  handleStartDigiLocker: () => void;
  handleCompleteDigiLocker: () => void;
  // Reset
  resetVerification: () => void;
  // Agreement data
  senderReceiver: SenderReceiver;
  selectedCourier: any;
  finalPrice: number;
  verifiedPhone?: string;
  // Callbacks
  onAccept: () => void;
  onKycFormVerified: (label: string, name: string, phone?: string) => void;
}

// ── Document SVG icons ───────────────────────────────────────────────────────

const DOC_ICONS: Record<GuestDocType, string> = {
  aadhaar: '/logos/doc-aadhaar.svg',
  pan: '/logos/doc-pan.svg',
  passport: '/logos/doc-passport.svg',
  voter_id: '/logos/doc-voterid.svg',
};

const DOC_LABELS: Record<GuestDocType, string> = {
  aadhaar: 'Aadhaar',
  pan: 'PAN Card',
  passport: 'Passport',
  voter_id: 'Voter ID',
};

// ── Tab animation variants ───────────────────────────────────────────────────

const tabContentVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function KycAgreementModal(props: KycAgreementModalProps) {
  const {
    show, onClose, agreementStep, setAgreementStep, isDomestic,
    aadhaarVerified, docVerified, docVerifiedLabel, verifiedName, verifiedAddress,
    verifiedDob, verifiedGender, verifiedDocId,
    selectedDocType, setSelectedDocType, kycMethod, setKycMethod,
    formattedAadhaar, handleAadhaarChange, aadhaarInput,
    panInput, setPanInput, passportInput, setPassportInput,
    passportDob, setPassportDob, voterIdInput, setVoterIdInput,
    docInputError, setDocInputError, aadhaarError, setAadhaarError, aadhaarLoading,
    sandboxStep, setSandboxStep, sandboxOtp, setSandboxOtp,
    handleSendSandboxOtp, handleVerifySandboxOtp,
    digilockerStep, setDigilockerStep, digilockerUrl, digilockerSupported,
    handleStartDigiLocker, handleCompleteDigiLocker,
    resetVerification, senderReceiver, selectedCourier, finalPrice, verifiedPhone, onAccept, onKycFormVerified,
  } = props;

  const [activeTab, setActiveTab] = useState<KycTab>('aadhaar_otp');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // ── Scroll-to-enable state ──
  const [hasScrolledAgreement, setHasScrolledAgreement] = useState(false);
  const agreementScrollRef = useRef<HTMLDivElement>(null);

  // ── OTP UX state ──
  const [showOtp, setShowOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const resendEndTimeRef = useRef<number>(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendTimer = useCallback(() => {
    // Use wall-clock end time so backgrounding the tab doesn't pause the timer
    resendEndTimeRef.current = Date.now() + 120_000;
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    resendTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((resendEndTimeRef.current - Date.now()) / 1000));
      setResendTimer(remaining);
      if (remaining <= 0) {
        clearInterval(resendTimerRef.current!);
        resendTimerRef.current = null;
      }
    }, 500); // tick every 500ms so it stays accurate
    setResendTimer(120);
  }, []);

  // Only start timer when OTP is first sent (idle → otp_sent).
  // Do NOT restart on every otp_sent transition (e.g. after a failed verify).
  const prevSandboxStepRef = useRef(sandboxStep);
  useEffect(() => {
    const prev = prevSandboxStepRef.current;
    prevSandboxStepRef.current = sandboxStep;
    if (sandboxStep === 'otp_sent' && prev === 'idle') {
      startResendTimer();
    }
    if (sandboxStep === 'idle') {
      setResendTimer(0);
      if (resendTimerRef.current) { clearInterval(resendTimerRef.current); resendTimerRef.current = null; }
    }
  }, [sandboxStep, startResendTimer]);

  useEffect(() => { return () => { if (resendTimerRef.current) clearInterval(resendTimerRef.current); }; }, []);

  // ── KYC Form (Cashfree hosted link) state ──
  const [kycFormPhone, setKycFormPhone] = useState(props.senderReceiver?.senderPhone?.replace(/^\+91/, '').slice(-10) || '');
  const [kycFormDocType, setKycFormDocType] = useState<GuestDocType>('aadhaar');
  const [kycFormStep, setKycFormStep] = useState<'idle' | 'sending' | 'sent' | 'polling'>('idle');
  const [kycFormVerificationId, setKycFormVerificationId] = useState('');
  const [kycFormError, setKycFormError] = useState('');
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  const handleSendKycFormLink = async () => {
    const phone = kycFormPhone.replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) { setKycFormError('Enter a valid 10-digit mobile number'); return; }
    setKycFormStep('sending');
    setKycFormError('');
    try {
      const res = await fetch('/api/kyc/kyc-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: 'aadhaar',
          phone,
          name: senderReceiver?.senderName || 'User',
          email: senderReceiver?.senderEmail || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setKycFormError(data.error || 'Failed to send verification link'); setKycFormStep('idle'); return; }
      setKycFormVerificationId(data.verificationId);
      setKycFormStep('sent');
      // Start polling every 5s
      startKycFormPolling(data.verificationId);
    } catch {
      setKycFormError('Failed to send verification link');
      setKycFormStep('idle');
    }
  };

  const startKycFormPolling = (vId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setKycFormStep('polling');
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/kyc/kyc-form?verification_id=${encodeURIComponent(vId)}`);
        const data = await res.json();
        if (data.verified) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          // Mark as verified using the parent's markVerified flow
          const label = `Aadhaar (KYC Form)`;
          props.resetVerification(); // clear first
          // We need to trigger verification through the parent — use a custom callback
          onKycFormVerified(label, data.verifiedName || '', kycFormPhone);
        }
      } catch { /* keep polling */ }
    }, 5000);
  };

  const stopKycFormPolling = () => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    setKycFormStep('idle');
    setKycFormVerificationId('');
  };

  // Sync tab with kycMethod
  useEffect(() => {
    if (activeTab === 'aadhaar_otp') {
      setKycMethod('sandbox_otp');
      if (selectedDocType !== 'aadhaar') setSelectedDocType('aadhaar');
    } else if (activeTab === 'digilocker') {
      setKycMethod('digilocker');
    }
    // KYC Form uses digilocker method under the hood for non-aadhaar docs
    if (activeTab === 'kyc_form') {
      setKycMethod('digilocker');
    }
  }, [activeTab]);

  // Auto-open DigiLocker when URL becomes available (skip the intermediate step)
  const digilockerAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (digilockerStep === 'redirect' && digilockerUrl && !digilockerAutoOpenedRef.current) {
      digilockerAutoOpenedRef.current = true;
      window.open(digilockerUrl, '_blank');
    }
    if (digilockerStep === 'idle') {
      digilockerAutoOpenedRef.current = false;
    }
  }, [digilockerStep, digilockerUrl]);

  const switchTab = (tab: KycTab) => {
    setActiveTab(tab);
    setAadhaarError('');
    setDocInputError('');
    setSandboxStep('idle');
    setDigilockerStep('idle');
    setSandboxOtp('');
    setShowOtp(false);
    stopKycFormPolling();
    setKycFormError('');
    feedbackPresets.tap();
  };

  // Reset scroll state when going back to step 1
  useEffect(() => {
    if (agreementStep === 1) setHasScrolledAgreement(false);
  }, [agreementStep]);

  const isVerified = aadhaarVerified || docVerified;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl border border-border shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]"
          >

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/30 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-blue-600" weight="duotone" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">Shipping Agreement</h3>
                  <p className="text-[11px] text-muted-foreground">{agreementStep === 1 ? 'Step 1 of 2 — Verify your identity' : 'Step 2 of 2 — Review & agree'}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Step indicator ── */}
            <div className="flex px-5 pt-3 pb-0 gap-2 shrink-0">
              {[1, 2].map(s => (
                <motion.div
                  key={s}
                  className={`flex-1 h-1.5 rounded-full ${s <= agreementStep ? 'bg-blue-500' : 'bg-muted'}`}
                  animate={{ backgroundColor: s <= agreementStep ? '#3b82f6' : undefined }}
                  transition={{ duration: 0.4 }}
                />
              ))}
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
              onScroll={(e) => {
                if (agreementStep !== 2 || hasScrolledAgreement) return;
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
                  setHasScrolledAgreement(true);
                }
              }}
            >

              {/* ════ STEP 1: KYC ════ */}
              {agreementStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Govt of India / MeitY trust banner */}
                  <div className="rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100/80 dark:border-blue-800/30 p-3 flex items-center gap-3">
                    <img src="/logos/meity-official.png" alt="Ministry of Electronics & Information Technology, Government of India" className="h-12 w-auto object-contain shrink-0" draggable={false} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-blue-800 dark:text-blue-300 leading-tight">
                        {isDomestic ? 'As per courier regulations, sender identity must be verified before dispatch.' : 'Under CBIC Courier Regulations and PMLA, sender identity must be verified before international dispatch.'}
                      </p>
                    </div>
                  </div>

                  {/* Already verified */}
                  {isVerified ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-emerald-600" weight="fill" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Identity Verified</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{docVerifiedLabel}</p>
                        {verifiedName && <p className="text-xs text-muted-foreground mt-0.5">Name: {verifiedName}</p>}
                      </div>
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0" onClick={resetVerification}>
                        Change
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      {/* ── Tab navigation: Aadhaar OTP | DigiLocker | KYC Form ── */}
                      <div className="flex rounded-xl bg-muted/50 p-1 gap-1 border border-border/50">
                        {([
                          { id: 'aadhaar_otp' as KycTab, label: 'Aadhaar OTP', icon: '🔐' },
                          { id: 'digilocker' as KycTab, label: 'DigiLocker', icon: '📂' },
                          { id: 'kyc_form' as KycTab, label: 'KYC Form', icon: '📝' },
                        ]).map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => switchTab(tab.id)}
                            className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-all relative ${
                              activeTab === tab.id
                                ? 'bg-white dark:bg-card text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200/60 dark:border-blue-700/40'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span className="mr-1">{tab.icon}</span>
                            <span className="hidden xs:inline">{tab.label}</span>
                            <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
                            {activeTab === tab.id && (
                              <motion.div
                                layoutId="kycTabIndicator"
                                className="absolute inset-0 rounded-lg bg-white dark:bg-card border border-blue-200/60 dark:border-blue-700/40 -z-10"
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                              />
                            )}
                          </button>
                        ))}
                      </div>

                      {/* ── Trust badges ── */}
                      <div className="p-3 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900/50 dark:to-blue-950/20 border border-slate-200/60 dark:border-slate-700/40">
                        <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 text-center">Secured by</p>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          {[
                            { src: '/logos/uidai.svg', alt: 'UIDAI' },
                            { src: '/logos/digilocker.svg', alt: 'DigiLocker' },
                            { src: '/logos/cashfree.svg', alt: 'Cashfree' },
                            { src: '/logos/meity-official.png', alt: 'MeitY' },
                          ].map((logo, i) => (
                            <div key={logo.alt} className="flex items-center gap-3">
                              {i > 0 && <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />}
                              <img src={logo.src} alt={logo.alt} title={logo.alt} className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" draggable={false} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── Tab content with animation ── */}
                      <AnimatePresence mode="wait">
                        {/* ═══ AADHAAR OTP TAB ═══ */}
                        {activeTab === 'aadhaar_otp' && (
                          <motion.div
                            key="aadhaar_otp"
                            variants={tabContentVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                          >
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-foreground">Aadhaar Number</label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={14}
                                placeholder="XXXX XXXX XXXX"
                                className="font-mono tracking-widest text-center h-12 text-base border-blue-200/60 focus:border-blue-400"
                                value={formattedAadhaar}
                                onChange={handleAadhaarChange}
                              />
                              {docInputError && (
                                <p className="text-xs text-red-600 flex items-center gap-1.5">
                                  <Warning className="h-3.5 w-3.5 shrink-0" weight="fill" /> {docInputError}
                                </p>
                              )}
                            </div>

                            {sandboxStep === 'idle' && (
                              <Button
                                onClick={() => { feedbackPresets.tap(); handleSendSandboxOtp(); }}
                                disabled={aadhaarLoading || aadhaarInput.length !== 12}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-sm font-medium rounded-xl"
                              >
                                {aadhaarLoading ? <CircleNotch className="h-4 w-4 animate-spin mr-2" /> : null}
                                Send OTP to Aadhaar-registered mobile
                              </Button>
                            )}

                            {sandboxStep === 'otp_sent' && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-3"
                              >
                                <p className="text-xs text-muted-foreground">Enter the 6-digit OTP sent to your Aadhaar-registered mobile.</p>
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <Input
                                      type={showOtp ? 'text' : 'password'}
                                      inputMode="numeric"
                                      maxLength={6}
                                      placeholder="6-digit OTP"
                                      className={`font-mono tracking-widest text-center h-11 text-base pr-10 ${aadhaarError ? 'border-red-500 focus:border-red-500 bg-red-50/40 dark:bg-red-950/20' : ''}`}
                                      value={sandboxOtp}
                                      onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setSandboxOtp(val);
                                        setAadhaarError('');
                                        if (val.length === 6) {
                                          feedbackPresets.tap(); handleVerifySandboxOtp(val);
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowOtp(v => !v)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                      tabIndex={-1}
                                    >
                                      {showOtp ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                      )}
                                    </button>
                                  </div>
                                  <Button
                                    onClick={() => { feedbackPresets.tap(); handleVerifySandboxOtp(); }}
                                    disabled={aadhaarLoading || sandboxOtp.length !== 6}
                                    className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 h-11 px-6 rounded-xl"
                                  >
                                    {aadhaarLoading ? <CircleNotch className="h-4 w-4 animate-spin" /> : 'Verify'}
                                  </Button>
                                </div>

                                {/* Wrong OTP error */}
                                {aadhaarError && (
                                  <motion.p initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                                    className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg border border-red-200/60 dark:border-red-800/30">
                                    <Warning className="h-3.5 w-3.5 shrink-0" weight="fill" />
                                    {aadhaarError.includes('secret not configured') ? 'Aadhaar OTP service not configured. Please use DigiLocker.' : aadhaarError}
                                  </motion.p>
                                )}

                                {/* Resend with timer */}
                                <div className="flex items-center gap-2">
                                  {resendTimer > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      Resend OTP in <span className="font-semibold text-foreground tabular-nums">{Math.floor(resendTimer / 60)}:{String(resendTimer % 60).padStart(2, '0')}</span>
                                    </p>
                                  ) : (
                                    <button
                                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                      onClick={() => {
                                        setSandboxOtp('');
                                        setAadhaarError('');
                                        setShowOtp(false);
                                        feedbackPresets.tap();
                                        handleSendSandboxOtp();
                                      }}
                                    >
                                      Resend OTP
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}

                            {sandboxStep === 'verifying' && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 text-sm text-blue-700 dark:text-blue-300">
                                <CircleNotch className="h-4 w-4 animate-spin" /> Verifying OTP...
                              </motion.div>
                            )}
                          </motion.div>
                        )}

                        {/* ═══ DIGILOCKER TAB ═══ */}
                        {activeTab === 'digilocker' && (
                          <motion.div
                            key="digilocker"
                            variants={tabContentVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                          >
                            {/* Document selection for DigiLocker — only Aadhaar & PAN supported */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-foreground">Select document</label>
                              <div className="grid grid-cols-2 gap-2">
                                {(['aadhaar', 'pan'] as GuestDocType[]).map(doc => (
                                  <button
                                    key={doc}
                                    onClick={() => { setSelectedDocType(doc); setDocInputError(''); setAadhaarError(''); }}
                                    className={`flex items-center gap-2.5 py-3 px-3 rounded-xl border text-left transition-all ${
                                      selectedDocType === doc
                                        ? 'border-blue-400 bg-blue-50/80 dark:bg-blue-950/30 ring-1 ring-blue-200/50'
                                        : 'border-border/60 bg-card hover:border-blue-200 hover:bg-blue-50/30'
                                    }`}
                                  >
                                    <img src={DOC_ICONS[doc]} alt={DOC_LABELS[doc]} className="h-8 w-8 object-contain" draggable={false} />
                                    <span className={`text-xs font-medium ${selectedDocType === doc ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'}`}>
                                      {DOC_LABELS[doc]}
                                    </span>
                                  </button>
                                ))}
                              </div>
                              <p className="text-[10px] text-muted-foreground">For Passport or Voter ID, use the KYC Form tab.</p>
                            </div>

                            {/* Document number input */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-foreground">Document number</label>
                              {selectedDocType === 'aadhaar' && (
                                <Input type="text" inputMode="numeric" maxLength={14} placeholder="XXXX XXXX XXXX" className="font-mono tracking-widest text-center h-11" value={formattedAadhaar} onChange={handleAadhaarChange} />
                              )}
                              {selectedDocType === 'pan' && (
                                <Input placeholder="ABCDE1234F" maxLength={10} className="font-mono tracking-widest uppercase h-11" value={panInput} onChange={e => { setPanInput(e.target.value.toUpperCase()); setDocInputError(''); }} />
                              )}
                              {selectedDocType === 'passport' && (
                                <div className="space-y-2">
                                  <Input placeholder="Passport number (e.g. A1234567)" maxLength={8} className="font-mono tracking-widest uppercase h-11" value={passportInput} onChange={e => { setPassportInput(e.target.value.toUpperCase()); setDocInputError(''); }} />
                                  <Input type="date" className="h-11" value={passportDob} onChange={e => { setPassportDob(e.target.value); setDocInputError(''); }} />
                                </div>
                              )}
                              {selectedDocType === 'voter_id' && (
                                <Input placeholder="EPIC number (e.g. ABC1234567)" className="font-mono tracking-widest uppercase h-11" value={voterIdInput} onChange={e => { setVoterIdInput(e.target.value.toUpperCase()); setDocInputError(''); }} />
                              )}
                              {docInputError && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><Warning className="h-3 w-3" weight="fill" /> {docInputError}</p>}
                            </div>

                            {/* DigiLocker action */}
                            {digilockerSupported ? (
                              <div className="space-y-2">
                                {digilockerStep === 'idle' && (
                                  <Button
                                    onClick={() => { feedbackPresets.tap(); handleStartDigiLocker(); }}
                                    disabled={aadhaarLoading || (selectedDocType === 'aadhaar' && aadhaarInput.length !== 12)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-sm font-medium rounded-xl"
                                  >
                                    {aadhaarLoading ? <CircleNotch className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Continue with DigiLocker
                                  </Button>
                                )}
                                {digilockerStep === 'redirect' && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-3 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/40 dark:border-blue-800/30"
                                  >
                                    <p className="text-xs text-muted-foreground">DigiLocker has been opened in a new tab. Complete verification there, then click below.</p>
                                    <Button variant="outline" className="w-full text-sm h-10 rounded-xl" onClick={() => window.open(digilockerUrl, '_blank')}>
                                      Reopen DigiLocker
                                    </Button>
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-10 rounded-xl" onClick={handleCompleteDigiLocker} disabled={aadhaarLoading}>
                                      {aadhaarLoading ? <CircleNotch className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                                      I have completed — Fetch Result
                                    </Button>
                                    <button className="text-xs text-muted-foreground hover:text-foreground w-full text-center" onClick={() => setDigilockerStep('idle')}>Cancel</button>
                                  </motion.div>
                                )}
                                {digilockerStep === 'verifying' && (
                                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 text-sm text-blue-700 dark:text-blue-300">
                                    <CircleNotch className="h-4 w-4 animate-spin" /> Fetching verified data...
                                  </motion.div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-amber-600 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/40">
                                DigiLocker is not available for {DOC_LABELS[selectedDocType]}. Please use Aadhaar OTP or KYC Form.
                              </p>
                            )}
                          </motion.div>
                        )}

                        {/* ═══ KYC FORM TAB ═══ */}
                        {activeTab === 'kyc_form' && (
                          <motion.div
                            key="kyc_form"
                            variants={tabContentVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                          >
                            {/* Document selection — KYC Form only supports Aadhaar via Cashfree hosted link */}
                            <div className="rounded-xl bg-blue-50/40 dark:bg-blue-950/15 border border-blue-100/60 dark:border-blue-800/20 p-3 flex items-start gap-2.5">
                              <img src={DOC_ICONS['aadhaar']} alt="Aadhaar" className="h-10 w-10 object-contain shrink-0" draggable={false} />
                              <div>
                                <p className="text-xs font-semibold text-foreground">Aadhaar Verification</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                  We&apos;ll send a secure Cashfree-hosted verification link to your mobile. Open it on your phone and complete Aadhaar verification — no app needed.
                                </p>
                              </div>
                            </div>

                            {/* Mobile number input */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-foreground">Mobile number</label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground font-medium shrink-0">+91</span>
                                <Input
                                  type="tel"
                                  inputMode="numeric"
                                  maxLength={10}
                                  placeholder="10-digit mobile number"
                                  className="font-mono tracking-wider h-11 text-base"
                                  value={kycFormPhone}
                                  onChange={e => { setKycFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setKycFormError(''); }}
                                  disabled={kycFormStep === 'polling' || kycFormStep === 'sent'}
                                />
                              </div>
                            </div>

                            {/* Info box */}
                            <div className="rounded-xl bg-blue-50/40 dark:bg-blue-950/15 border border-blue-100/60 dark:border-blue-800/20 p-3">
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {selectedDocType === 'aadhaar'
                                  ? "We'll send a verification OTP to your Aadhaar-registered mobile number."
                                  : "We'll verify your document via DigiLocker. A new tab will open automatically."}
                              </p>
                            </div>

                            {/* Send link button */}
                            {kycFormStep === 'idle' && (
                              <Button
                                onClick={() => { feedbackPresets.tap(); handleSendKycFormLink(); }}
                                disabled={kycFormPhone.length !== 10}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-sm font-medium rounded-xl"
                              >
                                Send Verification Link via SMS
                              </Button>
                            )}

                            {kycFormStep === 'sending' && (
                              <div className="flex items-center gap-2 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 text-sm text-blue-700 dark:text-blue-300">
                                <CircleNotch className="h-4 w-4 animate-spin" /> Sending verification link...
                              </div>
                            )}

                            {/* Waiting for completion */}
                            {(kycFormStep === 'sent' || kycFormStep === 'polling') && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-3 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/40 dark:border-blue-800/30"
                              >
                                <div className="flex items-center gap-2">
                                  <CircleNotch className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                                  <p className="text-xs text-foreground font-medium">Verification link sent to +91 {kycFormPhone}</p>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  Open the SMS on your phone and complete the verification. This page will update automatically once done.
                                </p>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" className="flex-1 text-xs h-9 rounded-xl" onClick={() => { stopKycFormPolling(); handleSendKycFormLink(); }}>
                                    Resend Link
                                  </Button>
                                  <Button variant="outline" size="sm" className="flex-1 text-xs h-9 rounded-xl" onClick={stopKycFormPolling}>
                                    Cancel
                                  </Button>
                                </div>
                              </motion.div>
                            )}

                            {/* Error */}
                            {kycFormError && (
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-amber-600 flex items-start gap-1.5 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/40">
                                <Warning className="h-3.5 w-3.5 mt-0.5 shrink-0" weight="fill" />
                                <span>{kycFormError}</span>
                              </motion.p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </>
                  )}

                  {/* Proceed to step 2 */}
                  {isVerified && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-h-[48px] rounded-xl font-medium shadow-sm" onClick={() => setAgreementStep(2)}>
                        Continue to Agreement <ArrowRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ════ STEP 2: AGREEMENT ════ */}
              {agreementStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* KYC verified badge */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30">
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" weight="fill" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Identity Verified</p>
                      <p className="text-xs text-muted-foreground font-mono">{verifiedDocId}</p>
                    </div>
                  </div>

                  {/* Sender details from KYC */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sender Details (from KYC)</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Full Name</span>
                        <p className="font-medium mt-0.5">{verifiedName || senderReceiver?.senderName || '—'}</p>
                      </div>
                      {verifiedDob && (() => {
                        const dobDate = new Date(verifiedDob.split('/').reverse().join('-'));
                        const age = isNaN(dobDate.getTime()) ? null : Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                        return (
                          <div>
                            <span className="text-muted-foreground">Age (as per KYC)</span>
                            <p className="font-medium mt-0.5">{age !== null ? `${age} years` : verifiedDob}</p>
                          </div>
                        );
                      })()}
                      {verifiedGender && (
                        <div>
                          <span className="text-muted-foreground">Gender</span>
                          <p className="font-medium mt-0.5">{verifiedGender === 'M' ? 'Male' : verifiedGender === 'F' ? 'Female' : verifiedGender}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Phone</span>
                        <p className="font-medium mt-0.5">{
                          (() => {
                            const ph = verifiedPhone || senderReceiver?.senderPhone || '';
                            const digits = ph.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
                            return digits.length === 10 ? `+91 ${digits}` : '—';
                          })()
                        }</p>
                      </div>
                      {senderReceiver?.senderEmail && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Email</span>
                          <p className="font-medium mt-0.5">{senderReceiver.senderEmail}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Address</span>
                        <p className="font-medium mt-0.5">{verifiedAddress || `${senderReceiver?.senderAddress}, ${senderReceiver?.senderCity} - ${senderReceiver?.senderPincode}`}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Document ID</span>
                        <p className="font-mono font-medium mt-0.5">{verifiedDocId}</p>
                      </div>
                    </div>
                  </div>

                  {/* Shipment details */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shipment Details</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div><span className="text-muted-foreground">Courier</span><p className="font-medium mt-0.5">{selectedCourier?.carrier || selectedCourier?.courier_name || '—'}</p></div>
                      <div><span className="text-muted-foreground">Amount</span><p className="font-semibold mt-0.5 text-emerald-600 dark:text-emerald-400">₹{finalPrice.toLocaleString('en-IN')}</p></div>
                      <div><span className="text-muted-foreground">Recipient</span><p className="font-medium mt-0.5">{senderReceiver?.receiverName}</p></div>
                      <div><span className="text-muted-foreground">Destination</span><p className="font-medium mt-0.5">{senderReceiver?.receiverCity} - {senderReceiver?.receiverZipcode}</p></div>
                    </div>
                  </div>

                  {/* Agreement text */}
                  <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 text-xs text-muted-foreground leading-relaxed">
                    <div className="border-b border-border pb-2">
                      <p className="font-bold text-foreground text-sm uppercase tracking-wide">Service Level Agreement</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Goldilocks Zone Private Limited · CIN: U52290OD2026PTC053323 · Rathagadasahi, Urali, Cuttack, Odisha – 753011
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px]">
                        This Agreement is entered into between <span className="font-semibold text-foreground">Goldilocks Zone Private Limited</span>, operating under the trade name <span className="font-semibold text-foreground">CourierX™</span> (the &quot;Company&quot;), and:
                      </p>
                      <div className="bg-muted/40 rounded-lg p-2 text-[11px] space-y-0.5">
                        <p><span className="text-muted-foreground">Name:</span> <span className="font-semibold text-foreground">{verifiedName || senderReceiver?.senderName}</span></p>
                        {verifiedDob && <p><span className="text-muted-foreground">DOB:</span> <span className="font-medium text-foreground">{verifiedDob}</span></p>}
                        <p><span className="text-muted-foreground">Address:</span> <span className="font-medium text-foreground">{verifiedAddress || `${senderReceiver?.senderAddress}, ${senderReceiver?.senderCity} – ${senderReceiver?.senderPincode}`}</span></p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Identity verified via Aadhaar OTP authentication. This electronic execution constitutes a valid and binding legal signature under the <span className="font-medium">Information Technology Act, 2000 (Section 5 &amp; Section 10A)</span> and the <span className="font-medium">IT (Amendment) Act, 2008</span>.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <p className="font-semibold text-foreground text-[11px]">1. Declaration of Shipment Contents</p>
                        <ul className="list-disc pl-4 space-y-1 mt-1">
                          <li>I warrant that the description, quantity, and declared value of goods are <span className="font-medium text-foreground">100% accurate</span>.</li>
                          <li>This shipment does <span className="font-medium text-foreground">not contain any prohibited, illegal, hazardous, or restricted items</span> as per the Indian Postal Act, 1898; IATA Dangerous Goods Regulations; Narcotic Drugs &amp; Psychotropic Substances Act, 1985; Customs Act, 1962; or any other applicable law.</li>
                          <li>I agree to indemnify the Company against any claims, fines, legal proceedings, or penalties arising from undeclared or illegal goods.</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-[11px]">2. Weight, Dimensions &amp; Surcharges</p>
                        <ul className="list-disc pl-4 space-y-1 mt-1">
                          <li>The Company and its carrier partners reserve the right to re-weigh and re-measure shipments.</li>
                          <li>If actual weight or volumetric dimensions exceed declared values, I am liable to pay additional charges immediately.</li>
                          <li>If additional charges remain unpaid for more than <span className="font-medium text-foreground">4 days</span>, the Company reserves the right to confiscate the shipment.</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-[11px]">3. Limitation of Liability &amp; Insurance</p>
                        <ul className="list-disc pl-4 space-y-1 mt-1">
                          <li>CourierX™ is a <span className="font-medium text-foreground">service aggregator</span> and is not directly responsible for loss or damage caused by third-party courier partners.</li>
                          <li>Basic insurance coverage is limited to <span className="font-medium text-foreground">100% of shipment value plus courier charges, up to ₹3,000</span>.</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-[11px]">4. Inspection, KYC &amp; Compliance</p>
                        <ul className="list-disc pl-4 space-y-1 mt-1">
                          <li>The Company or any authorised government body may open and inspect any shipment at any time.</li>
                          <li>I am responsible for providing all KYC documents required under PMLA, CBIC Courier Regulations, and FEMA.</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-[11px]">5. Packaging Responsibility</p>
                        <p className="mt-1">I am solely responsible for ensuring contents are packed securely.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-[11px]">6. Data Processing &amp; Privacy</p>
                        <p className="mt-1">I consent to the processing of my personal data for shipment processing, regulatory compliance, and fraud prevention, in accordance with the IT Act, 2000, SPDI Rules, 2011, and the Digital Personal Data Protection Act, 2023.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-[11px]">7. Governing Law &amp; Jurisdiction</p>
                        <p className="mt-1">This Agreement is governed by the laws of India. All disputes shall be subject to the exclusive jurisdiction of the courts in <span className="font-medium text-foreground">Cuttack, Odisha</span>.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-[11px]">8. Force Majeure</p>
                        <p className="mt-1">The Company shall not be responsible for delays caused by natural disasters, war, strikes, pandemics, or government restrictions beyond its control.</p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-2 space-y-1">
                      <p className="text-[11px] font-medium text-foreground">By clicking &quot;I Agree &amp; Confirm&quot; below, I confirm that:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>I have read, understood, and agree to all clauses of this Agreement.</li>
                        <li>I authorise CourierX™ to process this shipment and share necessary details with the courier partner.</li>
                        <li>This digital acceptance is legally binding under the <span className="font-medium">IT Act, 2000</span>.</li>
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-border/60">
                      <a href="/terms" target="_blank" className="text-blue-600 hover:underline font-medium">Terms &amp; Conditions ↗</a>
                      <a href="/shipping-policy" target="_blank" className="text-blue-600 hover:underline font-medium">Shipping Policy ↗</a>
                      <a href="/refund-policy" target="_blank" className="text-blue-600 hover:underline font-medium">Refund Policy ↗</a>
                      <a href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline font-medium">Privacy Policy ↗</a>
                      <a href="/prohibited-items" target="_blank" className="text-blue-600 hover:underline font-medium">Prohibited Items ↗</a>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-4 border-t border-border/60 shrink-0 space-y-2">
              {agreementStep === 2 && (
                <>
                  {!hasScrolledAgreement && (
                    <p className="text-[11px] text-center text-muted-foreground">Scroll through the agreement to enable confirmation</p>
                  )}
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-h-[52px] text-sm font-semibold shadow-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onAccept}
                    disabled={!hasScrolledAgreement}
                  >
                    <CheckCircle className="h-5 w-5" weight="fill" /> I Agree & Confirm
                  </Button>
                </>
              )}
              <button onClick={onClose} className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors">
                {agreementStep === 1 ? 'Cancel' : 'Back'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
