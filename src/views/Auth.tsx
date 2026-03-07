"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Phone, ArrowRight, Loader2, Eye, EyeOff, User, Settings, Briefcase, ArrowLeft, Package, Plane, MapPin, Globe, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { useSeo } from '@/hooks/useSeo';
import { supabase } from '@/integrations/supabase/client';
import logoMain from '@/assets/logo-main.jpeg';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useGoogleGsi } from '@/hooks/useGoogleGsi';

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
  { id: 'customer' as PanelType, title: 'Customer Panel', description: 'Ship internationally', icon: User, available: true },
  { id: 'admin' as PanelType, title: 'Admin Panel', description: 'Manage operations', icon: Settings, available: true },
  { id: 'cxbc' as PanelType, title: 'CXBC Panel', description: 'Partner portal', icon: Briefcase, available: true },
];

/**
 * Dual-lookup helper for CXBC partner access.
 * 1. Query cxbc_partners by user_id + approved
 * 2. Fallback: query by email + approved
 * 3. Auto-link user_id if found by email with null/mismatched user_id
 * 4. If no approved partner, check cxbc_partner_applications for status feedback
 */
async function cxbcDualLookup(userId: string, userEmail: string | undefined) {
  // Step 1: Query by user_id
  const { data: byUserId } = await supabase
    .from('cxbc_partners')
    .select('id, status, user_id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  if (byUserId) {
    return { partner: byUserId, applicationStatus: null as string | null };
  }

  // Step 2: Fallback — query by email
  if (userEmail) {
    const { data: byEmail } = await supabase
      .from('cxbc_partners')
      .select('id, status, user_id')
      .eq('email', userEmail)
      .eq('status', 'approved')
      .maybeSingle();

    if (byEmail) {
      // Step 3: Auto-link user_id if null or mismatched
      if (!byEmail.user_id || byEmail.user_id !== userId) {
        await supabase
          .from('cxbc_partners')
          .update({ user_id: userId })
          .eq('id', byEmail.id);
      }
      return { partner: byEmail, applicationStatus: null as string | null };
    }
  }

  // Step 4: No approved partner — check applications for status feedback
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

  useSeo({
    title: 'Sign In | CourierX',
    description: 'Sign in to CourierX for international shipping from India.',
    canonicalPath: '/auth',
  });

  const from = searchParams.get('from');
  const initialPanel = searchParams.get('panel') as PanelType | null;
  const initialMode = searchParams.get('mode') as AuthMode | null;

  useEffect(() => {
    if (initialPanel && !selectedPanel) {
      setSelectedPanel(initialPanel);
      setStep('method');
    }
  }, [initialPanel, selectedPanel]);

  useEffect(() => {
    if (initialMode && (initialMode === 'signin' || initialMode === 'signup')) {
      setMode(initialMode);
    }
  }, [initialMode]);
  
  // Handle redirect after sign in - DISABLED to prevent conflicts with handleEmailAuth
  // The redirect is now handled directly in handleEmailAuth function
  useEffect(() => {
    // Only handle redirect if user is already logged in when page loads
    const handleRedirect = async () => {
      if (!user || !selectedPanel) return;
      
      // Check if we're in the middle of a login flow (isLoading)
      // If so, skip this useEffect - let handleEmailAuth handle the redirect
      if (isLoading) return;
      
      console.log('[Auth useEffect] Starting redirect handler');
      console.log('[Auth useEffect] User:', user.id);
      console.log('[Auth useEffect] Selected panel:', selectedPanel);
      
      // PRIORITY 1: Check for return URL from rate calculator FIRST
      const returnUrl = localStorage.getItem('authReturnUrl');
      console.log('[Auth useEffect] Return URL from localStorage:', returnUrl);
      
      if (selectedPanel === 'admin') {
        const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        console.log('[Auth useEffect] Admin roles check:', roles);
        const hasAdminAccess = roles?.some(r => r.role === 'admin' || r.role === 'warehouse_operator');
        if (hasAdminAccess) { 
          console.log('[Auth useEffect] Has admin access, redirecting to /admin');
          router.replace('/admin'); 
        }
        else { 
          console.log('[Auth useEffect] No admin access, signing out');
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
      
      // For customer panel, fetch profile directly
      if (selectedPanel === 'customer') {
        console.log('[Auth useEffect] Customer panel, fetching profile...');
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        console.log('[Auth useEffect] Profile data:', profileData);
        
        if (profileData) {
          if (!profileData.full_name) {
            console.log('[Auth useEffect] No full_name, redirecting to onboarding');
            router.replace('/onboarding');
          } else {
            // PRIORITY 1: Check for return URL from rate calculator
            if (returnUrl) {
              console.log('[Auth useEffect] ✅ Found return URL, redirecting to:', returnUrl);
              localStorage.removeItem('authReturnUrl');
              router.replace(returnUrl);
            } else {
              console.log('[Auth useEffect] ❌ No return URL, redirecting to dashboard');
              // Default redirect
              router.replace(from || '/dashboard');
            }
          }
        } else {
          console.log('[Auth useEffect] No profile, redirecting to onboarding');
          router.replace('/onboarding');
        }
      }
    };
    
    handleRedirect();
  }, [user, selectedPanel, router, from, toast, isLoading]);

  const emailPasswordForm = useForm<EmailPasswordFormValues>({ resolver: zodResolver(emailPasswordSchema), defaultValues: { email: '', password: '' } });
  const phoneForm = useForm<PhoneFormValues>({ resolver: zodResolver(phoneSchema), defaultValues: { phone: '+91' } });
  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } });

  const handlePanelSelect = (panel: PanelType) => {
    setSelectedPanel(panel);
    if (panel === 'admin') setMode('signin');
    setStep('method');
  };

  const handleEmailAuth = async (values: EmailPasswordFormValues) => {
    setIsLoading(true);
    console.log('[Auth] Starting sign in...', { email: values.email, mode, selectedPanel });
    
    const authFn = mode === 'signin' ? signInWithEmail : signUpWithEmail;
    const { error } = await authFn(values.email, values.password);
    
    if (error) { 
      console.log('[Auth] Sign in error:', error.message);
      setIsLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' }); 
      return; 
    }
    
    console.log('[Auth] Sign in successful, showing toast...');
    toast({ title: mode === 'signup' ? 'Account Created' : 'Welcome!', description: mode === 'signup' ? 'Check your email.' : 'Signed in.' });
    
    // For sign up, don't redirect (user needs to verify email)
    if (mode === 'signup') {
      setIsLoading(false);
      return;
    }
    
    // For sign in, get the current user and redirect
    console.log('[Auth] Getting current user...');
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    console.log('[Auth] Current user:', currentUser?.id, 'Error:', userError?.message);
    
    if (!currentUser) {
      console.log('[Auth] No current user found, stopping');
      setIsLoading(false);
      return;
    }
    
    // Handle redirect based on panel
    console.log('[Auth] Handling redirect for panel:', selectedPanel);
    
    if (selectedPanel === 'admin') {
      const { data: roles, error: rolesError } = await supabase.from('user_roles').select('role').eq('user_id', currentUser.id);
      console.log('[Auth] Admin roles:', roles, 'Error:', rolesError?.message);
      const hasAdminAccess = roles?.some(r => r.role === 'admin' || r.role === 'warehouse_operator');
      if (hasAdminAccess) { 
        console.log('[Auth] ✅ Admin access granted, redirecting to /admin');
        // Use window.location for hard redirect to prevent useEffect interference
        setIsLoading(false);
        window.location.href = '/admin';
        return;
      } else { 
        console.log('[Auth] ❌ No admin access');
        toast({ title: 'Access Denied', description: 'No admin privileges.', variant: 'destructive' }); 
        await supabase.auth.signOut(); 
        setIsLoading(false);
        return;
      }
    }
    
    if (selectedPanel === 'cxbc') {
      const { partner, applicationStatus } = await cxbcDualLookup(currentUser.id, currentUser.email ?? undefined);
      console.log('[Auth] CXBC dual-lookup result:', { partner, applicationStatus });
      if (partner) { 
        console.log('[Auth] ✅ CXBC access granted (dual-lookup), redirecting to /cxbc');
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
          console.log('[Auth] No application found, redirecting to apply');
          toast({ title: 'Welcome!', description: 'Apply to become a CXBC partner to access the portal.' });
          setIsLoading(false);
          window.location.href = '/cxbc/apply';
        }
        return;
      }
    }
    
    // Customer panel - check profile and redirect
    console.log('[Auth] Fetching profile for customer panel...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();
    
    console.log('[Auth] Profile data:', profileData, 'Error:', profileError?.message);
    
    if (profileData) {
      if (!profileData.full_name) {
        console.log('[Auth] Redirecting to onboarding (no full_name)');
        setIsLoading(false);
        window.location.href = '/onboarding';
      } else {
        // PRIORITY 1: Check for return URL from rate calculator
        const returnUrl = localStorage.getItem('authReturnUrl');
        if (returnUrl) {
          console.log('[Auth] Redirecting to return URL from rate calculator:', returnUrl);
          localStorage.removeItem('authReturnUrl');
          setIsLoading(false);
          window.location.href = returnUrl;
        } else {
          console.log('[Auth] No return URL, redirecting to dashboard');
          setIsLoading(false);
          window.location.href = from || '/dashboard';
        }
      }
    } else {
      console.log('[Auth] No profile found, redirecting to onboarding');
      setIsLoading(false);
      window.location.href = '/onboarding';
    }
  };

  const handleGoogleCallback = async (idToken: string) => {
    setIsLoading(true);
    const { error } = await signInWithGoogle(idToken);

    if (error) {
      setIsLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // Get current user (session is now active)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { setIsLoading(false); return; }

    // Panel-specific redirect (identical to handleEmailAuth)
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

    // Customer panel
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    if (profileData?.full_name) {
      const returnUrl = localStorage.getItem('authReturnUrl');
      if (returnUrl) {
        localStorage.removeItem('authReturnUrl');
        setIsLoading(false);
        window.location.href = returnUrl;
      } else {
        setIsLoading(false);
        window.location.href = from || '/dashboard';
      }
    } else {
      setIsLoading(false);
      window.location.href = '/onboarding';
    }
  };

  const handleSendOtp = async (values: PhoneFormValues) => {
    setIsLoading(true);
    const { error } = await sendWhatsAppOtp(values.phone);
    setIsLoading(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setPhoneNumber(values.phone);
    setStep('otp');
    toast({ title: 'OTP Sent', description: `Code sent to ${values.phone} via WhatsApp` });
  };

  const handleVerifyOtp = async (values: OtpFormValues) => {
    setIsLoading(true);
    const { error } = method === 'whatsapp'
      ? await verifyWhatsAppOtp(phoneNumber, values.otp)
      : await verifyOtp(phoneNumber, values.otp);
    setIsLoading(false);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Welcome!', description: 'Signed in.' });
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

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Mobile Background Animations (visible only on mobile) */}
      <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-coke-red/5 via-transparent to-coke-red/5" />
        
        {/* Animated circles */}
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
        
        {/* Floating packages */}
        <motion.div
          className="absolute top-20 right-8 opacity-20"
          animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Package className="w-8 h-8 text-coke-red" />
        </motion.div>
        <motion.div
          className="absolute top-40 left-6 opacity-15"
          animate={{ y: [0, -15, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <Package className="w-6 h-6 text-coke-red" />
        </motion.div>
        
        {/* Flying plane */}
        <motion.div
          className="absolute top-32 opacity-20"
          initial={{ x: -50 }}
          animate={{ x: ['0%', '100%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <Plane className="w-6 h-6 text-coke-red transform -rotate-12" />
        </motion.div>
        
        {/* Floating location pins */}
        <motion.div
          className="absolute bottom-40 right-10 opacity-15"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <MapPin className="w-5 h-5 text-coke-red" />
        </motion.div>
        <motion.div
          className="absolute bottom-60 left-8 opacity-10"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        >
          <MapPin className="w-4 h-4 text-coke-red" />
        </motion.div>
        
        {/* Globe */}
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 opacity-5"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <Globe className="w-48 h-48 text-coke-red" />
        </motion.div>
        
        {/* Truck animation at bottom */}
        <motion.div
          className="absolute bottom-24 opacity-10"
          animate={{ x: ['-10%', '110%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          <Truck className="w-8 h-8 text-coke-red" />
        </motion.div>
        
        {/* Glowing dots */}
        <motion.div
          className="absolute top-1/3 right-1/4 w-2 h-2 bg-coke-red rounded-full"
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-2/3 left-1/4 w-1.5 h-1.5 bg-coke-red rounded-full"
          animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.3, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-1 h-1 bg-coke-red rounded-full"
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* Left Side - Always Dark (Charcoal) - Desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-charcoal relative overflow-hidden flex-col justify-center items-center p-12">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #F9F9F9 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-64 h-64 border border-paper-white/10 rounded-full" />
        <div className="absolute top-24 left-24 w-56 h-56 border border-paper-white/5 rounded-full" />
        
        {/* Content */}
        <div className="relative z-10 text-center max-w-md">
          <p className="text-paper-white/60 text-sm mb-8 font-typewriter">
            International shipping made simple — courier solutions for you.
          </p>
          
          <h1 className="text-5xl font-bold text-paper-white mb-4 leading-tight font-typewriter">
            Ship Your<br />
            <span className="text-coke-red">Essentials</span>
          </h1>
          
          {/* Animated Shipping Illustration */}
          <div className="relative mt-12 h-80">
            {/* World Map Dots Background */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-64 h-64 rounded-full border border-paper-white/10 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              >
                <Globe className="w-32 h-32 text-paper-white/10" />
              </motion.div>
            </div>

            {/* Flying Plane Animation */}
            <motion.div
              className="absolute"
              initial={{ x: -100, y: 100 }}
              animate={{ x: [-100, 150, 300], y: [100, 20, 80] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="relative">
                <Plane className="w-10 h-10 text-coke-red transform -rotate-45" />
                <motion.div
                  className="absolute -left-20 top-1/2 h-0.5 bg-gradient-to-r from-transparent to-coke-red/50"
                  animate={{ width: [0, 80, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
              </div>
            </motion.div>

            {/* Package Card */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#363636] rounded-2xl p-6 shadow-2xl border border-paper-white/10 w-64"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-coke-red/20 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-coke-red" />
                </div>
                <div>
                  <p className="text-paper-white font-semibold font-typewriter text-sm">Medicine Shipment</p>
                  <p className="text-paper-white/50 text-xs">Delhi → London</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-paper-white/50">Progress</span>
                  <span className="text-paper-white">75%</span>
                </div>
                <div className="h-1.5 bg-paper-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-coke-red rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    transition={{ duration: 1.5, delay: 1 }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-paper-white/5 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-paper-white font-typewriter">3-5</p>
                  <p className="text-paper-white/50 text-xs">Days</p>
                </div>
                <div className="bg-paper-white/5 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-coke-red font-typewriter">₹1,299</p>
                  <p className="text-paper-white/50 text-xs">Starting</p>
                </div>
              </div>
            </motion.div>

            {/* Floating Location Pins */}
            <motion.div
              className="absolute top-10 right-10"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="bg-coke-red/20 p-2 rounded-full">
                <MapPin className="w-5 h-5 text-coke-red" />
              </div>
            </motion.div>
            
            <motion.div
              className="absolute bottom-20 left-10"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              <div className="bg-coke-red/20 p-2 rounded-full">
                <MapPin className="w-5 h-5 text-coke-red" />
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-5 left-0"
              animate={{ x: [0, 280, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Truck className="w-8 h-8 text-paper-white/30" />
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div
            className="w-2 h-2 bg-coke-red rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Right Side - Form (supports dark/light mode) */}
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
            <ThemeToggle />
            {step !== 'panel-select' && (
              <button
                onClick={() => { 
                  setStep('panel-select'); 
                  setSelectedPanel(null);
                }}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            {/* Panel Selection */}
            {step === 'panel-select' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground font-typewriter">Welcome</h2>
                  <p className="text-muted-foreground mt-1">Select your portal to continue</p>
                </div>
                <div className="space-y-3">
                  {panelOptions.map((panel) => (
                    <button
                      key={panel.id}
                      onClick={() => handlePanelSelect(panel.id)}
                      className="w-full p-4 rounded-xl border border-border hover:border-coke-red bg-card hover:bg-coke-red/5 transition-all flex items-center gap-4 group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-coke-red/10 flex items-center justify-center transition-colors">
                        <panel.icon className="w-6 h-6 text-muted-foreground group-hover:text-coke-red transition-colors" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-foreground font-typewriter">{panel.title}</p>
                        <p className="text-sm text-muted-foreground">{panel.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-coke-red transition-colors" />
                    </button>
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
                        {m === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
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
                                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-coke-red" />
                          </FormItem>
                        )}
                      />
                      
                      <div className="text-right">
                        <button type="button" className="text-sm text-coke-red hover:text-coke-red/80 transition-colors">
                          Forgot password?
                        </button>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 rounded-full bg-coke-red hover:bg-coke-red/90 text-white font-semibold shadow-lg shadow-coke-red/25 font-typewriter"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          <>
                            <ArrowRight className="w-5 h-5 mr-2" />
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
                    <div ref={googleButtonRef} />
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
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
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
                    <ArrowLeft className="w-4 h-4" />
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
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
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
