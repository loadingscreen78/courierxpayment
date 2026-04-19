import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  account_number: string | null;
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
  signInWithGoogle: (idToken: string, nonce?: string) => Promise<{ error: Error | null }>;
  sendWhatsAppOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyWhatsAppOtp: (phone: string, code: string) => Promise<{ error: Error | null }>;
  sendPhoneOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyPhoneOtp: (phone: string, code: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
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

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user]);

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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        return { error: error as Error | null };
      }

      // Check account status after successful sign in
      if (data.session) {
        const statusRes = await fetch('/api/auth/check-account-status', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.session.access_token}`,
          },
        });

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (!statusData.allowed) {
            // Sign out the user if account is not active
            await supabase.auth.signOut();
            return { error: new Error(statusData.message || 'Account not active') };
          }
        }
      }

      return { error: null };
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

  const signInWithGoogle = useCallback(async (idToken: string, nonce?: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
        ...(nonce ? { nonce } : {}),
      });
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

      // The API now returns real session tokens — set them directly
      if (data.session?.access_token && data.session?.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (error) return { error: error as Error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  /** Send Phone OTP via FAST2SMS */
  const sendPhoneOtp = useCallback(async (phone: string): Promise<{ error: Error | null }> => {
    try {
      const res = await fetch('/api/auth/phone-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { error: new Error(data.error || 'Failed to send OTP') };
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  /** Verify Phone OTP via FAST2SMS, then sign into Supabase */
  const verifyPhoneOtp = useCallback(async (phone: string, code: string): Promise<{ error: Error | null }> => {
    try {
      const res = await fetch('/api/auth/phone-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { error: new Error(data.error || 'Phone OTP verification failed') };
      }

      if (data.session?.access_token && data.session?.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (error) return { error: error as Error };
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
    // Mark explicit logout so Auth page ignores the `from` redirect param
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('explicit_logout', '1');
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
    sendPhoneOtp,
    verifyPhoneOtp,
    signOut,
    updateProfile,
    refreshProfile,
    completeAadhaarKyc,
  }), [user, session, profile, loading, signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp, signInWithGoogle, sendWhatsAppOtp, verifyWhatsAppOtp, sendPhoneOtp, verifyPhoneOtp, signOut, updateProfile, refreshProfile, completeAadhaarKyc]);

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
