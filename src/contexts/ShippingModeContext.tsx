'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';

export type ShippingMode = 'international' | 'domestic';

const STORAGE_KEY = 'courierx_shipping_mode';

interface ShippingModeContextType {
  mode: ShippingMode;
  isSwitching: boolean;
  setMode: (mode: ShippingMode) => void;
  toggleMode: () => void;
}

const ShippingModeContext = createContext<ShippingModeContextType | undefined>(undefined);

export const ShippingModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ShippingMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'domestic' || saved === 'international') return saved;
    }
    return 'international';
  });
  const [isSwitching, setIsSwitching] = useState(false);
  const router = useRouter();

  const setMode = useCallback(async (newMode: ShippingMode) => {
    if (newMode === mode) return;
    setIsSwitching(true);
    
    setTimeout(async () => {
      setModeState(newMode);
      localStorage.setItem(STORAGE_KEY, newMode);
      
      // Check if user has any shipments
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: shipments, error } = await supabase
          .from('shipments')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        const hasShipments = shipments && shipments.length > 0;
        
        // Navigate based on mode and shipment history
        if (hasShipments) {
          // User has shipments - always go to dashboard
          router.push('/dashboard');
        } else {
          // New user with no shipments
          if (newMode === 'international') {
            router.push('/dashboard');
          } else {
            router.push('/new-shipment');
          }
        }
      } else {
        // Not logged in - default behavior
        if (newMode === 'international') {
          router.push('/dashboard');
        } else {
          router.push('/new-shipment');
        }
      }
      
      setTimeout(() => setIsSwitching(false), 600);
    }, 800);
  }, [mode, router]);

  const toggleMode = useCallback(() => {
    setMode(mode === 'international' ? 'domestic' : 'international');
  }, [mode, setMode]);

  return (
    <ShippingModeContext.Provider value={{ mode, isSwitching, setMode, toggleMode }}>
      {children}
    </ShippingModeContext.Provider>
  );
};

export const useShippingMode = () => {
  const ctx = useContext(ShippingModeContext);
  if (!ctx) throw new Error('useShippingMode must be used within ShippingModeProvider');
  return ctx;
};
