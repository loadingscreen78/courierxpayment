/**
 * Medicine Name Autocomplete Search
 * Searches 254K+ Indian medicines via API as user types.
 * When a suggestion is selected, auto-fills form, type, and HSN code.
 * Users can also type any name manually.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getHsnCode, type MedicineSuggestion } from '@/lib/medicine/medicineData';

interface MedicineNameSearchProps {
  value: string;
  onChange: (name: string) => void;
  onSelect: (suggestion: MedicineSuggestion & { hsnCode: string }) => void;
}

export function MedicineNameSearch({ value, onChange, onSelect }: MedicineNameSearchProps) {
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchMedicines = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/public/medicine-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data.results || []);
      setShowDropdown((data.results || []).length > 0);
      setHighlightIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchMedicines(val), 300);
  };

  const handleSelect = (suggestion: MedicineSuggestion) => {
    onChange(suggestion.name);
    setShowDropdown(false);
    setSuggestions([]);

    const hsnCode = getHsnCode(suggestion.type, suggestion.form);
    onSelect({ ...suggestion, hsnCode });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative space-y-2">
      <Label className="text-sm font-semibold">Medicine Name *</Label>
      <div className="relative">
        <Input
          placeholder="Type medicine name (e.g., Dolo 650, Augmentin)"
          value={value}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          className="input-premium pr-10"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              type="button"
              onClick={() => handleSelect(s)}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-border/50 last:border-0',
                i === highlightIndex ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>{s.manufacturer}</span>
                {s.composition && (
                  <>
                    <span className="text-border">•</span>
                    <span className="truncate">{s.composition}</span>
                  </>
                )}
              </div>
            </button>
          ))}
          <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
            Can't find your medicine? Just type the name manually.
          </div>
        </div>
      )}
    </div>
  );
}
