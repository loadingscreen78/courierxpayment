'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { BookingProgress } from '@/components/booking/BookingProgress';
import { DomesticDetailsStep } from '@/components/booking/domestic/DomesticDetailsStep';
import { DomesticAddressStep } from '@/components/booking/domestic/DomesticAddressStep';
import { DomesticCourierStep } from '@/components/booking/domestic/DomesticCourierStep';
import { DomesticReviewStep } from '@/components/booking/domestic/DomesticReviewStep';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CircleNotch } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { DomesticBookingData, DomesticShipmentType } from '@/lib/domestic/types';

const STEPS = [
  { id: 1, title: 'Package Details', description: 'Type, weight & dimensions' },
  { id: 2, title: 'Addresses', description: 'Pickup & delivery' },
  { id: 3, title: 'Select Courier', description: 'Compare options' },
  { id: 4, title: 'Review & Pay', description: 'Confirm booking' },
];

const initialData: DomesticBookingData = {
  shipmentType: 'document',
  weightKg: 0.5,
  lengthCm: 25,
  widthCm: 20,
  heightCm: 5,
  declaredValue: 500,
  contentDescription: '',
  prohibitedItemsConfirmed: false,
  pickupAddress: {
    fullName: '', phone: '', addressLine1: '', addressLine2: '',
    city: '', state: '', pincode: '',
  },
  deliveryAddress: {
    fullName: '', phone: '', addressLine1: '', addressLine2: '',
    city: '', state: '', pincode: '',
  },
  selectedCourier: null,
};

const DomesticBooking = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { deductFundsForShipment, refreshBalance } = useWallet();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DomesticBookingData>(() => {
    const typeParam = searchParams.get('type');
    const shipmentType: DomesticShipmentType =
      typeParam === 'gift' ? 'gift' : typeParam === 'laptop' ? 'laptop' : 'document';
    return { ...initialData, shipmentType };
  });
  const lockedType = searchParams.get('type') === 'document' || searchParams.get('type') === 'gift' || searchParams.get('type') === 'laptop';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Frozen snapshot for address step — prevents re-renders while typing
  const addressSnapRef = useRef<DomesticBookingData | null>(null);
  if (step === 2 && addressSnapRef.current === null) {
    addressSnapRef.current = data;
  }
  if (step !== 2) {
    addressSnapRef.current = null;
  }

  const handleUpdate = useCallback((updates: Partial<DomesticBookingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return data.weightKg > 0 && data.declaredValue > 0 && data.contentDescription.length > 0 && data.prohibitedItemsConfirmed;
      case 2:
        return isAddressValid(data.pickupAddress) && isAddressValid(data.deliveryAddress);
      case 3:
        return data.selectedCourier !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 4) {
      // Clear courier selection when going from step 2 to 3 (addresses may have changed)
      if (step === 2) {
        setData(prev => ({ ...prev, selectedCourier: null }));
      }
      setStep(s => s + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(s => s - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!session?.access_token || !data.selectedCourier) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/domestic/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          shipmentType: data.shipmentType,
          weightKg: data.weightKg,
          lengthCm: data.lengthCm,
          widthCm: data.widthCm,
          heightCm: data.heightCm,
          declaredValue: data.declaredValue,
          contentDescription: data.contentDescription,
          pickupAddress: data.pickupAddress,
          deliveryAddress: data.deliveryAddress,
          selectedCourier: {
            courier_company_id: data.selectedCourier.courier_company_id,
            courier_name: data.selectedCourier.courier_name,
            customer_price: data.selectedCourier.customer_price,
            shipping_charge: data.selectedCourier.shipping_charge,
            gst_amount: data.selectedCourier.gst_amount,
          },
        }),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error || 'Booking failed');
        toast.error(result.error || 'Booking failed');
        return;
      }

      // Refresh wallet balance
      await refreshBalance();

      toast.success('Shipment booked successfully!', {
        description: `AWB: ${result.shipment.awb} via ${result.shipment.courier_name}`,
      });

      // Redirect to shipments page
      router.push('/shipments');
    } catch (err) {
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderedStep = useMemo(() => {
    if (step === 1) return <DomesticDetailsStep data={data} onUpdate={handleUpdate} lockedType={lockedType} />;
    if (step === 2) return <DomesticAddressStep data={addressSnapRef.current ?? data} onUpdate={handleUpdate} />;
    if (step === 3) return <DomesticCourierStep data={data} onUpdate={handleUpdate} />;
    if (step === 4) return <DomesticReviewStep data={data} />;
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step === 2 ? 'step2' : step, step !== 2 ? data : null]);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <span className="text-lg font-bold text-coke-red">IN</span>
            <span className="font-semibold text-sm">Domestic Shipping</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-typewriter font-bold">
            Ship Across India
          </h1>
          <p className="text-muted-foreground text-sm">
            {data.shipmentType === 'document'
              ? 'Send documents up to 1 kg anywhere in India'
              : 'Send gifts & parcels up to 60 kg across India'}
          </p>
        </div>

        {/* Progress */}
        <BookingProgress steps={STEPS} currentStep={step} />

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderedStep}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={step === 1 ? () => router.push('/new-shipment') : handleBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 4 ? (
            <Button onClick={handleNext} disabled={!canGoNext()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !data.selectedCourier}
              className="bg-gradient-to-r from-coke-red to-red-600 hover:from-red-600 hover:to-coke-red text-white gap-2"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
                  Booking...
                </>
              ) : (
                <>Confirm & Pay ₹{data.selectedCourier?.customer_price?.toLocaleString('en-IN') || '0'}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

function isAddressValid(addr: DomesticBookingData['pickupAddress']): boolean {
  return !!(
    addr.fullName.trim() &&
    addr.phone.trim() &&
    addr.addressLine1.trim() &&
    addr.city.trim() &&
    addr.state.trim() &&
    addr.pincode.match(/^\d{6}$/)
  );
}

export default DomesticBooking;
