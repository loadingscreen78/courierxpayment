"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Envelope, Phone, ArrowRight, CircleNotch, Eye, EyeSlash,
  ArrowLeft, Package, Globe, Lock, User, ShieldCheck,
  CheckCircle, Truck, Sparkle,
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useSeo } from '@/hooks/useSeo';
import { supabase } from '@/integrations/supabase/client';
const logoMain = { src: '/lovable-uploads/logo.png' };
import { motion, AnimatePresence } from 'framer-motion';

// ─── Schemas ─────────────────────────────────────────────────────────
const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const nameSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

type SignupValues = z.infer<typeof signupSchema>;
type NameValues = z.infer<typeof nameSchema>;

type FlowStep = 'signup' | 'name' | 'guide';

/* ── Left panel data (mirrors Auth.tsx) ── */
const shippingRoutes = [
  { from: 'Delhi', to: 'London', type: 'Medicine', days: '3-5', price: '₹1,299' },
  { from: 'Mumbai', to: 'New York', type: 'Documents', days: '2-4', price: '₹999' },
  { from: 'Bangalore', to: 'Dubai', type: 'Electronics', days: '2-3', price: '₹1,499' },
];

const stats = [
  { label: 'Countries', value: '50+' },
  { label: 'Shipments', value: '10K+' },
  { label: 'Partners', value: '200+' },
];

const guideSteps = [
  {
    icon: ShieldCheck,
    title: 'Complete KYC',
    desc: 'Verify your Aadhaar via DigiLocker to unlock your full account.',
    status: 'required',
  },
  {
    icon: Truck,
    title: 'Book Domestic Shipments',
    desc: 'Send parcels anywhere in India — same-day, next-day, or standard.',
    status: 'after-kyc',
  },
  {
    icon: Globe,
    title: 'Ship Internationally',
    desc: 'Send medicines, documents & gifts to 50+ countries worldwide.',
    status: 'after-kyc',
  },
  {
    icon: Package,
    title: 'Track Everything',
    desc: 'Real-time tracking for all your shipments in one dashboard.',
    status: 'always',
  },
];

// ═════════════════════════════════════════════════════════════════════
export default function UnifiedRegistration() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signUpWithEmail } = useAuth();
  const { toast } = useToast();

  useSeo({
    title: 'Create Account | CourierX',
    description: 'Sign up for CourierX — domestic & international shipping from India.',
    canonicalPath: '/register',
  });

  const [flowStep, setFlowStep] = useState<FlowStep>('signup');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [routeIndex, setRouteIndex] = useState(0);
  const [firstName, setFirstName] = useState('');

  // Redirect if already logged in (but not during post-signup steps)
  useEffect(() => {
    if (user && flowStep === 'signup') router.replace('/dashboard');
  }, [user, flowStep, router]);

  // Rotate left-panel route cards
  useEffect(() => {
    const interval = setInterval(() => setRouteIndex((p) => (p + 1) % shippingRoutes.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const nameForm = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { fullName: '' },
  });

  // ── Step 1: Create account ──
  const handleSignup = async (values: SignupValues) => {
    setIsLoading(true);
    const { error } = await signUpWithEmail(values.email, values.password);
    setIsLoading(false);

    if (error) {
      toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
      return;
    }

    setFlowStep('name');
  };

  // ── Step 2: Save name ──
  const handleSaveName = async (values: NameValues) => {
    setIsLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.from('profiles').upsert({
          user_id: currentUser.id,
          full_name: values.fullName,
        }, { onConflict: 'user_id' });
      }
      setFirstName(values.fullName.split(' ')[0]);
      setFlowStep('guide');
    } catch {
      toast({ title: 'Error', description: 'Could not save your name. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const currentRoute = shippingRoutes[routeIndex];

  // ── Left panel (shared with Auth.tsx) ──
  const LeftPanel = (
    <div className="hidden lg:flex lg:w-1/2 bg-charcoal relative overflow-hidden flex-col justify-between">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e1e1e] via-charcoal to-[#1a1a1a]" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-coke-red/[0.03] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/4" />
      </div>
      <div className="relative z-10 p-10 pb-0" />
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-10 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="flex flex-col items-center">
          <p className="text-coke-red/80 text-xs font-typewriter tracking-[0.3em] uppercase mb-6">Courier Solutions</p>
          <h1 className="text-[3.2rem] leading-[1.1] font-bold text-paper-white font-typewriter mb-5">
            Ship Your<br /><span className="text-coke-red">Essentials</span>
          </h1>
          <p className="text-paper-white/40 text-base font-typewriter leading-relaxed max-w-sm">
            Domestic & international shipping from India — fast, reliable, and affordable.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }} className="mt-10 w-full max-w-[280px]">
          <AnimatePresence mode="wait">
            <motion.div key={routeIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
              className="bg-paper-white/[0.04] rounded-xl p-4 border border-paper-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-coke-red/10 rounded-lg flex items-center justify-center">
                    <Package size={16} weight="bold" className="text-coke-red" />
                  </div>
                  <div>
                    <p className="text-paper-white text-sm font-typewriter font-medium">{currentRoute.type}</p>
                    <p className="text-paper-white/30 text-[11px]">{currentRoute.from} → {currentRoute.to}</p>
                  </div>
                </div>
                <span className="text-coke-red font-typewriter font-bold text-sm">{currentRoute.price}</span>
              </div>
              <div className="h-px bg-paper-white/[0.06] mb-3" />
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-paper-white/30">Delivery</span>
                <span className="text-paper-white/60 font-typewriter">{currentRoute.days} business days</span>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-center gap-1 mt-3">
            {shippingRoutes.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === routeIndex ? 'w-5 bg-coke-red' : 'w-1 bg-paper-white/15'}`} />
            ))}
          </div>
        </motion.div>
      </div>
      <div className="relative z-10 px-10 pb-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.6 }} className="flex items-center justify-center gap-8">
          {stats.map((stat, i) => (
            <div key={i}>
              <span className="text-lg font-bold text-paper-white font-typewriter">{stat.value}</span>
              <span className="text-paper-white/30 text-xs ml-1.5">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex bg-background relative">

      {/* Mobile background (mirrors Auth.tsx) */}
      <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-coke-red/5 via-transparent to-coke-red/5" />
        <motion.div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-coke-red/10"
          animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full border border-coke-red/10"
          animate={{ rotate: -360 }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="absolute top-20 right-8 opacity-20"
          animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
          <Package size={32} weight="bold" className="text-coke-red" />
        </motion.div>
        <motion.div className="absolute top-1/4 left-1/2 -translate-x-1/2 opacity-5"
          animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}>
          <Globe size={192} weight="bold" className="text-coke-red" />
        </motion.div>
      </div>

      {LeftPanel}

      {/* ── Right Side ── */}
      <div className="w-full lg:w-1/2 bg-background flex flex-col min-h-screen">

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <a href="/" className="flex items-center gap-2">
            <img src={logoMain.src} alt="CourierX" className="h-8 w-auto rounded-lg" />
          </a>
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft size={16} weight="bold" />
            Home
          </a>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-sm">
            <AnimatePresence mode="wait">

              {/* ── STEP 1: SIGNUP FORM ── */}
              {flowStep === 'signup' && (
                <motion.div key="signup"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }} className="space-y-6">

                  <div>
                    <h2 className="text-2xl font-bold text-foreground font-typewriter">Create Account</h2>
                    <p className="text-muted-foreground mt-1">Your gateway to global & local delivery</p>
                  </div>

                  <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                      <FormField control={signupForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="email" placeholder="Email address"
                              className="h-12 rounded-full border-border bg-background px-5 focus:border-coke-red focus:ring-coke-red/20"
                              {...field} />
                          </FormControl>
                          <FormMessage className="text-coke-red" />
                        </FormItem>
                      )} />

                      <FormField control={signupForm.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input type={showPassword ? 'text' : 'password'} placeholder="Password (min. 6 characters)"
                                className="h-12 rounded-full border-border bg-background px-5 pr-12 focus:border-coke-red focus:ring-coke-red/20"
                                {...field} />
                              <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                {showPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-coke-red" />
                        </FormItem>
                      )} />

                      <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input type={showConfirm ? 'text' : 'password'} placeholder="Confirm password"
                                className="h-12 rounded-full border-border bg-background px-5 pr-12 focus:border-coke-red focus:ring-coke-red/20"
                                {...field} />
                              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                {showConfirm ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-coke-red" />
                        </FormItem>
                      )} />

                      <Button type="submit" disabled={isLoading}
                        className="w-full h-12 rounded-full bg-coke-red hover:bg-coke-red/90 text-white font-semibold shadow-lg shadow-coke-red/25 font-typewriter">
                        {isLoading ? <CircleNotch size={20} weight="bold" className="animate-spin" /> : (
                          <><ArrowRight size={20} weight="bold" className="mr-2" />Create Account</>
                        )}
                      </Button>

                      <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <a href="/auth" className="text-coke-red hover:text-coke-red/80 font-medium transition-colors">Sign In</a>
                      </p>
                    </form>
                  </Form>

                  <p className="text-center text-xs text-muted-foreground/70">
                    By continuing, you agree to the terms of{' '}
                    <a href="/terms-and-conditions" className="underline hover:text-coke-red transition-colors">
                      Goldilocks Zone Private Limited
                    </a>.
                  </p>
                </motion.div>
              )}

              {/* ── STEP 2: WHAT SHOULD WE CALL YOU? ── */}
              {flowStep === 'name' && (
                <motion.div key="name"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }} className="space-y-6">

                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-coke-red/10 flex items-center justify-center mb-4">
                      <Sparkle size={24} weight="bold" className="text-coke-red" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground font-typewriter">What should we call you?</h2>
                    <p className="text-muted-foreground mt-1">Just your name — you can update it later.</p>
                  </div>

                  <Form {...nameForm}>
                    <form onSubmit={nameForm.handleSubmit(handleSaveName)} className="space-y-4">
                      <FormField control={nameForm.control} name="fullName" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <User size={18} weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                              <Input placeholder="Your full name"
                                className="h-12 rounded-full border-border bg-background pl-11 pr-5 focus:border-coke-red focus:ring-coke-red/20"
                                autoFocus
                                {...field} />
                            </div>
                          </FormControl>
                          <FormMessage className="text-coke-red" />
                        </FormItem>
                      )} />

                      <Button type="submit" disabled={isLoading}
                        className="w-full h-12 rounded-full bg-coke-red hover:bg-coke-red/90 text-white font-semibold shadow-lg shadow-coke-red/25 font-typewriter">
                        {isLoading ? <CircleNotch size={20} weight="bold" className="animate-spin" /> : (
                          <><ArrowRight size={20} weight="bold" className="mr-2" />Continue</>
                        )}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* ── STEP 3: GUIDE ── */}
              {flowStep === 'guide' && (
                <motion.div key="guide"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }} className="space-y-6">

                  <div>
                    <h2 className="text-2xl font-bold text-foreground font-typewriter">
                      Welcome, <span className="text-coke-red">{firstName}</span> 👋
                    </h2>
                    <p className="text-muted-foreground mt-1">Here's what to do next to get started.</p>
                  </div>

                  <div className="space-y-3">
                    {guideSteps.map((item, i) => {
                      const Icon = item.icon;
                      const isRequired = item.status === 'required';
                      const isAfterKyc = item.status === 'after-kyc';
                      return (
                        <div key={i} className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-colors ${
                          isRequired
                            ? 'border-coke-red/30 bg-coke-red/5'
                            : 'border-border bg-muted/30'
                        }`}>
                          <div className={`p-2 rounded-xl shrink-0 ${isRequired ? 'bg-coke-red/10' : 'bg-background'}`}>
                            <Icon size={18} weight="bold" className={isRequired ? 'text-coke-red' : 'text-muted-foreground'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{item.title}</p>
                              {isRequired && (
                                <span className="text-[10px] font-bold uppercase tracking-wide text-coke-red bg-coke-red/10 px-1.5 py-0.5 rounded-full">
                                  Required first
                                </span>
                              )}
                              {isAfterKyc && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                  After KYC
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => router.replace('/dashboard')}
                    className="w-full h-12 rounded-full bg-coke-red hover:bg-coke-red/90 text-white font-semibold shadow-lg shadow-coke-red/25 font-typewriter">
                    <ArrowRight size={20} weight="bold" className="mr-2" />
                    Go to Dashboard
                  </Button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
          <span className="font-typewriter">© 2026 Goldilocks Zone Private Limited</span>
          <div className="flex items-center gap-4">
            <a href="/contact" className="hover:text-coke-red transition-colors">Contact Us</a>
            <span>English</span>
          </div>
        </div>
      </div>
    </div>
  );
}
