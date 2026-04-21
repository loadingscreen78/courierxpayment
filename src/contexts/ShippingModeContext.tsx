'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type ShippingMode = 'international' | 'domestic';

const STORAGE_KEY = 'courierx_shipping_mode';

interface ShippingModeContextType {
  mode: ShippingMode;
  isSwitching: boolean;
  setMode: (mode: ShippingMode) => void;
  toggleMode: () => void;
}

const ShippingModeContext = createContext<ShippingModeContextType | undefined>(undefined);

// Pages that are mode-specific and should redirect when mode changes
const DOMESTIC_PAGES = ['/new-shipment', '/book/domestic'];
const INTERNATIONAL_PAGES = ['/dashboard', '/book/medicine', '/book/document', '/book/gift', '/history', '/drafts'];

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
  const pathname = usePathname();

  const setMode = useCallback((newMode: ShippingMode) => {
    if (newMode === mode) return;

    setIsSwitching(true);
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);

    // Only navigate if the current page is mode-specific
    const isDomesticPage = DOMESTIC_PAGES.some(p => pathname?.startsWith(p));
    const isIntlPage = INTERNATIONAL_PAGES.some(p => pathname?.startsWith(p));

    if (newMode === 'domestic' && isIntlPage) {
      router.push('/new-shipment');
    } else if (newMode === 'international' && isDomesticPage) {
      router.push('/dashboard');
    }
    // If on a neutral page (profile, settings, etc.) — stay put, just update the mode

    setTimeout(() => setIsSwitching(false), 400);
  }, [mode, router, pathname]);

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
