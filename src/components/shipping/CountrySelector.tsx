import { useState, useMemo, forwardRef } from 'react';
import { Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useCountries } from '@/hooks/useCountries';
import { Region } from '@/lib/shipping/countries';

interface CountrySelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CountrySelector = forwardRef<HTMLButtonElement, CountrySelectorProps>(({
  value,
  onValueChange,
  placeholder = 'Select destination country',
  disabled = false,
  className,
}, ref) => {
  const [open, setOpen] = useState(false);
  const { groupedCountries, regionLabels, getCountry } = useCountries();

  const selectedCountry = useMemo(() => {
    if (!value) return null;
    return getCountry(value);
  }, [value, getCountry]);

  const regionOrder: Region[] = ['asia-pacific', 'middle-east', 'europe', 'americas', 'africa'];

  const commitSelection = (countryCode: string, isServed: boolean) => {
    if (!isServed) return;
    onValueChange(countryCode);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span className="text-lg">{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
              {!selectedCountry.isServed && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  Not available
                </Badge>
              )}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[350px] p-0 z-[9999] bg-popover pointer-events-auto" align="start">
        <Command>
          <CommandInput placeholder="Search countries..." />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No country found.</CommandEmpty>

            {regionOrder.map((region) => {
              const countries = groupedCountries[region] || [];
              if (countries.length === 0) return null;

              return (
                <CommandGroup key={region} heading={regionLabels[region]}>
                  {countries.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.code}`}
                      onPointerDown={() => commitSelection(country.code, country.isServed)}
                      onSelect={() => commitSelection(country.code, country.isServed)}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer',
                        !country.isServed && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      {!country.isServed && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      <Check
                        className={cn(
                          'h-4 w-4',
                          value === country.code ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

CountrySelector.displayName = 'CountrySelector';
