"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, ArrowRight, Loader2, CheckCircle2, MapPin, ExternalLink, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
const logoMain = { src: '/lovable-uploads/logo.png' };

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

type AadhaarFormValues = z.infer<typeof aadhaarSchema>;
type KycStep = 'aadhaar' | 'redirect' | 'verifying' | 'success';

function AadhaarKycInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<KycStep>('aadhaar');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [formattedAadhaar, setFormattedAadhaar] = useState('');
  const [digilockerUrl, setDigilockerUrl] = useState('');
  const [referenceId, setReferenceId] = useState<number | null>(null);
  const [verificationId, setVerificationId] = useState('');
  const [verifiedAddress, setVerifiedAddress] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [maskedAadhaar, setMaskedAadhaar] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = searchParams.get('from') || '/dashboard';

  // Handle DigiLocker callback — params injected by /auth/kyc/callback
  useEffect(() => {
    const cbVerificationId = searchParams.get('verification_id');
    const cbReferenceId = searchParams.get('reference_id');
    if (cbVerificationId || cbReferenceId) {
      if (cbVerificationId) setVerificationId(cbVerificationId);
      if (cbReferenceId) setReferenceId(Number(cbReferenceId));
      setStep('verifying');
    }
  }, [searchParams]);

  // Auto-complete verification after DigiLocker redirect
  useEffect(() => {
    if (step === 'verifying' && (referenceId || verificationId)) {
      completeVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, referenceId, verificationId]);

  useEffect(() => {
    if (!loading && profile?.aadhaar_verified) router.replace(from);
  }, [profile, loading, router, from]);

  const aadhaarForm = useForm<AadhaarFormValues>({
    resolver: zodResolver(aadhaarSchema),
    defaultValues: { aadhaarNumber: '' },
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

  const handleInitiateKyc = async (values: AadhaarFormValues) => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired. Please log in again.');
      const res = await fetch('/api/kyc/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aadhaarNumber: values.aadhaarNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate KYC');
      setAadhaarNumber(values.aadhaarNumber);
      setDigilockerUrl(data.digilockerUrl);
      setVerificationId(data.verificationId);
      setReferenceId(data.referenceId ?? null);
      setStep('redirect');
    } catch (err) {
      toast({
        title: 'KYC initiation failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeVerification = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired. Please log in again.');
      const res = await fetch('/api/kyc/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referenceId, verificationId, aadhaarNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setVerifiedName(data.verifiedName || '');
      setVerifiedAddress(data.verifiedAddress || '');
      setMaskedAadhaar(data.maskedAadhaar || '');
      setStep('success');
      toast({ title: 'KYC Complete', description: 'Your Aadhaar has been verified successfully.' });
    } catch (err) {
      toast({
        title: 'Verification Failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
      setStep('aadhaar');
      setFormattedAadhaar('');
      aadhaarForm.reset();
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
              {step === 'aadhaar' && 'Enter your 12-digit Aadhaar number to begin'}
              {step === 'redirect' && 'Complete verification on DigiLocker'}
              {step === 'verifying' && 'Completing your verification...'}
              {step === 'success' && 'Your identity has been verified successfully'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'aadhaar' && (
              <Form {...aadhaarForm}>
                <form onSubmit={aadhaarForm.handleSubmit(handleInitiateKyc)} className="space-y-4">
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
                      Verified via DigiLocker (UIDAI). We never store your full Aadhaar number.
                    </AlertDescription>
                  </Alert>
                  <Button type="submit" className="w-full btn-press" disabled={isLoading}>
                    {isLoading
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : <ArrowRight className="h-4 w-4 mr-2" />}
                    Continue with DigiLocker
                  </Button>
                </form>
              </Form>
            )}

            {step === 'redirect' && (
              <div className="space-y-6 text-center">
                <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                  <p>You&apos;ll be redirected to DigiLocker to log in with your Aadhaar-linked mobile number and grant consent.</p>
                  <p className="text-xs">The link expires in 10 minutes.</p>
                </div>
                <Button
                  className="w-full btn-press"
                  onClick={() => window.location.href = digilockerUrl}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open DigiLocker
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => { setStep('aadhaar'); setFormattedAadhaar(''); aadhaarForm.reset(); }}
                >
                  Change Aadhaar number
                </Button>
              </div>
            )}

            {step === 'verifying' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Fetching your verified Aadhaar data...</p>
              </div>
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
                  {maskedAadhaar && <p className="text-xs text-muted-foreground font-mono">{maskedAadhaar}</p>}
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
                <Button onClick={() => router.replace(from)} className="w-full btn-press">
                  Continue to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Powered by Cashfree DigiLocker · Secured by UIDAI
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
