"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CXBCLayout } from '@/components/cxbc/layout';
import { useCXBCAuth } from '@/hooks/useCXBCAuth';
import { useCXBCDrafts, BookingDraft, DraftFormData } from '@/hooks/useCXBCDrafts';
import { useCountries } from '@/hooks/useCountries';
import { useRateCalculator } from '@/hooks/useRateCalculator';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Save,
  Clock,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Carrier } from '@/lib/shipping/rateCalculator';

import { 
  CXBCShipmentStep, 
  CXBCSenderStep, 
  CXBCConsigneeStep, 
  CXBCReviewStep,
  CXBCDocumentDetailsStep,
  CXBCGiftItemsStep,
  CXBCGiftSafetyStep,
  CXBCMedicineDetailsStep,
  SenderDetails,
  ConsigneeDetails,
  DocumentDetails,
  GiftItem,
  SafetyChecklist,
  Medicine,
  initialDocumentDetails,
  initialSafetyChecklist,
  createEmptyMedicine,
} from '@/components/cxbc/booking';

type ShipmentType = 'medicine' | 'document' | 'gift';
type PaymentMethod = 'cash' | 'upi' | 'card';

const STEPS = ['Shipment', 'Sender', 'Consignee', 'Review & Pay'];

const initialSenderDetails: SenderDetails = {
  fullName: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  idType: 'aadhaar',
  idNumber: '',
  idDocument: null,
};

const initialConsigneeDetails: ConsigneeDetails = {
  fullName: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: '',
  zipcode: '',
  idType: '',
  idNumber: '',
  idDocument: null,
};

export default function CXBCBooking() {
  const { partner, refetch } = useCXBCAuth();
  const { servedCountries: countries } = useCountries();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Draft management
  const { drafts, saveDraft, deleteDraft, isLoading: draftsLoading } = useCXBCDrafts(partner?.id);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showDraftsDialog, setShowDraftsDialog] = useState(false);

  // Form state
  const [step, setStep] = useState(1);
  const [shipmentType, setShipmentType] = useState<ShipmentType>(
    (searchParams.get('type') as ShipmentType) || 'medicine'
  );
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || '');
  const [weightGrams, setWeightGrams] = useState(Number(searchParams.get('weight')) || 500);
  const [declaredValue, setDeclaredValue] = useState(Number(searchParams.get('value')) || 5000);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(
    (searchParams.get('carrier') as Carrier) || null
  );
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sender details (complete data as per Aadhaar/Passport)
  const [sender, setSender] = useState<SenderDetails>(initialSenderDetails);

  // Consignee details
  const [consignee, setConsignee] = useState<ConsigneeDetails>(initialConsigneeDetails);

  // Get profit margin from partner settings (not editable during booking)
  const profitMargin = partner?.profit_margin_percent || 0;
  const isGstRegistered = !!partner?.gst_number;

  const rateData = useRateCalculator({
    destinationCountryCode: selectedCountry,
    shipmentType,
    weightGrams,
    declaredValue,
  });

  // Get the selected courier option
  const selectedCourierOption = selectedCarrier 
    ? rateData.courierOptions.find(o => o.carrier === selectedCarrier)
    : rateData.selectedCourier;
  
  const basePrice = selectedCourierOption?.price || 0;
  const marginAmount = (basePrice * profitMargin) / 100;
  const customerPrice = basePrice + marginAmount;
  
  // GST calculation based on partner's GST status
  const gstAmount = isGstRegistered ? customerPrice * 0.18 : 0;
  const totalCustomerPrice = customerPrice + gstAmount;

  // Get partner address string
  const partnerAddress = partner 
    ? `${partner.address}, ${partner.city}, ${partner.state} - ${partner.pincode}`
    : '';

  // Get default sender from partner settings
  const defaultSender = partner ? {
    name: (partner as any).default_sender_name || '',
    phone: (partner as any).default_sender_phone || '',
    email: (partner as any).default_sender_email || '',
  } : undefined;

  // Show drafts dialog on mount if there are drafts
  useEffect(() => {
    if (drafts.length > 0 && !currentDraftId && !searchParams.get('type')) {
      setShowDraftsDialog(true);
    }
  }, [drafts, currentDraftId, searchParams]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCurrentFormData = (): DraftFormData => ({
    shipment_type: shipmentType,
    destination_country: selectedCountry,
    weight_grams: weightGrams,
    declared_value: declaredValue,
    profit_margin: profitMargin,
    customer_name: consignee.fullName,
    customer_phone: consignee.phone,
    customer_email: consignee.email,
    customer_address: `${consignee.addressLine1}${consignee.addressLine2 ? ', ' + consignee.addressLine2 : ''}`,
    customer_city: consignee.city,
    customer_state: consignee.state,
    customer_pincode: consignee.zipcode,
    notes,
    payment_method: paymentMethod,
  });

  const handleSaveDraft = async () => {
    const formData = getCurrentFormData();
    const result = await saveDraft.mutateAsync({ draftId: currentDraftId || undefined, data: formData });
    if (!currentDraftId && result) {
      setCurrentDraftId(result);
    }
  };

  const loadDraft = (draft: BookingDraft) => {
    setCurrentDraftId(draft.id);
    setShipmentType((draft.shipment_type as ShipmentType) || 'medicine');
    setSelectedCountry(draft.destination_country || '');
    setWeightGrams(draft.weight_grams || 500);
    setDeclaredValue(draft.declared_value || 5000);
    setNotes(draft.notes || '');
    setPaymentMethod((draft.payment_method as PaymentMethod) || 'cash');
    setConsignee({
      ...initialConsigneeDetails,
      fullName: draft.customer_name || '',
      phone: draft.customer_phone || '',
      email: draft.customer_email || '',
      addressLine1: draft.customer_address || '',
      city: draft.customer_city || '',
      state: draft.customer_state || '',
      zipcode: draft.customer_pincode || '',
    });
    setShowDraftsDialog(false);
    toast.success('Draft loaded');
  };

  const handleDeleteDraft = async (draftId: string) => {
    await deleteDraft.mutateAsync(draftId);
    if (currentDraftId === draftId) {
      setCurrentDraftId(null);
      resetForm();
    }
  };

  const resetForm = () => {
    setStep(1);
    setShipmentType('medicine');
    setSelectedCountry('');
    setWeightGrams(500);
    setDeclaredValue(5000);
    setSelectedCarrier(null);
    setNotes('');
    setPaymentMethod('cash');
    setSender(initialSenderDetails);
    setConsignee(initialConsigneeDetails);
    setCurrentDraftId(null);
  };

  const validateStep1 = () => {
    if (!selectedCountry) {
      toast.error('Please select a destination country');
      return false;
    }
    if (!rateData.isCountryServed) {
      toast.error('Selected country is not served');
      return false;
    }
    if (declaredValue > 25000) {
      toast.error('Declared value exceeds CSB IV limit of ₹25,000');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!sender.fullName.trim()) {
      toast.error('Sender full name is required');
      return false;
    }
    if (!sender.phone.trim()) {
      toast.error('Sender phone is required');
      return false;
    }
    if (!sender.email.trim()) {
      toast.error('Sender email is required');
      return false;
    }
    if (!sender.addressLine1.trim()) {
      toast.error('Sender address is required');
      return false;
    }
    if (!sender.city.trim()) {
      toast.error('Sender city is required');
      return false;
    }
    if (!sender.state.trim()) {
      toast.error('Sender state is required');
      return false;
    }
    if (!sender.pincode.trim() || sender.pincode.length !== 6) {
      toast.error('Valid 6-digit PIN code is required');
      return false;
    }
    if (!sender.idType) {
      toast.error('ID type is required');
      return false;
    }
    if (!sender.idNumber.trim()) {
      toast.error('ID number is required');
      return false;
    }
    if (!sender.idDocument) {
      toast.error('Please upload sender ID document');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!consignee.fullName.trim()) {
      toast.error('Consignee name is required');
      return false;
    }
    if (!consignee.phone.trim()) {
      toast.error('Consignee phone is required');
      return false;
    }
    if (!consignee.addressLine1.trim()) {
      toast.error('Delivery address is required');
      return false;
    }
    if (!consignee.city.trim()) {
      toast.error('Consignee city is required');
      return false;
    }
    if (!consignee.zipcode.trim()) {
      toast.error('ZIP/Postal code is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!partner) return;

    // Check wallet balance — must have enough to pay + keep ₹1000 minimum
    const MIN_WALLET_BALANCE = 1000;
    if (partner.wallet_balance - basePrice < MIN_WALLET_BALANCE) {
      toast.error(`Insufficient wallet balance. You need ₹${(basePrice + MIN_WALLET_BALANCE).toLocaleString('en-IN')} (booking cost + ₹1,000 minimum balance).`);
      return;
    }

    try {
      setIsSubmitting(true);

      const selectedCountryData = countries.find(c => c.code === selectedCountry);

      // Generate deterministic bookingReferenceId for idempotent retries
      const bookingReferenceId = currentDraftId
        ? `cxbc-${currentDraftId}`
        : `cxbc-${crypto.randomUUID()}`;

      // Build Lifecycle API payload
      const payload = {
        bookingReferenceId,
        recipientName: consignee.fullName,
        recipientPhone: consignee.phone,
        ...(consignee.email ? { recipientEmail: consignee.email } : {}),
        originAddress: partnerAddress,
        destinationAddress: `${consignee.addressLine1}${consignee.addressLine2 ? ', ' + consignee.addressLine2 : ''}, ${consignee.city}${consignee.state ? ', ' + consignee.state : ''} ${consignee.zipcode}`,
        destinationCountry: selectedCountryData?.name || selectedCountry,
        weightKg: weightGrams / 1000,
        declaredValue,
        shipmentType,
        shippingCost: basePrice,
        gstAmount: basePrice * 0.18,
        totalAmount: basePrice,
        cxbcPartnerId: partner.id,
        source: 'cxbc' as const,
      };

      // Get session access token for authorization
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error('Session expired, please log in again');
        return;
      }

      // Call Lifecycle API instead of direct Supabase insert
      const response = await fetch('/api/shipments/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired, please log in again');
          return;
        }
        if (response.status === 429) {
          toast.error('Too many requests, please wait');
          return;
        }
        if (response.status === 502) {
          toast.error('Shipping provider unavailable, please retry');
          return;
        }
        if (response.status === 400 && result.details) {
          const msg = result.details.map((d: { field: string; message: string }) => `${d.field}: ${d.message}`).join(', ');
          toast.error(`Invalid booking data: ${msg}`);
          return;
        }
        throw new Error(result.error || 'Failed to create booking');
      }

      const shipment = result.shipment;

      // Create customer bill with proper GST handling
      const { error: billError } = await supabase
        .from('cxbc_customer_bills')
        .insert([{
          partner_id: partner.id,
          shipment_id: shipment.id,
          customer_name: sender.fullName,
          customer_phone: sender.phone,
          customer_email: sender.email || null,
          base_cost: basePrice,
          partner_margin: marginAmount,
          gst_amount: gstAmount,
          total_amount: totalCustomerPrice,
          payment_method: paymentMethod,
          bill_number: 'TEMP', // Will be auto-generated by trigger
        }]);

      if (billError) throw billError;

      // Deduct from wallet
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: partner.user_id,
          amount: basePrice,
          type: 'debit',
          description: `Shipment to ${consignee.fullName} (${selectedCountryData?.name})`,
          reference_id: shipment.id,
        });

      if (txError) throw txError;

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('cxbc_partners')
        .update({ wallet_balance: partner.wallet_balance - basePrice })
        .eq('id', partner.id);

      if (updateError) throw updateError;

      // Delete draft if exists
      if (currentDraftId) {
        await supabase.from('cxbc_booking_drafts').delete().eq('id', currentDraftId);
      }

      toast.success('Booking created successfully!');
      refetch();
      router.push('/cxbc/bills');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) setStep(4);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Get country name for display
  const selectedCountryName = countries.find(c => c.code === selectedCountry)?.name || selectedCountry;

  return (
    <CXBCLayout title="New Booking" subtitle="Create a shipment for a walk-in customer">
      <div className="max-w-4xl mx-auto">
        {/* Drafts Dialog */}
        <Dialog open={showDraftsDialog} onOpenChange={setShowDraftsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Resume Draft?
              </DialogTitle>
              <DialogDescription>
                You have {drafts.length} saved draft{drafts.length > 1 ? 's' : ''}. Would you like to continue?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 cursor-pointer" onClick={() => loadDraft(draft)}>
                    <p className="font-medium capitalize">{draft.shipment_type} Shipment</p>
                    <p className="text-sm text-muted-foreground">
                      {draft.customer_name || 'No recipient'} • {draft.destination_country || 'No destination'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated {format(new Date(draft.updated_at), 'dd MMM, HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDraft(draft.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDraftsDialog(false)}>
                Start Fresh
              </Button>
              {drafts.length === 1 && (
                <Button className="flex-1" onClick={() => loadDraft(drafts[0])}>
                  Resume Draft
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Draft indicator & actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {currentDraftId && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Editing Draft
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {drafts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowDraftsDialog(true)}>
                <Clock className="h-4 w-4 mr-1" />
                Drafts ({drafts.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={saveDraft.isPending}
            >
              {saveDraft.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Draft
            </Button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center shrink-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  step > i + 1
                    ? 'bg-success text-success-foreground'
                    : step === i + 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > i + 1 ? <CheckCircle className="h-5 w-5" /> : i + 1}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${step === i + 1 ? 'font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-6 lg:w-12 h-0.5 bg-muted mx-2" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="mb-6">
          {step === 1 && (
            <CXBCShipmentStep
              shipmentType={shipmentType}
              setShipmentType={setShipmentType}
              selectedCountry={selectedCountry}
              setSelectedCountry={setSelectedCountry}
              weightGrams={weightGrams}
              setWeightGrams={setWeightGrams}
              declaredValue={declaredValue}
              setDeclaredValue={setDeclaredValue}
              selectedCarrier={selectedCarrier}
              setSelectedCarrier={setSelectedCarrier}
              profitMarginPercent={profitMargin}
              isGstRegistered={isGstRegistered}
            />
          )}

          {step === 2 && (
            <CXBCSenderStep
              data={sender}
              onUpdate={setSender}
              defaultSender={defaultSender}
              partnerAddress={partnerAddress}
            />
          )}

          {step === 3 && (
            <CXBCConsigneeStep
              data={consignee}
              onUpdate={setConsignee}
              selectedCountryCode={selectedCountry}
            />
          )}

          {step === 4 && (
            <CXBCReviewStep
              shipmentType={shipmentType}
              selectedCountry={selectedCountry}
              selectedCountryName={selectedCountryName}
              weightGrams={weightGrams}
              declaredValue={declaredValue}
              selectedCarrier={selectedCarrier}
              sender={sender}
              consignee={consignee}
              notes={notes}
              setNotes={setNotes}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              basePrice={basePrice}
              profitMargin={profitMargin}
              marginAmount={marginAmount}
              gstAmount={gstAmount}
              totalCustomerPrice={totalCustomerPrice}
              walletBalance={partner?.wallet_balance || 0}
              isGstRegistered={isGstRegistered}
              partnerAddress={partnerAddress}
              partnerId={partner?.id || ''}
              partnerUserId={partner?.user_id || ''}
              onRechargeComplete={refetch}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={prevStep} className="flex-1">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
          )}
          
          {step < 4 ? (
            <Button onClick={nextStep} className="flex-1">
              Continue
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              className="flex-1"
              disabled={isSubmitting || (partner?.wallet_balance || 0) - basePrice < 1000}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Confirm Booking
                  <CheckCircle className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* Wallet Balance Display */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Wallet Balance: <span className="font-mono font-medium">{formatCurrency(partner?.wallet_balance || 0)}</span>
          {basePrice > 0 && (
            <span className="ml-2">
              | Required: <span className="font-mono font-medium">{formatCurrency(basePrice + 1000)}</span>
              <span className="text-xs ml-1">(incl. ₹1,000 min. balance)</span>
            </span>
          )}
        </div>
      </div>
    </CXBCLayout>
  );
}

