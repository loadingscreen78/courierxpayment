'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
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

  // Keep a ref so callbacks always read the latest pathname without stale closures
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  // Keep a ref for mode too
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const setMode = useCallback((newMode: ShippingMode) => {
    // Always read from refs — never from stale closure values
    if (newMode === modeRef.current) return;

    setIsSwitching(true);
    setModeState(newMode);
    modeRef.current = newMode;
    localStorage.setItem(STORAGE_KEY, newMode);

    const currentPath = pathnameRef.current ?? '';
    const isDomesticPage = DOMESTIC_PAGES.some(p => currentPath.startsWith(p));
    const isIntlPage = INTERNATIONAL_PAGES.some(p => currentPath.startsWith(p));

    if (newMode === 'domestic' && isIntlPage) {
      router.push('/new-shipment');
    } else if (newMode === 'international' && isDomesticPage) {
      router.push('/dashboard');
    }
    // Neutral page — stay put, just update mode

    setTimeout(() => setIsSwitching(false), 400);
  }, [router]); // router is stable — no stale closure risk

  const toggleMode = useCallback(() => {
    setMode(modeRef.current === 'international' ? 'domestic' : 'international');
  }, [setMode]);

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
