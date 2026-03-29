"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Envelope, Lock, Eye, EyeSlash, ArrowRight, CircleNotch,
  ShieldCheck, Package, CurrencyInr, UserPlus, ArrowLeft,
  IdentificationCard, Bank, User, CalendarBlank,
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ── Schemas ──────────────────────────────────────────────────────────

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const kycSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  age: z.string().min(1, 'Age is required').refine(v => {
    const n = Number(v);
    return n >= 18 && n <= 100;
  }, 'Must be between 18 and 100'),
  sex: z.enum(['male', 'female', 'other'], { required_error: 'Please select' }),
  state: z.string().min(2, 'State is required'),
  city: z.string().min(2, 'City is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Must be exactly 12 digits'),
  panNumber: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Enter a valid PAN (e.g. ABCDE1234F)'),
  bankAccountNumber: z.string().min(8, 'Enter a valid account number').max(18, 'Too long'),
  bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code'),
  bankName: z.string().min(2, 'Bank name is required'),
  estimatedShipmentsPerMonth: z.enum(['1-10', '11-50', '51-100', '100+'], { required_error: 'Please select' }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;
type KycFormValues = z.infer<typeof kycSchema>;
type Step = 'signup' | 'otp' | 'kyc' | 'done';

const benefits = [
  { icon: CurrencyInr, text: '52% lower rates on all shipments' },
  { icon: Package, text: 'Wallet-based payments with auto-deduction' },
  { icon: ShieldCheck, text: 'Aadhaar-verified identity for customs compliance' },
];

const indianStates = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Chandigarh',
  'Jammu & Kashmir','Ladakh','Puducherry','Andaman & Nicobar','Lakshadweep',
  'Dadra & Nagar Haveli and Daman & Diu',
];

export default function OpenAccount() {
  const router = useRouter();
  const { user, signUpWithEmail } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('signup');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP state
  const [otpValue, setOtpValue] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // If already logged in, redirect
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      if (!profile?.full_name) {
        setStep('kyc');
      } else {
        router.replace('/dashboard');
      }
    };
    check();
  }, [user, router]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [resendCooldown]);

  const signupForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const kycForm = useForm<KycFormValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      fullName: '', phone: '', age: '', sex: undefined,
      state: '', city: '', pincode: '',
      aadhaarNumber: '', panNumber: '', bankAccountNumber: '',
      bankIfsc: '', bankName: '', estimatedShipmentsPerMonth: undefined,
    },
  });

  // ── Step 1: Signup → send OTP ──

  const handleSignUp = async (values: SignUpFormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ title: 'Error', description: data.error || 'Failed to send OTP', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      setSignupEmail(values.email);
      setSignupPassword(values.password);
      setOtpToken(data.otpToken);
      setResendCooldown(60);
      setStep('otp');
      toast({ title: 'OTP Sent', description: `Verification code sent to ${values.email}` });
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP → create Supabase account ──

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail, otp: otpValue, otpToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        toast({ title: 'Invalid Code', description: data.error || 'Please try again.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      // OTP verified — create the Supabase account
      const { error } = await signUpWithEmail(signupEmail, signupPassword);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      // Welcome email (fire-and-forget)
      fetch('/api/email/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: signupEmail }),
      }).catch(() => {});

      toast({ title: 'Email Verified', description: 'Now complete your KYC details.' });
      setStep('kyc');
    } catch {
      toast({ title: 'Error', description: 'Verification failed.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpToken(data.otpToken);
        setOtpValue('');
        setResendCooldown(60);
        toast({ title: 'Code Resent', description: 'A new verification code has been sent.' });
      }
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: KYC form → save to profile ──

  const handleKycSubmit = async (values: KycFormValues) => {
    setIsLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast({ title: 'Error', description: 'Session expired. Please sign in again.', variant: 'destructive' });
        router.replace('/auth');
        return;
      }
      const { error } = await supabase.from('profiles').update({
        full_name: values.fullName,
        phone_number: `+91${values.phone}`,
        age: parseInt(values.age),
        sex: values.sex,
        state: values.state,
        city: values.city,
        pincode: values.pincode,
        aadhaar_number: values.aadhaarNumber,
        pan_number: values.panNumber,
        bank_account_number: values.bankAccountNumber,
        bank_ifsc: values.bankIfsc,
        bank_name: values.bankName,
        estimated_shipments_per_month: values.estimatedShipmentsPerMonth,
        kyc_completed_at: new Date().toISOString(),
      }).eq('user_id', currentUser.id);

      if (error) {
        toast({ title: 'Error', description: 'Failed to save KYC details. Please try again.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      setStep('done');
      toast({ title: 'Account Ready', description: 'Your account has been set up successfully.' });
      setTimeout(() => { window.location.href = '/dashboard'; }, 2000);
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const stepIndex = step === 'signup' ? 0 : step === 'otp' ? 1 : step === 'kyc' ? 2 : 3;
  const stepLabels = ['Create Account', 'Verify Email', 'KYC Details', 'Done'];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — benefits (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-background to-coke-red/5 items-center justify-center p-12">
        <div className="max-w-md space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Link href="/">
              <img alt="CourierX" src="/logo.svg" className="h-10 w-auto object-contain mb-8" />
            </Link>
            <h2 className="text-3xl font-bold font-typewriter mb-4">Open a Free Account</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Account holders get exclusive rates — <span className="font-semibold text-candlestick-green">52% lower</span> than standard pricing on every domestic and international shipment.
            </p>
          </motion.div>
          <div className="space-y-4">
            {benefits.map((b, i) => (
              <motion.div key={b.text} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }} className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
                <div className="w-10 h-10 rounded-full bg-candlestick-green/10 flex items-center justify-center shrink-0">
                  <b.icon className="h-5 w-5 text-candlestick-green" />
                </div>
                <span className="text-sm font-medium">{b.text}</span>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.7 }} className="rounded-xl border border-border/50 bg-card/30 p-4">
            <h4 className="font-semibold text-sm mb-2">How it works</h4>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Create your account with email & password</li>
              <li>Verify your email with OTP</li>
              <li>Complete KYC (Aadhaar, PAN, bank details)</li>
              <li>Start shipping at discounted rates</li>
            </ol>
          </motion.div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md space-y-6 py-8">
          {/* Mobile logo */}
          <div className="lg:hidden mb-4">
            <Link href="/"><img alt="CourierX" src="/logo.svg" className="h-9 w-auto object-contain" /></Link>
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-1">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-1.5 w-full rounded-full transition-colors ${i <= stepIndex ? 'bg-coke-red' : 'bg-muted'}`} />
                <span className={`text-[10px] ${i <= stepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── STEP 1: Signup ── */}
            {step === 'signup' && (
              <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <UserPlus className="h-6 w-6 text-coke-red" />
                    Open Account
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">Create your account to unlock 52% lower shipping rates.</p>
                </div>
                <div className="lg:hidden rounded-xl border border-candlestick-green/30 bg-candlestick-green/5 p-3">
                  <p className="text-sm font-medium text-candlestick-green">Account holders save 52% on every shipment.</p>
                </div>
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <FormField control={signupForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...field} type="email" placeholder="you@example.com" className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" className="pl-10 pr-10" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                              {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Re-enter password" className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full bg-coke-red hover:bg-red-600 text-white gap-2" disabled={isLoading}>
                      {isLoading ? <><CircleNotch className="h-4 w-4 animate-spin" /> Sending OTP...</> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </form>
                </Form>
                <div className="text-center text-sm text-muted-foreground space-y-2">
                  <p>Already have an account?{' '}<button onClick={() => router.push('/auth?panel=customer')} className="text-coke-red hover:underline font-medium">Sign In</button></p>
                  <p>Just want to ship without an account?{' '}<button onClick={() => router.push('/public/book')} className="text-coke-red hover:underline font-medium">Ship Now (standard rates)</button></p>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: OTP Verification ── */}
            {step === 'otp' && (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <button onClick={() => { setStep('signup'); setOtpValue(''); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Envelope className="h-6 w-6 text-coke-red" />
                    Verify Your Email
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Enter the 6-digit code sent to <span className="font-medium text-foreground">{signupEmail}</span>
                  </p>
                </div>

                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button onClick={handleVerifyOtp} className="w-full bg-coke-red hover:bg-red-600 text-white gap-2" disabled={isLoading || otpValue.length !== 6}>
                  {isLoading ? <><CircleNotch className="h-4 w-4 animate-spin" /> Verifying...</> : <>Verify & Continue <ArrowRight className="h-4 w-4" /></>}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  {resendCooldown > 0 ? (
                    <p>Resend code in <span className="font-medium text-foreground">{resendCooldown}s</span></p>
                  ) : (
                    <button onClick={handleResendOtp} className="text-coke-red hover:underline font-medium" disabled={isLoading}>
                      Resend Code
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: KYC Form ── */}
            {step === 'kyc' && (
              <motion.div key="kyc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <IdentificationCard className="h-6 w-6 text-coke-red" />
                    KYC Details
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">Complete your identity verification to start shipping.</p>
                </div>

                <Form {...kycForm}>
                  <form onSubmit={kycForm.handleSubmit(handleKycSubmit)} className="space-y-4">
                    {/* Personal Info */}
                    <div className="rounded-lg border border-border/50 p-4 space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Personal Information</h3>

                      <FormField control={kycForm.control} name="fullName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name (as per Aadhaar)</FormLabel>
                          <FormControl><Input {...field} placeholder="Enter your full name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={kycForm.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                              <Input {...field} placeholder="9876543210" className="pl-12" maxLength={10} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={kycForm.control} name="age" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl><Input {...field} type="number" placeholder="25" min={18} max={100} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={kycForm.control} name="sex" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sex</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={kycForm.control} name="state" render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={kycForm.control} name="city" render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl><Input {...field} placeholder="Mumbai" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={kycForm.control} name="pincode" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pincode</FormLabel>
                            <FormControl><Input {...field} placeholder="400001" maxLength={6} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    {/* Identity Documents */}
                    <div className="rounded-lg border border-border/50 p-4 space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Identity Documents</h3>

                      <FormField control={kycForm.control} name="aadhaarNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aadhaar Number</FormLabel>
                          <FormControl><Input {...field} placeholder="123456789012" maxLength={12} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={kycForm.control} name="panNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ABCDE1234F" maxLength={10}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Bank Details */}
                    <div className="rounded-lg border border-border/50 p-4 space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2"><Bank className="h-4 w-4" /> Bank Details</h3>

                      <FormField control={kycForm.control} name="bankName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl><Input {...field} placeholder="State Bank of India" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={kycForm.control} name="bankAccountNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl><Input {...field} placeholder="Enter account number" maxLength={18} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={kycForm.control} name="bankIfsc" render={({ field }) => (
                        <FormItem>
                          <FormLabel>IFSC Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="SBIN0001234" maxLength={11}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Shipping Estimate */}
                    <div className="rounded-lg border border-border/50 p-4 space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Shipping Estimate</h3>

                      <FormField control={kycForm.control} name="estimatedShipmentsPerMonth" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Shipments Per Month</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1-10">1 – 10</SelectItem>
                              <SelectItem value="11-50">11 – 50</SelectItem>
                              <SelectItem value="51-100">51 – 100</SelectItem>
                              <SelectItem value="100+">100+</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <Button type="submit" className="w-full bg-coke-red hover:bg-red-600 text-white gap-2" disabled={isLoading}>
                      {isLoading ? <><CircleNotch className="h-4 w-4 animate-spin" /> Saving...</> : <>Complete Registration <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* ── STEP 4: Done ── */}
            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-12">
                <div className="mx-auto h-16 w-16 rounded-full bg-candlestick-green/10 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-candlestick-green" />
                </div>
                <h2 className="text-2xl font-bold font-typewriter">Account Ready!</h2>
                <p className="text-muted-foreground text-sm">Your account has been set up. Redirecting to dashboard...</p>
                <CircleNotch className="h-6 w-6 animate-spin mx-auto text-coke-red" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
