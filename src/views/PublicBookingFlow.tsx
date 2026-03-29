"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CircleNotch, UserPlus, Pill, FileText, Gift, Truck, Globe, User, Envelope, Phone, MapPin, Info, AirplaneTilt, Warning, X, IdentificationCard, Upload, Passport, House } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getCourierOptions, calculateRate, type CourierOption } from '@/lib/shipping/rateCalculator';
import { getServedCountries } from '@/lib/shipping/countries';
import { getCountryByCode } from '@/lib/shipping/countries';
import GuestSummaryStep from '@/components/guest-booking/GuestSummaryStep';
import { usePincodeLookup } from '@/hooks/usePincodeLookup';
import { INDIAN_STATES } from '@/lib/pincode-lookup';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type FlowMode = 'international' | 'domestic';

interface PublicBookingFlowProps {
  mode: FlowMode;
}

// â”€â”€ Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const internationalRateSchema = z.object({
  shipmentType: z.enum(['medicine', 'document', 'gift'], { required_error: 'Select shipment type' }),
  destinationCountry: z.string().min(2, 'Select destination country'),
  weightGrams: z.coerce.number().min(100, 'Min 100g').max(10000, 'Max 10 kg for guest booking'),
  lengthCm: z.coerce.number().min(1, 'Required').max(150),
  widthCm: z.coerce.number().min(1, 'Required').max(150),
  heightCm: z.coerce.number().min(1, 'Required').max(150),
  declaredValue: z.coerce.number().min(1, 'Required').max(50000, 'Max â‚¹50,000'),
}).superRefine((data, ctx) => {
  if (data.shipmentType === 'document') {
    if (data.weightGrams > 1000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documents max 1 kg', path: ['weightGrams'] });
    if (data.declaredValue > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documents max â‚¹100 declared value', path: ['declaredValue'] });
  }
});

const domesticRateSchema = z.object({
  shipmentType: z.enum(['document', 'gift'], { required_error: 'Select shipment type' }),
  pickupPincode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincode'),
  deliveryPincode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincode'),
  weightKg: z.coerce.number().min(0.1, 'Min 0.1 kg').max(30, 'Max 30 kg'),
  lengthCm: z.coerce.number().min(1, 'Required').max(150),
  widthCm: z.coerce.number().min(1, 'Required').max(150),
  heightCm: z.coerce.number().min(1, 'Required').max(150),
  declaredValue: z.coerce.number().min(0).max(49000, 'Max â‚¹49,000'),
}).superRefine((data, ctx) => {
  if (data.shipmentType === 'document') {
    if (data.weightKg > 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documents max 1 kg', path: ['weightKg'] });
    if (data.declaredValue > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documents max â‚¹100 declared value', path: ['declaredValue'] });
  }
  if (data.shipmentType === 'gift') {
    if (data.weightKg > 30) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Gift/Parcel max 30 kg', path: ['weightKg'] });
    if (data.declaredValue > 49000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Max declared value â‚¹49,000', path: ['declaredValue'] });
  }
});

const senderReceiverSchema = z.object({
  senderName: z.string().min(2, 'Required'),
  senderPhone: z.string().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Valid Indian phone required'),
  senderEmail: z.string().email('Valid email required'),
  senderAddress: z.string().min(5, 'Required'),
  senderCity: z.string().min(2, 'Required'),
  senderState: z.string().min(2, 'Required'),
  senderPincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit pincode'),
  receiverName: z.string().min(2, 'Required'),
  receiverPhone: z.string().min(5, 'Required'),
  receiverEmail: z.string().email('Valid email required'),
  receiverAddress: z.string().min(5, 'Required'),
  receiverCity: z.string().min(2, 'Required'),
  receiverZipcode: z.string().min(3, 'Required'),
  contentDescription: z.string().min(3, 'Describe contents'),
});

type InternationalRateValues = z.infer<typeof internationalRateSchema>;
type DomesticRateValues = z.infer<typeof domesticRateSchema>;
type SenderReceiverValues = z.infer<typeof senderReceiverSchema>;

const shipmentTypeOptions = {
  international: [
    { value: 'medicine' as const, label: 'Medicine', icon: Pill, desc: 'Prescription medicines (CSB-IV)' },
    { value: 'document' as const, label: 'Document', icon: FileText, desc: 'Documents & certificates' },
    { value: 'gift' as const, label: 'Gift / Personal', icon: Gift, desc: 'Gifts, clothing, food' },
  ],
  domestic: [
    { value: 'document' as const, label: 'Document', icon: FileText, desc: 'Documents & paperwork' },
    { value: 'gift' as const, label: 'Gift / Parcel', icon: Gift, desc: 'Gifts, clothing, items' },
  ],
};

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function PublicBookingFlow({ mode }: PublicBookingFlowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isInternational = mode === 'international';
  const countries = getServedCountries();

  // Steps: 1=rate form, 2=rate results, 3=sender/receiver details
  const [step, setStep] = useState(1);
  const [selectedCourier, setSelectedCourier] = useState<CourierOption | null>(null);
  const [rateFormData, setRateFormData] = useState<InternationalRateValues | DomesticRateValues | null>(null);
  const [guestCouriers, setGuestCouriers] = useState<CourierOption[]>([]);
  const [accountCouriers, setAccountCouriers] = useState<CourierOption[]>([]);
  const [domesticCouriers, setDomesticCouriers] = useState<any[]>([]);
  const [isDomesticLoading, setIsDomesticLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senderReceiverData, setSenderReceiverData] = useState<any>(null);
  const [addressSubStep, setAddressSubStep] = useState<'pickup' | 'sender' | 'receiver' | 'content'>('pickup');
  const [showWeightLimitModal, setShowWeightLimitModal] = useState(false);
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [passportIdentity, setPassportIdentity] = useState<File | null>(null);
  const [passportAddress, setPassportAddress] = useState<File | null>(null);

  // â”€â”€ International rate form â”€â”€
  const intlForm = useForm<InternationalRateValues>({
    resolver: zodResolver(internationalRateSchema),
    defaultValues: { shipmentType: undefined, destinationCountry: '', weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, declaredValue: 1000 },
  });

  // â”€â”€ Domestic rate form â”€â”€
  const domForm = useForm<DomesticRateValues>({
    resolver: zodResolver(domesticRateSchema),
    defaultValues: { shipmentType: undefined, pickupPincode: '', deliveryPincode: '', weightKg: undefined as any, lengthCm: undefined as any, widthCm: undefined as any, heightCm: undefined as any, declaredValue: undefined as any },
  });

  // â”€â”€ Sender/Receiver form â”€â”€
  const detailsForm = useForm<SenderReceiverValues>({
    resolver: zodResolver(senderReceiverSchema),
    defaultValues: {
      senderName: '', senderPhone: '', senderEmail: '', senderAddress: '', senderCity: '', senderState: '', senderPincode: '',
      receiverName: '', receiverPhone: '', receiverEmail: '', receiverAddress: '', receiverCity: '', receiverZipcode: '',
      contentDescription: '',
    },
  });

  // Watch shipment type to conditionally render document-specific fields
  const watchedIntlType = intlForm.watch('shipmentType');
  const isDocumentIntl = watchedIntlType === 'document';
  const isMedicineFlow = isInternational && rateFormData && 'shipmentType' in rateFormData && rateFormData.shipmentType === 'medicine';
  const destinationCountryInfo = isInternational && rateFormData && 'destinationCountry' in rateFormData
    ? getCountryByCode((rateFormData as InternationalRateValues).destinationCountry) : null;

  // Watch domestic shipment type
  const watchedDomType = domForm.watch('shipmentType');
  const isDocumentDom = watchedDomType === 'document';

  // â”€â”€ Pre-fill from rate calculator localStorage data â”€â”€
  useEffect(() => {
    try {
      const raw = localStorage.getItem('publicRateCalcData');
      if (!raw) return;
      const data = JSON.parse(raw);
      // Only use data less than 30 minutes old
      if (Date.now() - (data.timestamp || 0) > 30 * 60 * 1000) return;

      if (!isInternational && data.mode === 'domestic') {
        if (data.pickupPincode) domForm.setValue('pickupPincode', data.pickupPincode);
        if (data.deliveryPincode) domForm.setValue('deliveryPincode', data.deliveryPincode);
        if (data.shipmentType) domForm.setValue('shipmentType', data.shipmentType);
        if (data.weightKg) domForm.setValue('weightKg', data.weightKg);
        if (data.lengthCm) domForm.setValue('lengthCm', data.lengthCm);
        if (data.widthCm) domForm.setValue('widthCm', data.widthCm);
        if (data.heightCm) domForm.setValue('heightCm', data.heightCm);
      }
      // Clean up after reading
      localStorage.removeItem('publicRateCalcData');
    } catch { /* ignore parse errors */ }
  }, [isInternational, domForm]);

  // â”€â”€ Pincode lookups for domestic rate form (step 1) â”€â”€
  const ratePickupPin = domForm.watch('pickupPincode');
  const rateDeliveryPin = domForm.watch('deliveryPincode');
  const pickupLookup = usePincodeLookup(!isInternational ? ratePickupPin : '');
  const deliveryLookup = usePincodeLookup(!isInternational ? rateDeliveryPin : '');

  // â”€â”€ Volumetric weight calculation (NimbusPost formula: LÃ—WÃ—H / 5000) â”€â”€
  const watchedLength = domForm.watch('lengthCm');
  const watchedWidth = domForm.watch('widthCm');
  const watchedHeight = domForm.watch('heightCm');
  const watchedWeight = domForm.watch('weightKg');
  const volumetricWeight = (watchedLength && watchedWidth && watchedHeight)
    ? Number(((watchedLength * watchedWidth * watchedHeight) / 5000).toFixed(2))
    : 0;
  const chargeableWeight = Math.max(Number(watchedWeight) || 0, volumetricWeight);

  // â”€â”€ Pincode auto-fill for domestic â”€â”€
  // For domestic: pre-fill sender pincode from pickupPincode, receiver from deliveryPincode
  const domesticPickupPincode = !isInternational ? (rateFormData as DomesticRateValues)?.pickupPincode || '' : '';
  const domesticDeliveryPincode = !isInternational ? (rateFormData as DomesticRateValues)?.deliveryPincode || '' : '';

  // Watch the actual pincode fields for lookup
  const senderPincodeValue = detailsForm.watch('senderPincode');
  const receiverPincodeValue = detailsForm.watch('receiverZipcode');

  // India Post lookups
  const senderLookup = usePincodeLookup(!isInternational ? senderPincodeValue : '');
  const receiverLookup = usePincodeLookup(!isInternational ? receiverPincodeValue : '');

  // Auto-fill pincodes when entering step 3 for domestic
  useEffect(() => {
    if (step === 3 && !isInternational && domesticPickupPincode) {
      const currentSenderPin = detailsForm.getValues('senderPincode');
      if (!currentSenderPin) {
        detailsForm.setValue('senderPincode', domesticPickupPincode);
      }
    }
    if (step === 3 && !isInternational && domesticDeliveryPincode) {
      const currentReceiverPin = detailsForm.getValues('receiverZipcode');
      if (!currentReceiverPin) {
        detailsForm.setValue('receiverZipcode', domesticDeliveryPincode);
      }
    }
  }, [step, isInternational, domesticPickupPincode, domesticDeliveryPincode, detailsForm]);

  // Auto-fill city/state from lookup results
  useEffect(() => {
    if (senderLookup.district && !isInternational) {
      const currentCity = detailsForm.getValues('senderCity');
      if (!currentCity) detailsForm.setValue('senderCity', senderLookup.district);
    }
    if (senderLookup.state) {
      detailsForm.setValue('senderState', senderLookup.state);
    }
  }, [senderLookup.district, senderLookup.state, isInternational, detailsForm]);

  useEffect(() => {
    if (receiverLookup.district && !isInternational) {
      const currentCity = detailsForm.getValues('receiverCity');
      if (!currentCity) detailsForm.setValue('receiverCity', receiverLookup.district);
    }
  }, [receiverLookup.district, isInternational, detailsForm]);

  // â”€â”€ Handle international rate calculation â”€â”€
  const handleIntlRateSubmit = (values: InternationalRateValues) => {
    const guest = getCourierOptions({
      destinationCountryCode: values.destinationCountry,
      shipmentType: values.shipmentType,
      weightGrams: values.weightGrams,
      dimensions: { length: values.lengthCm, width: values.widthCm, height: values.heightCm },
      declaredValue: values.declaredValue,
    }, true);

    const account = getCourierOptions({
      destinationCountryCode: values.destinationCountry,
      shipmentType: values.shipmentType,
      weightGrams: values.weightGrams,
      dimensions: { length: values.lengthCm, width: values.widthCm, height: values.heightCm },
      declaredValue: values.declaredValue,
    }, false);

    setGuestCouriers(guest);
    setAccountCouriers(account);
    setRateFormData(values);
    setStep(2);
  };

  // â”€â”€ Handle domestic rate calculation â”€â”€
  const handleDomRateSubmit = async (values: DomesticRateValues) => {
    setIsDomesticLoading(true);
    setRateFormData(values);
    try {
      const res = await fetch('/api/domestic/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupPincode: values.pickupPincode,
          deliveryPincode: values.deliveryPincode,
          weightKg: values.weightKg,
          lengthCm: values.lengthCm,
          widthCm: values.widthCm,
          heightCm: values.heightCm,
          declaredValue: values.declaredValue,
          shipmentType: values.shipmentType,
          isGuest: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDomesticCouriers(data.couriers || []);
        setStep(2);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to fetch rates', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setIsDomesticLoading(false);
    }
  };

  // â”€â”€ Select a courier and go to details â”€â”€
  const handleSelectCourier = (courier: any) => {
    setSelectedCourier(courier);
    setStep(3);
  };

  // â”€â”€ Submit sender/receiver and go to summary â”€â”€
  const handleFinalSubmit = (values: SenderReceiverValues) => {
    setSenderReceiverData(values);
    setStep(4);
  };

  // â”€â”€ Validate pickup address fields before sliding to sender â”€â”€
  const handlePickupNext = async () => {
    const pickupFields = ['senderAddress', 'senderCity', 'senderState', 'senderPincode'] as const;
    const result = await detailsForm.trigger(pickupFields);
    if (result) setAddressSubStep('sender');
  };

  // â”€â”€ Validate sender fields before sliding to receiver â”€â”€
  const handleSenderNext = async () => {
    const senderFields = ['senderName', 'senderPhone', 'senderEmail'] as const;
    const result = await detailsForm.trigger(senderFields);
    if (result) setAddressSubStep('receiver');
  };

  // â”€â”€ Validate receiver fields before sliding to content â”€â”€
  const handleReceiverNext = async () => {
    const receiverFields = ['receiverName', 'receiverPhone', 'receiverEmail', 'receiverAddress', 'receiverCity', 'receiverZipcode'] as const;
    const result = await detailsForm.trigger(receiverFields);
    if (result) setAddressSubStep('content');
  };

  // â”€â”€ Region-specific address format guidance â”€â”€
  const getAddressGuidance = () => {
    if (!destinationCountryInfo) return 'Street address, building, apartment/unit number';
    switch (destinationCountryInfo.region) {
      case 'middle-east': return 'Building name/number, Street, Area/District, City. Include P.O. Box if available.';
      case 'americas': return 'Street number + Street name, Apt/Suite, City, State/Province, ZIP code';
      case 'europe': return 'Street name + number, Postal code, City, Country. Include apartment/floor if applicable.';
      case 'asia-pacific': return 'Block/Building, Street, District/Ward, City/Province, Postal code';
      case 'africa': return 'Street address, Suburb/Area, City, Postal code. Include landmarks if possible.';
      default: return 'Full street address with building, city, and postal code';
    }
  };

  const handleBack = () => {
    if (step === 1) router.push('/public/book');
    else setStep(step - 1);
  };

  const stepLabels = ['Shipment Details', 'Select Rate', 'Sender & Receiver', 'Summary & Pay'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <img alt="CourierX" src="/logo.svg" className="h-9 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/auth')} className="rounded-xl text-sm">Sign In</Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/open-account')} className="rounded-xl text-sm gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Open Account â€” Save 52%
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl py-8 space-y-6">
        {/* Back + Title */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {isInternational ? <Globe className="h-6 w-6 text-blue-600" weight="duotone" /> : <Truck className="h-6 w-6 text-green-600" weight="duotone" />}
              {isInternational ? 'International Shipping' : 'Domestic Shipping'}
            </h1>
            <p className="text-muted-foreground text-sm">Guest booking â€” standard rates apply</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors mb-1 ${i + 1 <= step ? 'bg-coke-red' : 'bg-muted'}`} />
              <p className={`text-xs ${i + 1 <= step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</p>
            </div>
          ))}
        </div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 1: Rate Calculator Form â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <h2 className="font-semibold text-lg">Enter shipment details to get rates</h2>

              {isInternational ? (
                <Form {...intlForm}>
                  <form onSubmit={intlForm.handleSubmit(handleIntlRateSubmit)} className="space-y-4">
                    {/* Shipment Type */}
                    <FormField control={intlForm.control} name="shipmentType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are you shipping?</FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {shipmentTypeOptions.international.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                field.value === opt.value
                                  ? 'border-coke-red bg-coke-red/5 ring-1 ring-coke-red/20'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <opt.icon className={`h-5 w-5 mb-1 ${field.value === opt.value ? 'text-coke-red' : 'text-muted-foreground'}`} weight="duotone" />
                              <p className="text-sm font-medium">{opt.label}</p>
                              <p className="text-xs text-muted-foreground">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Destination */}
                    <FormField control={intlForm.control} name="destinationCountry" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination Country</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Weight + Value â€” document-specific */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={intlForm.control} name="weightGrams" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight</FormLabel>
                          {isDocumentIntl ? (
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select weight" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="500">Up to 500g</SelectItem>
                                <SelectItem value="1000">Up to 1 kg</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select
                              onValueChange={(v) => {
                                if (v === 'over10') {
                                  setShowWeightLimitModal(true);
                                } else {
                                  field.onChange(Number(v));
                                }
                              }}
                              value={String(field.value)}
                            >
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select weight" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="500">Up to 500g</SelectItem>
                                <SelectItem value="1000">Up to 1 kg</SelectItem>
                                <SelectItem value="1500">Up to 1.5 kg</SelectItem>
                                <SelectItem value="2000">Up to 2 kg</SelectItem>
                                <SelectItem value="2500">Up to 2.5 kg</SelectItem>
                                <SelectItem value="3000">Up to 3 kg</SelectItem>
                                <SelectItem value="3500">Up to 3.5 kg</SelectItem>
                                <SelectItem value="4000">Up to 4 kg</SelectItem>
                                <SelectItem value="4500">Up to 4.5 kg</SelectItem>
                                <SelectItem value="5000">Up to 5 kg</SelectItem>
                                <SelectItem value="5500">Up to 5.5 kg</SelectItem>
                                <SelectItem value="6000">Up to 6 kg</SelectItem>
                                <SelectItem value="6500">Up to 6.5 kg</SelectItem>
                                <SelectItem value="7000">Up to 7 kg</SelectItem>
                                <SelectItem value="7500">Up to 7.5 kg</SelectItem>
                                <SelectItem value="8000">Up to 8 kg</SelectItem>
                                <SelectItem value="8500">Up to 8.5 kg</SelectItem>
                                <SelectItem value="9000">Up to 9 kg</SelectItem>
                                <SelectItem value="9500">Up to 9.5 kg</SelectItem>
                                <SelectItem value="10000">Up to 10 kg</SelectItem>
                                <SelectItem value="over10" className="text-coke-red font-medium">More than 10 kg â†’</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={intlForm.control} name="declaredValue" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Declared Value (â‚¹)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder={isDocumentIntl ? 'Max â‚¹100' : '1000'} max={isDocumentIntl ? 100 : 50000} />
                          </FormControl>
                          {isDocumentIntl && <p className="text-xs text-muted-foreground">Documents cannot exceed â‚¹100 declared value</p>}
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Dimensions */}
                    <div>
                      <p className="text-sm font-medium mb-2">Package Dimensions (cm)</p>
                      <div className="grid grid-cols-3 gap-3">
                        <FormField control={intlForm.control} name="lengthCm" render={({ field }) => (
                          <FormItem>
                            <FormControl><Input {...field} type="number" placeholder="Length" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={intlForm.control} name="widthCm" render={({ field }) => (
                          <FormItem>
                            <FormControl><Input {...field} type="number" placeholder="Width" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={intlForm.control} name="heightCm" render={({ field }) => (
                          <FormItem>
                            <FormControl><Input {...field} type="number" placeholder="Height" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 py-5">
                      Calculate Rates <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              ) : (
                /* â”€â”€ Domestic form â”€â”€ */
                <Form {...domForm}>
                  <form onSubmit={domForm.handleSubmit(handleDomRateSubmit)} className="space-y-4">
                    {/* Shipment Type */}
                    <FormField control={domForm.control} name="shipmentType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are you shipping?</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {shipmentTypeOptions.domestic.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                field.value === opt.value
                                  ? 'border-coke-red bg-coke-red/5 ring-1 ring-coke-red/20'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <opt.icon className={`h-5 w-5 mb-1 ${field.value === opt.value ? 'text-coke-red' : 'text-muted-foreground'}`} weight="duotone" />
                              <p className="text-sm font-medium">{opt.label}</p>
                              <p className="text-xs text-muted-foreground">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Pincodes with city/state display */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={domForm.control} name="pickupPincode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup Pincode</FormLabel>
                          <FormControl><Input {...field} placeholder="110001" maxLength={6} /></FormControl>
                          {pickupLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                          {pickupLookup.state && <p className="text-xs text-candlestick-green">ðŸ“ {pickupLookup.district}, {pickupLookup.state}</p>}
                          {pickupLookup.error && <p className="text-xs text-destructive">{pickupLookup.error}</p>}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={domForm.control} name="deliveryPincode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Pincode</FormLabel>
                          <FormControl><Input {...field} placeholder="400001" maxLength={6} /></FormControl>
                          {deliveryLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                          {deliveryLookup.state && <p className="text-xs text-candlestick-green">ðŸ“ {deliveryLookup.district}, {deliveryLookup.state}</p>}
                          {deliveryLookup.error && <p className="text-xs text-destructive">{deliveryLookup.error}</p>}
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Weight + Value */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={domForm.control} name="weightKg" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight</FormLabel>
                          {isDocumentDom ? (
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select weight" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0.5">Up to 500g</SelectItem>
                                <SelectItem value="1">Up to 1 kg</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select weight" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0.5">Up to 500g</SelectItem>
                                <SelectItem value="1">Up to 1 kg</SelectItem>
                                <SelectItem value="2">Up to 2 kg</SelectItem>
                                <SelectItem value="5">Up to 5 kg</SelectItem>
                                <SelectItem value="10">Up to 10 kg</SelectItem>
                                <SelectItem value="15">Up to 15 kg</SelectItem>
                                <SelectItem value="20">Up to 20 kg</SelectItem>
                                <SelectItem value="25">Up to 25 kg</SelectItem>
                                <SelectItem value="30">Up to 30 kg</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={domForm.control} name="declaredValue" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Declared Value (â‚¹)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder={isDocumentDom ? 'Max â‚¹100' : 'Max â‚¹49,000'} max={isDocumentDom ? 100 : 49000} />
                          </FormControl>
                          {isDocumentDom && <p className="text-xs text-muted-foreground">Documents cannot exceed â‚¹100 declared value</p>}
                          {!isDocumentDom && <p className="text-xs text-muted-foreground">Maximum â‚¹49,000 for gift/parcel shipments</p>}
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Dimensions with measurement instructions */}
                    <div>
                      <p className="text-sm font-medium mb-1">Package Dimensions (cm)</p>
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3 mb-3">
                        <p className="text-xs text-blue-800 dark:text-blue-300 flex items-start gap-1.5">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" weight="fill" />
                          <span>Measure the outer dimensions of your packed box using a measuring tape. Enter the longest side as Length, the next as Width, and the shortest as Height. Courier charges are based on the higher of actual weight or volumetric weight (LÃ—WÃ—H Ã· 5000).</span>
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <FormField control={domForm.control} name="lengthCm" render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">Length</FormLabel><FormControl><Input {...field} type="number" placeholder="cm" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={domForm.control} name="widthCm" render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">Width</FormLabel><FormControl><Input {...field} type="number" placeholder="cm" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={domForm.control} name="heightCm" render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">Height</FormLabel><FormControl><Input {...field} type="number" placeholder="cm" /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      {volumetricWeight > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                          <p>Volumetric weight: <span className="font-medium">{volumetricWeight} kg</span> ({watchedLength}Ã—{watchedWidth}Ã—{watchedHeight} Ã· 5000)</p>
                          {chargeableWeight > (Number(watchedWeight) || 0) && (
                            <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Warning className="h-3 w-3" weight="fill" />
                              Volumetric weight exceeds actual weight â€” courier will charge for <span className="font-semibold">{chargeableWeight} kg</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 py-5" disabled={isDomesticLoading}>
                      {isDomesticLoading ? <><CircleNotch className="h-4 w-4 animate-spin" /> Fetching Rates...</> : <>Calculate Rates <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </motion.div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 2: Rate Results â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {/* Account savings banner */}
            <div className="rounded-xl border border-candlestick-green/30 bg-candlestick-green/5 p-4">
              <p className="text-sm">
                ðŸ’¡ <span className="font-medium">Account holders pay up to 52% less</span> on these same routes.{' '}
                <button onClick={() => router.push('/open-account')} className="text-coke-red hover:underline font-semibold">Open a free account â†’</button>
              </p>
            </div>

            <h2 className="font-semibold text-lg">Available Rates</h2>
            <p className="text-sm text-muted-foreground">Select a courier to proceed with booking. Prices include GST.</p>

            {isInternational ? (
              guestCouriers.length === 0 ? (
                /* â”€â”€ Animated no-service for international â”€â”€ */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, type: 'spring' }}
                  className="bg-card rounded-2xl border border-border p-8 text-center space-y-4"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto"
                  >
                    <AirplaneTilt className="h-8 w-8 text-amber-500" weight="duotone" />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h3 className="font-semibold text-lg">No Service Available</h3>
                    <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                      No courier options available for this route. Try a different destination or weight.
                    </p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                      <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Try Different Route
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/contact')}>
                      Contact Support
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {guestCouriers.map((option, idx) => {
                    const accountPrice = accountCouriers[idx]?.price ?? option.price;
                    const savings = option.price - accountPrice;
                    const isComingSoon = option.carrier === 'ShipGlobal' || option.carrier === 'Aramex';
                    const rateBreakdown = rateFormData ? calculateRate({
                      destinationCountryCode: (rateFormData as InternationalRateValues).destinationCountry,
                      shipmentType: (rateFormData as InternationalRateValues).shipmentType,
                      weightGrams: (rateFormData as InternationalRateValues).weightGrams,
                      dimensions: { length: (rateFormData as InternationalRateValues).lengthCm, width: (rateFormData as InternationalRateValues).widthCm, height: (rateFormData as InternationalRateValues).heightCm },
                      declaredValue: (rateFormData as InternationalRateValues).declaredValue,
                    }, true) : null;

                    return (
                      <div key={option.carrier} className={`bg-card rounded-xl border border-border overflow-hidden transition-colors ${isComingSoon ? 'opacity-60' : 'hover:border-coke-red/30'}`}>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base">{option.carrier}</h3>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{option.serviceName}</span>
                                {option.isRecommended && !isComingSoon && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-candlestick-green/10 text-candlestick-green font-medium">Best Value</span>
                                )}
                                {isComingSoon && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 font-medium">Available Soon</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{option.transitDays.min}â€“{option.transitDays.max} days delivery</p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {option.features.slice(0, 3).map(f => (
                                  <span key={f} className="text-xs px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">{f}</span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-2xl font-bold">â‚¹{option.price.toLocaleString('en-IN')}</p>
                              {savings > 0 && !isComingSoon && (
                                <p className="text-xs text-candlestick-green mt-0.5">
                                  With account: <span className="font-semibold">â‚¹{accountPrice.toLocaleString('en-IN')}</span>
                                </p>
                              )}
                              {isComingSoon ? (
                                <Button size="sm" variant="outline" className="mt-2 opacity-50" disabled>
                                  Available Soon
                                </Button>
                              ) : (
                                <Button size="sm" className="mt-2 bg-coke-red hover:bg-red-600 text-white" onClick={() => handleSelectCourier(option)}>
                                  Book Now
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Rate breakdown (show for first/recommended) */}
                        {rateBreakdown && idx === 0 && (
                          <div className="border-t border-border bg-muted/30 px-4 py-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Rate Breakdown</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {rateBreakdown.breakdown.map(item => (
                                <div key={item.label} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{item.label}</span>
                                  <span className="font-medium">â‚¹{item.amount.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-border">
                              <span>Total</span>
                              <span>â‚¹{rateBreakdown.total.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* â”€â”€ Domestic rate results â”€â”€ */
              (() => {
                // For documents: show only air services, fallback to Delhivery Surface
                const isDocType = rateFormData && 'shipmentType' in rateFormData && rateFormData.shipmentType === 'document';
                let filteredDomestic = domesticCouriers;
                if (isDocType) {
                  const airOnly = domesticCouriers.filter((c: any) => c.mode === 'air');
                  if (airOnly.length > 0) {
                    filteredDomestic = airOnly;
                  } else {
                    // Fallback: Delhivery Surface
                    const delhiverySurface = domesticCouriers.filter((c: any) =>
                      c.courier_name?.toLowerCase().includes('delhivery') && c.mode === 'surface'
                    );
                    filteredDomestic = delhiverySurface;
                  }
                }

                return filteredDomestic.length === 0 ? (
                  /* â”€â”€ Animated no-service component â”€â”€ */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="bg-card rounded-2xl border border-border p-8 text-center space-y-4"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto"
                    >
                      <AirplaneTilt className="h-8 w-8 text-amber-500" weight="duotone" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 className="font-semibold text-lg">No Service Available</h3>
                      <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                        {isDocType
                          ? 'No air courier services are available for document shipments on this route right now.'
                          : 'No couriers available for this route.'}
                      </p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex flex-col sm:flex-row gap-2 justify-center pt-2"
                    >
                      <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Try Different Route
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => router.push('/contact')}>
                        Contact Support
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {isDocType && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
                        <AirplaneTilt className="h-4 w-4 shrink-0" weight="fill" />
                        <span>Showing air service rates for document shipments</span>
                      </div>
                    )}
                    {filteredDomestic.map((c: any) => (
                    <div key={c.courier_company_id} className="bg-card rounded-xl border border-border p-4 hover:border-coke-red/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{c.courier_name}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{c.mode}</span>
                            {c.is_recommended && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-candlestick-green/10 text-candlestick-green font-medium">Cheapest</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{c.estimated_delivery_days} days delivery</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-2xl font-bold">â‚¹{c.customer_price?.toLocaleString('en-IN')}</p>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Base: â‚¹{c.shipping_charge?.toLocaleString('en-IN')} + GST: â‚¹{c.gst_amount?.toLocaleString('en-IN')}
                          </div>
                          <Button size="sm" className="mt-2 bg-coke-red hover:bg-red-600 text-white" onClick={() => handleSelectCourier(c)}>
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                );
              })()
            )}
          </motion.div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 3: Sender & Receiver Details (4-Step Slider) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            {/* Selected courier summary */}
            {selectedCourier && (
              <div className="bg-muted/50 rounded-xl border border-border p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Courier</p>
                  <p className="font-semibold">{(selectedCourier as any).carrier || (selectedCourier as any).courier_name}</p>
                </div>
                <p className="text-xl font-bold">â‚¹{((selectedCourier as any).price || (selectedCourier as any).customer_price)?.toLocaleString('en-IN')}</p>
              </div>
            )}

            {/* Sub-step indicator â€” 4 steps */}
            <div className="flex items-center gap-2">
              {(['pickup', 'sender', 'receiver', 'content'] as const).map((s, i) => {
                const stepOrder = ['pickup', 'sender', 'receiver', 'content'];
                const currentIdx = stepOrder.indexOf(addressSubStep);
                const labels = ['Pickup Address', 'Sender / KYC', 'Receiver', 'Contents'];
                return (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      s === addressSubStep ? 'bg-coke-red text-white' :
                      currentIdx > i ? 'bg-candlestick-green text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {currentIdx > i ? 'âœ“' : i + 1}
                    </div>
                    <span className={`text-xs hidden sm:inline ${s === addressSubStep ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {labels[i]}
                    </span>
                    {i < 3 && <div className="flex-1 h-px bg-border" />}
                  </div>
                );
              })}
            </div>

            <Form {...detailsForm}>
              <form onSubmit={detailsForm.handleSubmit(handleFinalSubmit)}>
                <div className="overflow-hidden">
                  <AnimatePresence mode="wait">

                    {/* â”€â”€ Step 1: Pickup Address â”€â”€ */}
                    {addressSubStep === 'pickup' && (
                      <motion.div
                        key="pickup"
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-card rounded-2xl border border-border p-8 lg:p-10 space-y-5"
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                            <House className="h-5 w-5 text-orange-600" weight="duotone" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">Indian Pickup Address</h3>
                            <p className="text-xs text-muted-foreground">Where should we collect the shipment from?</p>
                          </div>
                        </div>
                        {isMedicineFlow && (
                          <div className="rounded-lg border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-950/20 p-3 text-xs text-orange-800 dark:text-orange-300 flex items-start gap-2">
                            <Info className="h-4 w-4 shrink-0 mt-0.5" weight="fill" />
                            <span>For medicine shipments, the pickup address must match your Aadhaar card address exactly.</span>
                          </div>
                        )}
                        <div className="space-y-4">
                          <FormField control={detailsForm.control} name="senderAddress" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Address (House/Flat No, Street, Locality)</FormLabel>
                              <FormControl><Input {...field} placeholder="e.g. 42, MG Road, Lajpat Nagar" className="h-11" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={detailsForm.control} name="senderPincode" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pincode</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="110001" maxLength={6} readOnly={!isInternational && !!domesticPickupPincode} className={`h-11 ${!isInternational && domesticPickupPincode ? 'bg-muted' : ''}`} />
                              </FormControl>
                              {senderLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                              {senderLookup.error && <p className="text-xs text-destructive">{senderLookup.error}</p>}
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={detailsForm.control} name="senderCity" render={({ field }) => (
                              <FormItem>
                                <FormLabel>City / District</FormLabel>
                                {senderLookup.areas.length > 0 ? (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-11"><SelectValue placeholder="Select city" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {senderLookup.district && <SelectItem value={senderLookup.district}>{senderLookup.district} (District)</SelectItem>}
                                      {senderLookup.areas.filter(a => a !== senderLookup.district).map(a => (
                                        <SelectItem key={a} value={a}>{a}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <FormControl><Input {...field} placeholder="City" className="h-11" /></FormControl>
                                )}
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={detailsForm.control} name="senderState" render={({ field }) => (
                              <FormItem>
                                <FormLabel>State</FormLabel>
                                {senderLookup.state ? (
                                  <div className="h-11 flex items-center px-3 rounded-md border border-border bg-muted text-sm font-medium">
                                    {senderLookup.state}
                                  </div>
                                ) : (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-11"><SelectValue placeholder="Select state" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {INDIAN_STATES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                )}
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          {senderLookup.state && senderLookup.district && (
                            <p className="text-xs text-candlestick-green flex items-center gap-1">ðŸ“ {senderLookup.district}, {senderLookup.state}</p>
                          )}
                        </div>
                        <Button type="button" onClick={handlePickupNext} className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 py-5">
                          Next: Sender Details <ArrowRight className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}

                    {/* â”€â”€ Step 2: Sender Details + Aadhaar (for medicine) â”€â”€ */}
                    {addressSubStep === 'sender' && (
                      <motion.div
                        key="sender"
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-card rounded-2xl border border-border p-8 lg:p-10 space-y-5"
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-full bg-coke-red/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-coke-red" weight="duotone" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">Sender Details</h3>
                            <p className="text-xs text-muted-foreground">{isMedicineFlow ? 'Name and details as per Aadhaar card' : 'Your contact information'}</p>
                          </div>
                        </div>
                        {isMedicineFlow && (
                          <div className="rounded-lg border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-950/20 p-3 text-xs text-orange-800 dark:text-orange-300 flex items-start gap-2">
                            <IdentificationCard className="h-4 w-4 shrink-0 mt-0.5" weight="fill" />
                            <span>Sender name must match your Aadhaar card exactly. This is required for medicine customs clearance under CSB-IV.</span>
                          </div>
                        )}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={detailsForm.control} name="senderName" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isMedicineFlow ? 'Full Name (as per Aadhaar)' : 'Full Name'}</FormLabel>
                                <FormControl><Input {...field} placeholder={isMedicineFlow ? 'Name exactly as on Aadhaar' : 'Sender name'} className="h-11" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={detailsForm.control} name="senderPhone" render={({ field }) => (
                              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} placeholder="+91 98765 43210" className="h-11" /></FormControl><FormMessage /></FormItem>
                            )} />
                          </div>
                          <FormField control={detailsForm.control} name="senderEmail" render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="sender@email.com" className="h-11" /></FormControl><FormMessage /></FormItem>
                          )} />

                          {/* Aadhaar Upload â€” Medicine only */}
                          {isMedicineFlow && (
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center gap-2">
                                <IdentificationCard className="h-5 w-5 text-[#FF6B00]" weight="duotone" />
                                <h4 className="font-semibold text-sm">Aadhaar Card Upload</h4>
                              </div>
                              <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs space-y-1">
                                <p className="font-medium text-amber-900 dark:text-amber-200">How to capture a clear Aadhaar photo:</p>
                                <ul className="list-disc list-inside text-amber-800 dark:text-amber-300 space-y-0.5">
                                  <li>Place Aadhaar on a flat, well-lit surface</li>
                                  <li>Avoid glare, shadows, or blurry edges</li>
                                  <li>All 4 corners of the card must be visible</li>
                                  <li>Name, address, and Aadhaar number must be readable</li>
                                </ul>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Front Side</label>
                                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#FF6B00]/40 bg-[#FF6B00]/5 hover:bg-[#FF6B00]/10 p-4 cursor-pointer transition-colors">
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setAadhaarFront(e.target.files[0]); }} />
                                    {aadhaarFront ? (
                                      <div className="text-center">
                                        <IdentificationCard className="h-8 w-8 text-candlestick-green mx-auto" weight="duotone" />
                                        <p className="text-xs font-medium text-candlestick-green mt-1">Uploaded</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{aadhaarFront.name}</p>
                                      </div>
                                    ) : (
                                      <div className="text-center">
                                        <Upload className="h-6 w-6 text-[#FF6B00] mx-auto" weight="duotone" />
                                        <p className="text-xs font-medium text-[#FF6B00]">Upload Front</p>
                                        <p className="text-[10px] text-muted-foreground">JPG, PNG or PDF</p>
                                      </div>
                                    )}
                                  </label>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Back Side</label>
                                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#FF6B00]/40 bg-[#FF6B00]/5 hover:bg-[#FF6B00]/10 p-4 cursor-pointer transition-colors">
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setAadhaarBack(e.target.files[0]); }} />
                                    {aadhaarBack ? (
                                      <div className="text-center">
                                        <IdentificationCard className="h-8 w-8 text-candlestick-green mx-auto" weight="duotone" />
                                        <p className="text-xs font-medium text-candlestick-green mt-1">Uploaded</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{aadhaarBack.name}</p>
                                      </div>
                                    ) : (
                                      <div className="text-center">
                                        <Upload className="h-6 w-6 text-[#FF6B00] mx-auto" weight="duotone" />
                                        <p className="text-xs font-medium text-[#FF6B00]">Upload Back</p>
                                        <p className="text-[10px] text-muted-foreground">JPG, PNG or PDF</p>
                                      </div>
                                    )}
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <Button type="button" variant="outline" onClick={() => setAddressSubStep('pickup')} className="flex-1 gap-1.5">
                            <ArrowLeft className="h-4 w-4" /> Pickup
                          </Button>
                          <Button type="button" onClick={handleSenderNext} className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-2">
                            Next: Receiver <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* â”€â”€ Step 3: Receiver Details + Passport (for medicine) â”€â”€ */}
                    {addressSubStep === 'receiver' && (
                      <motion.div
                        key="receiver"
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-card rounded-2xl border border-border p-8 lg:p-10 space-y-5"
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                            <Globe className="h-5 w-5 text-blue-600" weight="duotone" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">Receiver Details</h3>
                            <p className="text-xs text-muted-foreground">{isInternational ? 'Delivery address abroad' : 'Delivery address in India'}</p>
                          </div>
                        </div>
                        {isMedicineFlow && (
                          <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20 p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                            <Passport className="h-4 w-4 shrink-0 mt-0.5" weight="fill" />
                            <span>Receiver name must match their passport exactly. Address should follow the destination country format.</span>
                          </div>
                        )}
                        {isInternational && destinationCountryInfo && (
                          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex items-start gap-2">
                            <Info className="h-4 w-4 shrink-0 mt-0.5" weight="fill" />
                            <span>Address format for {destinationCountryInfo.name}: {getAddressGuidance()}</span>
                          </div>
                        )}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={detailsForm.control} name="receiverName" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isMedicineFlow ? 'Full Name (as per Passport)' : 'Full Name'}</FormLabel>
                                <FormControl><Input {...field} placeholder={isMedicineFlow ? 'Name exactly as on passport' : 'Receiver name'} className="h-11" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={detailsForm.control} name="receiverPhone" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone (with country code)</FormLabel>
                                <FormControl><Input {...field} placeholder={destinationCountryInfo?.phoneCode ? `${destinationCountryInfo.phoneCode} ...` : 'Phone number'} className="h-11" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={detailsForm.control} name="receiverEmail" render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="receiver@email.com" className="h-11" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={detailsForm.control} name="receiverAddress" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Address</FormLabel>
                              <FormControl><Textarea {...field} placeholder={getAddressGuidance()} rows={2} className="resize-none" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={detailsForm.control} name="receiverZipcode" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isInternational ? 'Zip / Postal Code' : 'Pincode'}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={isInternational ? 'Zipcode' : '400001'} maxLength={isInternational ? 10 : 6} readOnly={!isInternational && !!domesticDeliveryPincode} className={`h-11 ${!isInternational && domesticDeliveryPincode ? 'bg-muted' : ''}`} />
                                </FormControl>
                                {!isInternational && receiverLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                                {!isInternational && receiverLookup.state && <p className="text-xs text-candlestick-green">{receiverLookup.district}, {receiverLookup.state}</p>}
                                {!isInternational && receiverLookup.error && <p className="text-xs text-destructive">{receiverLookup.error}</p>}
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={detailsForm.control} name="receiverCity" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isInternational ? 'City' : 'City / District'}</FormLabel>
                                {!isInternational && receiverLookup.areas.length > 0 ? (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-11"><SelectValue placeholder="Select city" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {receiverLookup.district && <SelectItem value={receiverLookup.district}>{receiverLookup.district} (District)</SelectItem>}
                                      {receiverLookup.areas.filter(a => a !== receiverLookup.district).map(a => (
                                        <SelectItem key={a} value={a}>{a}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <FormControl><Input {...field} placeholder="City" className="h-11" /></FormControl>
                                )}
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>

                          {/* Passport Upload â€” Medicine only */}
                          {isMedicineFlow && (
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center gap-2">
                                <Passport className="h-5 w-5 text-blue-600" weight="duotone" />
                                <h4 className="font-semibold text-sm">Receiver Passport Upload</h4>
                              </div>
                              <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20 p-3 text-xs space-y-1">
                                <p className="font-medium text-blue-900 dark:text-blue-200">How to capture a clear passport photo:</p>
                                <ul className="list-disc list-inside text-blue-800 dark:text-blue-300 space-y-0.5">
                                  <li>Open passport flat on a well-lit surface</li>
                                  <li>Capture the full page without cutting edges</li>
                                  <li>Name, photo, and passport number must be clearly readable</li>
                                  <li>Address page: capture the page with the current address</li>
                                </ul>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Identity Page (Photo side)</label>
                                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-400/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 p-4 cursor-pointer transition-colors">
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setPassportIdentity(e.target.files[0]); }} />
                                    {passportIdentity ? (
                                      <div className="text-center">
                                        <Passport className="h-8 w-8 text-candlestick-green mx-auto" weight="duotone" />
                                        <p className="text-xs font-medium text-candlestick-green mt-1">Uploaded</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{passportIdentity.name}</p>
                                      </div>
                                    ) : (
                                      <div className="text-center">
                                        <Upload className="h-6 w-6 text-blue-500 mx-auto" weight="duotone" />
                                        <p className="text-xs font-medium text-blue-600">Upload Identity</p>
                                        <p className="text-[10px] text-muted-foreground">JPG, PNG or PDF</p>
                                      </div>
                                    )}
                                  </label>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Address Page</label>
                                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-400/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 p-4 cursor-pointer transition-colors">
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setPassportAddress(e.target.files[0]); }} />
                                    {passportAddress ? (
                                      <div className="text-center">
                                        <Passport className="h-8 w-8 text-candlestick-green mx-auto" weight="duotone" />
                                        <p className="text-xs font-medium text-candlestick-green mt-1">Uploaded</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{passportAddress.name}</p>
                                      </div>
                                    ) : (
                                      <div className="text-center">
                                        <Upload className="h-6 w-6 text-blue-500 mx-auto" weight="duotone" />
                                        <p className="text-xs font-medium text-blue-600">Upload Address</p>
                                        <p className="text-[10px] text-muted-foreground">JPG, PNG or PDF</p>
                                      </div>
                                    )}
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <Button type="button" variant="outline" onClick={() => setAddressSubStep('sender')} className="flex-1 gap-1.5">
                            <ArrowLeft className="h-4 w-4" /> Sender
                          </Button>
                          <Button type="button" onClick={handleReceiverNext} className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-2">
                            Next: Contents <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* â”€â”€ Step 4: Content Description â”€â”€ */}
                    {addressSubStep === 'content' && (
                      <motion.div
                        key="content"
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-card rounded-2xl border border-border p-8 lg:p-10 space-y-5"
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-purple-600" weight="duotone" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">Shipment Contents</h3>
                            <p className="text-xs text-muted-foreground">{isInternational ? 'Required for customs declaration' : 'Describe what you are shipping'}</p>
                          </div>
                        </div>
                        <FormField control={detailsForm.control} name="contentDescription" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content Description</FormLabel>
                            <FormControl><Textarea {...field} placeholder={isMedicineFlow ? 'List medicine names, quantities, and dosages for customs' : isInternational ? 'Describe contents for customs declaration' : 'Describe the contents of your shipment'} rows={3} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="flex gap-3">
                          <Button type="button" variant="outline" onClick={() => setAddressSubStep('receiver')} className="flex-1 gap-1.5">
                            <ArrowLeft className="h-4 w-4" /> Receiver
                          </Button>
                          <Button type="submit" className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-2">
                            Continue to Summary <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </Form>
          </motion.div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 4: Summary & Pay â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {step === 4 && senderReceiverData && (
          <GuestSummaryStep
            mode={mode}
            rateFormData={rateFormData}
            selectedCourier={selectedCourier}
            senderReceiver={senderReceiverData}
            onBack={() => setStep(3)}
          />
        )}
      </main>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• Weight Limit Modal â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <AnimatePresence>
        {showWeightLimitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowWeightLimitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                    <Warning className="h-5 w-5 text-amber-600" weight="duotone" />
                  </div>
                  <h3 className="font-semibold text-lg">Weight Limit Reached</h3>
                </div>
                <button onClick={() => setShowWeightLimitModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Guest bookings are limited to 10 kg. To ship heavier packages, open a free account and enjoy up to 52% lower rates.
              </p>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowWeightLimitModal(false)} className="flex-1">
                  Go Back
                </Button>
                <Button onClick={() => router.push('/open-account')} className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-1.5">
                  <UserPlus className="h-4 w-4" /> Open Account
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
