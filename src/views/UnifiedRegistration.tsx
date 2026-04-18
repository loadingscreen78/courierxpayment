"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Envelope, Lock, Eye, EyeSlash, ArrowRight, CircleNotch,
  User, Phone, ShieldCheck, FileText, IdentificationCard,
  CheckCircle, WarningCircle, CloudArrowUp, CaretDown,
  MapPin, Calendar, GenderIntersex,
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// ─── Types ───────────────────────────────────────────────────────────
type FlowStep = 'email-check' | 'signin' | 'credentials' | 'otp' | 'documents' | 'personal' | 'agreement';
type RegistrationStep = 1 | 2 | 3 | 4; // For progress bar: credentials, documents, personal, agreement

// ─── Schemas ─────────────────────────────────────────────────────────
const emailCheckSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const signInSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const credentialsSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  mobile: z.string().regex(/^\+91[0-9]{10}$/, 'Enter a valid Indian mobile number (+91XXXXXXXXXX)'),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const personalSchema = z.object({
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  address1: z.string().min(1, 'Address Line 1 is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  country: z.string().default('India'),
});

type EmailCheckValues = z.infer<typeof emailCheckSchema>;
type SignInValues = z.infer<typeof signInSchema>;
type CredentialsValues = z.infer<typeof credentialsSchema>;
type PersonalValues = z.infer<typeof personalSchema>;

// ─── Persist key ─────────────────────────────────────────────────────
const PERSIST_KEY = 'courierx_reg_state';

interface PersistedState {
  step: FlowStep;
  email: string;
  fullName: string;
  mobile: string;
  aadhaarDigits: string[];
  aadhaarFrontName: string | null;
  aadhaarBackName: string | null;
  extractedName: string;
  extractedAadhaar: string;
  personalDetails: Partial<PersonalValues>;
}

function loadPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function persistState(state: Partial<PersistedState>) {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadPersistedState() || {};
    sessionStorage.setItem(PERSIST_KEY, JSON.stringify({ ...existing, ...state }));
  } catch { /* ignore */ }
}

function clearPersistedState() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PERSIST_KEY);
}

// ─── Step transition animation ───────────────────────────────────────
const stepVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};
const stepTransition = { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const };

// ─── Progress bar steps ──────────────────────────────────────────────
const PROGRESS_STEPS = ['Account Setup', 'Documents', 'Personal Details', 'Agreement'] as const;

function getRegistrationStep(flowStep: FlowStep): RegistrationStep | null {
  switch (flowStep) {
    case 'credentials': case 'otp': return 1;
    case 'documents': return 2;
    case 'personal': return 3;
    case 'agreement': return 4;
    default: return null;
  }
}

// ─── Aadhaar types for instructions panel ────────────────────────────
const AADHAAR_TYPES = [
  { label: 'Original Aadhaar Card', desc: 'Physical card issued by UIDAI', icon: '🪪' },
  { label: 'Aadhaar Letter', desc: 'Printed letter from enrollment center', icon: '📄' },
  { label: 'e-Aadhaar (PDF)', desc: 'Downloaded from uidai.gov.in', icon: '📑' },
  { label: 'mAadhaar Screenshot', desc: 'Screenshot from mAadhaar app', icon: '📱' },
];

// ─── Indian states ───────────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Chandigarh',
  'Puducherry','Andaman & Nicobar Islands','Dadra & Nagar Haveli','Daman & Diu','Lakshadweep',
];

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════
export default function UnifiedRegistration() {
  const router = useRouter();
  const { user, signInWithEmail, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const { toast } = useToast();

  // ── Global state ──
  const persisted = loadPersistedState();
  const [flowStep, setFlowStep] = useState<FlowStep>(persisted?.step || 'email-check');
  const [email, setEmail] = useState(persisted?.email || '');
  const [fullName, setFullName] = useState(persisted?.fullName || '');
  const [mobile, setMobile] = useState(persisted?.mobile || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpToken, setOtpToken] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Documents state (Step 2)
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [aadhaarFrontPreview, setAadhaarFrontPreview] = useState<string | null>(null);
  const [aadhaarBackPreview, setAadhaarBackPreview] = useState<string | null>(null);
  const [aadhaarDigits, setAadhaarDigits] = useState<string[]>(persisted?.aadhaarDigits || ['', '', '']);
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Extracted from Aadhaar API (Step 2 → Step 4)
  const [extractedName, setExtractedName] = useState(persisted?.extractedName || '');
  const [extractedAadhaar, setExtractedAadhaar] = useState(persisted?.extractedAadhaar || '');

  // Agreement state (Step 4)
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // ── Redirect if already logged in ──
  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  // ── Persist state on changes ──
  useEffect(() => {
    if (flowStep !== 'email-check' && flowStep !== 'signin') {
      persistState({
        step: flowStep,
        email,
        fullName,
        mobile,
        aadhaarDigits,
        aadhaarFrontName: aadhaarFront?.name || null,
        aadhaarBackName: aadhaarBack?.name || null,
        extractedName,
        extractedAadhaar,
      });
    }
  }, [flowStep, email, fullName, mobile, aadhaarDigits, aadhaarFront, aadhaarBack, extractedName, extractedAadhaar]);

  // ── OTP countdown ──
  useEffect(() => {
    if (flowStep === 'otp' && otpCountdown > 0) {
      countdownRef.current = setInterval(() => {
        setOtpCountdown(prev => {
          if (prev <= 1) { if (countdownRef.current) clearInterval(countdownRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [flowStep, otpCountdown]);

  // ── Forms ──
  const emailCheckForm = useForm<EmailCheckValues>({
    resolver: zodResolver(emailCheckSchema),
    defaultValues: { email: email || '' },
  });

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { password: '' },
  });

  const credentialsForm = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      fullName: fullName || '',
      password: '',
      confirmPassword: '',
      mobile: mobile || '+91',
    },
  });

  const personalForm = useForm<PersonalValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      dob: (persisted?.personalDetails?.dob) || '',
      gender: (persisted?.personalDetails?.gender) || '',
      address1: (persisted?.personalDetails?.address1) || '',
      address2: (persisted?.personalDetails?.address2) || '',
      city: (persisted?.personalDetails?.city) || '',
      state: (persisted?.personalDetails?.state) || '',
      pincode: (persisted?.personalDetails?.pincode) || '',
      country: 'India',
    },
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 0: EMAIL CHECK
  // ═══════════════════════════════════════════════════════════════════
  const handleEmailCheck = async (values: EmailCheckValues) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();
      setEmail(values.email);

      if (data.exists) {
        setFlowStep('signin');
      } else {
        setFlowStep('credentials');
        credentialsForm.setValue('fullName', '');
      }
    } catch {
      toast({ title: 'Error', description: 'Could not check email. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // SIGN IN (existing user)
  // ═══════════════════════════════════════════════════════════════════
  const handleSignIn = async (values: SignInValues) => {
    setIsLoading(true);
    const { error } = await signInWithEmail(email, values.password);
    setIsLoading(false);
    if (error) {
      toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
    router.replace('/dashboard');
  };

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: CREDENTIALS → SEND OTP
  // ═══════════════════════════════════════════════════════════════════
  const handleCredentials = async (values: CredentialsValues) => {
    setIsLoading(true);
    setFullName(values.fullName);
    setMobile(values.mobile);
    setPassword(values.password);

    try {
      // Send OTP to mobile via FAST2SMS
      const res = await fetch('/api/auth/phone-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: values.mobile }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({ title: 'Error', description: data.error || 'Failed to send OTP', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      setOtpCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setFlowStep('otp');
      toast({ title: 'OTP Sent', description: `Verification code sent to ${values.mobile}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to send OTP. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // OTP VERIFICATION
  // ═══════════════════════════════════════════════════════════════════
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Please enter all 6 digits.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/phone-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mobile, code }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({ title: 'Verification failed', description: data.error || 'Incorrect OTP', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Set session from phone OTP verify response
      if (data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // Update profile with name and email
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.from('profiles').upsert({
          user_id: currentUser.id,
          full_name: fullName,
          email: email,
          phone_number: mobile,
        }, { onConflict: 'user_id' });
      }

      toast({ title: 'Verified!', description: 'Mobile number verified successfully.' });
      setFlowStep('documents');
    } catch {
      toast({ title: 'Error', description: 'Verification failed. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/phone-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mobile }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpCountdown(60);
        setOtpDigits(['', '', '', '', '', '']);
        toast({ title: 'OTP Resent', description: 'New code sent to your mobile.' });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to resend OTP', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to resend OTP.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2: DOCUMENTS (Aadhaar upload + verification)
  // ═══════════════════════════════════════════════════════════════════
  const handleFileSelect = (side: 'front' | 'back', file: File) => {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'File too large', description: 'Max file size is 5MB', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (side === 'front') {
        setAadhaarFront(file);
        setAadhaarFrontPreview(reader.result as string);
      } else {
        setAadhaarBack(file);
        setAadhaarBackPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAadhaarDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    const newDigits = [...aadhaarDigits];
    newDigits[index] = cleaned;
    setAadhaarDigits(newDigits);

    // Auto-advance to next box when 4 digits entered
    if (cleaned.length === 4 && index < 2) {
      const nextInput = document.getElementById(`aadhaar-box-${index + 1}`);
      nextInput?.focus();
    }
  };

  const getFullAadhaar = () => aadhaarDigits.join('');

  const handleDocumentsSubmit = async () => {
    const aadhaarNumber = getFullAadhaar();
    if (!aadhaarFront || !aadhaarBack) {
      toast({ title: 'Missing files', description: 'Please upload both front and back of your Aadhaar.', variant: 'destructive' });
      return;
    }
    if (aadhaarNumber.length !== 12) {
      toast({ title: 'Invalid Aadhaar', description: 'Aadhaar number must be exactly 12 digits.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Session expired', description: 'Please start over.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Call KYC send-otp to initiate DigiLocker verification
      const res = await fetch('/api/kyc/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ aadhaarNumber }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        // If KYC API fails, still allow proceeding with manual entry
        // Store the name from credentials as fallback
        setExtractedName(fullName);
        setExtractedAadhaar(aadhaarNumber);
        persistState({ extractedName: fullName, extractedAadhaar: aadhaarNumber });
        toast({
          title: 'Aadhaar verification pending',
          description: 'We could not verify your Aadhaar automatically. You can complete verification later from your dashboard.',
        });
        setFlowStep('personal');
        setIsLoading(false);
        return;
      }

      // If DigiLocker URL is returned, open it in a new tab
      if (data.digilockerUrl) {
        // Store verification IDs for later
        const verificationId = data.verificationId;
        const referenceId = data.referenceId;

        // Open DigiLocker in new window
        const digiWin = window.open(data.digilockerUrl, '_blank', 'width=600,height=700');

        // Poll for completion (check every 3 seconds for up to 5 minutes)
        let attempts = 0;
        const maxAttempts = 100;
        const pollInterval = setInterval(async () => {
          attempts++;
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setExtractedName(fullName);
            setExtractedAadhaar(aadhaarNumber);
            toast({ title: 'Verification timeout', description: 'DigiLocker verification timed out. Proceeding with manual details.' });
            setFlowStep('personal');
            setIsLoading(false);
            return;
          }

          try {
            const verifyRes = await fetch('/api/kyc/verify-otp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ referenceId, verificationId, aadhaarNumber }),
            });
            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              clearInterval(pollInterval);
              setExtractedName(verifyData.verifiedName || fullName);
              setExtractedAadhaar(verifyData.maskedAadhaar || `XXXX XXXX ${aadhaarNumber.slice(-4)}`);
              persistState({
                extractedName: verifyData.verifiedName || fullName,
                extractedAadhaar: verifyData.maskedAadhaar || `XXXX XXXX ${aadhaarNumber.slice(-4)}`,
              });
              toast({ title: 'Aadhaar Verified!', description: 'Your identity has been verified successfully.' });
              setFlowStep('personal');
              setIsLoading(false);
              if (digiWin && !digiWin.closed) digiWin.close();
            }
          } catch { /* continue polling */ }
        }, 3000);

        return; // Don't set isLoading false yet — polling handles it
      }

      // Fallback: no DigiLocker URL
      setExtractedName(fullName);
      setExtractedAadhaar(aadhaarNumber);
      setFlowStep('personal');
    } catch {
      toast({ title: 'Error', description: 'Aadhaar verification failed. Please try again.', variant: 'destructive' });
      // Allow proceeding anyway
      setExtractedName(fullName);
      setExtractedAadhaar(aadhaarNumber);
      setFlowStep('personal');
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3: PERSONAL DETAILS
  // ═══════════════════════════════════════════════════════════════════
  const handlePersonalSubmit = async (values: PersonalValues) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Session expired', description: 'Please start over.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Save personal details to profile
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const address = [values.address1, values.address2, values.city, values.state, values.pincode, values.country]
          .filter(Boolean).join(', ');

        await supabase.from('profiles').update({
          aadhaar_address: address,
        }).eq('user_id', currentUser.id);
      }

      persistState({ personalDetails: values });
      setFlowStep('agreement');
    } catch {
      toast({ title: 'Error', description: 'Failed to save details. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // STEP 4: AGREEMENT → COMPLETE
  // ═══════════════════════════════════════════════════════════════════
  const handleCompleteRegistration = async () => {
    if (!agreedToTerms) {
      toast({ title: 'Agreement required', description: 'Please agree to the Terms & Conditions.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        // Mark KYC as submitted
        await supabase.from('profiles').update({
          kyc_completed_at: new Date().toISOString(),
          account_status: 'pending',
        } as Record<string, unknown>).eq('user_id', currentUser.id);
      }

      clearPersistedState();
      toast({ title: 'Registration Complete!', description: 'Welcome to CourierX. Redirecting to your dashboard...' });

      // Small delay for toast visibility, then redirect
      setTimeout(() => {
        router.replace('/dashboard');
      }, 1500);
    } catch {
      toast({ title: 'Error', description: 'Registration failed. Please try again.', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // DRAG & DROP HANDLER
  // ═══════════════════════════════════════════════════════════════════
  const handleDrop = (side: 'front' | 'back') => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(side, file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const regStep = getRegistrationStep(flowStep);
  const showProgressBar = regStep !== null && flowStep !== 'otp';

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Progress Bar ── */}
      {showProgressBar && regStep && (
        <div className="w-full bg-white border-b border-[#E5E7EB] px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              {PROGRESS_STEPS.map((label, i) => {
                const stepNum = (i + 1) as RegistrationStep;
                const isCompleted = regStep > stepNum;
                const isActive = regStep === stepNum;
                return (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                          isCompleted
                            ? 'bg-[#1A1A2E] text-white'
                            : isActive
                            ? 'bg-[#1A1A2E] text-white ring-4 ring-[#1A1A2E]/20'
                            : 'bg-[#E5E7EB] text-[#6B7280]'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle size={18} weight="fill" />
                        ) : (
                          stepNum
                        )}
                      </div>
                      <span
                        className={`mt-1.5 text-[11px] font-medium whitespace-nowrap ${
                          isActive ? 'text-[#1A1A2E]' : 'text-[#6B7280]'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {i < PROGRESS_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-3 mt-[-18px] ${
                          regStep > stepNum ? 'bg-[#1A1A2E]' : 'bg-[#E5E7EB]'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <AnimatePresence mode="wait">
          {/* ════════════════════════════════════════════════════════ */}
          {/* STEP 0: EMAIL CHECK                                     */}
          {/* ════════════════════════════════════════════════════════ */}
          {flowStep === 'email-check' && (
            <motion.div key="email-check" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}
              className="w-full max-w-md"
            >
              <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 bg-[#1A1A2E] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Envelope size={28} weight="bold" className="text-white" />
                  </div>
                  <h1 className="text-[22px] font-bold text-[#1A1A2E]">Welcome to CourierX</h1>
                  <p className="text-sm text-[#6B7280] mt-1">Enter your email to get started</p>
                </div>

                <Form {...emailCheckForm}>
                  <form onSubmit={emailCheckForm.handleSubmit(handleEmailCheck)} className="space-y-4">
                    <FormField
                      control={emailCheckForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              className="h-[44px] rounded-lg border-[#E5E7EB] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]/20 text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[#EF4444] text-xs flex items-center gap-1">
                            {emailCheckForm.formState.errors.email && (
                              <WarningCircle size={14} weight="fill" />
                            )}
                          </FormMessage>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 rounded-lg bg-[#1A1A2E] hover:bg-[#1A1A2E]/90 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      {isLoading ? (
                        <CircleNotch size={20} weight="bold" className="animate-spin" />
                      ) : (
                        <>Continue <ArrowRight size={18} weight="bold" className="ml-2" /></>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* SIGN IN (existing user)                                 */}
          {/* ════════════════════════════════════════════════════════ */}
          {flowStep === 'signin' && (
            <motion.div key="signin" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}
              className="w-full max-w-md"
            >
              <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 bg-[#1A1A2E] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock size={28} weight="bold" className="text-white" />
                  </div>
                  <h1 className="text-[22px] font-bold text-[#1A1A2E]">Welcome Back</h1>
                  <p className="text-sm text-[#6B7280] mt-1">Sign in to <span className="font-medium text-[#1A1A2E]">{email}</span></p>
                </div>

                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                className="h-[44px] rounded-lg border-[#E5E7EB] focus:border-[#1A1A2E] pr-12 text-sm"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1A1A2E]"
                              >
                                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-[#EF4444] text-xs" />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 rounded-lg bg-[#1A1A2E] hover:bg-[#1A1A2E]/90 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      {isLoading ? (
                        <CircleNotch size={20} weight="bold" className="animate-spin" />
                      ) : (
                        <>Sign In <ArrowRight size={18} weight="bold" className="ml-2" /></>
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setFlowStep('email-check'); setEmail(''); }}
                      className="w-full text-sm text-[#6B7280] hover:text-[#1A1A2E] transition-colors mt-2"
                    >
                      Use a different email
                    </button>
                  </form>
                </Form>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* STEP 1: CREDENTIALS                                     */}
          {/* ════════════════════════════════════════════════════════ */}
          {flowStep === 'credentials' && (
            <motion.div key="credentials" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}
              className="w-full max-w-md"
            >
              <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
                <div className="mb-6">
                  <h1 className="text-[22px] font-bold text-[#1A1A2E]">Create Your Account</h1>
                  <p className="text-sm text-[#6B7280] mt-1">Fill in your details to get started</p>
                </div>

                <Form {...credentialsForm}>
                  <form onSubmit={credentialsForm.handleSubmit(handleCredentials)} className="space-y-4">
                    {/* Email (locked) */}
                    <div>
                      <label className="text-sm font-medium text-[#1A1A2E] mb-1.5 block">Email</label>
                      <Input
                        type="email"
                        value={email}
                        disabled
                        className="h-[44px] rounded-lg border-[#E5E7EB] bg-[#F9FAFB] text-sm text-[#6B7280] cursor-not-allowed"
                      />
                    </div>

                    <FormField
                      control={credentialsForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[#1A1A2E]">Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your full name"
                              className="h-[44px] rounded-lg border-[#E5E7EB] focus:border-[#1A1A2E] text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[#EF4444] text-xs flex items-center gap-1" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={credentialsForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[#1A1A2E]">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Min 6 characters"
                                className="h-[44px] rounded-lg border-[#E5E7EB] focus:border-[#1A1A2E] pr-12 text-sm"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1A1A2E]"
                              >
                                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-[#EF4444] text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={credentialsForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[#1A1A2E]">Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Re-enter your password"
                              className="h-[44px] rounded-lg border-[#E5E7EB] focus:border-[#1A1A2E] text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[#EF4444] text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={credentialsForm.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[#1A1A2E]">Mobile Number</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+91XXXXXXXXXX"
                              className="h-[44px] rounded-lg border-[#E5E7EB] focus:border-[#1A1A2E] text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[#EF4444] text-xs" />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 rounded-lg bg-[#1A1A2E] hover:bg-[#1A1A2E]/90 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      {isLoading ? (
                        <CircleNotch size={20} weight="bold" className="animate-spin" />
                      ) : (
                        <>Send OTP <ArrowRight size={18} weight="bold" className="ml-2" /></>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* OTP VERIFICATION                                        */}
          {/* ════════════════════════════════════════════════════════ */}
          {flowStep === 'otp' && (
            <motion.div key="otp" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}
              className="w-full max-w-md"
            >
              <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 bg-[#1A1A2E] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={28} weight="bold" className="text-white" />
                  </div>
                  <h1 className="text-[22px] font-bold text-[#1A1A2E]">Verify Your Mobile</h1>
                  <p className="text-sm text-[#6B7280] mt-1">
                    Enter the 6-digit code sent to <span className="font-medium text-[#1A1A2E]">{mobile}</span>
                  </p>
                </div>

                {/* OTP Input Boxes */}
                <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-[#E5E7EB] rounded-lg focus:border-[#1A1A2E] focus:ring-2 focus:ring-[#1A1A2E]/20 outline-none transition-all bg-white"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {/* Countdown / Resend */}
                <div className="text-center mb-6">
                  {otpCountdown > 0 ? (
                    <p className="text-sm text-[#6B7280]">
                      Resend code in <span className="font-semibold text-[#1A1A2E]">{otpCountdown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-sm font-medium text-[#1A1A2E] hover:underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otpDigits.join('').length !== 6}
                  className="w-full h-12 rounded-lg bg-[#1A1A2E] hover:bg-[#1A1A2E]/90 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                >
                  {isLoading ? (
                    <CircleNotch size={20} weight="bold" className="animate-spin" />
                  ) : (
                    <>Verify & Continue <ArrowRight size={18} weight="bold" className="ml-2" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* STEP 2: DOCUMENTS (Aadhaar)                             */}
          {/* ════════════════════════════════════════════════════════ */}
          {flowStep === 'documents' && (
            <motion.div key="documents" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}
              className="w-full max-w-4xl"
            >
              <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* ── Left: Instructions Panel ── */}
                  <div className="hidden md:block md:w-[340px] bg-[#1A1A2E] p-8 text-white">
                    <div className="mb-6">
                      <IdentificationCard size={32} weight="bold" className="text-white/80 mb-3" />
                      <h2 className="text-lg font-bold">Aadhaar Verification</h2>
                      <p className="text-sm text-white/60 mt-1">Upload any of the following accepted formats</p>
                    </div>
                    <div className="space-y-4">
                      {AADHAAR_TYPES.map((type) => (
                        <div key={type.label} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                          <span className="text-2xl mt-0.5">{type.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{type.label}</p>
                            <p className="text-xs text-white/50">{type.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Mobile: Collapsible Guidelines ── */}
                  <div className="md:hidden border-b border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={() => setShowGuidelines(!showGuidelines)}
                      className="w-full flex items-center justify-between p-4 text-sm font-medium text-[#1A1A2E]"
                    >
                      <span className="flex items-center gap-2">
                        <IdentificationCard size={18} weight="bold" />
                        View Aadhaar Guidelines
                      </span>
                      <CaretDown size={16} className={`transition-transform ${showGuidelines ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showGuidelines && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {AADHAAR_TYPES.map((type) => (
                              <div key={type.label} className="flex items-center gap-2 p-2 rounded-lg bg-[#F9FAFB] text-sm">
                                <span>{type.icon}</span>
                                <span className="text-[#1A1A2E] font-medium">{type.label}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── Right: Upload Form ── */}
                  <div className="flex-1 p-8">
                    <div className="mb-6">
                      <h1 className="text-[22px] font-bold text-[#1A1A2E]">Upload Documents</h1>
                      <p className="text-sm text-[#6B7280] mt-1">Upload your Aadhaar card for identity verification</p>
                    </div>

                    <div className="space-y-5">
                      {/* Aadhaar Front Upload */}
                      <div>
                        <label className="text-sm font-medium text-[#1A1A2E] mb-2 block">Aadhaar Front</label>
                        {aadhaarFrontPreview ? (
                          <div className="relative rounded-xl border-2 border-green-500/50 bg-green-50 p-3">
                            <div className="flex items-center gap-3">
                              <img src={aadhaarFrontPreview} alt="Front" className="w-16 h-12 rounded-lg object-cover" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-green-900 truncate">{aadhaarFront?.name}</p>
                                <p className="text-xs text-green-700">Uploaded</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setAadhaarFront(null); setAadhaarFrontPreview(null); }}
                                className="text-[#6B7280] hover:text-[#EF4444] transition-colors"
                              >✕</button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onDrop={handleDrop('front')}
                            onDragOver={handleDragOver}
                            onClick={() => document.getElementById('aadhaar-front-input')?.click()}
                            className="rounded-xl border-2 border-dashed border-[#D1D5DB] bg-[#F9FAFB] hover:border-[#1A1A2E] hover:bg-[#1A1A2E]/5 transition-all cursor-pointer p-6 text-center"
                          >
                            <CloudArrowUp size={32} weight="bold" className="text-[#6B7280] mx-auto mb-2" />
                            <p className="text-sm font-medium text-[#1A1A2E]">Click or drag to upload</p>
                            <p className="text-xs text-[#6B7280] mt-1">JPG, PNG, or PDF — Max 5MB</p>
                            <input
                              id="aadhaar-front-input"
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleFileSelect('front', e.target.files[0])}
                            />
                          </div>
                        )}
                      </div>

                      {/* Aadhaar Back Upload */}
                      <div>
                        <label className="text-sm font-medium text-[#1A1A2E] mb-2 block">Aadhaar Back</label>
                        {aadhaarBackPreview ? (
                          <div className="relative rounded-xl border-2 border-green-500/50 bg-green-50 p-3">
                            <div className="flex items-center gap-3">
                              <img src={aadhaarBackPreview} alt="Back" className="w-16 h-12 rounded-lg object-cover" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-green-900 truncate">{aadhaarBack?.name}</p>
                                <p className="text-xs text-green-700">Uploaded</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setAadhaarBack(null); setAadhaarBackPreview(null); }}
                                className="text-[#6B7280] hover:text-[#EF4444] transition-colors"
                              >✕</button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onDrop={handleDrop('back')}
                            onDragOver={handleDragOver}
                            onClick={() => document.getElementById('aadhaar-back-input')?.click()}
                            className="rounded-xl border-2 border-dashed border-[#D1D5DB] bg-[#F9FAFB] hover:border-[#1A1A2E] hover:bg-[#1A1A2E]/5 transition-all cursor-pointer p-6 text-center"
                          >
                            <CloudArrowUp size={32} weight="bold" className="text-[#6B7280] mx-auto mb-2" />
                            <p className="text-sm font-medium text-[#1A1A2E]">Click or drag to upload</p>
                            <p className="text-xs text-[#6B7280] mt-1">JPG, PNG, or PDF — Max 5MB</p>
                            <input
                              id="aadhaar-back-input"
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleFileSelect('back', e.target.files[0])}
                            />
                          </div>
                        )}
                      </div>

                      {/* Aadhaar Number — 3 boxes of 4 digits */}
                      <div>
                        <label className="text-sm font-medium text-[#1A1A2E] mb-2 block">Aadhaar Number</label>
                        <div className="flex items-center gap-3">
                          {aadhaarDigits.map((val, i) => (
                            <input
                              key={i}
                              id={`aadhaar-box-${i}`}
                              type="text"
                              inputMode="numeric"
                              maxLength={4}
                              value={val}
                              onChange={(e) => handleAadhaarDigitChange(i, e.target.value)}
                              placeholder="0000"
                              className="flex-1 h-[44px] text-center text-base font-mono tracking-widest border border-[#E5E7EB] rounded-lg focus:border-[#1A1A2E] focus:ring-2 focus:ring-[#1A1A2E]/20 outline-none transition-all"
                            />
                          ))}
                        </div>
                        <p className="text-xs text-[#6B7280] mt-1.5">Enter your 12-digit Aadhaar number</p>
                      </div>

                      <Button
                        type="button"
                        onClick={handleDocumentsSubmit}
                        disabled={isLoading}
                        className="w-full h-12 rounded-lg bg-[#1A1A2E] hover:bg-[#1A1A2E]/90 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        {isLoading ? (
                          <CircleNotch size={20} weight="bold" className="animate-spin" />
                        ) : (
                          <>Verify & Continue <ArrowRight size={18} weight="bold" className="ml-2" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* STEP 3: PERSONAL DETAILS                                */}
          {/* ════════════════════════════════════════════════════════ */}
          {flowStep === 'personal' && (
            <motion.div key="personal" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}
              className="w-full max-w-lg"
            >
              <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
                <div className="mb-6">
                  <h1 className="text-[22px] font-bold text-[#1A1A2E]">Personal Details</h1>
                  <p className="text-sm text-[#6B7280] mt-1">Tell us a bit more about yourself</p>
                </div>

                <Form {...personalForm}>
                  <form onSubmit={personalForm.handleSubmit(handlePersonalSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={personalForm.control}
                        name="dob"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-[#1A1A2E]">Date of Birth</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                className="h-[44px] rounded-lg border-[#E5E7EB] focus:border-[#1A1A2E] text-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-[#EF4444] text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalForm.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-[#1A1A2E]">Gender</FormLabel>
                            <FormControl>
                              <select
                                className="w-full h-[44px] rounded-lg border border-[#E5E7EB] focus:border-[#1A1A2E] focus:ring-2 focus:ring-[#1A1A2E]/20 outline-none px-3 text-sm bg-white"
                                {...field}
                              >
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                              </select>
                            </FormControl>
                            <FormMessage className="text-[#EF4444] text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={personalForm.control}
                      name="address1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[#1A1A2E]">Address Line 1</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="House/Flat No., Street"
                              className="h-[44px] rounded-lg border-[#E5E7EB] focus:border-[#1A1A2E] text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[#EF4444] text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={personalForm.control}
                      name="address2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[#1A1A2E]">Address Line 2 <span className="text-[#6B7280] font-normal">(Optional)</span></FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Landmark, Area"
                              className="h-[44px] rounded-lg border-[#E5E7EB] focus:border-[#1A1A2E] text-sm"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={personalForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-[#1A1A2E]">City</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="City"
                                className="h-[44px] rounded-lg border-[#E5E7EB] focus:border-[#1A1A2E] text-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-[#EF4444] text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-[#1A1A2E]">State</FormLabel>
                            <FormControl>
                              <select
                                className="w-full h-[44px] rounded-lg border border-[#E5E7EB] focus:border-[#1A1A2E] focus:ring-2 focus:ring-[#1A1A2E]/20 outline-none px-3 text-sm bg-white"
                                {...field}
                              >
                                <option value="">Select state</option>
                                {INDIAN_STATES.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage className="text-[#EF4444] text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={personalForm.control}
                        name="pincode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-[#1A1A2E]">Pincode</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="6-digit pincode"
                                className="h-[44px] rounded-lg border-[#E5E7EB] focus:border-[#1A1A2E] text-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-[#EF4444] text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-[#1A1A2E]">Country</FormLabel>
                            <FormControl>
                              <Input
                                value="India"
                                disabled
                                className="h-[44px] rounded-lg border-[#E5E7EB] bg-[#F9FAFB] text-sm text-[#6B7280] cursor-not-allowed"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 rounded-lg bg-[#1A1A2E] hover:bg-[#1A1A2E]/90 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg mt-2"
                    >
                      {isLoading ? (
                        <CircleNotch size={20} weight="bold" className="animate-spin" />
                      ) : (
                        <>Continue <ArrowRight size={18} weight="bold" className="ml-2" /></>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* STEP 4: AGREEMENT                                       */}
          {/* ════════════════════════════════════════════════════════ */}
          {flowStep === 'agreement' && (
            <motion.div key="agreement" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}
              className="w-full max-w-lg"
            >
              <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
                <div className="mb-6">
                  <h1 className="text-[22px] font-bold text-[#1A1A2E]">Review & Agree</h1>
                  <p className="text-sm text-[#6B7280] mt-1">Confirm your details and accept the terms</p>
                </div>

                {/* Auto-populated details from Aadhaar */}
                <div className="bg-[#F9FAFB] rounded-xl p-5 mb-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1A1A2E]/10 rounded-lg flex items-center justify-center">
                      <User size={20} weight="bold" className="text-[#1A1A2E]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7280]">Full Name</p>
                      <p className="text-sm font-semibold text-[#1A1A2E]">{extractedName || fullName}</p>
                    </div>
                  </div>
                  <div className="h-px bg-[#E5E7EB]" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1A1A2E]/10 rounded-lg flex items-center justify-center">
                      <IdentificationCard size={20} weight="bold" className="text-[#1A1A2E]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7280]">Aadhaar Number</p>
                      <p className="text-sm font-semibold text-[#1A1A2E] font-mono tracking-wider">
                        {extractedAadhaar || `XXXX XXXX ${getFullAadhaar().slice(-4)}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="bg-[#F9FAFB] rounded-xl p-5 mb-6 max-h-48 overflow-y-auto text-xs text-[#6B7280] leading-relaxed">
                  <p className="font-semibold text-[#1A1A2E] text-sm mb-3">Terms & Conditions — CourierX</p>
                  <p className="mb-2">
                    By creating an account and using the CourierX platform operated by Goldilocks Zone Private Limited,
                    you agree to the following terms:
                  </p>
                  <p className="mb-2">
                    1. You confirm that all information provided during registration, including your Aadhaar details,
                    is accurate and belongs to you. Providing false information may result in account suspension.
                  </p>
                  <p className="mb-2">
                    2. Your Aadhaar information is collected solely for identity verification and customs compliance
                    purposes as required by Indian shipping regulations. We store only a masked version of your
                    Aadhaar number and never retain the full number.
                  </p>
                  <p className="mb-2">
                    3. You agree to comply with all applicable laws regarding the shipment of goods, including
                    restrictions on prohibited items. CourierX reserves the right to refuse shipments that violate
                    these regulations.
                  </p>
                  <p className="mb-2">
                    4. Shipping rates, delivery timelines, and service availability are subject to change. CourierX
                    will make reasonable efforts to notify you of significant changes.
                  </p>
                  <p className="mb-2">
                    5. Your account is personal and non-transferable. You are responsible for maintaining the
                    confidentiality of your login credentials.
                  </p>
                  <p>
                    6. For complete terms, privacy policy, and refund policy, please visit our website at courierx.in.
                  </p>
                </div>

                {/* Checkbox */}
                <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-[#E5E7EB] text-[#1A1A2E] focus:ring-[#1A1A2E]/20 cursor-pointer"
                  />
                  <span className="text-sm text-[#6B7280] group-hover:text-[#1A1A2E] transition-colors">
                    I confirm that the above details are correct and I agree to the{' '}
                    <a href="/terms-and-conditions" target="_blank" className="text-[#1A1A2E] font-medium underline">
                      Terms & Conditions
                    </a>
                    .
                  </span>
                </label>

                <Button
                  type="button"
                  onClick={handleCompleteRegistration}
                  disabled={isLoading || !agreedToTerms}
                  className="w-full h-12 rounded-lg bg-[#1A1A2E] hover:bg-[#1A1A2E]/90 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                >
                  {isLoading ? (
                    <CircleNotch size={20} weight="bold" className="animate-spin" />
                  ) : (
                    <>Complete Registration <CheckCircle size={18} weight="bold" className="ml-2" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
