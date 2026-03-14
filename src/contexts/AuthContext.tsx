import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  aadhaar_verified: boolean;
  aadhaar_address: string | null;
  kyc_completed_at: string | null;
  preferred_otp_method: 'email' | 'whatsapp';
  created_at?: string;
  avatar_url?: string | null;
  preferred_language?: string;
  preferred_currency?: string;
  notifications_email?: boolean;
  notifications_whatsapp?: boolean;
  notifications_promotional?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (idToken: string) => Promise<{ error: Error | null }>;
  sendWhatsAppOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyWhatsAppOtp: (phone: string, code: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  completeAadhaarKyc: (aadhaarNumber: string, otp: string) => Promise<{ error: Error | null; address?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!error && data) {
      setProfile(data as Profile);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        if (error.message.includes('duplicate key') ||
            error.message.includes('already registered') ||
            error.message.includes('users_email_partial_key')) {
          return { error: new Error('This email is already registered. Please sign in instead.') };
        }
        return { error: error as Error };
      }

      return { error: nullrror cases with user-friendly messages
      if (error) {
        // Check for duplicate email error
        if (error.message.includes('duplicate key') || 
            error.message.includes('already registered') ||
            error.message.includes('users_email_partial_key')) {
          return { 
            error: new Error('This email is already registered. Please sign in instead or use a different email.') 
          };
        }
        
        // Check for generic database errors
        if (error.message.includes('Database error')) {
          return { 
            error: new Error('Unable to create account. Please try again or contact support if the issue persists.') 
          };
        }
        
        return { error: error as Error };
      }
      
      // Auto-complete KYC for new users (MOCK MODE)
      if (data.user) {
        console.log('[Auth] New user created, auto-completing KYC (mock mode)...');
        
        // Set aadhaar_verified to true by default for mock mode
        await supabase
          .from('profiles')
          .update({
            aadhaar_verified: true,
            aadhaar_address: '123, Mock Street, Sample City, Sample State - 123456',
            kyc_completed_at: new Date().toISOString(),
          })
          .eq('user_id', data.user.id);
      }
      
      return { error: null };
    } catch (err) {
      const error = err as Error;
      // Handle caught exceptions with user-friendly messages
      if (error.message.includes('duplicate key') || 
          error.message.includes('already registered') ||
          error.message.includes('users_email_partial_key')) {
        return { 
          error: new Error('This email is already registered. Please sign in instead or use a different email.') 
        };
      }
      return { error };
    }
  }, []);

  const signInWithOtp = useCallback(async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({ type: 'sms', phone, token });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signInWithGoogle = useCallback(async (idToken: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  /** Send WhatsApp OTP via Twilio Verify */
  const sendWhatsAppOtp = useCallback(async (phone: string): Promise<{ error: Error | null }> => {
    try {
      const res = await fetch('/api/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { error: new Error(data.error || 'Failed to send WhatsApp OTP') };
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  /** Verify WhatsApp OTP via Twilio Verify, then sign into Supabase */
  const verifyWhatsAppOtp = useCallback(async (phone: string, code: string): Promise<{ error: Error | null }> => {
    try {
      const res = await fetch('/api/auth/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { error: new Error(data.error || 'WhatsApp OTP verification failed') };
      }

      if (data.actionLink) {
        const url = new URL(data.actionLink);
        const token_hash = url.searchParams.get('token') || url.hash?.replace('#', '');
        if (token_hash) {
          const { error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash });
          if (error) {
            const { error: phoneErr } = await supabase.auth.signInWithOtp({ phone });
            if (phoneErr) return { error: phoneErr as Error };
          }
        }
      } else {
        const { error: otpErr } = await supabase.auth.signInWithOtp({ phone });
        if (otpErr) return { error: otpErr as Error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        google.accounts.id.disableAutoSelect();
      }
    } catch {
      // GSI not loaded, safe to ignore
    }
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
    return { error: error as Error | null };
  }, [user]);

  const completeAadhaarKyc = useCallback(async (_aadhaarNumber: string, _otp: string) => {
    try {
      console.log('[KYC Mock] Auto-completing KYC verification...');
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockAddress = '123, Mock Street, Sample City, Sample State - 123456';
      if (user) {
        await supabase.from('profiles').update({
          aadhaar_verified: true,
          aadhaar_address: mockAddress,
          kyc_completed_at: new Date().toISOString(),
        }).eq('user_id', user.id);
        setProfile(prev => prev ? {
          ...prev,
          aadhaar_verified: true,
          aadhaar_address: mockAddress,
          kyc_completed_at: new Date().toISOString(),
        } : null);
      }
      console.log('[KYC Mock] KYC verification completed successfully');
      return { error: null, address: mockAddress };
    } catch (err) {
      console.error('[KYC Mock] Error:', err);
      return { error: err as Error };
    }
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithOtp,
    verifyOtp,
    signInWithGoogle,
    sendWhatsAppOtp,
    verifyWhatsAppOtp,
    signOut,
    updateProfile,
    completeAadhaarKyc,
  }), [user, session, profile, loading, signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp, signInWithGoogle, sendWhatsAppOtp, verifyWhatsAppOtp, signOut, updateProfile, completeAadhaarKyc]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
