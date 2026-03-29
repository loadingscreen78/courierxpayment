"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Envelope, Phone, ArrowRight, CircleNotch, Eye, EyeSlash, User, Gear, Briefcase, ArrowLeft, Package, Airplane, MapPin, Globe, Truck, ShieldWarning, Warning } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { useSeo } from '@/hooks/useSeo';
import { supabase } from '@/integrations/supabase/client';
const logoMain = { src: '/lovable-uploads/logo.png' };
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleGsi } from '@/hooks/useGoogleGsi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const emailPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const phoneSchema = z.object({
  phone: z.string().regex(/^\+91[0-9]{10}$/, 'Please enter a valid Indian phone number (+91XXXXXXXXXX)'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'Please enter a 6-digit OTP'),
});

type EmailPasswordFormValues = z.infer<typeof emailPasswordSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

type AuthStep = 'panel-select' | 'method' | 'otp';
type AuthMethod = 'email' | 'whatsapp';
type AuthMode = 'signin' | 'signup';
type PanelType = 'customer' | 'admin' | 'cxbc';

const panelOptions = [
  { id: 'customer' as PanelType, title: 'Account Login', description: 'Ship internationally', icon: User, available: true },
  { id: 'admin' as PanelType, title: 'Admin Login', description: 'Manage operations', icon: Gear, available: true },
  { id: 'cxbc' as PanelType, title: 'CXBC Panel', description: 'Partner portal', icon: Briefcase, available: false },
];

/**
 * Dual-lookup helper for CXBC partner access.
 */
async function cxbcDualLookup(userId: string, userEmail: string | undefined) {
  const { data: byUserId } = await supabase
    .from('cxbc_partners')
    .select('id, status, user_id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  if (byUserId) {
    return { partner: byUserId, applicationStatus: null as string | null };
  }

  if (userEmail) {
    const { data: byEmail } = await supabase
      .from('cxbc_partners')
      .select('id, status, user_id')
      .eq('email', userEmail)
      .eq('status', 'approved')
      .maybeSingle();

    if (byEmail) {
      if (!byEmail.user_id || byEmail.user_id !== userId) {
        await supabase
          .from('cxbc_partners')
          .update({ user_id: userId })
          .eq('id', byEmail.id);
      }
      return { partner: byEmail, applicationStatus: null as string | null };
    }
  }

  let applicationStatus: string | null = null;
  if (userEmail) {
    const { data: application } = await supabase
      .from('cxbc_partner_applications')
      .select('id, status')
      .eq('email', userEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (application) {
      applicationStatus = application.status;
    }
  }

  return { partner: null, applicationStatus };
}

/* ── Shipping route data for left-panel animation ── */
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

const Auth = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp, signInWithGoogle, sendWhatsAppOtp, verifyWhatsAppOtp } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<AuthStep>('panel-select');
  const [selectedPanel, setSelectedPanel] = useState<PanelType | null>(null);
  const [method, setMethod] = useState<AuthMethod>('email');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [forgotStep, setForgotStep] = useState<'idle' | 'form' | 'sent'>('idle');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showAdminWarning, setShowAdminWarning] = useState(false);
  const [routeIndex, setRouteIndex] = useState(0);

  useSeo({
    title: 'Sign In | CourierX',
    description: 'Sign in to CourierX for international shipping from India.',
    canonicalPath: '/auth',
  });

  const from = searchParams.get('from');
  const explicitLogout = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('explicit_logout') === '1';
  const safeFrom = explicitLogout ? null : from;
  if (explicitLogout && typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('explicit_logout');
  }
  const initialPanel = searchParams.get('panel') as PanelType | null;
  const initialMode = searchParams.get('mode') as AuthMode | null;

  useEffect(() => {
    if (initialPanel && step === 'panel-select' && !selectedPanel) {
      setSelectedPanel(initialPanel);
      setStep('method');
    }
  }, [initialPanel]);

  useEffect(() => {
    if (initialMode && (initialMode === 'signin' || initialMode === 'signup')) {
      setMode(initialMode);
    }
  }, [initialMode]);

  /* Rotate shipping routes on left panel */
  useEffect(() => {
    const interval = setInterval(() => {
      setRouteIndex((prev) => (prev + 1) % shippingRoutes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle redirect after sign in
  useEffect(() => {
    const handleRedirect = async () => {
      if (!user || !selectedPanel) return;
      if (isLoading) return;
      
      const returnUrl = localStorage.getItem('authReturnUrl');
      
      if (selectedPanel === 'admin') {
        const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        const hasAdminAccess = roles?.some(r => r.role === 'admin' || r.role === 'warehouse_operator');
        if (hasAdminAccess) { 
          router.replace('/admin'); 
        }
        else { 
          toast({ title: 'Access Denied', description: 'No admin privileges.', variant: 'destructive' }); 
          await supabase.auth.signOut(); 
        }
        return;
      }
      
      if (selectedPanel === 'cxbc') {
        const { partner, applicationStatus } = await cxbcDualLookup(user.id, user.email ?? undefined);
        if (partner) { router.replace('/cxbc'); }
        else if (applicationStatus === 'pending') {
          toast({ title: 'Your application is Pending', description: 'Your partner application is being reviewed. We\'ll notify you once approved.' });
        } else if (applicationStatus === 'under_review') {
          toast({ title: 'Your application is Under Review', description: 'Your partner application is being reviewed. We\'ll notify you once approved.' });
        } else if (applicationStatus === 'rejected') {
          toast({ title: 'Application Rejected', description: 'Your application was rejected. You can re-apply.', variant: 'destructive' });
          router.replace('/cxbc/apply');
        } else {
          router.replace('/cxbc/apply');
        }
        return;
      }
      
      if (selectedPanel === 'customer') {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (profileData) {
          if (!profileData.full_name) {
            router.replace('/onboarding');
          } else {
            if (returnUrl) {
              localStorage.removeItem('authReturnUrl');
              router.replace(returnUrl);
            } else {
              router.replace(safeFrom || '/dashboard');
            }
          }
        } else {
          router.replace('/onboarding');
        }
      }
    };
    
    handleRedirect();
  }, [user, selectedPanel, router, safeFrom, toast, isLoading]);

  const emailPasswordForm = useForm<EmailPasswordFormValues>({ resolver: zodResolver(emailPasswordSchema), defaultValues: { email: '', password: '' } });
  const phoneForm = useForm<PhoneFormValues>({ resolver: zodResolver(phoneSchema), defaultValues: { phone: '+91' } });
  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } });

  const handlePanelSelect = (panel: PanelType) => {
    if (panel === 'admin') {
      setShowAdminWarning(true);
      return;
    }
    setSelectedPanel(panel);
    setStep('method');
  };

  const handleAdminWarningConfirm = () => {
    setShowAdminWarning(false);
    setSelectedPanel('admin');
    setMode('signin');
    setStep('method');
  };

  const handleEmailAuth = async (values: EmailPasswordFormValues) => {
    setIsLoading(true);
    
    const authFn = mode === 'signin' ? signInWithEmail : signUpWithEmail;
    const { error } = await authFn(values.email, values.password);
    
    if (error) { 
      setIsLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' }); 
      return; 
    }
    
    toast({ title: mode === 'signup' ? 'Account Created' : 'Welcome!', description: mode === 'signup' ? 'Account created successfully!' : 'Signed in.' });
    
    if (mode === 'signup') {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { setIsLoading(false); return; }

      fetch('/api/email/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: values.email, userId: currentUser.id }),
      }).catch(() => {});

      setIsLoading(false);
      window.location.href = '/onboarding';
      return;
    }
    
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    
    if (selectedPanel === 'admin') {
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', currentUser.id);
      const hasAdminAccess = roles?.some(r => r.role === 'admin' || r.role === 'warehouse_operator');
      if (hasAdminAccess) { 
        setIsLoading(false);
        window.location.href = '/admin';
        return;
      } else { 
        toast({ title: 'Access Denied', description: 'No admin privileges.', variant: 'destructive' }); 
        await supabase.auth.signOut(); 
        setIsLoading(false);
        return;
      }
    }
    
    if (selectedPanel === 'cxbc') {
      const { partner, applicationStatus } = await cxbcDualLookup(currentUser.id, currentUser.email ?? undefined);
      if (partner) { 
        setIsLoading(false);
        window.location.href = '/cxbc';
        return;
      } else { 
        if (applicationStatus === 'pending') {
          toast({ title: 'Your application is Pending', description: 'Your partner application is being reviewed. We\'ll notify you once approved.' });
          setIsLoading(false);
        } else if (applicationStatus === 'under_review') {
          toast({ title: 'Your application is Under Review', description: 'Your partner application is being reviewed. We\'ll notify you once approved.' });
          setIsLoading(false);
        } else if (applicationStatus === 'rejected') {
          toast({ title: 'Application Rejected', description: 'Your application was rejected. You can re-apply.', variant: 'destructive' });
          setIsLoading(false);
          window.location.href = '/cxbc/apply';
        } else {
          toast({ title: 'Welcome!', description: 'Apply to become a CXBC partner to access the portal.' });
          setIsLoading(false);
          window.location.href = '/cxbc/apply';
        }
        return;
      }
    }
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();
    
    if (profileData) {
      if (!profileData.full_name) {
        setIsLoading(false);
        window.location.href = '/onboarding';
      } else {
        const returnUrl = localStorage.getItem('authReturnUrl');
        if (returnUrl) {
          localStorage.removeItem('authReturnUrl');
          setIsLoading(false);
          window.location.href = returnUrl;
        } else {
          setIsLoading(false);
          window.location.href = from || '/dashboard';
        }
      }
    } else {
      setIsLoading(false);
      window.location.href = '/onboarding';
    }
  };

  const handleGoogleCallback = async (idToken: string, nonce?: string) => {
    setIsLoading(true);
    const { error } = await signInWithGoogle(idToken, nonce);

    if (error) {
      setIsLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { 
      setIsLoading(false); 
      return; 
    }

    if (selectedPanel === 'cxbc') {
      const { partner, applicationStatus } = await cxbcDualLookup(currentUser.id, currentUser.email ?? undefined);
      if (partner) {
        setIsLoading(false);
        window.location.href = '/cxbc';
      } else if (applicationStatus === 'pending') {
        toast({ title: 'Your application is Pending', description: 'Your partner application is being reviewed. We\'ll notify you once approved.' });
        setIsLoading(false);
      } else if (applicationStatus === 'under_review') {
        toast({ title: 'Your application is Under Review', description: 'Your partner application is being reviewed. We\'ll notify you once approved.' });
        setIsLoading(false);
      } else if (applicationStatus === 'rejected') {
        toast({ title: 'Application Rejected', description: 'Your application was rejected. You can re-apply.', variant: 'destructive' });
        setIsLoading(false);
        window.location.href = '/cxbc/apply';
      } else {
        toast({ title: 'Welcome!', description: 'Apply to become a CXBC partner to access the portal.' });
        setIsLoading(false);
        window.location.href = '/cxbc/apply';
      }
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    if (!profileData || !profileData.full_name) {
      toast({ 
        title: 'Welcome to CourierX!', 
        description: 'Please complete your profile to get started.' 
      });
      setIsLoading(false);
      window.location.href = '/onboarding';
      return;
    }

    const returnUrl = localStorage.getItem('authReturnUrl');
    if (returnUrl) {
      localStorage.removeItem('authReturnUrl');
      setIsLoading(false);
      window.location.href = returnUrl;
    } else {
      setIsLoading(false);
      window.location.href = safeFrom || '/dashboard';
    }
  };

  const handleSendOtp = async (values: PhoneFormValues) => {
    setIsLoading(true);
    const { error } = await sendWhatsAppOtp(values.phone);
    setIsLoading(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setPhoneNumber(values.phone);
    setStep('otp');
    toast({ title: 'OTP Sent', description: `Verification code sent to ${values.phone}` });
  };

  const handleVerifyOtp = async (values: OtpFormValues) => {
    setIsLoading(true);
    const { error } = method === 'whatsapp'
      ? await verifyWhatsAppOtp(phoneNumber, values.otp)
      : await verifyOtp(phoneNumber, values.otp);
    if (error) { setIsLoading(false); toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Welcome!', description: 'Signed in.' });

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { setIsLoading(false); return; }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', currentUser.id)
      .single();

    setIsLoading(false);

    if (!profileData || !profileData.full_name) {
      window.location.href = '/onboarding';
    } else {
      const returnUrl = localStorage.getItem('authReturnUrl');
      if (returnUrl) {
        localStorage.removeItem('authReturnUrl');
        window.location.href = returnUrl;
      } else {
        window.location.href = safeFrom || '/dashboard';
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    setForgotLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, panel: selectedPanel }),
      });
    } catch (_) { /* silent */ }
    setForgotLoading(false);
    setForgotStep('sent');
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    const { error } = method === 'whatsapp'
      ? await sendWhatsAppOtp(phoneNumber)
      : await signInWithOtp(phoneNumber);
    setIsLoading(false);
    if (error) { toast({ title: 'Error', description: 'Failed to resend.', variant: 'destructive' }); return; }
    toast({ title: 'OTP Resent', description: `New code sent to ${phoneNumber}` });
  };

  useGoogleGsi({
    enabled: selectedPanel === 'customer' || selectedPanel === 'cxbc',
    onCredential: handleGoogleCallback,
    buttonDivRef: googleButtonRef,
    isLoading,
  });

  const currentRoute = shippingRoutes[routeIndex];

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Mobile Background Animations (visible only on mobile) */}
      <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-coke-red/5 via-transparent to-coke-red/5" />
        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-coke-red/10"
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full border border-coke-red/10"
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-20 right-8 opacity-20"
          animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Package size={32} weight="bold" className="text-coke-red" />
        </motion.div>
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 opacity-5"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <Globe size={192} weight="bold" className="text-coke-red" />
        </motion.div>
      </div>

      {/* ── Left Side — Redesigned Professional Panel (Desktop only) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-charcoal relative overflow-hidden flex-col justify-between p-0">
        {/* Background layers */}
        <div className="absolute inset-0">
          {/* Subtle dot grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #F9F9F9 0.5px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-charcoal to-[#1a1a1a]" />
          {/* Accent glow */}
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-coke-red/5 rounded-full blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-coke-red/3 rounded-full blur-[100px]" />
        </div>

        {/* Top section — Branding */}
        <div className="relative z-10 p-10 pb-0">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-2"
          >
            <img src={logoMain.src} alt="CourierX" className="h-9 w-auto rounded-lg" />
            <span className="font-bold text-xl text-paper-white font-typewriter tracking-wide">
              Courier<span className="text-coke-red">X</span>
            </span>
          </motion.div>
        </div>

        {/* Center section — Hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-paper-white/50 text-sm font-typewriter tracking-widest uppercase mb-4"
          >
            International Shipping Made Simple
          </motion.p>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl font-bold text-paper-white leading-tight font-typewriter mb-6"
          >
            Ship Your<br />
            <span className="text-coke-red">Essentials</span>
            <br />
            <span className="text-paper-white/40 text-3xl">Worldwide</span>
          </motion.h1>

          {/* Animated route card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-4 max-w-xs"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={routeIndex}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="bg-paper-white/[0.06] backdrop-blur-sm rounded-2xl p-5 border border-paper-white/10"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-coke-red/15 rounded-xl flex items-center justify-center">
                    <Package size={20} weight="bold" className="text-coke-red" />
                  </div>
                  <div className="flex-1">
                    <p className="text-paper-white font-semibold font-typewriter text-sm">{currentRoute.type} Shipment</p>
                    <p className="text-paper-white/40 text-xs">{currentRoute.from} → {currentRoute.to}</p>
                  </div>
                  <Airplane size={18} weight="bold" className="text-coke-red/60" />
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-paper-white/40">Progress</span>
                    <span className="text-paper-white/70">75%</span>
                  </div>
                  <div className="h-1 bg-paper-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-coke-red rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 1.2, delay: 0.2 }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-paper-white/[0.04] rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-paper-white font-typewriter">{currentRoute.days}</p>
                    <p className="text-paper-white/40 text-[10px] uppercase tracking-wider">Days</p>
                  </div>
                  <div className="bg-paper-white/[0.04] rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-coke-red font-typewriter">{currentRoute.price}</p>
                    <p className="text-paper-white/40 text-[10px] uppercase tracking-wider">Starting</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Route indicator dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {shippingRoutes.map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${i === routeIndex ? 'w-6 bg-coke-red' : 'w-1.5 bg-paper-white/20'}`}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom section — Stats + trust bar */}
        <div className="relative z-10 p-10 pt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex items-center gap-6 mb-6"
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xl font-bold text-paper-white font-typewriter">{stat.value}</span>
                <span className="text-paper-white/40 text-xs">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Animated route line */}
          <div className="relative h-8 mb-4">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-paper-white/10" />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2"
              animate={{ x: ['0%', '100%'] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            >
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-coke-red rounded-full" />
                <div className="w-12 h-px bg-gradient-to-r from-coke-red to-transparent" />
              </div>
            </motion.div>
            {/* Static route points */}
            <div className="absolute top-1/2 -translate-y-1/2 left-[10%] flex flex-col items-center">
              <MapPin size={14} weight="bold" className="text-paper-white/30" />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 left-[50%] flex flex-col items-center">
              <Globe size={14} weight="bold" className="text-paper-white/20" />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 left-[90%] flex flex-col items-center">
              <MapPin size={14} weight="bold" className="text-paper-white/30" />
            </div>
          </div>

          <p className="text-paper-white/30 text-xs font-typewriter">
            Trusted by thousands across India for international courier
          </p>
        </div>
      </div>

      {/* ── Admin Warning Dialog ── */}
      <Dialog open={showAdminWarning} onOpenChange={setShowAdminWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 w-14 h-14 bg-coke-red/10 rounded-full flex items-center justify-center">
              <ShieldWarning size={32} weight="bold" className="text-coke-red" />
            </div>
            <DialogTitle className="text-center text-lg font-typewriter">Admin Authorization Only</DialogTitle>
            <DialogDescription className="text-center space-y-2">
              <span className="block">This login is restricted to authorized administrators only. It is not intended for public users.</span>
              <span className="block text-coke-red/80 font-medium text-xs mt-2">
                <Warning size={14} weight="bold" className="inline mr-1 -mt-0.5" />
                Your location and system information will be tracked for security purposes.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={handleAdminWarningConfirm}
              className="w-full h-11 rounded-full bg-coke-red hover:bg-coke-red/90 text-white font-semibold font-typewriter"
            >
              I Understand, Continue
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAdminWarning(false)}
              className="w-full h-11 rounded-full font-typewriter"
            >
              Go Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Right Side — Form (supports dark/light mode) ── */}
      <div className="w-full lg:w-1/2 bg-background flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <a href="/" className="flex items-center gap-2">
            <img src={logoMain.src} alt="CourierX" className="h-8 w-auto rounded-lg" />
            <span className="font-bold text-xl text-foreground font-typewriter">
              Courier<span className="text-coke-red">X</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            {step !== 'panel-select' && (
              <button
                onClick={() => { 
                  setStep('panel-select'); 
                  setSelectedPanel(null);
                  router.replace('/auth');
                }}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ArrowLeft size={16} weight="bold" />
                Back
              </button>
            )}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            {/* ── Panel Selection — Card Grid ── */}
            {step === 'panel-select' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground font-typewriter">Welcome</h2>
                  <p className="text-muted-foreground mt-1">Select your portal to continue</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {panelOptions.map((panel) => (
                    <div key={panel.id} className="relative group/panel">
                      <button
                        onClick={() => panel.available && handlePanelSelect(panel.id)}
                        disabled={!panel.available}
                        className={`w-full p-5 rounded-2xl border transition-all flex flex-col items-center text-center gap-3 aspect-square justify-center ${
                          panel.available
                            ? 'border-border hover:border-coke-red bg-card hover:bg-coke-red/5 cursor-pointer group hover:shadow-lg hover:shadow-coke-red/5'
                            : 'border-border/50 bg-card/50 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                          panel.available
                            ? 'bg-muted group-hover:bg-coke-red/10'
                            : 'bg-muted/50'
                        }`}>
                          <panel.icon size={28} weight="bold" className={`transition-colors ${
                            panel.available
                              ? 'text-muted-foreground group-hover:text-coke-red'
                              : 'text-muted-foreground/50'
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground font-typewriter text-sm">{panel.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{panel.description}</p>
                        </div>
                      </button>
                      {!panel.available && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/panel:opacity-100 transition-opacity">
                          <div className="bg-charcoal text-paper-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg border border-coke-red/20">
                            SOON AVAILABLE
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sign In Form */}
            {step === 'method' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground font-typewriter">
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {panelOptions.find(p => p.id === selectedPanel)?.title}
                  </p>
                </div>

                {/* Method Tabs for Customer */}
                {selectedPanel === 'customer' && (
                  <div className="flex gap-2 p-1 bg-muted rounded-lg">
                    {(['email', 'whatsapp'] as AuthMethod[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                          method === m 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {m === 'email' ? <Envelope size={16} weight="bold" /> : <Phone size={16} weight="bold" />}
                        {m === 'email' ? 'Email' : 'WhatsApp'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Email Form */}
                {(selectedPanel !== 'customer' || method === 'email') && (
                  <Form {...emailPasswordForm}>
                    <form onSubmit={emailPasswordForm.handleSubmit(handleEmailAuth)} className="space-y-4">
                      <FormField
                        control={emailPasswordForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Email or Username"
                                className="h-12 rounded-full border-border bg-background px-5 focus:border-coke-red focus:ring-coke-red/20"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-coke-red" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={emailPasswordForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="Password"
                                  className="h-12 rounded-full border-border bg-background px-5 pr-12 focus:border-coke-red focus:ring-coke-red/20"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-coke-red" />
                          </FormItem>
                        )}
                      />
                      
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(emailPasswordForm.getValues('email') || '');
                            setForgotStep('form');
                          }}
                          className="text-sm text-coke-red hover:text-coke-red/80 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>

                      {/* Forgot Password Inline Flow */}
                      {forgotStep !== 'idle' && (
                        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                          {forgotStep === 'form' ? (
                            <>
                              <p className="text-sm text-muted-foreground">
                                Enter your email and we'll send a reset link
                                {selectedPanel === 'customer' ? ' via email and WhatsApp' : ''}.
                              </p>
                              <input
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="w-full h-10 rounded-full border border-border bg-background px-4 text-sm focus:outline-none focus:border-coke-red"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setForgotStep('idle')}
                                  className="flex-1 h-9 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleForgotPassword}
                                  disabled={forgotLoading}
                                  className="flex-1 h-9 rounded-full bg-coke-red text-white text-sm font-medium hover:bg-coke-red/90 transition-colors disabled:opacity-60"
                                >
                                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-green-600 font-medium">Reset link sent!</p>
                              <p className="text-sm text-muted-foreground">
                                Check your email{selectedPanel === 'customer' ? ' and WhatsApp' : ''} for the reset link. It expires in 1 hour.
                              </p>
                              <button
                                type="button"
                                onClick={() => setForgotStep('idle')}
                                className="text-sm text-coke-red hover:text-coke-red/80 transition-colors"
                              >
                                Back to sign in
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 rounded-full bg-coke-red hover:bg-coke-red/90 text-white font-semibold shadow-lg shadow-coke-red/25 font-typewriter"
                      >
                        {isLoading ? <CircleNotch size={20} weight="bold" className="animate-spin" /> : (
                          <>
                            <ArrowRight size={20} weight="bold" className="mr-2" />
                            {mode === 'signin' ? 'Sign In' : 'Create Account'}
                          </>
                        )}
                      </Button>

                      {(selectedPanel === 'customer' || selectedPanel === 'cxbc') && (
                        <p className="text-center text-sm text-muted-foreground">
                          {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                          <button
                            type="button"
                            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                            className="text-coke-red hover:text-coke-red/80 font-medium transition-colors"
                          >
                            {mode === 'signin' ? 'Sign up' : 'Sign in'}
                          </button>
                        </p>
                      )}
                    </form>
                  </Form>
                )}

                {/* Google Sign-In Section */}
                {(selectedPanel === 'customer' || selectedPanel === 'cxbc') && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-sm text-muted-foreground">or continue with</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div ref={googleButtonRef} className="w-full min-h-[44px]" />
                  </>
                )}

                {/* Legal Note */}
                {(selectedPanel === 'customer' || selectedPanel === 'cxbc') && (
                  <p className="text-center text-xs text-muted-foreground/70">
                    By continuing, you agree to the terms of{' '}
                    <a href="/terms-and-conditions" className="underline hover:text-coke-red transition-colors">
                      Indiano Ventures Private Limited
                    </a>
                    .
                  </p>
                )}

                {/* WhatsApp Form */}
                {selectedPanel === 'customer' && method === 'whatsapp' && (
                  <Form {...phoneForm}>
                    <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
                      <FormField
                        control={phoneForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="WhatsApp Number (+91...)"
                                className="h-12 rounded-full border-border bg-background px-5 focus:border-coke-red focus:ring-coke-red/20"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-coke-red" />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 rounded-full bg-coke-red hover:bg-coke-red/90 text-white font-semibold shadow-lg shadow-coke-red/25 font-typewriter"
                      >
                        {isLoading ? <CircleNotch size={20} weight="bold" className="animate-spin" /> : 'Send OTP'}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">
                        New users will be automatically registered
                      </p>
                    </form>
                  </Form>
                )}
              </div>
            )}

            {/* OTP Verification */}
            {step === 'otp' && (
              <div className="space-y-6">
                <div>
                  <button
                    onClick={() => setStep('method')}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4 transition-colors"
                  >
                    <ArrowLeft size={16} weight="bold" />
                    Back
                  </button>
                  <h2 className="text-2xl font-bold text-foreground font-typewriter">Verify OTP</h2>
                  <p className="text-muted-foreground mt-1">Enter the code sent to {phoneNumber}</p>
                </div>

                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-6">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem className="flex justify-center">
                          <FormControl>
                            <InputOTP maxLength={6} {...field}>
                              <InputOTPGroup className="gap-2">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                  <InputOTPSlot
                                    key={i}
                                    index={i}
                                    className="w-12 h-14 text-xl border-border rounded-xl focus:border-coke-red bg-background"
                                  />
                                ))}
                              </InputOTPGroup>
                            </InputOTP>
                          </FormControl>
                          <FormMessage className="text-coke-red" />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 rounded-full bg-coke-red hover:bg-coke-red/90 text-white font-semibold font-typewriter"
                    >
                      {isLoading ? <CircleNotch size={20} weight="bold" className="animate-spin" /> : 'Verify'}
                    </Button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="w-full text-center text-sm text-muted-foreground hover:text-coke-red transition-colors"
                    >
                      Resend OTP
                    </button>
                  </form>
                </Form>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-typewriter">© 2026 Indiano Ventures Private Limited</span>
          <div className="flex items-center gap-4">
            <a href="/contact" className="hover:text-coke-red transition-colors">Contact Us</a>
            <span>English</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
