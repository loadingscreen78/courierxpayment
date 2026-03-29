export interface GuestBookingEmailData {
  trackingNumber: string;
  awb: string;
  labelUrl: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  senderAddress: string;
  senderCity: string;
  senderPincode: string;
  receiverName: string;
  receiverEmail: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverCity: string;
  receiverZipcode: string;
  shipmentType: string;
  contentDescription: string;
  amount: number;
  courierName: string;
  destinationCountry?: string;
}

// ── Sender confirmation email (dark branded) ──
export function renderSenderConfirmationEmail(data: GuestBookingEmailData): string {
  const amountStr = `₹${data.amount.toLocaleString('en-IN')}`;
  const awbSection = data.labelUrl
    ? `<tr><td align="center" style="padding-top:24px;padding-bottom:8px;">
        <a href="${data.labelUrl}" style="display:inline-block;background-color:#F40000;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;">📄 Download AWB Label</a>
       </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed — CourierX</title>
</head>
<body style="margin:0;padding:0;background-color:#0F0F0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0F0F;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#F40000;border-radius:12px;padding:10px 20px;">
                    <span style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:bold;color:#FFFFFF;letter-spacing:2px;">COURIERX</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color:#1A1A1A;border-radius:16px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:4px;background:linear-gradient(90deg,#16A34A,#22C55E,#16A34A);font-size:0;line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td style="padding:36px 32px;">

                    <!-- Success icon -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center" style="padding-bottom:20px;">
                        <div style="width:56px;height:56px;border-radius:50%;background-color:rgba(22,163,74,0.15);display:inline-block;text-align:center;line-height:56px;font-size:28px;">✅</div>
                      </td></tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center" style="padding-bottom:4px;">
                        <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;">Shipment Booked!</h1>
                      </td></tr>
                      <tr><td align="center" style="padding-bottom:28px;">
                        <p style="margin:0;font-size:14px;color:#888888;">Hi ${data.senderName}, your shipment has been confirmed and is being processed.</p>
                      </td></tr>
                    </table>

                    <!-- Tracking Number Box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="background-color:#262626;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:1px;padding-bottom:6px;">Tracking Number</td>
                          </tr>
                          <tr>
                            <td style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:bold;color:#FFFFFF;letter-spacing:1px;">${data.trackingNumber}</td>
                          </tr>
                          ${data.awb ? `<tr><td style="font-size:11px;color:#666666;padding-top:6px;">AWB: ${data.awb}</td></tr>` : ''}
                        </table>
                      </td></tr>
                    </table>

                    ${awbSection}

                    <!-- Shipment Details -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                      <tr><td style="border-top:1px solid #2A2A2A;padding-top:20px;padding-bottom:8px;">
                        <span style="font-size:13px;font-weight:600;color:#AAAAAA;text-transform:uppercase;letter-spacing:0.5px;">Shipment Details</span>
                      </td></tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;font-size:13px;color:#666666;">Type</td>
                        <td style="padding:8px 0;text-align:right;font-size:13px;color:#CCCCCC;">${data.shipmentType}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:13px;color:#666666;">Courier</td>
                        <td style="padding:8px 0;text-align:right;font-size:13px;color:#CCCCCC;">${data.courierName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:13px;color:#666666;">Contents</td>
                        <td style="padding:8px 0;text-align:right;font-size:13px;color:#CCCCCC;max-width:200px;word-break:break-word;">${data.contentDescription || '—'}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:13px;color:#666666;">Amount Paid</td>
                        <td style="padding:8px 0;text-align:right;font-size:14px;font-weight:700;color:#FFFFFF;">${amountStr}</td>
                      </tr>
                      ${data.destinationCountry ? `<tr>
                        <td style="padding:8px 0;font-size:13px;color:#666666;">Destination</td>
                        <td style="padding:8px 0;text-align:right;font-size:13px;color:#CCCCCC;">${data.destinationCountry}</td>
                      </tr>` : ''}
                    </table>

                    <!-- Addresses -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                      <tr><td style="border-top:1px solid #2A2A2A;padding-top:20px;padding-bottom:8px;">
                        <span style="font-size:13px;font-weight:600;color:#AAAAAA;text-transform:uppercase;letter-spacing:0.5px;">Delivery To</span>
                      </td></tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;font-size:14px;color:#FFFFFF;font-weight:600;">${data.receiverName}</td></tr>
                      <tr><td style="padding:2px 0;font-size:13px;color:#888888;">${data.receiverAddress}</td></tr>
                      <tr><td style="padding:2px 0;font-size:13px;color:#888888;">${data.receiverCity} ${data.receiverZipcode}</td></tr>
                      <tr><td style="padding:2px 0;font-size:13px;color:#888888;">${data.receiverPhone}</td></tr>
                    </table>

                    <!-- Track button -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center" style="padding-top:28px;">
                        <a href="https://courierx.in/public/track" style="display:inline-block;background-color:#262626;border:1px solid #333333;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;">📍 Track Your Shipment</a>
                      </td></tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#555555;line-height:1.6;">
                Sent by <span style="color:#F40000;font-weight:600;">CourierX</span> · India's trusted international courier<br>
                <a href="https://courierx.in" style="color:#666666;text-decoration:none;">courierx.in</a>
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


// ── Receiver notification email (dark branded) ──
export function renderReceiverNotificationEmail(data: GuestBookingEmailData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A Shipment Is On Its Way — CourierX</title>
</head>
<body style="margin:0;padding:0;background-color:#0F0F0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0F0F;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#F40000;border-radius:12px;padding:10px 20px;">
                    <span style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:bold;color:#FFFFFF;letter-spacing:2px;">COURIERX</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color:#1A1A1A;border-radius:16px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:4px;background:linear-gradient(90deg,#3B82F6,#60A5FA,#3B82F6);font-size:0;line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td style="padding:36px 32px;">

                    <!-- Package icon -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center" style="padding-bottom:20px;">
                        <div style="width:56px;height:56px;border-radius:50%;background-color:rgba(59,130,246,0.15);display:inline-block;text-align:center;line-height:56px;font-size:28px;">📦</div>
                      </td></tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center" style="padding-bottom:4px;">
                        <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;">A Shipment Is On Its Way!</h1>
                      </td></tr>
                      <tr><td align="center" style="padding-bottom:28px;">
                        <p style="margin:0;font-size:14px;color:#888888;line-height:1.5;">Hi ${data.receiverName}, <span style="color:#CCCCCC;font-weight:600;">${data.senderName}</span> has sent you a shipment via CourierX.</p>
                      </td></tr>
                    </table>

                    <!-- Tracking Number Box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="background-color:#262626;border-radius:10px;padding:16px 20px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:1px;padding-bottom:6px;">Tracking Number</td>
                          </tr>
                          <tr>
                            <td style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:bold;color:#FFFFFF;letter-spacing:1px;">${data.trackingNumber}</td>
                          </tr>
                        </table>
                      </td></tr>
                    </table>

                    <!-- Shipment Info -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                      <tr><td style="border-top:1px solid #2A2A2A;padding-top:20px;padding-bottom:8px;">
                        <span style="font-size:13px;font-weight:600;color:#AAAAAA;text-transform:uppercase;letter-spacing:0.5px;">Shipment Info</span>
                      </td></tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;font-size:13px;color:#666666;">From</td>
                        <td style="padding:8px 0;text-align:right;font-size:13px;color:#CCCCCC;">${data.senderName}, ${data.senderCity}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:13px;color:#666666;">Type</td>
                        <td style="padding:8px 0;text-align:right;font-size:13px;color:#CCCCCC;">${data.shipmentType}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:13px;color:#666666;">Courier</td>
                        <td style="padding:8px 0;text-align:right;font-size:13px;color:#CCCCCC;">${data.courierName}</td>
                      </tr>
                    </table>

                    <!-- Delivery Address -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                      <tr><td style="border-top:1px solid #2A2A2A;padding-top:20px;padding-bottom:8px;">
                        <span style="font-size:13px;font-weight:600;color:#AAAAAA;text-transform:uppercase;letter-spacing:0.5px;">Delivering To</span>
                      </td></tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;font-size:14px;color:#FFFFFF;font-weight:600;">${data.receiverName}</td></tr>
                      <tr><td style="padding:2px 0;font-size:13px;color:#888888;">${data.receiverAddress}</td></tr>
                      <tr><td style="padding:2px 0;font-size:13px;color:#888888;">${data.receiverCity} ${data.receiverZipcode}</td></tr>
                    </table>

                    <!-- Track button -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center" style="padding-top:28px;">
                        <a href="https://courierx.in/public/track" style="display:inline-block;background-color:#3B82F6;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;">📍 Track This Shipment</a>
                      </td></tr>
                    </table>

                    <!-- Note -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="border-top:1px solid #2A2A2A;margin-top:24px;padding-top:20px;">
                        <p style="margin:0;font-size:12px;color:#666666;line-height:1.6;text-align:center;">
                          You're receiving this because ${data.senderName} listed your email as the recipient.<br>
                          If this wasn't expected, you can safely ignore this email.
                        </p>
                      </td></tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#555555;line-height:1.6;">
                Sent by <span style="color:#F40000;font-weight:600;">CourierX</span> · India's trusted international courier<br>
                <a href="https://courierx.in" style="color:#666666;text-decoration:none;">courierx.in</a>
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
