import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchManufacturers, type Manufacturer } from '@/data/manufacturerData';

interface ManufacturerSearchProps {
    value: string;
    onSelect: (name: string, address: string) => void;
    className?: string;
}

export const ManufacturerSearch = ({ value, onSelect, className }: ManufacturerSearchProps) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<Manufacturer[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [selected, setSelected] = useState<Manufacturer | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync external value changes
    useEffect(() => {
        setQuery(value);
        // If value matches a known manufacturer, mark as selected
        if (value) {
            const match = searchManufacturers(value, 1);
            if (match.length > 0 && match[0].name === value) {
                setSelected(match[0]);
            }
        }
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        setSelected(null);
        setActiveIndex(-1);

        if (val.trim().length > 0) {
            const matches = searchManufacturers(val);
            setResults(matches);
            setIsOpen(matches.length > 0);
        } else {
            setResults([]);
            setIsOpen(false);
        }

        // Still propagate the typed value as name (no address auto-fill until selection)
        onSelect(val, '');
    }, [onSelect]);

    const handleSelect = useCallback((manufacturer: Manufacturer) => {
        setQuery(manufacturer.name);
        setSelected(manufacturer);
        setIsOpen(false);
        setActiveIndex(-1);
        onSelect(manufacturer.name, manufacturer.address);
    }, [onSelect]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < results.length) {
                    handleSelect(results[activeIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setActiveIndex(-1);
                break;
        }
    }, [isOpen, results, activeIndex, handleSelect]);

    const handleFocus = useCallback(() => {
        if (query.trim().length > 0 && !selected) {
            const matches = searchManufacturers(query);
            setResults(matches);
            setIsOpen(matches.length > 0);
        }
    }, [query, selected]);

    return (
        <div ref={wrapperRef} className={cn('relative', className)}>
            <Label className="text-xs text-muted-foreground">Manufacturer Name</Label>
            <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    ref={inputRef}
                    placeholder="Search manufacturer (e.g., Sun Pharma, Cipla)..."
                    value={query}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        'pl-9 input-premium transition-colors',
                        selected && 'border-emerald-500/50 pr-8'
                    )}
                    autoComplete="on"
                />
                {selected && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                )}
            </div>

            {/* Selected badge */}
            {selected && (
                <Badge
                    variant="outline"
                    className="mt-1.5 text-[10px] px-1.5 py-0.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-normal gap-1"
                >
                    <Building2 className="h-3 w-3" />
                    Verified manufacturer — address auto-filled
                </Badge>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-xl overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-150">
                    <div className="max-h-[280px] overflow-y-auto">
                        {results.map((m, i) => (
                            <button
                                key={m.name}
                                type="button"
                                className={cn(
                                    'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors',
                                    i === activeIndex
                                        ? 'bg-accent text-accent-foreground'
                                        : 'hover:bg-accent/50'
                                )}
                                onMouseEnter={() => setActiveIndex(i)}
                                onClick={() => handleSelect(m)}
                            >
                                <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{m.name}</p>
                                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        {m.address}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground bg-muted/30">
                        {results.length} result{results.length !== 1 ? 's' : ''} · Type to search or enter custom name
                    </div>
                </div>
            )}
        </div>
    );
};
