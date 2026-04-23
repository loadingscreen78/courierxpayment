"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Envelope, ArrowRight, CircleNotch, Eye, EyeSlash, Gear, ShieldWarning, Warning, ArrowLeft } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useSeo } from '@/hooks/useSeo';
import { supabase } from '@/integrations/supabase/client';
import { cx } from '@/lib/cookies';
const logoMain = { src: '/lovable-uploads/logo.png' };
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const emailPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type EmailPasswordFormValues = z.infer<typeof emailPasswordSchema>;

const AdminAuth = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signInWithEmail } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'idle' | 'form' | 'sent'>('idle');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [adminPinStep, setAdminPinStep] = useState<'warning' | 'pin' | 'verified'>('warning');
  const [adminPin, setAdminPin] = useState(['', '', '', '']);
  const [adminPinError, setAdminPinError] = useState('');
  const [adminPinLoading, setAdminPinLoading] = useState(false);
  const [adminPinRemaining, setAdminPinRemaining] = useState(5);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useSeo({
    title: 'Admin Login | CourierX',
    description: 'Admin portal for CourierX operations management.',
    canonicalPath: '/admin/login',
  });

  const from = searchParams.get('from');
  const explicitLogout = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('explicit_logout') === '1';
  const safeFrom = explicitLogout ? null : from;
  if (explicitLogout && typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('explicit_logout');
  }

  // Auto-restore admin session if user already has a valid Supabase session + admin role
  // This handles the case where cx_admin cookie expired but Supabase session is still valid
  useEffect(() => {
    const autoRestore = async () => {
      if (!user) return;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const token = sessionData.session.access_token;
      const res = await fetch('/api/admin/check-access', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data.hasAccess) {
        cx.setAuth(sessionData.session.access_token, sessionData.session.refresh_token);
        cx.setUserId(user.id);
        cx.setAdminSession(true);
        window.location.href = '/admin';
      }
    };

    autoRestore();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle redirect after PIN + email/password sign in
  useEffect(() => {
    const handleRedirect = async () => {
      if (!user || adminPinStep !== 'verified') return;
      if (isLoading) return;
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const token = sessionData.session.access_token;
      cx.setAuth(token, sessionData.session.refresh_token);
      cx.setUserId(user.id);

      const res = await fetch('/api/admin/check-access', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : { hasAccess: false };

      if (data.hasAccess) { 
        cx.setAdminSession(true);
        window.location.href = '/admin';
      } else { 
        toast({ title: 'Access Denied', description: 'No admin privileges.', variant: 'destructive' }); 
        await supabase.auth.signOut(); 
      }
    };
    
    handleRedirect();
  }, [user, adminPinStep, toast, isLoading]);

  const emailPasswordForm = useForm<EmailPasswordFormValues>({ 
    resolver: zodResolver(emailPasswordSchema), 
    defaultValues: { email: '', password: '' } 
  });

  const handleAdminWarningConfirm = () => {
    setAdminPinStep('pin');
    setAdminPin(['', '', '', '']);
    setAdminPinError('');
    setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
  };

  const handleAdminPinInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...adminPin];
    newPin[index] = value.slice(-1);
    setAdminPin(newPin);
    setAdminPinError('');

    if (value && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3 && newPin.every(d => d !== '')) {
      handleAdminPinSubmit(newPin.join(''));
    }
  };

  const handleAdminPinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !adminPin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handleAdminPinSubmit = async (pin: string) => {
    setAdminPinLoading(true);
    setAdminPinError('');
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAdminPinStep('verified');
      } else if (data.locked) {
        toast({ title: 'Access Locked', description: 'Too many failed attempts. Redirecting...', variant: 'destructive' });
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } else {
        setAdminPinRemaining(data.remainingAttempts ?? 0);
        setAdminPinError(`Incorrect PIN. ${data.remainingAttempts ?? 0} attempt${(data.remainingAttempts ?? 0) === 1 ? '' : 's'} remaining.`);
        setAdminPin(['', '', '', '']);
        setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setAdminPinError('Connection error. Please try again.');
    }
    setAdminPinLoading(false);
  };

  const handleEmailAuth = async (values: EmailPasswordFormValues) => {
    setIsLoading(true);
    
    const { error } = await signInWithEmail(values.email, values.password);
    
    if (error) { 
      setIsLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' }); 
      return; 
    }
    
    const { data: sessionData } = await supabase.auth.getSession();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser || !sessionData.session) {
      setIsLoading(false);
      return;
    }

    // Set auth cookies explicitly before redirect (onAuthStateChange is async)
    cx.setAuth(sessionData.session.access_token, sessionData.session.refresh_token);
    cx.setUserId(currentUser.id);
    
    const res = await fetch('/api/admin/check-access', {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });
    const data = res.ok ? await res.json() : { hasAccess: false };

    if (data.hasAccess) { 
      setIsLoading(false);
      cx.setAdminSession(true);
      window.location.href = '/admin';
      return;
    } else { 
      toast({ title: 'Access Denied', description: 'No admin privileges.', variant: 'destructive' }); 
      await supabase.auth.signOut(); 
      setIsLoading(false);
      return;
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
        body: JSON.stringify({ email: forgotEmail, panel: 'admin' }),
      });
    } catch (_) { /* silent */ }
    setForgotLoading(false);
    setForgotStep('sent');
  };

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Admin Access Dialog (Warning + PIN) */}
      <Dialog open={adminPinStep !== 'verified'} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          {adminPinStep === 'warning' && (
            <>
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
                  className="w-full h-11 rounded-full bg-coke-red hover:bg-coke-red/90 text-white font-typewriter"
                >
                  I Understand, Continue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="w-full h-11 rounded-full font-typewriter"
                >
                  Go Back
                </Button>
              </DialogFooter>
            </>
          )}

          {adminPinStep === 'pin' && (
            <>
              <DialogHeader>
                <div className="mx-auto mb-3 w-12 h-12 bg-coke-red/10 rounded-full flex items-center justify-center">
                  <ShieldWarning size={24} weight="bold" className="text-coke-red" />
                </div>
                <DialogTitle className="text-center text-lg font-typewriter">Enter Access PIN</DialogTitle>
                <DialogDescription className="text-center">
                  Enter the 4-digit admin access code to proceed.
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-center gap-3 my-4">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { pinInputRefs.current[i] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={adminPin[i]}
                    onChange={(e) => handleAdminPinInput(i, e.target.value)}
                    onKeyDown={(e) => handleAdminPinKeyDown(i, e)}
                    disabled={adminPinLoading}
                    className={`w-14 h-16 text-center text-2xl font-typewriter font-bold rounded-xl border-2 bg-background outline-none transition-all ${
                      adminPinError
                        ? 'border-coke-red/50 text-coke-red'
                        : 'border-border focus:border-coke-red'
                    } disabled:opacity-50`}
                    aria-label={`PIN digit ${i + 1}`}
                  />
                ))}
              </div>

              {adminPinError && (
                <p className="text-center text-sm text-coke-red font-medium">{adminPinError}</p>
              )}

              {adminPinLoading && (
                <div className="flex justify-center">
                  <CircleNotch size={24} weight="bold" className="animate-spin text-coke-red" />
                </div>
              )}

              <DialogFooter className="flex-col gap-2 sm:flex-col mt-2">
                <Button
                  variant="outline"
                  onClick={() => setAdminPinStep('warning')}
                  className="w-full h-10 rounded-full font-typewriter text-sm"
                >
                  <ArrowLeft size={14} weight="bold" className="mr-1.5" />
                  Back
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Left Side - Admin Branding */}
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
            <Gear size={48} weight="bold" className="text-coke-red" />
          </div>
          <h1 className="text-4xl font-bold text-paper-white font-typewriter mb-4">
            Admin Portal
          </h1>
          <p className="text-paper-white/40 text-lg font-typewriter max-w-md">
            Manage operations, monitor shipments, and oversee platform activities.
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
            {adminPinStep === 'verified' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground font-typewriter">Admin Sign In</h2>
                  <p className="text-muted-foreground mt-1">Manage operations</p>
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
                  </form>
                </Form>
              </div>
            )}
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

export default AdminAuth;
