"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Envelope, Lock, Eye, EyeSlash, ArrowRight, CircleNotch,
  ShieldCheck, Package, CurrencyInr, UserPlus, ArrowLeft,
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleGsi } from '@/hooks/useGoogleGsi';

// ── Schemas ──────────────────────────────────────────────────────────

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;
type Step = 'signup' | 'otp';

const benefits = [
  { icon: CurrencyInr, text: 'Lower rates on all shipments' },
  { icon: Package, text: 'Wallet-based payments with auto-deduction' },
  { icon: ShieldCheck, text: 'Aadhaar-verified identity for customs compliance' },
];

// ── Main Component ───────────────────────────────────────────────────

export default function OpenAccount() {
  const router = useRouter();
  const { user } = useAuth();
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
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { if (cooldownRef.current) clearInterval(cooldownRef.current); return 0; }
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
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP → create account → redirect to dashboard ──

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
      // Use server-side signup that auto-confirms email and returns session tokens
      const signupRes = await fetch('/api/auth/signup-confirmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail, password: signupPassword }),
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok || !signupData.success) {
        toast({ title: 'Error', description: signupData.error || 'Signup failed', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      // Set the session tokens in the client
      if (signupData.session?.access_token && signupData.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: signupData.session.access_token,
          refresh_token: signupData.session.refresh_token,
        });
      }
      // Fallback sign-in if session wasn't set
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        await supabase.auth.signInWithPassword({
          email: signupEmail,
          password: signupPassword,
        });
      }
      toast({ title: 'Account Created!', description: 'Welcome to CourierX. Complete your profile to unlock lower rates.' });
      // Redirect to onboarding (to set full_name), then they'll land on dashboard
      window.location.href = '/onboarding';
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

  const handleGoogleCallback = async (idToken: string, nonce?: string) => {
    setIsLoading(true);
    const { data: authData, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      nonce,
    });

    if (error) {
      setIsLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Account Created!', description: 'Welcome to CourierX.' });
    setIsLoading(false);
    window.location.href = '/onboarding';
  };

  useGoogleGsi({
    enabled: step === 'signup',
    onCredential: handleGoogleCallback,
    buttonDivRef: googleButtonRef,
    isLoading,
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-background to-coke-red/5 items-center justify-center p-12">
        <div className="max-w-md space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Link href="/"><img alt="CourierX" src="/logo.svg" className="h-10 w-auto object-contain mb-8" /></Link>
            <h2 className="text-3xl font-bold font-typewriter mb-4">Create Your Account</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Sign up to access exclusive rates — <span className="font-semibold text-candlestick-green">25% lower</span> than standard pricing on every domestic and international shipment.
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
              <li>Start shipping immediately</li>
              <li>Complete KYC later to unlock lower rates</li>
            </ol>
          </motion.div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md space-y-6 py-8">
          <div className="lg:hidden mb-4">
            <Link href="/"><img alt="CourierX" src="/logo.svg" className="h-9 w-auto object-contain" /></Link>
          </div>

          <AnimatePresence mode="wait">
            {/* ── STEP 1: Signup ── */}
            {step === 'signup' && (
              <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2 font-typewriter"><UserPlus className="h-6 w-6 text-coke-red" /> Sign Up</h1>
                  <p className="text-muted-foreground text-sm mt-1">Create your account to start shipping.</p>
                </div>
                <div className="lg:hidden rounded-xl border border-candlestick-green/30 bg-candlestick-green/5 p-3">
                  <p className="text-sm font-medium text-candlestick-green">Account holders save 25% on every shipment.</p>
                </div>
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <FormField control={signupForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><div className="relative"><Envelope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input {...field} type="email" placeholder="you@example.com" className="pl-10" /></div></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={signupForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel>Password</FormLabel><FormControl><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" className="pl-10 pr-10" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Re-enter password" className="pl-10" /></div></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full bg-coke-red hover:bg-red-600 text-white gap-2" disabled={isLoading}>
                      {isLoading ? <><CircleNotch className="h-4 w-4 animate-spin" /> Sending OTP...</> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </form>
                </Form>

                {/* Google Sign-Up */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted-foreground">or continue with</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div ref={googleButtonRef} className="w-full min-h-[44px]" />

                <p className="text-center text-xs text-muted-foreground/70">
                  By continuing, you agree to the terms of{' '}
                  <a href="/terms" className="underline hover:text-coke-red transition-colors">
                    Goldilocks Zone Private Limited
                  </a>
                  .
                </p>

                <div className="text-center text-sm text-muted-foreground space-y-2">
                  <p>Already have an account?{' '}<button onClick={() => router.push('/auth')} className="text-coke-red hover:underline font-medium">Sign In</button></p>
                  <p>Just want to ship without an account?{' '}<button onClick={() => router.push('/public/book')} className="text-coke-red hover:underline font-medium">Ship Now (standard rates)</button></p>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 'otp' && (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <button onClick={() => { setStep('signup'); setOtpValue(''); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Back</button>
                  <h1 className="text-2xl font-bold flex items-center gap-2 font-typewriter"><Envelope className="h-6 w-6 text-coke-red" /> Verify Your Email</h1>
                  <p className="text-muted-foreground text-sm mt-1">Enter the 6-digit code sent to <span className="font-medium text-foreground">{signupEmail}</span></p>
                </div>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                      <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button onClick={handleVerifyOtp} className="w-full bg-coke-red hover:bg-red-600 text-white gap-2" disabled={isLoading || otpValue.length !== 6}>
                  {isLoading ? <><CircleNotch className="h-4 w-4 animate-spin" /> Verifying...</> : <>Verify & Create Account <ArrowRight className="h-4 w-4" /></>}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  {resendCooldown > 0 ? <p>Resend code in <span className="font-medium text-foreground">{resendCooldown}s</span></p> : <button onClick={handleResendOtp} className="text-coke-red hover:underline font-medium" disabled={isLoading}>Resend Code</button>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
