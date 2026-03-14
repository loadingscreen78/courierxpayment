import { memo, useState, useCallback, useMemo } from 'react';
import { DocumentBookingData } from '@/views/DocumentBooking';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DebouncedInput } from '@/components/ui/debounced-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, User, Phone, Home, Globe, Loader2, CheckCircle2, Check, ChevronsUpDown } from 'lucide-react';
import { lookupPincode, INDIAN_STATES, CITIES_BY_STATE } from '@/lib/pincode-lookup';
import { COUNTRY_DATA, getCountryByCode, validatePhone } from '@/lib/country-data';
import { lookupZipcode, isZipLookupSupported } from '@/lib/zipcode-lookup';
import { cn } from '@/lib/utils';
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
import { Button } from '@/components/ui/button';

interface DocumentAddressStepProps {
  data: DocumentBookingData;
  onUpdate: (updates: Partial<DocumentBookingData>) => void;
}

const COUNTRIES = COUNTRY_DATA.map(c => ({ code: c.code, name: c.name }));

const DocumentAddressStepComponent = ({ data, onUpdate }: DocumentAddressStepProps) => {
  const [localPickupAddress, setLocalPickupAddress] = useState(data.pickupAddress);
  const [localConsigneeAddress, setLocalConsigneeAddress] = useState(data.consigneeAddress);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [zipcodeLoading, setZipcodeLoading] = useState(false);
  const [zipcodeError, setZipcodeError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);

  const countryInfo = useMemo(() =>
    getCountryByCode(localConsigneeAddress.country),
    [localConsigneeAddress.country]
  );
  const selectedCountry = useMemo(() =>
    COUNTRIES.find(c => c.code === localConsigneeAddress.country),
    [localConsigneeAddress.country]
  );
  const availableCities = localPickupAddress.state
    ? CITIES_BY_STATE[localPickupAddress.state] || []
    : [];

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Only sync when leaving the entire address section, not when moving between inputs
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      onUpdate({
        pickupAddress: localPickupAddress,
        consigneeAddress: localConsigneeAddress
      });
    }
  }, [localPickupAddress, localConsigneeAddress, onUpdate]);

  const updatePickupAddress = useCallback((field: string, value: string) => {
    setLocalPickupAddress(prev => {
      const updated = { ...prev, [field]: value };
      onUpdate({ pickupAddress: updated });
      return updated;
    });
  }, [onUpdate]);

  const updateConsigneeAddress = useCallback((field: string, value: string) => {
    setLocalConsigneeAddress(prev => {
      const updated = { ...prev, [field]: value };
      onUpdate({ consigneeAddress: updated });
      return updated;
    });
  }, [onUpdate]);

  // PIN code auto-fill for pickup address
  const handlePincodeChange = async (pincode: string) => {
    const cleanPincode = pincode.replace(/\D/g, '').slice(0, 6);
    updatePickupAddress('pincode', cleanPincode);
    setPincodeError(null);

    if (cleanPincode.length === 6) {
      setPincodeLoading(true);
      try {
        const result = await lookupPincode(cleanPincode);
        if (result) {
          setLocalPickupAddress(prev => ({
            ...prev, pincode: cleanPincode, city: result.city, state: result.state,
          }));
        } else {
          setPincodeError('Invalid PIN code');
        }
      } catch {
        setPincodeError('Could not verify PIN code');
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  // ZIP/Postal code auto-fill for consignee address
  const handleZipcodeChange = async (zipcode: string) => {
    const cc = localConsigneeAddress.country;
    const postalRule = countryInfo?.postal;
    const maxLen = postalRule?.maxLength || 10;
    const cleanZip = zipcode.slice(0, maxLen);
    updateConsigneeAddress('zipcode', cleanZip);
    setZipcodeError(null);

    if (!cc || cleanZip.length < 3) return;
    if (postalRule && !postalRule.regex.test(cleanZip)) return;

    if (isZipLookupSupported(cc)) {
      setZipcodeLoading(true);
      try {
        const result = await lookupZipcode(cleanZip, cc);
        if (result) {
          setLocalConsigneeAddress(prev => ({
            ...prev, zipcode: cleanZip, city: result.city,
          }));
        }
      } catch {
        // Silent fail
      } finally {
        setZipcodeLoading(false);
      }
    }
  };

  // Phone validation on blur
  const handleConsigneePhoneBlur = () => {
    const phone = localConsigneeAddress.phone;
    const cc = localConsigneeAddress.country;
    if (!phone || !cc) return;
    setPhoneError(null);
    if (countryInfo && !phone.startsWith('+') && phone.length > 3) {
      setLocalConsigneeAddress(prev => ({
        ...prev, phone: `${countryInfo.phone.dialCode} ${phone}`,
      }));
    }
    if (cc && phone.length > 3 && !validatePhone(phone, cc)) {
      setPhoneError(`Expected format: ${countryInfo?.phone.format || 'international format'}`);
    }
  };

  // Country change handler - auto-prefix phone dial code
  const handleCountryChange = (countryCode: string) => {
    const info = getCountryByCode(countryCode);
    setPhoneError(null);
    setZipcodeError(null);
    setLocalConsigneeAddress(prev => ({
      ...prev,
      country: countryCode,
      phone: prev.phone || (info ? `${info.phone.dialCode} ` : ''),
    }));
  };

  const validatePincode = (pincode: string) => /^\d{6}$/.test(pincode);

  return (
    <div className="space-y-8" onBlur={handleBlur}>
      {/* Sender Notice */}
      <Card className="bg-accent/20 border-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Sender Address (From KYC)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-background rounded-lg border border-border">
            <p className="font-typewriter text-sm text-foreground">
              123 Sample Street, Example Area<br />
              Mumbai, Maharashtra 400001, India
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pickup Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-destructive" />
            Pickup Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickupName">Contact Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pickupName"
                  placeholder="Full name"
                  value={localPickupAddress.fullName}
                  onChange={(e) => updatePickupAddress('fullName', e.target.value)}
                  className="input-premium pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupPhone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pickupPhone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={localPickupAddress.phone}
                  onChange={(e) => updatePickupAddress('phone', e.target.value)}
                  className="input-premium pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Indian mobile number (+91 optional)</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupAddress1">Address Line 1 *</Label>
            <Input
              id="pickupAddress1"
              placeholder="House/Flat number, Building name"
              value={localPickupAddress.addressLine1}
              onChange={(e) => updatePickupAddress('addressLine1', e.target.value)}
              className="input-premium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupAddress2">Address Line 2</Label>
            <Input
              id="pickupAddress2"
              placeholder="Street, Area, Landmark"
              value={localPickupAddress.addressLine2}
              onChange={(e) => updatePickupAddress('addressLine2', e.target.value)}
              className="input-premium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickupPincode">PIN Code *</Label>
              <div className="relative">
                <Input
                  id="pickupPincode"
                  placeholder="6-digit PIN"
                  maxLength={6}
                  value={localPickupAddress.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className={cn(
                    "input-premium font-typewriter pr-10",
                    localPickupAddress.pincode && !validatePincode(localPickupAddress.pincode) && 'border-destructive'
                  )}
                />
                {pincodeLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!pincodeLoading && localPickupAddress.pincode.length === 6 && !pincodeError && localPickupAddress.city && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
              {pincodeError && (
                <p className="text-xs text-destructive">{pincodeError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupState">State *</Label>
              <Select
                value={localPickupAddress.state}
                onValueChange={(value) => {
                  updatePickupAddress('state', value);
                  updatePickupAddress('city', '');
                }}
              >
                <SelectTrigger className="input-premium">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="bg-popover max-h-60">
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupCity">City *</Label>
              <Select
                value={localPickupAddress.city}
                onValueChange={(value) => updatePickupAddress('city', value)}
                disabled={!localPickupAddress.state}
              >
                <SelectTrigger className="input-premium">
                  <SelectValue placeholder={localPickupAddress.state ? "Select city" : "Select state first"} />
                </SelectTrigger>
                <SelectContent className="bg-popover max-h-60">
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                  {localPickupAddress.city && !availableCities.includes(localPickupAddress.city) && (
                    <SelectItem value={localPickupAddress.city}>{localPickupAddress.city}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consignee Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-destructive" />
            Consignee (Recipient) Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="consigneeName">Full Name *</Label>
              <Input
                id="consigneeName"
                placeholder="Recipient name"
                value={localConsigneeAddress.fullName}
                onChange={(e) => updateConsigneeAddress('fullName', e.target.value)}
                className="input-premium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consigneePhone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <DebouncedInput
                  id="consigneePhone"
                  type="tel"
                  placeholder={countryInfo?.phone.example || 'With country code (e.g., +971 50 123 4567)'}
                  value={localConsigneeAddress.phone}
                  onChange={(value) => updateConsigneeAddress('phone', value)}
                  className={cn("input-premium pl-10", phoneError && "border-destructive")}
                />
              </div>
              {countryInfo && (
                <p className="text-xs text-muted-foreground">
                  Format: {countryInfo.phone.format}
                </p>
              )}
              {phoneError && (
                <p className="text-xs text-destructive">{phoneError}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consigneeEmail">Email Address</Label>
            <Input
              id="consigneeEmail"
              type="email"
              placeholder="For delivery updates"
              value={localConsigneeAddress.email}
              onChange={(e) => updateConsigneeAddress('email', e.target.value)}
              className="input-premium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consigneeCountry">Country *</Label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={countryOpen}
                  className="w-full justify-between input-premium font-normal"
                >
                  {selectedCountry ? (
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      {selectedCountry.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Search destination country...
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search country..." className="h-10" />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-auto">
                      {COUNTRIES.map((country) => (
                        <CommandItem
                          key={country.code}
                          value={country.name}
                          onSelect={() => {
                            handleCountryChange(country.code);
                            setCountryOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              localConsigneeAddress.country === country.code ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {country.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consigneeAddress1">Address Line 1 *</Label>
            <Input
              id="consigneeAddress1"
              placeholder="Street address"
              value={localConsigneeAddress.addressLine1}
              onChange={(e) => updateConsigneeAddress('addressLine1', e.target.value)}
              className="input-premium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consigneeAddress2">Address Line 2</Label>
            <Input
              id="consigneeAddress2"
              placeholder="Apartment, suite, etc."
              value={localConsigneeAddress.addressLine2}
              onChange={(e) => updateConsigneeAddress('addressLine2', e.target.value)}
              className="input-premium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="consigneeZipcode">{countryInfo?.postal.label || 'ZIP/Postal Code'} *</Label>
              <div className="relative">
                <Input
                  id="consigneeZipcode"
                  placeholder={countryInfo?.postal.example || 'ZIP code'}
                  value={localConsigneeAddress.zipcode}
                  onChange={(e) => handleZipcodeChange(e.target.value)}
                  maxLength={countryInfo?.postal.maxLength || 10}
                  className="input-premium font-typewriter pr-10"
                />
                {zipcodeLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!zipcodeLoading && localConsigneeAddress.zipcode && localConsigneeAddress.city && !zipcodeError && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
              {zipcodeError && (
                <p className="text-xs text-destructive">{zipcodeError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="consigneeCity">City *</Label>
              <Input
                id="consigneeCity"
                placeholder="City (auto-filled from postal code)"
                value={localConsigneeAddress.city}
                onChange={(e) => updateConsigneeAddress('city', e.target.value)}
                className="input-premium"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const DocumentAddressStep = memo(DocumentAddressStepComponent);
