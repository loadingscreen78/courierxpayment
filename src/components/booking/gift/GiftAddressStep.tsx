import { useState, useRef, useMemo, useCallback, memo } from 'react';
import { GiftBookingData } from '@/views/GiftBooking';
import { Label } from '@/components/ui/label';
import { DebouncedInput } from '@/components/ui/debounced-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, User, Phone, Home, Globe, Upload, X, FileText, Info, CheckCircle2, Loader2, Search, Check, ChevronsUpDown } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';
import { lookupPincode, INDIAN_STATES, CITIES_BY_STATE } from '@/lib/pincode-lookup';
import { COUNTRY_DATA, getCountryByCode, validatePhone } from '@/lib/country-data';
import { lookupZipcode, isZipLookupSupported } from '@/lib/zipcode-lookup';
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
import { cn } from '@/lib/utils';

interface GiftAddressStepProps {
  data: GiftBookingData;
  onUpdate: (updates: Partial<GiftBookingData>) => void;
}

// Use comprehensive country list from shared data
const COUNTRIES = COUNTRY_DATA.map(c => ({ code: c.code, name: c.name }));

export const GiftAddressStep = ({ data, onUpdate }: GiftAddressStepProps) => {
  const { lightTap } = useHaptics();
  const [passportFront, setPassportFront] = useState<File | null>(null);
  const [passportBack, setPassportBack] = useState<File | null>(null);
  const [passportFrontPreview, setPassportFrontPreview] = useState<string | null>(null);
  const [passportBackPreview, setPassportBackPreview] = useState<string | null>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [zipcodeLoading, setZipcodeLoading] = useState(false);
  const [zipcodeError, setZipcodeError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Local state to prevent parent re-renders on every keystroke
  const [localPickupAddress, setLocalPickupAddress] = useState(data.pickupAddress);
  const [localConsigneeAddress, setLocalConsigneeAddress] = useState(data.consigneeAddress);

  // Get cities for selected state
  const availableCities = localPickupAddress.state
    ? CITIES_BY_STATE[localPickupAddress.state] || []
    : [];

  // Get selected country info with phone/postal rules
  const selectedCountry = useMemo(() =>
    COUNTRIES.find(c => c.code === localConsigneeAddress.country),
    [localConsigneeAddress.country]
  );
  const countryInfo = useMemo(() =>
    getCountryByCode(localConsigneeAddress.country),
    [localConsigneeAddress.country]
  );

  // Sync to parent on blur (leaving the address section)
  const handleBlur = useCallback((e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      onUpdate({
        pickupAddress: localPickupAddress,
        consigneeAddress: localConsigneeAddress,
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

  // Handle PIN code change with auto-fill
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
            ...prev,
            pincode: cleanPincode,
            city: result.city,
            state: result.state,
          }));
          onUpdate({
            pickupAddress: {
              ...localPickupAddress,
              pincode: cleanPincode,
              city: result.city,
              state: result.state,
            }
          });
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

  const updateConsigneeAddress = useCallback((field: string, value: string) => {
    setLocalConsigneeAddress(prev => {
      const updated = { ...prev, [field]: value };
      onUpdate({ consigneeAddress: updated });
      return updated;
    });
  }, [onUpdate]);

  // Handle ZIP/Postal code change with auto-fill for consignee
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
          setLocalConsigneeAddress(prev => ({ ...prev, zipcode: cleanZip, city: result.city }));
          onUpdate({
            consigneeAddress: {
              ...localConsigneeAddress,
              zipcode: cleanZip,
              city: result.city,
            }
          });
        }
      } catch {
        // Silent fail
      } finally {
        setZipcodeLoading(false);
      }
    }
  };

  // Handle consignee phone with country dial code auto-prefix
  const handleConsigneePhoneChange = useCallback((phone: string) => {
    updateConsigneeAddress('phone', phone);
    setPhoneError(null);
  }, [updateConsigneeAddress]);

  const handleConsigneePhoneBlur = useCallback(() => {
    const phone = localConsigneeAddress.phone;
    const cc = localConsigneeAddress.country;
    if (!phone || !cc) return;
    if (countryInfo && !phone.startsWith('+') && phone.length > 3) {
      updateConsigneeAddress('phone', `${countryInfo.phone.dialCode} ${phone}`);
    }
    if (cc && phone.length > 3 && !validatePhone(phone, cc)) {
      setPhoneError(`Expected format: ${countryInfo?.phone.format || 'international format'}`);
    }
  }, [localConsigneeAddress, countryInfo, updateConsigneeAddress]);

  // When country changes, reset phone prefix hint and clear zip auto-fill
  const handleCountryChange = useCallback((countryCode: string) => {
    const info = getCountryByCode(countryCode);
    setPhoneError(null);
    setZipcodeError(null);
    setLocalConsigneeAddress(prev => ({
      ...prev,
      country: countryCode,
      phone: prev.phone || (info ? `${info.phone.dialCode} ` : ''),
    }));
    onUpdate({
      consigneeAddress: {
        ...localConsigneeAddress,
        country: countryCode,
        phone: localConsigneeAddress.phone || (info ? `${info.phone.dialCode} ` : ''),
      }
    });
  }, [localConsigneeAddress, onUpdate]);

  const handleFileUpload = useCallback((file: File | null, type: 'front' | 'back') => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'front') {
        setPassportFront(file);
        setPassportFrontPreview(reader.result as string);
        onUpdate({ passportPhotoPage: file });
      } else {
        setPassportBack(file);
        setPassportBackPreview(reader.result as string);
        onUpdate({ passportAddressPage: file });
      }
    };
    reader.readAsDataURL(file);
  }, [onUpdate]);

  const removeFile = useCallback((type: 'front' | 'back') => {
    lightTap();
    if (type === 'front') {
      setPassportFront(null);
      setPassportFrontPreview(null);
      if (frontInputRef.current) frontInputRef.current.value = '';
      onUpdate({ passportPhotoPage: null });
    } else {
      setPassportBack(null);
      setPassportBackPreview(null);
      if (backInputRef.current) backInputRef.current.value = '';
      onUpdate({ passportAddressPage: null });
    }
  }, [lightTap, onUpdate]);

  return (
    <div className="space-y-8">
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
        <CardContent className="space-y-4" onBlur={handleBlur}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <DebouncedInput
                  placeholder="Full name"
                  value={localPickupAddress.fullName}
                  onChange={(value) => updatePickupAddress('fullName', value)}
                  className="input-premium pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <DebouncedInput
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={localPickupAddress.phone}
                  onChange={(value) => updatePickupAddress('phone', value)}
                  className="input-premium pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Indian mobile number (+91 optional)</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address Line 1 *</Label>
            <DebouncedInput
              placeholder="House/Flat number, Building name"
              value={localPickupAddress.addressLine1}
              onChange={(value) => updatePickupAddress('addressLine1', value)}
              className="input-premium"
            />
          </div>

          <div className="space-y-2">
            <Label>Address Line 2</Label>
            <DebouncedInput
              placeholder="Street, Area, Landmark"
              value={localPickupAddress.addressLine2}
              onChange={(value) => updatePickupAddress('addressLine2', value)}
              className="input-premium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>PIN Code *</Label>
              <div className="relative">
                <DebouncedInput
                  placeholder="6-digit PIN"
                  maxLength={6}
                  value={localPickupAddress.pincode}
                  onChange={handlePincodeChange}
                  className="input-premium font-typewriter pr-10"
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
              <Label>State *</Label>
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
              <Label>City *</Label>
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
        <CardContent className="space-y-4" onBlur={handleBlur}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <DebouncedInput
                placeholder="Recipient name"
                value={localConsigneeAddress.fullName}
                onChange={(value) => updateConsigneeAddress('fullName', value)}
                className="input-premium"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <DebouncedInput
                  type="tel"
                  placeholder={countryInfo?.phone.example || 'With country code (e.g., +971 50 123 4567)'}
                  value={localConsigneeAddress.phone}
                  onChange={handleConsigneePhoneChange}
                  onBlur={handleConsigneePhoneBlur}
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
            <Label>Email Address</Label>
            <DebouncedInput
              type="email"
              placeholder="For delivery updates"
              value={localConsigneeAddress.email}
              onChange={(value) => updateConsigneeAddress('email', value)}
              className="input-premium"
            />
          </div>

          <div className="space-y-2">
            <Label>Country *</Label>
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
                            lightTap();
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
            <Label>Address Line 1 *</Label>
            <DebouncedInput
              placeholder="Street address"
              value={localConsigneeAddress.addressLine1}
              onChange={(value) => updateConsigneeAddress('addressLine1', value)}
              className="input-premium"
            />
          </div>

          <div className="space-y-2">
            <Label>Address Line 2</Label>
            <DebouncedInput
              placeholder="Apartment, suite, etc."
              value={localConsigneeAddress.addressLine2}
              onChange={(value) => updateConsigneeAddress('addressLine2', value)}
              className="input-premium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{countryInfo?.postal.label || 'ZIP/Postal Code'} *</Label>
              <div className="relative">
                <DebouncedInput
                  placeholder={countryInfo?.postal.example || 'ZIP code'}
                  value={localConsigneeAddress.zipcode}
                  onChange={handleZipcodeChange}
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
              <Label>City *</Label>
              <DebouncedInput
                placeholder="City (auto-filled from postal code)"
                value={localConsigneeAddress.city}
                onChange={(value) => updateConsigneeAddress('city', value)}
                className="input-premium"
              />
            </div>
          </div>

          {/* Passport Upload Section */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-coke-red/10">
                <FileText className="h-5 w-5 text-coke-red" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-semibold">Recipient&apos;s Passport/ID</Label>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Optional</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload passport pages to speed up customs clearance and avoid delivery delays
                </p>
              </div>
            </div>

            {/* Instructions Card */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border mb-4">
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-coke-red" />
                Which pages to upload?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front page instruction */}
                <div className="flex gap-3">
                  <div className="w-16 h-20 rounded-lg bg-background border border-border flex-shrink-0 overflow-hidden">
                    {/* Passport front mock */}
                    <div className="h-full p-1.5 flex">
                      <div className="w-1/3 border-r border-dashed border-border flex items-center justify-center">
                        <div className="w-5 h-6 rounded-sm bg-muted-foreground/30" />
                      </div>
                      <div className="flex-1 p-1 space-y-1">
                        <div className="h-1 w-full bg-muted-foreground/20 rounded" />
                        <div className="h-1 w-3/4 bg-muted-foreground/20 rounded" />
                        <div className="h-1 w-full bg-muted-foreground/20 rounded" />
                        <div className="h-1 w-1/2 bg-muted-foreground/20 rounded" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Page 2 - Photo Page</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Contains photo, name, passport number, date of birth, and expiry date
                    </p>
                  </div>
                </div>

                {/* Back page instruction */}
                <div className="flex gap-3">
                  <div className="w-16 h-20 rounded-lg bg-background border border-border flex-shrink-0 overflow-hidden">
                    {/* Passport back/address mock */}
                    <div className="h-full p-1.5">
                      <div className="text-[6px] text-muted-foreground/50 mb-1">ADDRESS</div>
                      <div className="space-y-1">
                        <div className="h-1 w-full bg-muted-foreground/20 rounded" />
                        <div className="h-1 w-3/4 bg-muted-foreground/20 rounded" />
                        <div className="h-1 w-full bg-muted-foreground/20 rounded" />
                        <div className="h-1 w-2/3 bg-muted-foreground/20 rounded" />
                        <div className="h-1 w-1/2 bg-muted-foreground/20 rounded" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Last Page - Address Page</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Contains permanent address of the passport holder (usually last page)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Front Side Upload */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-coke-red/10 text-coke-red text-xs flex items-center justify-center font-semibold">1</span>
                  Photo Page (Page 2)
                </Label>

                {passportFrontPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-green-500/50 bg-muted/30">
                    <img
                      src={passportFrontPreview}
                      alt="Passport front"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow-lg"
                        onClick={() => removeFile('front')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <div className="flex items-center gap-1.5 text-white text-xs">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        Photo page uploaded
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => { lightTap(); frontInputRef.current?.click(); }}
                    className="relative rounded-xl border-2 border-dashed border-border hover:border-coke-red/50 bg-muted/20 hover:bg-coke-red/5 transition-all cursor-pointer group"
                  >
                    <div className="p-4 h-44 flex flex-col items-center justify-center">
                      {/* Passport mock illustration */}
                      <div className="w-24 h-28 rounded-lg bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-800 mb-3 p-2 relative overflow-hidden">
                        <div className="text-[6px] text-blue-300/70 font-semibold mb-1">PASSPORT</div>
                        <div className="flex gap-1.5">
                          <div className="w-6 h-8 rounded-sm bg-gray-300/80 flex items-center justify-center">
                            <User className="h-3 w-3 text-gray-500" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="h-1 w-full bg-blue-300/30 rounded" />
                            <div className="h-1 w-3/4 bg-blue-300/30 rounded" />
                            <div className="h-1 w-full bg-blue-300/30 rounded" />
                            <div className="h-1 w-1/2 bg-blue-300/30 rounded" />
                          </div>
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 h-2 bg-blue-300/20 rounded text-[4px] text-blue-300/50 flex items-center px-1">
                          &lt;&lt;&lt; MRZ CODE &gt;&gt;&gt;
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-coke-red transition-colors">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm font-medium">Upload photo page</span>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'front')}
                />
              </div>

              {/* Back Side Upload */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-coke-red/10 text-coke-red text-xs flex items-center justify-center font-semibold">2</span>
                  Address Page (Last Page)
                </Label>

                {passportBackPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-green-500/50 bg-muted/30">
                    <img
                      src={passportBackPreview}
                      alt="Passport back"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow-lg"
                        onClick={() => removeFile('back')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <div className="flex items-center gap-1.5 text-white text-xs">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        Address page uploaded
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => { lightTap(); backInputRef.current?.click(); }}
                    className="relative rounded-xl border-2 border-dashed border-border hover:border-coke-red/50 bg-muted/20 hover:bg-coke-red/5 transition-all cursor-pointer group"
                  >
                    <div className="p-4 h-44 flex flex-col items-center justify-center">
                      {/* Address page mock illustration */}
                      <div className="w-24 h-28 rounded-lg bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-800 mb-3 p-2 relative overflow-hidden">
                        <div className="text-[6px] text-blue-300/70 font-semibold mb-1">ADDRESS</div>
                        <div className="space-y-1.5 mt-2">
                          <div className="h-1.5 w-full bg-blue-300/30 rounded" />
                          <div className="h-1.5 w-4/5 bg-blue-300/30 rounded" />
                          <div className="h-1.5 w-full bg-blue-300/30 rounded" />
                          <div className="h-1.5 w-3/5 bg-blue-300/30 rounded" />
                          <div className="h-1.5 w-2/3 bg-blue-300/30 rounded" />
                        </div>
                        <div className="absolute bottom-1 right-1 w-6 h-6 rounded border border-blue-300/30 flex items-center justify-center">
                          <div className="text-[5px] text-blue-300/50">SEAL</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-coke-red transition-colors">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm font-medium">Upload address page</span>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'back')}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Tip:</span> Make sure the entire page is visible, text is readable, and there&apos;s no glare. Accepted formats: JPG, PNG, PDF (max 5MB each)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

