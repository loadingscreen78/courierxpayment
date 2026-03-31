"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { MagnifyingGlass, MapPin, CircleNotch } from '@phosphor-icons/react';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';

interface AddressSuggestion {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
    county?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (parts: { address: string; city: string; state: string; zipcode: string }) => void;
  countryCode?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export default function AddressAutocomplete({
  value, onChange, onAddressSelect, countryCode, placeholder, rows = 2, className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch suggestions from Nominatim
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); setShowDropdown(false); return; }
    setIsLoading(true);
    try {
      const cc = countryCode?.toLowerCase() || '';
      const countryParam = cc ? `&countrycodes=${cc}` : '';
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}${countryParam}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data: AddressSuggestion[] = await res.json();
      setSuggestions(data);
      setShowDropdown(data.length > 0);
      setSelectedIdx(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [countryCode]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    const addr = suggestion.address;
    const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
    const suburb = addr.suburb || '';
    const fullAddress = [street, suburb].filter(Boolean).join(', ');

    onChange(fullAddress || suggestion.display_name.split(',').slice(0, 3).join(','));
    setShowDropdown(false);
    setSuggestions([]);

    if (onAddressSelect) {
      onAddressSelect({
        address: fullAddress || suggestion.display_name.split(',').slice(0, 3).join(','),
        city: addr.city || addr.town || addr.village || addr.county || '',
        state: addr.state || '',
        zipcode: addr.postcode || '',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Format suggestion for display
  const formatSuggestion = (s: AddressSuggestion) => {
    const parts = s.display_name.split(',').map(p => p.trim());
    const main = parts.slice(0, 2).join(', ');
    const secondary = parts.slice(2, 4).join(', ');
    return { main, secondary };
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          placeholder={placeholder}
          rows={rows}
          className={`resize-none pr-9 ${className || ''}`}
          autoComplete="off"
        />
        <div className="absolute right-2.5 top-2.5 text-muted-foreground">
          {isLoading ? (
            <CircleNotch className="h-4 w-4 animate-spin" />
          ) : (
            <MagnifyingGlass className="h-4 w-4" weight="duotone" />
          )}
        </div>
      </div>
      <AnimatePresence>
        {showDropdown && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          >
            <div className="px-2.5 py-1.5 border-b border-border/50 flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-muted-foreground" weight="fill" />
              <span className="text-[10px] text-muted-foreground font-medium">Address suggestions</span>
            </div>
            {suggestions.map((s, i) => {
              const { main, secondary } = formatSuggestion(s);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors border-b border-border/30 last:border-0 ${
                    i === selectedIdx ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <MapPin className="h-4 w-4 text-[#FF6B00] shrink-0 mt-0.5" weight="duotone" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{main}</p>
                    {secondary && <p className="text-[11px] text-muted-foreground truncate">{secondary}</p>}
                  </div>
                </button>
              );
            })}
            <div className="px-2.5 py-1 border-t border-border/50 bg-muted/30">
              <p className="text-[9px] text-muted-foreground text-right">Powered by OpenStreetMap</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
