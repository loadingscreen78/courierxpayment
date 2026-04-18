"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Home, Briefcase, Warehouse, MapPin, Phone,
  User, Building2, Loader2, CheckCircle2, Sparkles, Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAddresses } from '@/hooks/useAddresses';
import { lookupPincode, INDIAN_STATES } from '@/lib/pincode-lookup';

type AddressType = 'home' | 'office' | 'warehouse';

interface AddressForm {
  fullName: string;
  phone: string;
  alternatePhone: string;
  houseNumber: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  addressType: AddressType;
  isDefault: boolean;
}

const ADDRESS_TYPES = [
  { value: 'home' as AddressType, label: 'Home', icon: Home, desc: 'Residential' },
  { value: 'office' as AddressType, label: 'Office', icon: Briefcase, desc: 'Business' },
  { value: 'warehouse' as AddressType, label: 'Warehouse', icon: Warehouse, desc: 'Storage' },
];

export default function AddAddress() {
  const router = useRouter();
  const { addAddress } = useAddresses();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPincodeLooking, setIsPincodeLooking] = useState(false);
  const [pincodeAutoFilled, setPincodeAutoFilled] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm, string>>>({});

  const [formData, setFormData] = useState<AddressForm>({
    fullName: '',
    phone: '',
    alternatePhone: '',
    houseNumber: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    addressType: 'home',
    isDefault: false,
  });

  const handleInputChange = useCallback((field: keyof AddressForm, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Auto-fill city/state from pincode via India Post API
  const handlePincodeChange = useCallback(async (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    handleInputChange('pincode', cleaned);
    setPincodeAutoFilled(false);

    if (cleaned.length === 6) {
      setIsPincodeLooking(true);
      try {
        const result = await lookupPincode(cleaned);
        if (result) {
          setFormData(prev => ({
            ...prev,
            city: result.city,
            state: result.state,
            pincode: cleaned,
          }));
          setPincodeAutoFilled(true);
          setErrors(prev => ({ ...prev, city: undefined, state: undefined, pincode: undefined }));
        }
      } catch {
        // Silently fail — user can fill manually
      } finally {
        setIsPincodeLooking(false);
      }
    }
  }, [handleInputChange]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddressForm, string>> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Required';
    if (!formData.phone.trim()) newErrors.phone = 'Required';
    else if (!/^[6-9]\d{9}$/.test(formData.phone)) newErrors.phone = 'Invalid 10-digit number';

    if (formData.alternatePhone && !/^[6-9]\d{9}$/.test(formData.alternatePhone)) {
      newErrors.alternatePhone = 'Invalid 10-digit number';
    }

    if (!formData.houseNumber.trim()) newErrors.houseNumber = 'Required';
    if (!formData.street.trim()) newErrors.street = 'Required';
    if (!formData.city.trim()) newErrors.city = 'Required';
    if (!formData.state) newErrors.state = 'Required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Required';
    else if (!/^\d{6}$/.test(formData.pincode)) newErrors.pincode = 'Invalid 6-digit pincode';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the highlighted errors');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await addAddress({
        type: 'pickup',
        label: formData.addressType === 'warehouse' ? 'other' : formData.addressType,
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        address_line_1: `${formData.houseNumber.trim()}, ${formData.street.trim()}`,
        address_line_2: formData.landmark.trim() || null,
        city: formData.city.trim(),
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country,
        is_default: formData.isDefault,
      });

      if (result) {
        router.back();
      }
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Track completion percentage for progress indicator
  const filledFields = [
    formData.fullName, formData.phone, formData.houseNumber,
    formData.street, formData.city, formData.state, formData.pincode
  ].filter(f => f.trim().length > 0).length;
  const completionPct = Math.round((filledFields / 7) * 100);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white/70" />
            </button>
            <div>
              <h1 className="text-base font-semibold tracking-tight">New Address</h1>
              <p className="text-xs text-white/40">All fields marked * are required</p>
            </div>
          </div>

          {/* Completion indicator */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-500 ease-out"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-[10px] text-white/40 font-mono w-8">{completionPct}%</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-5 py-6 pb-36 space-y-6">

        {/* ═══ Section 1: Contact ═══ */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <User className="h-4 w-4 text-red-400" />
            <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Contact</span>
          </div>
          <div className="p-5 space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Full Name *</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="John Doe"
                className={cn(
                  "h-11 bg-white/[0.04] border-white/[0.08] rounded-xl text-white placeholder:text-white/20",
                  "focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 transition-all",
                  errors.fullName && "border-red-500/70 bg-red-500/5"
                )}
              />
              {errors.fullName && <p className="text-[11px] text-red-400">{errors.fullName}</p>}
            </div>

            {/* Phone Numbers — 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/60">Phone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <Input
                    type="tel"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className={cn(
                      "h-11 pl-9 bg-white/[0.04] border-white/[0.08] rounded-xl text-white placeholder:text-white/20",
                      "focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 transition-all",
                      errors.phone && "border-red-500/70 bg-red-500/5"
                    )}
                  />
                </div>
                {errors.phone && <p className="text-[11px] text-red-400">{errors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/60">Alternate Phone <span className="text-white/30">(opt.)</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <Input
                    type="tel"
                    maxLength={10}
                    value={formData.alternatePhone}
                    onChange={(e) => handleInputChange('alternatePhone', e.target.value.replace(/\D/g, ''))}
                    placeholder="Optional"
                    className={cn(
                      "h-11 pl-9 bg-white/[0.04] border-white/[0.08] rounded-xl text-white placeholder:text-white/20",
                      "focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 transition-all",
                      errors.alternatePhone && "border-red-500/70 bg-red-500/5"
                    )}
                  />
                </div>
                {errors.alternatePhone && <p className="text-[11px] text-red-400">{errors.alternatePhone}</p>}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Section 2: Location ═══ */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-400" />
            <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Location</span>
          </div>
          <div className="p-5 space-y-4">
            {/* Pincode — with auto-fill magic */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Pincode * <span className="text-white/30">— auto-fills city & state</span></Label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <Input
                  type="tel"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="Enter 6-digit pincode"
                  className={cn(
                    "h-11 pl-9 pr-10 bg-white/[0.04] border-white/[0.08] rounded-xl text-white placeholder:text-white/20 font-mono tracking-wider",
                    "focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 transition-all",
                    pincodeAutoFilled && "border-emerald-500/50 bg-emerald-500/5",
                    errors.pincode && "border-red-500/70 bg-red-500/5"
                  )}
                />
                {isPincodeLooking && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 animate-spin" />
                )}
                {pincodeAutoFilled && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                )}
              </div>
              {pincodeAutoFilled && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-normal gap-1">
                  <Sparkles className="h-3 w-3" />
                  City & state auto-filled from pincode
                </Badge>
              )}
              {errors.pincode && <p className="text-[11px] text-red-400">{errors.pincode}</p>}
            </div>

            {/* House + Street — side by side on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/60">House / Flat / Building *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <Input
                    value={formData.houseNumber}
                    onChange={(e) => handleInputChange('houseNumber', e.target.value)}
                    placeholder="B-12, Skyline Tower"
                    className={cn(
                      "h-11 pl-9 bg-white/[0.04] border-white/[0.08] rounded-xl text-white placeholder:text-white/20",
                      "focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 transition-all",
                      errors.houseNumber && "border-red-500/70 bg-red-500/5"
                    )}
                  />
                </div>
                {errors.houseNumber && <p className="text-[11px] text-red-400">{errors.houseNumber}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/60">Street / Area *</Label>
                <Input
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  placeholder="MG Road, Sector 14"
                  className={cn(
                    "h-11 bg-white/[0.04] border-white/[0.08] rounded-xl text-white placeholder:text-white/20",
                    "focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 transition-all",
                    errors.street && "border-red-500/70 bg-red-500/5"
                  )}
                />
                {errors.street && <p className="text-[11px] text-red-400">{errors.street}</p>}
              </div>
            </div>

            {/* Landmark */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Landmark <span className="text-white/30">(opt.)</span></Label>
              <Input
                value={formData.landmark}
                onChange={(e) => handleInputChange('landmark', e.target.value)}
                placeholder="Near Metro Station, Opposite Park..."
                className="h-11 bg-white/[0.04] border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 transition-all"
              />
            </div>

            {/* City + State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/60">City *</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Mumbai"
                  className={cn(
                    "h-11 bg-white/[0.04] border-white/[0.08] rounded-xl text-white placeholder:text-white/20",
                    "focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 transition-all",
                    pincodeAutoFilled && "border-emerald-500/30",
                    errors.city && "border-red-500/70 bg-red-500/5"
                  )}
                />
                {errors.city && <p className="text-[11px] text-red-400">{errors.city}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/60">State *</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => handleInputChange('state', value)}
                >
                  <SelectTrigger
                    className={cn(
                      "h-11 bg-white/[0.04] border-white/[0.08] rounded-xl text-white",
                      "focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 transition-all",
                      pincodeAutoFilled && "border-emerald-500/30",
                      errors.state && "border-red-500/70 bg-red-500/5"
                    )}
                  >
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-white/10 text-white max-h-60">
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state} className="focus:bg-white/10 focus:text-white">
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-[11px] text-red-400">{errors.state}</p>}
              </div>
            </div>

            {/* Country — locked to India */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Country</Label>
              <div className="h-11 px-4 flex items-center rounded-xl bg-white/[0.02] border border-white/[0.06] text-white/50 text-sm">
                India
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Section 3: Address Type ═══ */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <Home className="h-4 w-4 text-red-400" />
            <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Type</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {ADDRESS_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.addressType === type.value;

                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleInputChange('addressType', type.value)}
                    className={cn(
                      "relative p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1.5 group",
                      isSelected
                        ? "bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 transition-colors",
                      isSelected ? "text-red-400" : "text-white/40 group-hover:text-white/60"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      isSelected ? "text-red-400" : "text-white/60 group-hover:text-white/80"
                    )}>
                      {type.label}
                    </span>
                    <span className={cn(
                      "text-[10px] transition-colors",
                      isSelected ? "text-red-400/60" : "text-white/25"
                    )}>
                      {type.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Default address toggle */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => handleInputChange('isDefault', checked as boolean)}
                className="border-white/20 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
              />
              <Label
                htmlFor="isDefault"
                className="text-sm text-white/70 cursor-pointer flex-1"
              >
                Set as default address
              </Label>
            </div>
          </div>
        </section>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto p-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl border-white/10 text-white/70 hover:bg-white/5 hover:text-white transition-all"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "flex-[2] h-12 rounded-xl font-semibold transition-all duration-300",
              "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400",
              "shadow-lg shadow-red-500/20 hover:shadow-red-500/30",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Save Address
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
