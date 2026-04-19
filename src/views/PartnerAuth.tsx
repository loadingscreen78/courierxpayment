"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Envelope, ArrowRight, CircleNotch, Eye, EyeSlash, Briefcase, ArrowLeft } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useSeo } from '@/hooks/useSeo';
import { supabase } from '@/integrations/supabase/client';
const logoMain = { src: '/lovable-uploads/logo.png' };
import { motion } from 'framer-motion';
import { useGoogleGsi } from '@/hooks/useGoogleGsi';

const emailPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type EmailPasswordFormValues = z.infer<typeof emailPasswordSchema>;

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

const PartnerAuth = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signInWithEmail, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'idle' | 'form' | 'sent'>('idle');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useSeo({
    title: 'Partner Login | CourierX',
    description: 'CXBC Partner portal for CourierX business partners.',
    canonicalPath: '/partner/login',
  });

  const from = searchParams.get('from');
  const explicitLogout = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('explicit_logout') === '1';
  const safeFrom = explicitLogout ? null : from;
  if (explicitLogout && typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('explicit_logout');
  }

  // Handle redirect after sign in
  useEffect(() => {
    const handleRedirect = async () => {
      if (!user) return;
      if (isLoading) return;
      
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
    };
    
    handleRedirect();
  }, [user, router, toast, isLoading]);

  const emailPasswordForm = useForm<EmailPasswordFormValues>({ 
    resolver: zodResolver(emailPasswordSchema), 
    defaultValues: { email: '', password: '' } 
  });

  const handleEmailAuth = async (values: EmailPasswordFormValues) => {
    setIsLoading(true);
    
    const { error } = await signInWithEmail(values.email, values.password);
    
    if (error) { 
      setIsLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' }); 
      return; 
    }
    
    toast({ title: 'Welcome!', description: 'Signed in.' });
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { setIsLoading(false); return; }

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
        body: JSON.stringify({ email: forgotEmail, panel: 'cxbc' }),
      });
    } catch (_) { /* silent */ }
    setForgotLoading(false);
    setForgotStep('sent');
  };

  useGoogleGsi({
    enabled: true,
    onCredential: handleGoogleCallback,
    buttonDivRef: googleButtonRef,
    isLoading,
  });

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Left Side - Partner Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-charcoal relative overflow-hidden flex-col justify-center items-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1e1e1e] via-charcoal to-[#1a1a1a]" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-coke-red/[0.03] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/4" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 flex flex-col items-center text-center px-10"
        >
          <div className="w-20 h-20 bg-coke-red/10 rounded-2xl flex items-center justify-center mb-6">
            <Briefcase size={48} weight="bold" className="text-coke-red" />
          </div>
          <h1 className="text-4xl font-bold text-paper-white font-typewriter mb-4">
            CXBC Partner Portal
          </h1>
          <p className="text-paper-white/40 text-lg font-typewriter max-w-md">
            Access your partner dashboard, manage bookings, and track your business performance.
          </p>
        </motion.div>
      </div>

      {/* Right Side - Login Form */}
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

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-sm">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground font-typewriter">Partner Sign In</h2>
                <p className="text-muted-foreground mt-1">CXBC Partner Portal</p>
              </div>

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
                            Enter your email and we'll send a reset link.
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
                            Check your email for the reset link. It expires in 1 hour.
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
                        Sign In
                      </>
                    )}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <a
                      href="/cxbc/apply"
                      className="text-coke-red hover:text-coke-red/80 font-medium transition-colors"
                    >
                      Apply Now
                    </a>
                  </p>
                </form>
              </Form>

              {/* Google Sign-In Section */}
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted-foreground">or continue with</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div ref={googleButtonRef} className="w-full min-h-[44px]" />
              </>

              {/* Legal Note */}
              <p className="text-center text-xs text-muted-foreground/70">
                By continuing, you agree to the terms of{' '}
                <a href="/terms" className="underline hover:text-coke-red transition-colors">
                  Goldilocks Zone Private Limited
                </a>
                .
              </p>
            </div>
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
};

export default PartnerAuth;
