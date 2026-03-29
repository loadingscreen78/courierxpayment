"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Envelope, Lock, Eye, EyeSlash, ArrowRight, CircleNotch, ShieldCheck, Package, CurrencyInr, UserPlus } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Link from 'next/link';
import { motion } from 'framer-motion';

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

const benefits = [
  { icon: CurrencyInr, text: '52% lower rates on all shipments' },
  { icon: Package, text: 'Wallet-based payments with auto-deduction' },
  { icon: ShieldCheck, text: 'Aadhaar-verified identity for customs compliance' },
];

export default function OpenAccount() {
  const router = useRouter();
  const { user, signUpWithEmail } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in, redirect to KYC or dashboard
  useEffect(() => {
    if (!user) return;
    const checkProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('aadhaar_verified, full_name')
        .eq('user_id', user.id)
        .single();
      if (!profile?.full_name) {
        router.replace('/onboarding');
      } else if (!profile?.aadhaar_verified) {
        router.replace('/auth/kyc?from=/dashboard');
      } else {
        router.replace('/dashboard');
      }
    };
    checkProfile();
  }, [user, router]);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const handleSignUp = async (values: SignUpFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await signUpWithEmail(values.email, values.password);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      toast({ title: 'Account Created', description: 'Complete your profile and Aadhaar verification next.' });

      // Send welcome email (fire-and-forget)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        fetch('/api/email/send-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: values.email, userId: currentUser.id }),
        }).catch(() => {});
      }

      // Redirect to onboarding → KYC flow
      window.location.href = '/onboarding';
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-background to-coke-red/5 items-center justify-center p-12">
        <div className="max-w-md space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/">
              <img
                alt="CourierX"
                src="/logo.svg"
                className="h-10 w-auto object-contain mb-8"
              />
            </Link>
            <h2 className="text-3xl font-bold font-typewriter mb-4">
              Open a Free Account
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Account holders get exclusive rates — <span className="font-semibold text-candlestick-green">52% lower</span> than standard pricing on every domestic and international shipment.
            </p>
          </motion.div>

          <div className="space-y-4">
            {benefits.map((b, i) => (
              <motion.div
                key={b.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50"
              >
                <div className="w-10 h-10 rounded-full bg-candlestick-green/10 flex items-center justify-center shrink-0">
                  <b.icon className="h-5 w-5 text-candlestick-green" />
                </div>
                <span className="text-sm font-medium">{b.text}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="rounded-xl border border-border/50 bg-card/30 p-4"
          >
            <h4 className="font-semibold text-sm mb-2">How it works</h4>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Create your account with email & password</li>
              <li>Complete your profile (name, phone)</li>
              <li>Verify your identity with Aadhaar (DigiLocker)</li>
              <li>Start shipping at discounted rates</li>
            </ol>
          </motion.div>
        </div>
      </div>

      {/* Right panel — sign up form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="lg:hidden mb-6">
            <Link href="/">
              <img
                alt="CourierX"
                src="/logo.svg"
                className="h-9 w-auto object-contain"
              />
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-coke-red" />
              Open Account
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Create your account to unlock 52% lower shipping rates. Aadhaar KYC verification required.
            </p>
          </div>

          {/* Mobile benefits */}
          <div className="lg:hidden rounded-xl border border-candlestick-green/30 bg-candlestick-green/5 p-3">
            <p className="text-sm font-medium text-candlestick-green">
              Account holders save 52% on every shipment — domestic & international.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
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
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" className="pl-10 pr-10" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
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
                )}
              />

              <Button type="submit" className="w-full bg-coke-red hover:bg-red-600 text-white gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <CircleNotch className="h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              Already have an account?{' '}
              <button onClick={() => router.push('/auth?panel=customer')} className="text-coke-red hover:underline font-medium">
                Sign In
              </button>
            </p>
            <p>
              Just want to ship without an account?{' '}
              <button onClick={() => router.push('/public/book')} className="text-coke-red hover:underline font-medium">
                Ship Now (standard rates)
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
