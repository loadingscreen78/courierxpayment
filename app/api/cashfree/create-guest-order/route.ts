import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { CASHFREE_API_BASE, CASHFREE_API_VERSION } from '@/lib/wallet/cashfreeConfig';

/**
 * Create a Cashfree payment order for guest (non-account) bookings.
 * No auth required — uses sender details for customer info.
 * Stores full booking payload so verify-guest-payment can create the NimbusPost shipment.
 */
export async function POST(request: NextRequest) {
  try {
    const appId = process.env.CASHFREE_APP_ID?.trim();
    const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();

    const formData = await request.formData();
    const amount = Number(formData.get('amount'));
    const senderReceiver = JSON.parse(formData.get('senderReceiver') as string || '{}');
    const rateFormData = JSON.parse(formData.get('rateFormData') as string || '{}');
    const selectedCourier = JSON.parse(formData.get('selectedCourier') as string || '{}');
    const aadhaarNumber = formData.get('aadhaarNumber') as string || '';
    const couponCode = formData.get('couponCode') as string || '';

    // Extract uploaded KYC documents (domestic flow)
    const kycDocument = formData.get('kycDocument') as File | null;
    const kycDocType = formData.get('kycDocType') as string || '';

    // Extract passport documents (international medicine flow)
    const passportIdentityFile = formData.get('passportIdentity') as File | null;
    const passportAddressFile = formData.get('passportAddress') as File | null;
    const passportUploadLater = formData.get('passportUploadLater') === 'true';
    const prescriptionUploadLater = formData.get('prescriptionUploadLater') === 'true';
    const pharmacyBillUploadLater = formData.get('pharmacyBillUploadLater') === 'true';

    // For domestic, senderEmail is optional. For international it's required.
    // Also allow amount=0 when a coupon covers the full cost.
    const isInternationalBooking = !!rateFormData?.destinationCountry;
    if (!senderReceiver?.senderName || !senderReceiver?.senderPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (isInternationalBooking && !senderReceiver?.senderEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (amount == null || isNaN(amount) || amount < 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const orderId = `cxg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const trackingNumber = `CRX-${Date.now().toString(36).toUpperCase()}`;

    // Store guest booking in DB with full payload for NimbusPost
    const supabase = getServiceRoleClient();

    // Upload KYC document to Supabase storage if provided
    let uploadedDocPath = '';
    let uploadedDocName = '';
    let uploadedDocType = '';
    if (kycDocument && kycDocument instanceof File && kycDocument.size > 0) {
      try {
        const timestamp = Date.now();
        const sanitizedName = kycDocument.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `guest/${orderId}/${kycDocType || 'kyc'}_${timestamp}_${sanitizedName}`;
        const buffer = Buffer.from(await kycDocument.arrayBuffer());

        const { error: uploadErr } = await supabase.storage
          .from('shipment-documents')
          .upload(storagePath, buffer, { contentType: kycDocument.type, upsert: false });

        if (uploadErr) {
          console.error('[create-guest-order] KYC doc upload failed:', uploadErr.message);
        } else {
          uploadedDocPath = storagePath;
          uploadedDocName = kycDocument.name;
          uploadedDocType = kycDocument.type;
          console.log('[create-guest-order] KYC doc uploaded:', storagePath);
        }
      } catch (uploadEx) {
        console.error('[create-guest-order] KYC doc upload exception:', uploadEx);
      }
    }

    // Upload passport documents to Supabase storage if provided (international medicine flow)
    let passportIdentityPath = '';
    let passportAddressPath = '';
    if (passportIdentityFile && passportIdentityFile instanceof File && passportIdentityFile.size > 0) {
      try {
        const timestamp = Date.now();
        const sanitizedName = passportIdentityFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `guest/${orderId}/passport_identity_${timestamp}_${sanitizedName}`;
        const buffer = Buffer.from(await passportIdentityFile.arrayBuffer());
        const { error: uploadErr } = await supabase.storage
          .from('shipment-documents')
          .upload(storagePath, buffer, { contentType: passportIdentityFile.type, upsert: false });
        if (uploadErr) {
          console.error('[create-guest-order] Passport identity upload failed:', uploadErr.message);
        } else {
          passportIdentityPath = storagePath;
        }
      } catch (ex) {
        console.error('[create-guest-order] Passport identity upload exception:', ex);
      }
    }
    if (passportAddressFile && passportAddressFile instanceof File && passportAddressFile.size > 0) {
      try {
        const timestamp = Date.now();
        const sanitizedName = passportAddressFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `guest/${orderId}/passport_address_${timestamp}_${sanitizedName}`;
        const buffer = Buffer.from(await passportAddressFile.arrayBuffer());
        const { error: uploadErr } = await supabase.storage
          .from('shipment-documents')
          .upload(storagePath, buffer, { contentType: passportAddressFile.type, upsert: false });
        if (uploadErr) {
          console.error('[create-guest-order] Passport address upload failed:', uploadErr.message);
        } else {
          passportAddressPath = storagePath;
        }
      } catch (ex) {
        console.error('[create-guest-order] Passport address upload exception:', ex);
      }
    }

    const { error: insertError } = await supabase.from('guest_bookings').insert({
      order_id: orderId,
      tracking_number: trackingNumber,
      amount,
      sender_name: senderReceiver.senderName,
      sender_email: senderReceiver.senderEmail,
      sender_phone: senderReceiver.senderPhone,
      sender_address: `${senderReceiver.senderAddress}, ${senderReceiver.senderCity} - ${senderReceiver.senderPincode}`,
      receiver_name: senderReceiver.receiverName,
      receiver_email: senderReceiver.receiverEmail,
      receiver_phone: senderReceiver.receiverPhone,
      receiver_address: `${senderReceiver.receiverAddress}, ${senderReceiver.receiverCity} - ${senderReceiver.receiverZipcode}`,
      shipment_type: rateFormData?.shipmentType || 'gift',
      courier_name: selectedCourier?.carrier || selectedCourier?.courier_name || 'Unknown',
      aadhaar_last4: aadhaarNumber?.slice(-4) || '',
      coupon_code: couponCode || null,
      status: 'pending_payment',
      booking_payload: {
        senderReceiver,
        rateFormData,
        selectedCourier,
        ...(uploadedDocPath && { kycDocPath: uploadedDocPath, kycDocName: uploadedDocName, kycDocMimeType: uploadedDocType, kycDocType }),
        ...(passportIdentityPath && { passportIdentityPath }),
        ...(passportAddressPath && { passportAddressPath }),
        ...(passportUploadLater && { passportUploadLater: true }),
        ...(prescriptionUploadLater && { prescriptionUploadLater: true }),
        ...(pharmacyBillUploadLater && { pharmacyBillUploadLater: true }),
      },
    });

    if (insertError) {
      console.error('[create-guest-order] DB insert failed:', insertError.message, insertError.code);
      return NextResponse.json({ error: `Booking failed: ${insertError.message}` }, { status: 500 });
    }

    if (!appId || !secretKey || amount === 0) {
      // Dev mode or fully-discounted order (₹0) — skip Cashfree, mark as paid immediately
      if (amount === 0) {
        await supabase
          .from('guest_bookings')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('order_id', orderId);
      }
      return NextResponse.json({
        orderId: orderId,
        trackingNumber,
        awbUrl: '',
        paymentSessionId: null,
        amount,
      });
    }

    // Create Cashfree order
    const orderPayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: `guest_${Date.now()}`,
        customer_name: senderReceiver.senderName,
        customer_email: senderReceiver.senderEmail || `guest_${Date.now()}@courierx.in`,
        customer_phone: senderReceiver.senderPhone?.replace(/\D/g, '').slice(-10) || '9999999999',
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/public/book/confirm?order_id={order_id}&tracking=${trackingNumber}`,
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/cashfree/webhook`,
      },
      order_tags: {
        type: 'guest_booking',
        tracking_number: trackingNumber,
        ...(couponCode ? { coupon_code: couponCode } : {}),
      },
    };

    const cfRes = await fetch(`${CASHFREE_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!cfRes.ok) {
      const errText = await cfRes.text();
      console.error('[create-guest-order] Cashfree error:', cfRes.status, errText);
      return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
    }

    const order = await cfRes.json();

    return NextResponse.json({
      orderId: order.order_id,
      paymentSessionId: order.payment_session_id,
      trackingNumber,
      awbUrl: '',
      amount,
    });
  } catch (error) {
    console.error('[create-guest-order] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
