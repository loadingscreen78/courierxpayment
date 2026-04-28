"use client";

import { useState, useEffect, useRef } from 'react';
import { CircleNotch, CaretDown, Info } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { STATES, DISTRICTS_BY_STATE } from '@/lib/indian-districts';
import { cn } from '@/lib/utils';

interface PincodeResult {
  pincode: string;
  offices: string[];
  district: string;
  state: string;
}

interface PincodeFinderProps {
  onSelect: (pin: string, district?: string, state?: string) => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

export function PincodeFinder({ onSelect, onClose, align = 'right' }: PincodeFinderProps) {
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [pincodes, setPincodes] = useState<PincodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click — desktop only, ignore on mobile to avoid
  // closing when user taps a <select> option (touch fires mousedown on document)
  useEffect(() => {
    const isMobile = () => window.matchMedia('(max-width: 639px)').matches;
    const handler = (e: MouseEvent) => {
      if (isMobile()) return; // mobile uses backdrop button instead
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const districts = selectedState ? (DISTRICTS_BY_STATE[selectedState] || []) : [];

  useEffect(() => {
    if (!selectedState || !selectedDistrict) { setPincodes([]); return; }
    setLoading(true);
    fetch(`/api/public/pincode-by-district?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(selectedDistrict)}`)
      .then(r => r.json())
      .then(data => { if (data.success && data.pincodes?.length) setPincodes(data.pincodes); else setPincodes([]); })
      .catch(() => setPincodes([]))
      .finally(() => setLoading(false));
  }, [selectedState, selectedDistrict]);

  const filtered = filterText
    ? pincodes.filter(p => p.pincode.includes(filterText) || p.offices.some(o => o.toLowerCase().includes(filterText.toLowerCase())))
    : pincodes;

  return (
    <>
      {/* Mobile backdrop — only close if tap is strictly on the backdrop, not bubbled from sheet */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40 sm:hidden"
        onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        onTouchEnd={e => { if (e.target === e.currentTarget) onClose(); }}
      />

      <div
        ref={ref}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        className={cn(
          // Mobile: fixed bottom sheet
          'fixed bottom-0 left-0 right-0 z-[9999] rounded-t-2xl border border-border/60 bg-card shadow-2xl overflow-hidden sm:hidden',
          // Desktop: absolute dropdown
          'sm:absolute sm:bottom-auto sm:left-auto sm:top-full sm:mt-1.5 sm:w-80 sm:rounded-2xl sm:block',
          align === 'right' ? 'sm:right-0' : 'sm:left-0'
        )}
      >
        <div className="px-4 pt-4 pb-3 border-b border-border/40 bg-muted/30">
          {/* Mobile drag handle */}
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Find Pincode</p>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <div className="relative mb-2">
            <select
              value={selectedState}
              onChange={e => { setSelectedState(e.target.value); setSelectedDistrict(''); setPincodes([]); }}
              className="w-full h-10 px-3 pr-8 rounded-lg border border-border bg-background text-sm appearance-none cursor-pointer focus:outline-none focus:border-coke-red"
            >
              <option value="">Select State</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <CaretDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
              className="w-full h-10 px-3 pr-8 rounded-lg border border-border bg-background text-sm appearance-none cursor-pointer focus:outline-none focus:border-coke-red disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select District</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <CaretDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div className="max-h-64 sm:max-h-56 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <CircleNotch className="h-4 w-4 animate-spin" /> Loading pincodes...
            </div>
          )}
          {!loading && selectedDistrict && pincodes.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 sticky top-0 bg-card z-10">
                <Input
                  type="text"
                  placeholder="Filter by pincode or area..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
                <p className="text-[11px] text-muted-foreground mt-1">{filtered.length} pincode{filtered.length !== 1 ? 's' : ''} found</p>
              </div>
              {filtered.map(p => (
                <button
                  key={p.pincode}
                  onClick={() => onSelect(p.pincode, selectedDistrict, selectedState)}
                  className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0"
                >
                  <span className="text-sm font-semibold text-coke-red">{p.pincode}</span>
                  <span className="text-xs text-muted-foreground ml-2 truncate">{p.offices.slice(0, 3).join(', ')}{p.offices.length > 3 ? ` +${p.offices.length - 3} more` : ''}</span>
                </button>
              ))}
            </>
          )}
          {!loading && selectedDistrict && pincodes.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">No pincodes found. Try a different district or enter directly.</p>
            </div>
          )}
          {!loading && !selectedDistrict && (
            <div className="px-4 py-6 text-center">
              <Info className="h-5 w-5 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Select a state and district to see all pincodes.</p>
            </div>
          )}
        </div>
        {/* Safe area for mobile home bar */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} className="sm:hidden" />
      </div>
    </>
  );
}
