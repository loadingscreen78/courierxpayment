"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CircleNotch, User, Sparkle, Shield, Package, Clock } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffects } from '@/hooks/useSoundEffects';
const logoMain = { src: '/lovable-uploads/logo.png' };

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  preferredOtpMethod: z.enum(['email', 'whatsapp']),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type OnboardingStep = 'welcome' | 'profile' | 'complete';

const Onboarding = () => {
  const router = useRouter();
  const { user, profile, updateProfile, loading } = useAuth();
  const { toast } = useToast();
  const { heavyTap, successFeedback } = useHaptics();
  const { playSuccess } = useSoundEffects();
  
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name || '',
      preferredOtpMethod: profile?.preferred_otp_method || 'email',
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  // Skip onboarding if profile is already complete
  useEffect(() => {
    if (!loading && profile?.full_name) {
      // Profile already complete, go directly to dashboard
      router.replace('/');
    }
  }, [profile, loading, router]);

  const handleNext = () => {
    heavyTap();
    setStep('profile');
  };

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    setIsLoading(true);
    
    const { error } = await updateProfile({
      full_name: values.fullName,
      preferred_otp_method: values.preferredOtpMethod as 'email' | 'whatsapp',
    });
    
    setIsLoading(false);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    
    successFeedback();
    playSuccess();
    setStep('complete');
    
    // Redirect to dashboard
    setTimeout(() => {
      router.replace('/dashboard');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <CircleNotch size={32} weight="bold" className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`h-2 w-8 rounded-full transition-colors ${step === 'welcome' ? 'bg-destructive' : 'bg-accent'}`} />
          <div className={`h-2 w-8 rounded-full transition-colors ${step === 'profile' ? 'bg-destructive' : step === 'complete' ? 'bg-accent' : 'bg-muted'}`} />
          <div className={`h-2 w-8 rounded-full transition-colors ${step === 'complete' ? 'bg-destructive' : 'bg-muted'}`} />
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img src={logoMain.src} alt="CourierX" className="h-16 w-auto rounded-lg" />
          <h1 className="font-typewriter text-2xl font-bold text-foreground">CourierX</h1>
        </div>

        {step === 'welcome' && (
          <Card className="border-border/50 shadow-lg animate-fade-in">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                <Sparkle size={32} weight="bold" className="text-accent-foreground" />
              </div>
              <CardTitle className="font-typewriter text-xl">Welcome to CourierX!</CardTitle>
              <CardDescription>
                Your trusted partner for international personal shipments from India
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <Package size={20} weight="bold" className="text-foreground" />
                  <span className="text-sm">Ship medicines, documents & gifts worldwide</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <Shield size={20} weight="bold" className="text-foreground" />
                  <span className="text-sm">CSB IV compliant with customs support</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <Clock size={20} weight="bold" className="text-foreground" />
                  <span className="text-sm">Fast delivery with real-time tracking</span>
                </div>
              </div>
              
              <Button 
                onClick={handleNext}
                className="w-full btn-press"
              >
                Get Started
                <ArrowRight size={16} weight="bold" className="ml-2" />
              </Button>
              
              <p className="text-center text-xs text-muted-foreground">
                Quick setup: Complete your profile to get started
              </p>
            </CardContent>
          </Card>
        )}

        {step === 'profile' && (
          <Card className="border-border/50 shadow-lg animate-fade-in">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                <User size={32} weight="bold" className="text-accent-foreground" />
              </div>
              <CardTitle className="font-typewriter text-xl">Complete Your Profile</CardTitle>
              <CardDescription>
                Tell us a bit about yourself
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleProfileSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your full name"
                            className="input-premium"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="preferredOtpMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred OTP Method</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-2 gap-4"
                          >
                            <div>
                              <RadioGroupItem
                                value="email"
                                id="email"
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor="email"
                                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive [&:has([data-state=checked])]:border-destructive cursor-pointer"
                              >
                                <span className="text-sm font-medium">Email</span>
                              </Label>
                            </div>
                            <div>
                              <RadioGroupItem
                                value="whatsapp"
                                id="whatsapp"
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor="whatsapp"
                                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive [&:has([data-state=checked])]:border-destructive cursor-pointer"
                              >
                                <span className="text-sm font-medium">WhatsApp</span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full btn-press" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <CircleNotch size={16} weight="bold" className="animate-spin mr-2" />
                    ) : (
                      <ArrowRight size={16} weight="bold" className="mr-2" />
                    )}
                    Continue
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {step === 'complete' && (
          <Card className="border-border/50 shadow-lg animate-fade-in">
            <CardContent className="py-8 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-accent flex items-center justify-center animate-scale-in">
                <Shield size={32} weight="bold" className="text-accent-foreground" />
              </div>
              <h3 className="font-typewriter text-xl font-semibold mb-2">Profile Saved!</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Redirecting to dashboard...
              </p>
              <CircleNotch size={24} weight="bold" className="animate-spin mx-auto text-destructive" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;




