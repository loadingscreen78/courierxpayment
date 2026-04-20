import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { renderAdminAbandonedBookingEmail, type AdminGuestBookingEmailData } from '@/lib/email/templates/adminGuestBookingNotification';

/**
 * Notify admin when a guest customer is unable to complete their booking
 * at the summary/payment stage. No auth required — this is a public endpoint.
 * Rate-limited by basic payload validation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      senderReceiver,
      rateFormData,
      selectedCourier,
      amount,
      mode,
      reason,
    } = body;

    // Basic validation — require at least sender name and phone
    if (!senderReceiver?.senderName || !senderReceiver?.senderPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isInternational = mode === 'international';
    const shipmentType = rateFormData?.shipmentType || 'parcel';
    const bookingMode = isInternational ? 'international' : 'domestic';
    const subjectPrefix = isInternational ? '🌍 Intl' : '🇮🇳 Domestic';
    const subjectType = shipmentType.charAt(0).toUpperCase() + shipmentType.slice(1);

    const adminEmailData: AdminGuestBookingEmailData = {
      trackingNumber: '',
      awb: '',
      labelUrl: '',
      orderId: '',
      senderName: senderReceiver.senderName || '',
      senderEmail: senderReceiver.senderEmail || '',
      senderPhone: senderReceiver.senderPhone || '',
      senderAddress: senderReceiver.senderAddress || '',
      senderCity: senderReceiver.senderCity || '',
      senderPincode: senderReceiver.senderPincode || '',
      receiverName: senderReceiver.receiverName || '',
      receiverEmail: senderReceiver.receiverEmail || '',
      receiverPhone: senderReceiver.receiverPhone || '',
      receiverAddress: senderReceiver.receiverAddress || '',
      receiverCity: senderReceiver.receiverCity || '',
      receiverZipcode: senderReceiver.receiverZipcode || '',
      shipmentType,
      contentDescription: senderReceiver.contentDescription || '',
      amount: Number(amount) || 0,
      courierName: selectedCourier?.carrier || selectedCourier?.courier_name || selectedCourier?.name || 'Unknown',
      destinationCountry: rateFormData?.destinationCountry || '',
      bookingMode: bookingMode as 'international' | 'domestic',
      weightInfo: rateFormData?.weightGrams
        ? `${rateFormData.weightGrams}g`
        : rateFormData?.weightKg
          ? `${rateFormData.weightKg} kg`
          : '',
      dimensions: rateFormData?.lengthCm
        ? `${rateFormData.lengthCm} × ${rateFormData.widthCm} × ${rateFormData.heightCm} cm`
        : '',
    };

    const result = await sendEmail({
      to: 'info@courierx.in',
      subject: `⚠️ Abandoned ${subjectPrefix} ${subjectType} Booking | ${senderReceiver.senderName} — ${senderReceiver.senderPhone}`,
      html: renderAdminAbandonedBookingEmail({
        ...adminEmailData,
        abandonReason: reason || 'Customer left the summary/payment page without completing the booking.',
      }),
    });

    if (result.success) {
      console.log(`[guest-booking-abandoned] Admin notified for abandoned booking by ${senderReceiver.senderName}`);
    } else {
      console.error(`[guest-booking-abandoned] Failed to notify admin:`, result.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[guest-booking-abandoned] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
