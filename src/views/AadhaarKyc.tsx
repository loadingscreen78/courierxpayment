"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, ArrowRight, Loader2, CheckCircle2, MapPin, RotateCcw, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import logoMain from '@/assets/logo-main.jpeg';

// Verhoeff algorithm for Aadhaar checksum validation
const verhoeffD = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const verhoeffP = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];

function validateVerhoeff(num: string): boolean {
  let c = 0;
  const rev = num.split('').reverse();
  for (let i = 0; i < rev.length; i++) {
    c = verhoeffD[c][verhoeffP[i % 8][parseInt(rev[i], 10)]];
  }
  return c === 0;
}

const formatAadhaar = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 12);
  const p: string[] = [];
  for (let i = 0; i < d.length; i += 4) p.push(d.slice(i, i + 4));
  return p.join(' ');
};

const aadhaarSchema = z.object({
  aadhaarNumber: z.string()
    .regex(/^\d{12}$/, 'Must be exactly 12 digits')
    .refine(validateVerhoeff, 'Invalid Aadhaar number'),
});
const otpSchema = z.object({ otp: z.string().length(6, 'Enter the 6-digit OTP') });

type AadhaarFormValues = z.infer<typeof aadhaarSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;
type KycStep = 'aadhaar' | 'otp' | 'success';

const RESEND_COOLDOWN = 30;

function AadhaarKycInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const { successFeedback, heavyTap } = useHaptics();
  const { playSuccess } = useSoundEffects();

  const [step, setStep] = useState<KycStep>('aadhaar');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [formattedAadhaar, setFormattedAadhaar] = useState('');
  const [refId, setRefId] = useState('');
  const [verifiedAddress, setVerifiedAddress] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const from = searchParams.get('from') || '/';

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (!loading && profile?.aadhaar_verified) router.replace(from);
  }, [profile, loading, router, from]);

  const aadhaarForm = useForm<AadhaarFormValues>({
    resolver: zodResolver(aadhaarSchema),
    defaultValues: { aadhaarNumber: '' },
  });
  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
    setFormattedAadhaar(formatAadhaar(value));
    aadhaarForm.setValue('aadhaarNumber', value, { shouldValidate: value.length === 12 });
  };

  const sendOtp = async (aadhaar: string) => {
    const token = await getToken();
    if (!token) throw new Error('Session expired. Please log in again.');
    const res = await fetch('/api/kyc/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ aadhaarNumber: aadhaar }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
    return data.refId as string;
  };

  const handleSendAadhaarOtp = async (values: AadhaarFormValues) => {
    setIsLoading(true);
    heavyTap();
    try {
      const id = await sendOtp(values.aadhaarNumber);
      setRefId(id);
      setAadhaarNumber(values.aadhaarNumber);
      setStep('otp');
      setResendCooldown(RESEND_COOLDOWN);
      toast({ title: 'OTP Sent', description: 'Check the mobile number linked to your Aadhaar.' });
    } catch (err) {
      toast({ title: 'Failed to send OTP', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    heavyTap();
    try {
      const id = await sendOtp(aadhaarNumber);
      setRefId(id);
      setResendCooldown(RESEND_COOLDOWN);
      toast({ title: 'OTP Resent', description: 'A new OTP has been sent to your Aadhaar-linked mobile.' });
    } catch (err) {
      toast({ title: 'Resend failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAadhaarOtp = async (values: OtpFormValues) => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired. Please log in again.');
      const res = await fetch('/api/kyc/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp: values.otp, refId, aadhaarNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      successFeedback();
      playSuccess();
      setVerifiedName(data.verifiedName || '');
      setVerifiedAddress(data.verifiedAddress || '');
      setStep('success');
      toast({ title: 'KYC Complete', description: 'Your Aadhaar has been verified successfully.' });
    } catch (err) {
      toast({ title: 'Verification Failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logoMain.src} alt="CourierX" className="h-16 w-auto rounded-lg" />
          <h1 className="font-typewriter text-2xl font-bold text-foreground">CourierX</h1>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-typewriter text-xl flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Aadhaar KYC Verification
            </CardTitle>
            <CardDescription>
              {step === 'aadhaar' && 'Enter your 12-digit Aadhaar number to receive an OTP'}
              {step === 'otp' && 'Enter the OTP sent to your Aadhaar-linked mobile number'}
              {step === 'success' && 'Your identity has been verified successfully'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'aadhaar' && (
              <Form {...aadhaarForm}>
                <form onSubmit={aadhaarForm.handleSubmit(handleSendAadhaarOtp)} className="space-y-4">
                  <FormField
                    control={aadhaarForm.control}
                    name="aadhaarNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aadhaar Number</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            maxLength={14}
                            placeholder="XXXX XXXX XXXX"
                            className="input-premium font-mono tracking-widest text-center text-lg"
                            value={formattedAadhaar}
                            onChange={handleAadhaarChange}
                          />
                        </FormControl>
                        <input type="hidden" {...field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Verified via UIDAI through Cashfree. We never store your full Aadhaar number.
                    </AlertDescription>
                  </Alert>
                  <Button type="submit" className="w-full btn-press" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    Send OTP
                  </Button>
                </form>
              </Form>
            )}

            {step === 'otp' && (
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(handleVerifyAadhaarOtp)} className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      OTP sent for Aadhaar:{' '}
                      <span className="font-mono font-semibold">XXXX XXXX {aadhaarNumber.slice(-4)}</span>
                    </p>
                  </div>
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center">
                        <FormLabel className="sr-only">Aadhaar OTP</FormLabel>
                        <FormControl>
                          <InputOTP maxLength={6} {...field}>
                            <InputOTPGroup>
                              {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                            </InputOTPGroup>
                          </InputOTP>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-3">
                    <Button type="submit" className="w-full btn-press" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                      Verify & Complete KYC
                    </Button>
                    <div className="flex items-center justify-between">
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => { setStep('aadhaar'); setFormattedAadhaar(''); aadhaarForm.reset(); }}>
                        Change Aadhaar
                      </Button>
                      <Button type="button" variant="ghost" size="sm"
                        onClick={handleResendOtp} disabled={resendCooldown > 0 || isLoading}>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            )}

            {step === 'success' && (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-accent-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-typewriter font-semibold">Verification Complete</h3>
                  {verifiedName && <p className="text-sm font-medium text-foreground">{verifiedName}</p>}
                  <p className="text-sm text-muted-foreground">Your Aadhaar has been verified successfully.</p>
                </div>
                {verifiedAddress && (
                  <div className="bg-secondary/50 rounded-lg p-4 text-left">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Registered Address (from Aadhaar)</p>
                        <p className="text-sm font-medium">{verifiedAddress}</p>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  This address will be used for customs declarations and sender verification.
                </p>
                <Button onClick={() => router.replace(from)} className="w-full btn-press">
                  Continue to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Powered by Cashfree Verification · Secured by UIDAI
        </p>
      </div>
    </div>
  );
}

export default function AadhaarKyc() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AadhaarKycInner />
    </Suspense>
  );
}
