// Cashfree JS SDK dynamic script loader

const CASHFREE_SCRIPT_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';

let loadPromise: Promise<void> | null = null;

export function isCashfreeLoaded(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Cashfree;
}

export function loadCashfreeScript(): Promise<void> {
  if (isCashfreeLoaded()) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CASHFREE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Cashfree SDK'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
