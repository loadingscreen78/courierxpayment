"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CircleNotch, Eye, EyeSlash, Gear, ArrowLeft } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useSeo } from '@/hooks/useSeo';
import { supabase } from '@/integrations/supabase/client';
import { cx } from '@/lib/cookies';
import { motion } from 'framer-motion';
const logoMain = { src: '/lovable-uploads/logo.png' };

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

const AdminAuth = () => {
  const router = useRouter();
  const { signInWithEmail } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useSeo({
    title: 'Admin Login | CourierX',
    description: 'Admin portal for CourierX operations management.',
    canonicalPath: '/admin/login',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);

    const { error } = await signInWithEmail(values.email, values.password);
    if (error) {
      setIsLoading(false);
      toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
      return;
    }

    // Get session immediately after sign in
    const { data: sessionData } = await supabase.auth.getSession();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser || !sessionData.session) {
      setIsLoading(false);
      toast({ title: 'Error', description: 'Could not retrieve session.', variant: 'destructive' });
      return;
    }

    // Set cookies before redirect
    cx.setAuth(sessionData.session.access_token, sessionData.session.refresh_token);
    cx.setUserId(currentUser.id);

    // Check admin access via server-side API (bypasses RLS)
    const res = await fetch('/api/admin/check-access', {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });
    const data = res.ok ? await res.json() : { hasAccess: false };

    if (data.hasAccess) {
      // Use router.push — no full page reload, preserves state
      router.push('/admin');
    } else {
      toast({ title: 'Access Denied', description: 'You do not have admin privileges.', variant: 'destructive' });
      await supabase.auth.signOut();
      cx.clearAuth();
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-charcoal relative overflow-hidden flex-col justify-center items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e1e1e] via-charcoal to-[#1a1a1a]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 flex flex-col items-center text-center px-10"
        >
          <div className="w-20 h-20 bg-coke-red/10 rounded-2xl flex items-center justify-center mb-6">
            <Gear size={48} weight="bold" className="text-coke-red" />
          </div>
          <h1 className="text-4xl font-bold text-paper-white font-typewriter mb-4">Admin Portal</h1>
          <p className="text-paper-white/40 text-lg font-typewriter max-w-md">
            Manage operations, monitor shipments, and oversee platform activities.
          </p>
        </motion.div>
      </div>

      {/* Right form */}
      <div className="w-full lg:w-1/2 bg-background flex flex-col min-h-screen">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <a href="/" className="flex items-center gap-2">
            <img src={logoMain.src} alt="CourierX" className="h-8 w-auto rounded-lg" />
          </a>
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft size={16} weight="bold" /> Home
          </a>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-sm space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-typewriter">Admin Sign In</h2>
              <p className="text-muted-foreground mt-1">Authorized personnel only</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Admin email"
                          className="h-12 rounded-full border-border bg-background px-5 focus:border-coke-red focus:ring-coke-red/20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-coke-red" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-full bg-coke-red hover:bg-coke-red/90 text-white font-semibold shadow-lg shadow-coke-red/25 font-typewriter"
                >
                  {isLoading
                    ? <CircleNotch size={20} weight="bold" className="animate-spin" />
                    : <><ArrowRight size={20} weight="bold" className="mr-2" />Sign In</>
                  }
                </Button>
              </form>
            </Form>
          </div>
        </div>

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
