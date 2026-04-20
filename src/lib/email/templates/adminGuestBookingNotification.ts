import type { GuestBookingEmailData } from './guestBookingConfirmation';

export interface AdminGuestBookingEmailData extends GuestBookingEmailData {
  orderId: string;
  aadhaarLast4?: string;
  couponCode?: string;
  weightInfo?: string;
  dimensions?: string;
  bookingMode: 'international' | 'domestic';
  paidAt?: string;
  kycDocType?: string;
}

/**
 * Render a professional admin notification email for a completed guest booking.
 * Sent to info@courierx.in with full booking details.
 */
export function renderAdminBookingNotificationEmail(data: AdminGuestBookingEmailData): string {
  const amountStr = `₹${data.amount.toLocaleString('en-IN')}`;
  const bookingTypeLabel = getBookingTypeLabel(data.shipmentType, data.bookingMode);
  const timestamp = data.paidAt ? new Date(data.paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Guest Booking — ${bookingTypeLabel}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#F40000;border-radius:12px 12px 0 0;padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:bold;color:#FFFFFF;letter-spacing:2px;">COURIERX</span>
                    <span style="color:rgba(255,255,255,0.7);font-size:13px;margin-left:12px;">Admin Notification</span>
                  </td>
                  <td align="right">
                    <span style="background-color:rgba(255,255,255,0.2);color:#FFFFFF;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">GUEST BOOKING</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color:#FFFFFF;padding:0;">

              <!-- Booking Type Banner -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:24px 32px;border-bottom:1px solid #E5E7EB;">
                    <h1 style="margin:0;font-size:20px;font-weight:700;color:#111827;">New ${bookingTypeLabel} Booking</h1>
                    <p style="margin:6px 0 0;font-size:13px;color:#6B7280;">${timestamp} IST</p>
                  </td>
                </tr>
              </table>

              <!-- Quick Stats -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:20px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                      <tr>
                        <td style="padding:14px 16px;background-color:#F9FAFB;border-right:1px solid #E5E7EB;width:33%;text-align:center;">
                          <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Order ID</p>
                          <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#111827;font-family:monospace;">${data.orderId}</p>
                        </td>
                        <td style="padding:14px 16px;background-color:#F9FAFB;border-right:1px solid #E5E7EB;width:33%;text-align:center;">
                          <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Tracking</p>
                          <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#111827;font-family:monospace;">${data.trackingNumber}</p>
                        </td>
                        <td style="padding:14px 16px;background-color:#F9FAFB;width:33%;text-align:center;">
                          <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Amount</p>
                          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#059669;">${amountStr}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${data.awb ? `
              <!-- AWB Info -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:12px 16px;">
                      <tr>
                        <td>
                          <span style="font-size:12px;color:#065F46;font-weight:600;">AWB Number:</span>
                          <span style="font-size:13px;color:#065F46;font-family:monospace;margin-left:8px;">${data.awb}</span>
                        </td>
                        ${data.labelUrl ? `<td align="right"><a href="${data.labelUrl}" style="font-size:12px;color:#059669;font-weight:600;text-decoration:none;">Download Label →</a></td>` : ''}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              <!-- Shipment Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 20px;">
                    <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Shipment Details</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                      ${renderDetailRow('Booking Mode', data.bookingMode === 'international' ? '🌍 International' : '🇮🇳 Domestic')}
                      ${renderDetailRow('Shipment Type', capitalize(data.shipmentType))}
                      ${renderDetailRow('Courier Partner', data.courierName)}
                      ${renderDetailRow('Contents', data.contentDescription || '—')}
                      ${data.weightInfo ? renderDetailRow('Weight', data.weightInfo) : ''}
                      ${data.dimensions ? renderDetailRow('Dimensions', data.dimensions) : ''}
                      ${data.destinationCountry ? renderDetailRow('Destination Country', data.destinationCountry) : ''}
                      ${data.couponCode ? renderDetailRow('Coupon Used', data.couponCode) : ''}
                      ${data.aadhaarLast4 ? renderDetailRow('Aadhaar (Last 4)', `XXXX XXXX ${data.aadhaarLast4}`) : ''}
                      ${data.kycDocType ? renderDetailRow('KYC Document', capitalize(data.kycDocType.replace(/_/g, ' '))) : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Sender Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 20px;">
                    <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">📤 Sender Details</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                      ${renderDetailRow('Name', data.senderName)}
                      ${renderDetailRow('Phone', data.senderPhone)}
                      ${data.senderEmail ? renderDetailRow('Email', data.senderEmail) : ''}
                      ${renderDetailRow('Address', `${data.senderAddress}, ${data.senderCity} - ${data.senderPincode}`)}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Receiver Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 20px;">
                    <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">📥 Receiver Details</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                      ${renderDetailRow('Name', data.receiverName)}
                      ${renderDetailRow('Phone', data.receiverPhone)}
                      ${data.receiverEmail ? renderDetailRow('Email', data.receiverEmail) : ''}
                      ${renderDetailRow('Address', `${data.receiverAddress}, ${data.receiverCity} - ${data.receiverZipcode}`)}
                      ${data.destinationCountry ? renderDetailRow('Country', data.destinationCountry) : ''}
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F9FAFB;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;">
                This is an automated notification from <span style="color:#F40000;font-weight:600;">CourierX</span> Guest Booking System.<br>
                <a href="https://courierx.in/admin" style="color:#6B7280;text-decoration:none;">Open Admin Panel →</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


/**
 * Render admin notification for an abandoned/failed guest booking.
 * Triggered when a customer reaches the summary page but cannot complete payment.
 */
export function renderAdminAbandonedBookingEmail(data: AdminGuestBookingEmailData & { abandonReason?: string }): string {
  const bookingTypeLabel = getBookingTypeLabel(data.shipmentType, data.bookingMode);
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const amountStr = `₹${data.amount.toLocaleString('en-IN')}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Abandoned Guest Booking — ${bookingTypeLabel}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#DC2626;border-radius:12px 12px 0 0;padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:bold;color:#FFFFFF;letter-spacing:2px;">COURIERX</span>
                    <span style="color:rgba(255,255,255,0.7);font-size:13px;margin-left:12px;">Admin Alert</span>
                  </td>
                  <td align="right">
                    <span style="background-color:rgba(255,255,255,0.2);color:#FFFFFF;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">⚠️ ABANDONED</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color:#FFFFFF;padding:0;">

              <!-- Alert Banner -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:24px 32px;border-bottom:1px solid #E5E7EB;">
                    <h1 style="margin:0;font-size:20px;font-weight:700;color:#DC2626;">Abandoned ${bookingTypeLabel} Booking</h1>
                    <p style="margin:6px 0 0;font-size:13px;color:#6B7280;">A customer was unable to complete their booking at the summary/payment stage.</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#9CA3AF;">${timestamp} IST</p>
                  </td>
                </tr>
              </table>

              ${data.abandonReason ? `
              <!-- Reason -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px 16px;">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:12px;font-weight:600;color:#991B1B;">Reason / Error:</p>
                          <p style="margin:4px 0 0;font-size:13px;color:#7F1D1D;">${data.abandonReason}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              <!-- Attempted Booking Value -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                      <tr>
                        <td style="padding:14px 16px;background-color:#FEF2F2;border-right:1px solid #E5E7EB;width:50%;text-align:center;">
                          <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Attempted Amount</p>
                          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#DC2626;">${amountStr}</p>
                        </td>
                        <td style="padding:14px 16px;background-color:#FEF2F2;width:50%;text-align:center;">
                          <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Booking Type</p>
                          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#374151;">${bookingTypeLabel}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Shipment Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 20px;">
                    <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Attempted Shipment Details</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                      ${renderDetailRow('Booking Mode', data.bookingMode === 'international' ? '🌍 International' : '🇮🇳 Domestic')}
                      ${renderDetailRow('Shipment Type', capitalize(data.shipmentType))}
                      ${renderDetailRow('Courier Partner', data.courierName)}
                      ${renderDetailRow('Contents', data.contentDescription || '—')}
                      ${data.weightInfo ? renderDetailRow('Weight', data.weightInfo) : ''}
                      ${data.dimensions ? renderDetailRow('Dimensions', data.dimensions) : ''}
                      ${data.destinationCountry ? renderDetailRow('Destination Country', data.destinationCountry) : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Customer Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 20px;">
                    <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">📞 Customer Contact (Sender)</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                      ${renderDetailRow('Name', data.senderName)}
                      ${renderDetailRow('Phone', data.senderPhone)}
                      ${data.senderEmail ? renderDetailRow('Email', data.senderEmail) : ''}
                      ${renderDetailRow('Address', `${data.senderAddress}, ${data.senderCity} - ${data.senderPincode}`)}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Receiver Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 20px;">
                    <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">📥 Intended Receiver</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                      ${renderDetailRow('Name', data.receiverName)}
                      ${renderDetailRow('Phone', data.receiverPhone)}
                      ${data.receiverEmail ? renderDetailRow('Email', data.receiverEmail) : ''}
                      ${renderDetailRow('Address', `${data.receiverAddress}, ${data.receiverCity} - ${data.receiverZipcode}`)}
                      ${data.destinationCountry ? renderDetailRow('Country', data.destinationCountry) : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:14px 16px;">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:13px;font-weight:600;color:#92400E;">💡 Suggested Action</p>
                          <p style="margin:6px 0 0;font-size:12px;color:#78350F;line-height:1.5;">Consider reaching out to the customer via phone (${data.senderPhone}) to assist with completing their booking. This could be a payment gateway issue, network problem, or the customer may need help.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F9FAFB;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;">
                This is an automated alert from <span style="color:#F40000;font-weight:600;">CourierX</span> Guest Booking System.<br>
                <a href="https://courierx.in/admin" style="color:#6B7280;text-decoration:none;">Open Admin Panel →</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Helpers ──

function renderDetailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;width:35%;vertical-align:top;">${label}</td>
    <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;border-bottom:1px solid #F3F4F6;word-break:break-word;">${value}</td>
  </tr>`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getBookingTypeLabel(shipmentType: string, mode: string): string {
  const typeMap: Record<string, string> = {
    medicine: 'Medicine',
    document: 'Document',
    gift: 'Gift/Parcel',
  };
  const modeLabel = mode === 'international' ? 'International' : 'Domestic';
  return `${modeLabel} ${typeMap[shipmentType] || capitalize(shipmentType)}`;
}
