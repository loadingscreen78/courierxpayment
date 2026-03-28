"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeSlash, CircleNotch, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const logoMain = '/lovable-uploads/logo.png';

const resetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true);
      }
    });

    const init = async () => {
      // Check for token_hash in query params (our custom flow)
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const type = params.get('type');

      if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (error) {
          console.error('[ResetPassword] verifyOtp error:', error.message);
          setSessionError(true);
        } else {
          setSessionReady(true);
        }
        return;
      }

      // Fallback: check existing session (magic link auto-exchange via URL hash)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        return;
      }

      // Give Supabase a moment to process the URL hash
      setTimeout(async () => {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s) setSessionReady(true);
        else setSessionError(true);
      }, 1500);
    };

    init();
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (values: ResetFormValues) => {
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setIsLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setDone(true);
    toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });

    setTimeout(() => {
      supabase.auth.signOut().then(() => router.replace('/auth'));
    }, 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Image src={logoMain} alt="CourierX" width={120} height={40} className="h-10 w-auto" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg space-y-6">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle size={64} weight="bold" className="text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold font-typewriter">Password Updated</h2>
              <p className="text-muted-foreground text-sm">Redirecting you to sign in...</p>
            </div>
          ) : sessionError ? (
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold font-typewriter">Link Expired</h2>
              <p className="text-muted-foreground text-sm">
                This reset link has expired or already been used. Please request a new one.
              </p>
              <Button
                onClick={() => router.replace('/auth')}
                className="w-full h-12 rounded-full bg-coke-red hover:bg-coke-red/90 text-white font-semibold font-typewriter"
              >
                Back to Sign In
              </Button>
            </div>
          ) : !sessionReady ? (
            <div className="text-center space-y-4">
              <CircleNotch size={40} weight="bold" className="animate-spin text-coke-red mx-auto" />
              <p className="text-muted-foreground text-sm">Verifying reset link...</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold font-typewriter">Set New Password</h2>
                <p className="text-muted-foreground text-sm">Choose a strong password for your account.</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="New password"
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

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirm ? 'text' : 'password'}
                              placeholder="Confirm new password"
                              className="h-12 rounded-full border-border bg-background px-5 pr-12 focus:border-coke-red focus:ring-coke-red/20"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm(!showConfirm)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showConfirm ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
                            </button>
                          </div>
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
                    {isLoading ? (
                      <CircleNotch size={20} weight="bold" className="animate-spin" />
                    ) : (
                      <>
                        <ArrowRight size={20} weight="bold" className="mr-2" />
                        Update Password
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
