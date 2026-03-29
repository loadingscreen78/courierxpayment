import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { CASHFREE_API_BASE, CASHFREE_API_VERSION } from '@/lib/wallet/cashfreeConfig';
import { createDomesticShipment } from '@/lib/domestic/nimbusPostDomestic';
import { lookupPincode } from '@/lib/pincode-lookup';
import { sendEmail } from '@/lib/email/resend';
import { renderSenderConfirmationEmail, renderReceiverNotificationEmail, type GuestBookingEmailData } from '@/lib/email/templates/guestBookingConfirmation';

/**
 * Verify a guest booking payment with Cashfree.
 * After payment is confirmed, creates the actual shipment via NimbusPost
 * and returns the AWB + label URL.
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID required' }, { status: 400 });
    }

    const appId = process.env.CASHFREE_APP_ID?.trim();
    const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
    const supabase = getServiceRoleClient();

    const devMode = !appId || !secretKey;
    let isPaid = devMode;

    if (!devMode) {
      const cfRes = await fetch(`${CASHFREE_API_BASE}/orders/${orderId}`, {
        headers: {
          'x-api-version': CASHFREE_API_VERSION,
          'x-client-id': appId!,
          'x-client-secret': secretKey!,
        },
      });
      if (!cfRes.ok) {
        return NextResponse.json({ success: false, error: 'Failed to verify payment' }, { status: 500 });
      }
      const order = await cfRes.json();
      isPaid = order.order_status === 'PAID';
    }

    if (!isPaid) {
      return NextResponse.json({ success: false, error: 'Payment not completed' });
    }

    // Fetch guest booking data
    const { data: booking, error: bookingErr } = await supabase
      .from('guest_bookings')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (bookingErr || !booking) {
      console.error('[verify-guest-payment] Booking not found:', orderId, bookingErr);
      return NextResponse.json({ success: true, awbUrl: '', error: 'Booking record not found' });
    }

    // Already processed — return existing AWB
    if (booking.status === 'shipped' && booking.awb_number) {
      return NextResponse.json({
        success: true,
        awbUrl: booking.label_url || '',
        awb: booking.awb_number,
        trackingNumber: booking.tracking_number,
      });
    }

    // Already failed NimbusPost — don't retry automatically
    if (booking.status === 'paid_nimbus_failed') {
      return NextResponse.json({
        success: true,
        awbUrl: '',
        trackingNumber: booking.tracking_number,
        error: 'Shipment creation previously failed — our team will process manually',
      });
    }

    // Idempotency: use atomic update to claim this booking for processing.
    // Only one request can transition from pending_payment → paid.
    const { data: claimed, error: claimErr } = await supabase
      .from('guest_bookings')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('status', 'pending_payment')
      .select('order_id')
      .maybeSingle();

    // If we didn't claim it, another request is already processing
    if (!claimed && !claimErr) {
      // Wait briefly and re-fetch to return the result from the other request
      await new Promise(r => setTimeout(r, 3000));
      const { data: updated } = await supabase
        .from('guest_bookings')
        .select('status, awb_number, label_url, tracking_number')
        .eq('order_id', orderId)
        .maybeSingle();

      if (updated?.status === 'shipped' && updated.awb_number) {
        return NextResponse.json({
          success: true,
          awbUrl: updated.label_url || '',
          awb: updated.awb_number,
          trackingNumber: updated.tracking_number,
        });
      }
      return NextResponse.json({
        success: true,
        awbUrl: '',
        trackingNumber: booking.tracking_number,
        error: 'Payment confirmed — shipment is being processed',
      });
    }

    // Parse stored booking payload
    let bookingPayload: any = null;
    try {
      bookingPayload = typeof booking.booking_payload === 'string'
        ? JSON.parse(booking.booking_payload)
        : booking.booking_payload;
    } catch {
      console.error('[verify-guest-payment] Failed to parse booking_payload');
    }

    if (!bookingPayload) {
      return NextResponse.json({
        success: true,
        awbUrl: '',
        error: 'Booking payload missing — cannot create shipment',
      });
    }

    const { senderReceiver, rateFormData, selectedCourier } = bookingPayload;

    // ── Create NimbusPost shipment ──
    const skipNimbus = !process.env.NIMBUS_EMAIL || !process.env.NIMBUS_PASSWORD;

    let awb = '';
    let labelUrl = '';

    if (skipNimbus) {
      awb = `CXD-MOCK-${Date.now()}`;
      console.warn('[verify-guest-payment] NimbusPost credentials missing — mock AWB');
    } else {
      try {
        // Resolve courier_id — NimbusPost returns this in rate check
        const courierId = Number(
          selectedCourier?.courier_company_id
          || selectedCourier?.courier_id
          || selectedCourier?.id
          || 0
        );

        if (!courierId) {
          throw new Error('No courier_company_id in selectedCourier');
        }

        // Get weight — domestic form uses weightKg
        const weightKg = Number(rateFormData?.weightKg) || 0.5;

        // Clean phone numbers — NimbusPost expects 10-digit Indian numbers
        const cleanPhone = (phone: string) => {
          const digits = (phone || '').replace(/\D/g, '');
          // Remove leading 91 country code if present
          return digits.length > 10 ? digits.slice(-10) : digits || '9999999999';
        };

        // Get sender/receiver pincodes
        const senderPincode = senderReceiver.senderPincode
          || rateFormData?.pickupPincode || '';
        const receiverPincode = senderReceiver.receiverZipcode
          || senderReceiver.receiverPincode
          || rateFormData?.deliveryPincode || '';

        // Lookup states from pincodes (NimbusPost requires state)
        const [senderLookup, receiverLookup] = await Promise.all([
          lookupPincode(senderPincode),
          lookupPincode(receiverPincode),
        ]);

        const senderState = senderLookup?.state || 'Unknown';
        const receiverState = receiverLookup?.state || 'Unknown';
        const senderCity = senderReceiver.senderCity || senderLookup?.city || 'Unknown';
        const receiverCity = senderReceiver.receiverCity || receiverLookup?.city || 'Unknown';

        console.log('[verify-guest-payment] NimbusPost payload:', JSON.stringify({
          courier_id: courierId,
          tracking: booking.tracking_number,
          weight: weightKg,
          senderPincode,
          receiverPincode,
          senderState,
          receiverState,
        }));

        const nimbusResult = await createDomesticShipment({
          courier_id: courierId,
          order_number: booking.tracking_number || `CXG-${Date.now()}`,
          pickup: {
            name: senderReceiver.senderName || 'Sender',
            phone: cleanPhone(senderReceiver.senderPhone),
            address: senderReceiver.senderAddress || 'Address',
            city: senderCity,
            state: senderState,
            pincode: senderPincode,
          },
          delivery: {
            name: senderReceiver.receiverName || 'Receiver',
            phone: cleanPhone(senderReceiver.receiverPhone),
            address: senderReceiver.receiverAddress || 'Address',
            city: receiverCity,
            state: receiverState,
            pincode: receiverPincode,
          },
          order_amount: Number(rateFormData?.declaredValue) || Number(booking.amount) || 100,
          weight: weightKg,
          length: Number(rateFormData?.lengthCm) || 20,
          breadth: Number(rateFormData?.widthCm) || 15,
          height: Number(rateFormData?.heightCm) || 10,
          payment_type: 'prepaid',
          content_description: senderReceiver.contentDescription
            || rateFormData?.shipmentType
            || 'Guest Shipment',
        });

        if (nimbusResult.success && nimbusResult.awb) {
          awb = nimbusResult.awb;
          labelUrl = nimbusResult.label_url || '';
          console.log('[verify-guest-payment] NimbusPost shipment created. AWB:', awb);
        } else {
          console.error('[verify-guest-payment] NimbusPost failed:', nimbusResult.error);
          await supabase
            .from('guest_bookings')
            .update({
              status: 'paid_nimbus_failed',
              booking_payload: {
                ...bookingPayload,
                _nimbus_error: nimbusResult.error || 'Unknown',
                _failed_at: new Date().toISOString(),
              },
            })
            .eq('order_id', orderId);

          return NextResponse.json({
            success: true,
            awbUrl: '',
            trackingNumber: booking.tracking_number,
            error: nimbusResult.error || 'Shipment creation failed — our team will process manually',
          });
        }
      } catch (err: any) {
        console.error('[verify-guest-payment] NimbusPost exception:', err);
        await supabase
          .from('guest_bookings')
          .update({
            status: 'paid_nimbus_failed',
            booking_payload: {
              ...bookingPayload,
              _nimbus_error: err?.message || 'Exception',
              _failed_at: new Date().toISOString(),
            },
          })
          .eq('order_id', orderId);

        return NextResponse.json({
          success: true,
          awbUrl: '',
          trackingNumber: booking.tracking_number,
          error: 'Shipment creation failed — our team will process manually',
        });
      }
    }

    // Update guest booking with AWB
    await supabase
      .from('guest_bookings')
      .update({
        status: 'shipped',
        awb_number: awb,
        label_url: labelUrl,
      })
      .eq('order_id', orderId);

    // ── Send confirmation emails to sender & receiver (fire-and-forget) ──
    const emailData: GuestBookingEmailData = {
      trackingNumber: booking.tracking_number || '',
      awb,
      labelUrl,
      senderName: senderReceiver.senderName || 'Sender',
      senderEmail: senderReceiver.senderEmail || '',
      senderPhone: senderReceiver.senderPhone || '',
      senderAddress: senderReceiver.senderAddress || '',
      senderCity: senderReceiver.senderCity || '',
      senderPincode: senderReceiver.senderPincode || '',
      receiverName: senderReceiver.receiverName || 'Receiver',
      receiverEmail: senderReceiver.receiverEmail || '',
      receiverPhone: senderReceiver.receiverPhone || '',
      receiverAddress: senderReceiver.receiverAddress || '',
      receiverCity: senderReceiver.receiverCity || '',
      receiverZipcode: senderReceiver.receiverZipcode || '',
      shipmentType: rateFormData?.shipmentType || 'parcel',
      contentDescription: senderReceiver.contentDescription || '',
      amount: Number(booking.amount) || 0,
      courierName: selectedCourier?.name || selectedCourier?.courier_name || 'CourierX Partner',
      destinationCountry: rateFormData?.destinationCountry || '',
    };

    // Send both emails in parallel, don't block the response
    const emailPromises: Promise<any>[] = [];

    if (emailData.senderEmail) {
      emailPromises.push(
        sendEmail({
          to: emailData.senderEmail,
          subject: `Shipment Confirmed — ${emailData.trackingNumber} | CourierX`,
          html: renderSenderConfirmationEmail(emailData),
        }).then(r => {
          if (r.success) console.log(`[verify-guest-payment] Sender confirmation sent to ${emailData.senderEmail}`);
          else console.error(`[verify-guest-payment] Sender email failed:`, r.error);
        }).catch(e => console.error('[verify-guest-payment] Sender email error:', e))
      );
    }

    if (emailData.receiverEmail) {
      emailPromises.push(
        sendEmail({
          to: emailData.receiverEmail,
          subject: `A Shipment Is On Its Way — ${emailData.trackingNumber} | CourierX`,
          html: renderReceiverNotificationEmail(emailData),
        }).then(r => {
          if (r.success) console.log(`[verify-guest-payment] Receiver notification sent to ${emailData.receiverEmail}`);
          else console.error(`[verify-guest-payment] Receiver email failed:`, r.error);
        }).catch(e => console.error('[verify-guest-payment] Receiver email error:', e))
      );
    }

    // Wait for emails but don't fail the response if they error
    await Promise.allSettled(emailPromises);

    return NextResponse.json({
      success: true,
      awbUrl: labelUrl,
      awb,
      trackingNumber: booking.tracking_number,
    });
  } catch (error) {
    console.error('[verify-guest-payment] Error:', error);
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
