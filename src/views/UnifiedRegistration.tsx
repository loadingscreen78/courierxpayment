"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Envelope, Lock, Eye, EyeSlash, ArrowRight, CircleNotch,
  User, Phone, CheckCircle,
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────
type FlowStep = 'email-check' | 'signin' | 'credentials' | 'otp';

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

type EmailCheckValues = z.infer<typeof emailCheckSchema>;
type SignInValues = z.infer<typeof signInSchema>;
type CredentialsValues = z.infer<typeof credentialsSchema>;

// ─── Step animation ──────────────────────────────────────────────────
const stepVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};
const stepTransition = { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const };

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════
export default function UnifiedRegistration() {
  const router = useRouter();
  const { user, signInWithEmail } = useAuth();
  const { toast } = useToast();

  const [flowStep, setFlowStep] = useState<FlowStep>('email-check');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  // OTP countdown
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
    defaultValues: { email: '' },
  });

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { password: '' },
  });

  const credentialsForm = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { fullName: '', password: '', confirmPassword: '', mobile: '+91' },
  });

  // ── Step 0: Email check ──
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
      }
    } catch {
      toast({ title: 'Error', description: 'Could not check email. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sign in (existing user) ──
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

  // ── Step 1: Credentials → send OTP ──
  const handleCredentials = async (values: CredentialsValues) => {
    setIsLoading(true);
    setFullName(values.fullName);
    setMobile(values.mobile);
    setPassword(values.password);

    try {
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

  // ── OTP handlers ──
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
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
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setOtpDigits(newDigits);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
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

      // Set session
      if (data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // Save profile with name and email
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.from('profiles').upsert({
          user_id: currentUser.id,
          full_name: fullName,
          email: email,
          phone_number: mobile,
        }, { onConflict: 'user_id' });
      }

      toast({ title: 'Account created!', description: 'Welcome to CourierX.' });
      router.replace('/dashboard');
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
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4 sm:p-8" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <AnimatePresence mode="wait">

        {/* ── EMAIL CHECK ── */}
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
                        <FormLabel className="text-[#374151] font-medium">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Envelope size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              className="pl-10 h-11 border-[#E5E7EB] focus:border-[#1A1A2E] focus:ring-[#1A1A2E]/10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-[#1A1A2E] hover:bg-[#2d2d4e] text-white font-semibold rounded-xl"
                  >
                    {isLoading ? <CircleNotch size={20} weight="bold" className="animate-spin" /> : (
                      <><ArrowRight size={18} weight="bold" className="mr-2" />Continue</>
                    )}
                  </Button>
                  <p className="text-center text-sm text-[#6B7280]">
                    Already have an account?{' '}
                    <a href="/auth" className="text-[#1A1A2E] font-semibold hover:underline">Sign In</a>
                  </p>
                </form>
              </Form>
            </div>
          </motion.div>
        )}

        {/* ── SIGN IN (existing user) ── */}
        {flowStep === 'signin' && (
          <motion.div key="signin" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
              <button
                onClick={() => setFlowStep('email-check')}
                className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A2E] mb-6 transition-colors"
              >
                ← Back
              </button>
              <div className="text-center mb-8">
                <h1 className="text-[22px] font-bold text-[#1A1A2E]">Welcome back</h1>
                <p className="text-sm text-[#6B7280] mt-1">{email}</p>
              </div>

              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <FormField
                    control={signInForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#374151] font-medium">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Your password"
                              className="pl-10 pr-10 h-11 border-[#E5E7EB] focus:border-[#1A1A2E]"
                              {...field}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
                              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-[#1A1A2E] hover:bg-[#2d2d4e] text-white font-semibold rounded-xl"
                  >
                    {isLoading ? <CircleNotch size={20} weight="bold" className="animate-spin" /> : (
                      <><ArrowRight size={18} weight="bold" className="mr-2" />Sign In</>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </motion.div>
        )}

        {/* ── CREDENTIALS (new user) ── */}
        {flowStep === 'credentials' && (
          <motion.div key="credentials" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
              <button
                onClick={() => setFlowStep('email-check')}
                className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A2E] mb-6 transition-colors"
              >
                ← Back
              </button>
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-[#1A1A2E] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User size={28} weight="bold" className="text-white" />
                </div>
                <h1 className="text-[22px] font-bold text-[#1A1A2E]">Create your account</h1>
                <p className="text-sm text-[#6B7280] mt-1">{email}</p>
              </div>

              <Form {...credentialsForm}>
                <form onSubmit={credentialsForm.handleSubmit(handleCredentials)} className="space-y-4">
                  <FormField
                    control={credentialsForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#374151] font-medium">Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                            <Input placeholder="Your full name" className="pl-10 h-11 border-[#E5E7EB] focus:border-[#1A1A2E]" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={credentialsForm.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#374151] font-medium">Mobile Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                            <Input placeholder="+91XXXXXXXXXX" className="pl-10 h-11 border-[#E5E7EB] focus:border-[#1A1A2E]" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={credentialsForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#374151] font-medium">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Min. 6 characters"
                              className="pl-10 pr-10 h-11 border-[#E5E7EB] focus:border-[#1A1A2E]"
                              {...field}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
                              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={credentialsForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#374151] font-medium">Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Repeat your password"
                              className="pl-10 pr-10 h-11 border-[#E5E7EB] focus:border-[#1A1A2E]"
                              {...field}
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
                              {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-[#1A1A2E] hover:bg-[#2d2d4e] text-white font-semibold rounded-xl"
                  >
                    {isLoading ? <CircleNotch size={20} weight="bold" className="animate-spin" /> : (
                      <><ArrowRight size={18} weight="bold" className="mr-2" />Send Verification Code</>
                    )}
                  </Button>
                  <p className="text-center text-xs text-[#9CA3AF]">
                    By signing up you agree to our{' '}
                    <a href="/terms-and-conditions" className="underline hover:text-[#1A1A2E]">Terms & Conditions</a>
                  </p>
                </form>
              </Form>
            </div>
          </motion.div>
        )}

        {/* ── OTP VERIFICATION ── */}
        {flowStep === 'otp' && (
          <motion.div key="otp" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
              <button
                onClick={() => setFlowStep('credentials')}
                className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A2E] mb-6 transition-colors"
              >
                ← Back
              </button>
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-[#1A1A2E] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Phone size={28} weight="bold" className="text-white" />
                </div>
                <h1 className="text-[22px] font-bold text-[#1A1A2E]">Verify your number</h1>
                <p className="text-sm text-[#6B7280] mt-1">
                  Enter the 6-digit code sent to <span className="font-medium text-[#374151]">{mobile}</span>
                </p>
              </div>

              {/* OTP boxes */}
              <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-11 h-12 text-center text-lg font-bold border-2 border-[#E5E7EB] rounded-xl focus:border-[#1A1A2E] focus:outline-none transition-colors"
                  />
                ))}
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={isLoading || otpDigits.join('').length !== 6}
                className="w-full h-11 bg-[#1A1A2E] hover:bg-[#2d2d4e] text-white font-semibold rounded-xl"
              >
                {isLoading ? <CircleNotch size={20} weight="bold" className="animate-spin" /> : (
                  <><CheckCircle size={18} weight="bold" className="mr-2" />Verify & Create Account</>
                )}
              </Button>

              <div className="text-center mt-4">
                {otpCountdown > 0 ? (
                  <p className="text-sm text-[#9CA3AF]">Resend in {otpCountdown}s</p>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-sm text-[#1A1A2E] font-medium hover:underline disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
