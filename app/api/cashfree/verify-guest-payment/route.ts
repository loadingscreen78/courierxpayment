import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { CASHFREE_API_BASE, CASHFREE_API_VERSION } from '@/lib/wallet/cashfreeConfig';
import { createDomesticShipment, fetchDomesticRates } from '@/lib/domestic/nimbusPostDomestic';
import { lookupPincode } from '@/lib/pincode-lookup';
import { getNearestWarehouse } from '@/lib/warehouse/getWarehouse';
import { sendEmail, type EmailAttachment } from '@/lib/email/resend';
import { renderSenderConfirmationEmail, renderReceiverNotificationEmail, type GuestBookingEmailData } from '@/lib/email/templates/guestBookingConfirmation';
import { renderAdminBookingNotificationEmail, type AdminGuestBookingEmailData } from '@/lib/email/templates/adminGuestBookingNotification';

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

    // Optional auth — if a logged-in user is verifying, link the booking to their account
    const authHeader = request.headers.get('authorization');
    let callerUserId: string | null = null;

    const appId = process.env.CASHFREE_APP_ID?.trim();
    const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
    const supabase = getServiceRoleClient();

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
        callerUserId = user?.id ?? null;
      } catch { /* non-fatal */ }
    }

    const devMode = !appId || !secretKey;
    let isPaid = devMode;

    if (!devMode) {
      // If booking is already marked paid in DB (e.g. ₹0 coupon order), trust the DB
      const { data: preCheck } = await supabase
        .from('guest_bookings')
        .select('status, amount')
        .eq('order_id', orderId)
        .maybeSingle();

      if (preCheck?.status === 'paid' || preCheck?.status === 'shipped' || Number(preCheck?.amount) === 0) {
        isPaid = true;
      } else {
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

    // Already failed NimbusPost — allow one retry
    if (booking.status === 'paid_nimbus_failed') {
      console.log('[verify-guest-payment] Retrying previously failed NimbusPost shipment for:', orderId);
      // Reset status to paid so we retry below
      await supabase
        .from('guest_bookings')
        .update({ status: 'paid' })
        .eq('order_id', orderId);
    }

    // Mark as paid if still pending
    if (booking.status === 'pending_payment') {
      await supabase
        .from('guest_bookings')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          ...(callerUserId && !booking.user_id ? { user_id: callerUserId } : {}),
        })
        .eq('order_id', orderId);
    }

    console.log('[verify-guest-payment] Processing booking:', orderId, 'status:', booking.status);

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

    // Determine if this is an international booking
    const isInternational = !!rateFormData?.destinationCountry;

    console.log('[verify-guest-payment] Booking type:', isInternational ? 'INTERNATIONAL' : 'DOMESTIC', 
      'shipmentType:', rateFormData?.shipmentType,
      'selectedCourier keys:', selectedCourier ? Object.keys(selectedCourier) : 'null');

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
        // For international bookings, we need a domestic courier to ship to warehouse
        let courierId = Number(
          selectedCourier?.courier_company_id
          || selectedCourier?.courier_id
          || selectedCourier?.id
          || 0
        );

        // Clean phone numbers — NimbusPost expects 10-digit Indian numbers
        const cleanPhone = (phone: string) => {
          const digits = (phone || '').replace(/\D/g, '');
          return digits.length > 10 ? digits.slice(-10) : digits || '9999999999';
        };

        // Get sender pincode and state
        const senderPincode = senderReceiver.senderPincode
          || rateFormData?.pickupPincode || '';
        const senderLookup = await lookupPincode(senderPincode);
        const senderState = senderLookup?.state || 'Unknown';
        const senderCity = senderReceiver.senderCity || senderLookup?.city || 'Unknown';

        if (isInternational) {
          // ── INTERNATIONAL: pickup = customer, delivery = nearest warehouse ──
          const warehouse = await getNearestWarehouse(senderState);

          // For international, we don't have a NimbusPost courier_id from rate check
          // (international rates come from our own calculator, not NimbusPost).
          // We need to fetch domestic rates for customer→warehouse and pick cheapest.
          if (!courierId) {
            const weightKg = Number(rateFormData?.weightGrams) ? Number(rateFormData.weightGrams) / 1000 : 0.5;
            console.log('[verify-guest-payment] No courierId for intl, fetching domestic rates:', JSON.stringify({
              pickupPincode: senderPincode,
              deliveryPincode: warehouse.pincode,
              weightKg,
              senderState,
            }));
            try {
              const domesticRates = await fetchDomesticRates({
                pickupPincode: senderPincode,
                deliveryPincode: warehouse.pincode,
                weightKg,
                lengthCm: Number(rateFormData?.lengthCm) || 20,
                widthCm: Number(rateFormData?.widthCm) || 15,
                heightCm: Number(rateFormData?.heightCm) || 10,
                declaredValue: Number(rateFormData?.declaredValue) || 1000,
                shipmentType: 'gift',
              });
              console.log('[verify-guest-payment] Domestic rates result:', domesticRates.length, 'couriers found',
                domesticRates.length > 0 ? `cheapest: ${domesticRates[0].courier_name} id=${domesticRates[0].courier_company_id}` : 'NONE');
              if (domesticRates.length > 0) {
                courierId = domesticRates[0].courier_company_id;
              }
            } catch (rateErr) {
              console.error('[verify-guest-payment] Failed to fetch domestic rates for intl leg:', rateErr);
            }
          }

          if (!courierId) {
            throw new Error('No domestic courier available for customer→warehouse leg');
          }

          const weightKg = Number(rateFormData?.weightGrams) ? Number(rateFormData.weightGrams) / 1000 : 0.5;

          console.log('[verify-guest-payment] International NimbusPost: customer→warehouse', JSON.stringify({
            courier_id: courierId,
            tracking: booking.tracking_number,
            weight: weightKg,
            pickup: senderPincode,
            delivery: warehouse.pincode,
            warehouse: warehouse.name,
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
              name: warehouse.name,
              phone: cleanPhone(warehouse.phone),
              address: warehouse.address,
              city: warehouse.city,
              state: warehouse.state,
              pincode: warehouse.pincode,
            },
            order_amount: Number(rateFormData?.declaredValue) || Number(booking.amount) || 100,
            weight: weightKg,
            length: Number(rateFormData?.lengthCm) || 20,
            breadth: Number(rateFormData?.widthCm) || 15,
            height: Number(rateFormData?.heightCm) || 10,
            payment_type: 'prepaid',
            content_description: senderReceiver.contentDescription
              || rateFormData?.shipmentType
              || 'International Guest Shipment',
          });

          if (nimbusResult.success && nimbusResult.awb) {
            awb = nimbusResult.awb;
            labelUrl = nimbusResult.label_url || '';
            console.log('[verify-guest-payment] NimbusPost intl domestic leg created. AWB:', awb);
          } else {
            throw new Error(nimbusResult.error || 'NimbusPost domestic leg failed');
          }
        } else {
          // ── DOMESTIC: pickup = customer, delivery = receiver (as before) ──
          if (!courierId) {
            throw new Error('No courier_company_id in selectedCourier');
          }

          const weightKg = Number(rateFormData?.weightKg) || 0.5;
          const receiverPincode = senderReceiver.receiverZipcode
            || senderReceiver.receiverPincode
            || rateFormData?.deliveryPincode || '';
          const receiverLookup = await lookupPincode(receiverPincode);
          const receiverState = receiverLookup?.state || 'Unknown';
          const receiverCity = senderReceiver.receiverCity || receiverLookup?.city || 'Unknown';

          console.log('[verify-guest-payment] Domestic NimbusPost payload:', JSON.stringify({
            courier_id: courierId,
            tracking: booking.tracking_number,
            weight: weightKg,
            senderPincode,
            receiverPincode,
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
            order_amount: Math.max(100, Number(rateFormData?.declaredValue) || Number(booking.amount) || 100),
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
            console.log('[verify-guest-payment] NimbusPost domestic shipment created. AWB:', awb);
          } else {
            throw new Error(nimbusResult.error || 'NimbusPost shipment creation failed');
          }
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

    // Update guest booking with AWB (and link to user if authenticated)
    await supabase
      .from('guest_bookings')
      .update({
        status: 'shipped',
        awb_number: awb,
        label_url: labelUrl,
        ...(callerUserId && !booking.user_id ? { user_id: callerUserId } : {}),
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

    // ── Send admin notification email with all details + document attachments ──
    const bookingMode = isInternational ? 'international' : 'domestic';
    const shipmentTypeLabel = rateFormData?.shipmentType || 'parcel';
    const adminSubjectPrefix = isInternational ? '🌍 Intl' : '🇮🇳 Domestic';
    const adminSubjectType = shipmentTypeLabel.charAt(0).toUpperCase() + shipmentTypeLabel.slice(1);

    const adminEmailData: AdminGuestBookingEmailData = {
      ...emailData,
      orderId,
      aadhaarLast4: booking.aadhaar_last4 || '',
      couponCode: booking.coupon_code || '',
      weightInfo: rateFormData?.weightGrams
        ? `${rateFormData.weightGrams}g`
        : rateFormData?.weightKg
          ? `${rateFormData.weightKg} kg`
          : '',
      dimensions: rateFormData?.lengthCm
        ? `${rateFormData.lengthCm} × ${rateFormData.widthCm} × ${rateFormData.heightCm} cm`
        : '',
      bookingMode: bookingMode as 'international' | 'domestic',
      paidAt: booking.paid_at || new Date().toISOString(),
      kycDocType: bookingPayload?.kycDocType || '',
    };

    // Collect document attachments from Supabase storage
    const adminAttachments: EmailAttachment[] = [];
    try {
      if (bookingPayload?.kycDocPath) {
        const { data: docData, error: docErr } = await supabase.storage
          .from('shipment-documents')
          .download(bookingPayload.kycDocPath);
        if (docData && !docErr) {
          const buffer = Buffer.from(await docData.arrayBuffer());
          adminAttachments.push({
            filename: bookingPayload.kycDocName || 'kyc-document',
            content: buffer,
            contentType: bookingPayload.kycDocMimeType || 'application/octet-stream',
          });
          console.log(`[verify-guest-payment] Attached KYC doc: ${bookingPayload.kycDocName}`);
        } else {
          console.error('[verify-guest-payment] Failed to download KYC doc for admin email:', docErr?.message);
        }
      }
    } catch (attachErr) {
      console.error('[verify-guest-payment] Error fetching attachments for admin email:', attachErr);
    }

    emailPromises.push(
      sendEmail({
        to: 'info@courierx.in',
        subject: `${adminSubjectPrefix} ${adminSubjectType} Booking — ${emailData.trackingNumber} | ₹${emailData.amount.toLocaleString('en-IN')} | ${emailData.senderName}`,
        html: renderAdminBookingNotificationEmail(adminEmailData),
        ...(adminAttachments.length > 0 && { attachments: adminAttachments }),
      }).then(r => {
        if (r.success) console.log(`[verify-guest-payment] Admin notification sent to info@courierx.in`);
        else console.error(`[verify-guest-payment] Admin email failed:`, r.error);
      }).catch(e => console.error('[verify-guest-payment] Admin email error:', e))
    );

    // Wait for emails but don't fail the response if they error
    await Promise.allSettled(emailPromises);

    return NextResponse.json({
      success: true,
      awbUrl: labelUrl,
      awb,
      trackingNumber: booking.tracking_number,
      shipmentType: rateFormData?.shipmentType || '',
      mode: isInternational ? 'international' : 'domestic',
    });
  } catch (error) {
    console.error('[verify-guest-payment] Error:', error);
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
