import { useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDraft } from '@/hooks/useDraft';
import { formatRelativeTime } from '@/lib/drafts/draftService';
import { AppLayout } from '@/components/layout';
import { MedicineDetailsStep } from '@/components/booking/medicine/MedicineDetailsStep';
import { AddressStep } from '@/components/booking/medicine/AddressStep';
import { DocumentUploadStep } from '@/components/booking/medicine/DocumentUploadStep';
import { AddonsStep } from '@/components/booking/medicine/AddonsStep';
import { ReviewStep } from '@/components/booking/medicine/ReviewStep';
import { BookingProgress } from '@/components/booking/BookingProgress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Medicine, createEmptyMedicine } from '@/components/booking/medicine/MedicineCard';
import { adaptBookingData } from '@/lib/shipments/bookingAdapter';
import { submitBooking } from '@/lib/shipments/lifecycleApiClient';
import { insertMedicineItems, uploadShipmentDocuments, insertAddons } from '@/lib/shipments/postBookingService';
import { sendStatusNotification } from '@/lib/email/notify';
import { toast } from 'sonner';

export interface MedicineBookingData {
  // Multiple Medicines
  medicines: Medicine[];

  // Addresses
  pickupAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
  };
  consigneeAddress: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    country: string;
    zipcode: string;
    passportNumber: string;
  };

  // Documents
  prescription: File | null;
  pharmacyBill: File | null;
  consigneeId: File | null;

  // Add-ons
  insurance: boolean;
  specialPackaging: boolean;
}

const initialBookingData: MedicineBookingData = {
  medicines: [],
  pickupAddress: {
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  },
  consigneeAddress: {
    fullName: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    country: '',
    zipcode: '',
    passportNumber: '',
  },
  prescription: null,
  pharmacyBill: null,
  consigneeId: null,
  insurance: false,
  specialPackaging: false,
};

const STEPS = [
  { id: 1, title: 'Medicine Details', description: 'Enter medicine information' },
  { id: 2, title: 'Addresses', description: 'Pickup & delivery addresses' },
  { id: 3, title: 'Documents', description: 'Upload required documents' },
  { id: 4, title: 'Add-ons', description: 'Insurance & packaging' },
  { id: 5, title: 'Review', description: 'Confirm your booking' },
];

interface MedicineBookingProps {
  isAdminMode?: boolean;
}

const MedicineBooking = ({ isAdminMode = false }: MedicineBookingProps) => {
  const router = useRouter();
  const { user, session } = useAuth();
  const { deductFundsForShipment, refreshBalance } = useWallet();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draftId');

  const {
    data: bookingData,
    currentStep,
    lastSaved,
    isSaving,
    setData,
    setStep,
    saveNow,
    discardDraft,
  } = useDraft<MedicineBookingData>({
    type: 'medicine',
    initialData: initialBookingData,
    totalSteps: STEPS.length,
    draftId,
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingReferenceId, setBookingReferenceId] = useState<string | null>(null);
  const { mediumTap, errorFeedback, successFeedback } = useHaptics();
  const { playClick, playError, playSuccess } = useSoundEffects();

  // Stable snapshot for AddressStep — captured once when step 2 is entered.
  // Prevents AddressStep from re-rendering every time bookingData changes during typing.
  const addressStepDataRef = useRef<MedicineBookingData | null>(null);
  if (currentStep === 2 && addressStepDataRef.current === null) {
    addressStepDataRef.current = bookingData;
  }
  if (currentStep !== 2) {
    addressStepDataRef.current = null; // reset so next visit to step 2 gets fresh snapshot
  }

  // Calculate aggregated values across all medicines
  const aggregatedSupplyDays = bookingData.medicines.reduce((max, med) => {
    const supply = med.dailyDosage > 0 ? Math.ceil(med.unitCount / med.dailyDosage) : 0;
    return Math.max(max, supply);
  }, 0);

  const aggregatedTotalValue = bookingData.medicines.reduce((sum, med) => {
    return sum + (med.unitCount * med.unitPrice);
  }, 0);

  // Check if any medicine has blocking issues
  const hasBlockingMedicine = bookingData.medicines.some(med => {
    const supply = med.dailyDosage > 0 ? Math.ceil(med.unitCount / med.dailyDosage) : 0;
    const value = med.unitCount * med.unitPrice;
    return supply > 90 || value > 25000;
  });

  const isOverValueCap = aggregatedTotalValue > 25000;
  const hasBlockingIssue = hasBlockingMedicine || isOverValueCap;

  const updateBookingData = useCallback((updates: Partial<MedicineBookingData>) => {
    setData(prev => {
      // Only update if values actually changed
      const hasChanges = Object.keys(updates).some(key => {
        const k = key as keyof MedicineBookingData;
        const oldVal = prev[k];
        const newVal = updates[k];

        // Special handling for File objects
        if (oldVal instanceof File && newVal instanceof File) {
          return oldVal.name !== newVal.name || oldVal.size !== newVal.size;
        }
        if (oldVal instanceof File || newVal instanceof File) {
          return oldVal !== newVal;
        }

        // For other values, use JSON comparison
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
      });

      if (!hasChanges) return prev;

      return { ...prev, ...updates };
    });
    // Only clear errors if there were errors
    setValidationErrors(prev => prev.length > 0 ? [] : prev);
  }, [setData]);

  const updateMedicines = useCallback((medicines: Medicine[]) => {
    setData(prev => ({ ...prev, medicines }));
    // Only clear errors if there were errors
    setValidationErrors(prev => prev.length > 0 ? [] : prev);
  }, [setData]);

  const validateStep = (step: number): boolean => {
    const errors: string[] = [];

    switch (step) {
      case 1:
        if (bookingData.medicines.length === 0) {
          errors.push('Please add at least one medicine');
        } else {
          // Only validate medicine details if medicines exist
          bookingData.medicines.forEach((med, index) => {
            // Check if medicine has required fields filled
            if (!med.medicineName.trim()) {
              errors.push(`Medicine #${index + 1}: Please enter medicine name`);
            }
            if (!med.medicineType) {
              errors.push(`Medicine #${index + 1}: Please select medicine type`);
            }
            if (!med.category) {
              errors.push(`Medicine #${index + 1}: Please select category`);
            }
            if (!med.form) {
              errors.push(`Medicine #${index + 1}: Please select form`);
            }
            if (med.unitCount <= 0) {
              errors.push(`Medicine #${index + 1}: Please enter valid unit count`);
            }
            if (med.unitPrice <= 0) {
              errors.push(`Medicine #${index + 1}: Please enter valid unit price`);
            }

            // Check supply and value limits
            const supply = med.dailyDosage > 0 ? Math.ceil(med.unitCount / med.dailyDosage) : 0;
            const value = med.unitCount * med.unitPrice;
            if (supply > 90) errors.push(`Medicine #${index + 1}: Supply exceeds 90 days`);
            if (value > 25000) errors.push(`Medicine #${index + 1}: Value exceeds ₹25,000`);
          });

          if (isOverValueCap) errors.push('Total value of all medicines exceeds ₹25,000 CSB IV limit');
        }
        break;
      case 2:
        if (!bookingData.pickupAddress.fullName.trim()) errors.push('Please enter pickup contact name');
        if (!bookingData.pickupAddress.phone.trim()) errors.push('Please enter pickup phone number');
        else if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(bookingData.pickupAddress.phone.replace(/\s/g, ''))) errors.push('Pickup phone must be a valid Indian mobile number (e.g. +91 98765 43210)');
        if (!bookingData.pickupAddress.addressLine1.trim()) errors.push('Please enter pickup address');
        if (!bookingData.pickupAddress.pincode.trim() || bookingData.pickupAddress.pincode.length !== 6) errors.push('Please enter valid 6-digit pincode');
        if (!bookingData.consigneeAddress.fullName.trim()) errors.push('Please enter consignee name');
        if (!bookingData.consigneeAddress.country.trim()) errors.push('Please select destination country');
        if (!bookingData.consigneeAddress.addressLine1.trim()) errors.push('Please enter consignee address');
        break;
      case 3:
        if (!bookingData.prescription) errors.push('Please upload doctor\'s prescription');
        if (!bookingData.pharmacyBill) errors.push('Please upload pharmacy bill/invoice');
        if (!bookingData.consigneeId) errors.push('Please upload consignee ID document');
        break;
    }

    setValidationErrors(errors);
    if (errors.length > 0) {
      errorFeedback();
      playError();
    }
    return errors.length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      mediumTap();
      playClick();
      setStep(Math.min(currentStep + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    mediumTap();
    playClick();
    setStep(Math.max(currentStep - 1, 1));
    // Only clear errors if there were errors
    setValidationErrors(prev => prev.length > 0 ? [] : prev);
  };

  const handleConfirmBooking = async () => {
    if (!user || !session?.access_token) {
      toast.error('Please sign in to continue');
      router.push('/auth');
      return;
    }

    setIsSubmitting(true);
    mediumTap();

    try {
      console.log('[MedicineBooking] Submitting booking via lifecycle API...');

      // Generate or reuse bookingReferenceId for idempotency
      let refId = bookingReferenceId;
      if (!refId) {
        const adapted = adaptBookingData({ formData: bookingData, shipmentType: 'medicine', draftId });
        refId = adapted.bookingReferenceId;
        setBookingReferenceId(refId);
      }

      // Adapt form data to lifecycle API schema
      const payload = adaptBookingData({ formData: bookingData, shipmentType: 'medicine', draftId });
      // Ensure the same reference ID is used across retries
      payload.bookingReferenceId = refId;

      // Add add-on costs to the total
      let addonTotal = 0;
      const addons: Array<{ type: string; name: string; cost: number }> = [];
      if (bookingData.insurance) {
        addons.push({ type: 'insurance', name: 'Shipment Insurance', cost: 150 });
        addonTotal += 150;
      }
      if (bookingData.specialPackaging) {
        addons.push({ type: 'special_packaging', name: 'Special Packaging', cost: 300 });
        addonTotal += 300;
      }
      payload.totalAmount += addonTotal;

      // Call lifecycle API
      const { httpStatus, body } = await submitBooking(payload, session.access_token);

      // Handle error status codes
      if (httpStatus === 401) {
        toast.error('Session expired. Please sign in again.');
        router.push('/auth');
        return;
      }
      if (httpStatus === 429) {
        toast.error('Too many requests', {
          description: 'Please wait a moment before trying again.',
        });
        return;
      }
      if (httpStatus === 502) {
        toast.error('Courier Unavailable', {
          description: 'Courier service is temporarily unavailable. Please try again later.',
        });
        return;
      }
      if (httpStatus === 400) {
        const detail = body.details?.map(d => `${d.field}: ${d.message}`).join(', ') || body.error;
        toast.error('Validation Error', { description: detail || 'Invalid booking data.' });
        return;
      }
      if (httpStatus === 0) {
        toast.error('Connection Error', {
          description: body.error || 'Unable to connect. Please check your internet connection.',
        });
        return;
      }
      if (!body.success || !body.shipment) {
        errorFeedback();
        playError();
        toast.error('Booking Failed', {
          description: body.error || 'Failed to create shipment. Please try again.',
        });
        return;
      }

      // --- Success (201) ---
      const shipmentId = body.shipment.id;
      console.log('[MedicineBooking] Shipment created:', shipmentId);

      // Insert type-specific data (non-blocking on failure)
      try {
        await insertMedicineItems(shipmentId, bookingData);
      } catch (err) {
        console.error('[MedicineBooking] Medicine items insert failed:', err);
        toast.warning('Booking created but some details may not have saved. Contact support if needed.');
      }

      // Upload documents (non-blocking on failure)
      try {
        const files: Array<{ file: File; type: string }> = [];
        if (bookingData.prescription) files.push({ file: bookingData.prescription, type: 'prescription' });
        if (bookingData.pharmacyBill) files.push({ file: bookingData.pharmacyBill, type: 'pharmacy_bill' });
        if (bookingData.consigneeId) files.push({ file: bookingData.consigneeId, type: 'consignee_id' });
        if (files.length > 0) {
          await uploadShipmentDocuments(shipmentId, files, user.id);
        }
      } catch (err) {
        console.error('[MedicineBooking] Document upload failed:', err);
        toast.warning('Booking created but some documents may not have uploaded. Contact support if needed.');
      }

      // Insert add-ons (non-blocking on failure)
      try {
        if (addons.length > 0) {
          await insertAddons(shipmentId, addons);
        }
      } catch (err) {
        console.error('[MedicineBooking] Add-ons insert failed:', err);
        toast.warning('Booking created but add-on details may not have saved.');
      }

      // Wallet deduction
      console.log('[MedicineBooking] Deducting funds from wallet...');
      const walletResult = await deductFundsForShipment(
        payload.totalAmount,
        shipmentId,
        `Medicine shipment to ${bookingData.consigneeAddress.country}`,
      );

      if (!walletResult.success) {
        console.error('[MedicineBooking] Wallet deduction failed:', walletResult.error);
        toast.error('Payment Failed', {
          description: walletResult.error || 'Your shipment was created but payment could not be processed.',
        });
        setIsSubmitting(false);
        return;
      }

      // Refresh wallet balance
      await refreshBalance();

      successFeedback();
      playSuccess();

      toast.success('Booking Confirmed!', {
        description: `Shipment ID: ${shipmentId}`,
      });

      // Fire-and-forget email notification
      sendStatusNotification(shipmentId, 'confirmed').catch(() => {});

      // Discard draft after successful booking
      discardDraft();

      // Redirect to shipments page
      setTimeout(() => {
        router.push('/shipments');
      }, 1500);
    } catch (error) {
      errorFeedback();
      playError();
      console.error('[MedicineBooking] Error:', error);
      toast.error('Unexpected Error', {
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <MedicineDetailsStep
            medicines={bookingData.medicines}
            onUpdateMedicines={updateMedicines}
            aggregatedSupplyDays={aggregatedSupplyDays}
            aggregatedTotalValue={aggregatedTotalValue}
          />
        );
      case 2:
        return (
          <AddressStep
            data={addressStepDataRef.current ?? bookingData}
            onUpdate={updateBookingData}
          />
        );
      case 3:
        return (
          <DocumentUploadStep
            prescription={bookingData.prescription}
            pharmacyBill={bookingData.pharmacyBill}
            consigneeId={bookingData.consigneeId}
            onUpdate={updateBookingData}
          />
        );
      case 4:
        return (
          <AddonsStep
            data={bookingData}
            onUpdate={updateBookingData}
          />
        );
      case 5:
        return (
          <ReviewStep
            data={bookingData}
            aggregatedSupplyDays={aggregatedSupplyDays}
            aggregatedTotalValue={aggregatedTotalValue}
            onConfirmBooking={handleConfirmBooking}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="btn-press"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ship Medicine</h1>
            <p className="text-muted-foreground text-sm">Prescription medicines with documentation</p>
          </div>
        </div>

        {/* Progress */}
        <BookingProgress steps={STEPS} currentStep={currentStep} />

        {/* Blocking Alerts */}
        {hasBlockingIssue && currentStep === 1 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Booking Blocked</AlertTitle>
            <AlertDescription>
              {hasBlockingMedicine && (
                <p>One or more medicines exceed the 90-day supply limit or individual ₹25,000 value cap.</p>
              )}
              {isOverValueCap && !hasBlockingMedicine && (
                <p>Total value (₹{aggregatedTotalValue.toLocaleString('en-IN')}) exceeds CSB IV limit of ₹25,000.</p>
              )}
              <Button variant="link" className="p-0 h-auto text-destructive-foreground underline mt-2">
                Contact Support for Assistance
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Please fix the following errors</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="bg-card rounded-xl border border-border p-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="btn-press"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={hasBlockingIssue && currentStep === 1}
              className="btn-press bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              className="btn-press bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Confirm & Pay
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* Auto-save indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          {isSaving ? (
            <span>Saving...</span>
          ) : lastSaved ? (
            <span>Draft saved {formatRelativeTime(lastSaved.toISOString())}</span>
          ) : (
            <span>Your progress is auto-saved as a draft for 30 days</span>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default MedicineBooking;
