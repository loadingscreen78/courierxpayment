'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { countries, Country } from '@/lib/shipping/countries';

// Get unique phone codes with country info
const phoneCodeCountries = countries
  .filter(c => c.isServed)
  .reduce((acc, country) => {
    if (!acc.find(c => c.phoneCode === country.phoneCode)) {
      acc.push(country);
    }
    return acc;
  }, [] as Country[])
  .sort((a, b) => a.name.localeCompare(b.name));

// Common countries to show at top
const commonCodes = ['+91', '+971', '+1', '+44', '+65', '+61'];
const commonCountries = commonCodes
  .map(code => phoneCodeCountries.find(c => c.phoneCode === code))
  .filter(Boolean) as Country[];

// Parse phone value into code and number
function parsePhoneValue(value: string, defaultCode: string): { code: string; number: string } {
  if (!value) return { code: defaultCode, number: '' };
  
  const matchedCountry = phoneCodeCountries.find(c => value.startsWith(c.phoneCode));
  if (matchedCountry) {
    return {
      code: matchedCountry.phoneCode,
      number: value.slice(matchedCountry.phoneCode.length).trim()
    };
  }
  
  if (value.startsWith('+')) {
    const spaceIndex = value.indexOf(' ');
    if (spaceIndex > 0) {
      return {
        code: value.slice(0, spaceIndex),
        number: value.slice(spaceIndex + 1)
      };
    }
  }
  
  return { code: defaultCode, number: value };
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  defaultCountryCode?: string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = 'Phone number',
  className,
  disabled,
  defaultCountryCode = '+91',
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false);
  
  // Parse the value prop directly - no internal state for phone number
  const { code: selectedCode, number: phoneNumber } = parsePhoneValue(value, defaultCountryCode);

  const handleCodeSelect = (code: string) => {
    setOpen(false);
    if (phoneNumber) {
      onChange(`${code} ${phoneNumber}`);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/^\s+/, '');
    if (newNumber) {
      onChange(`${selectedCode} ${newNumber}`);
    } else {
      onChange('');
    }
  };

  const selectedCountry = phoneCodeCountries.find(c => c.phoneCode === selectedCode);

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-[130px] justify-between px-3 font-normal"
          >
            <span className="flex items-center gap-2 truncate">
              {selectedCountry && (
                <>
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.phoneCode}</span>
                </>
              )}
              {!selectedCountry && selectedCode}
            </span>
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              {commonCountries.length > 0 && (
                <CommandGroup heading="Common">
                  {commonCountries.map((country) => (
                    <CommandItem
                      key={`common-${country.code}`}
                      value={`${country.name} ${country.phoneCode}`}
                      onSelect={() => handleCodeSelect(country.phoneCode)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedCode === country.phoneCode ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="mr-2">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-muted-foreground">{country.phoneCode}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading="All Countries">
                {phoneCodeCountries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.phoneCode}`}
                    onSelect={() => handleCodeSelect(country.phoneCode)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedCode === country.phoneCode ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="mr-2">{country.flag}</span>
                    <span className="flex-1">{country.name}</span>
                    <span className="text-muted-foreground">{country.phoneCode}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="relative flex-1">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="tel"
          inputMode="tel"
          placeholder={placeholder}
          value={phoneNumber}
          onChange={handleNumberChange}
          disabled={disabled}
          className="pl-10"
        />
      </div>
    </div>
  );
}

export default PhoneInput;
