export interface CXBCAdminNotificationEmailData {
  ownerName: string;
  businessName: string;
  email: string;
  phone: string;
  zone: string;
  city: string;
  state: string;
  pincode: string;
  panNumber: string;
  gstNumber?: string | null;
  address: string;
  submittedAt?: string;
}

function renderDetailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;width:38%;vertical-align:top;">${label}</td>
    <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;border-bottom:1px solid #F3F4F6;word-break:break-word;">${value}</td>
  </tr>`;
}

export function renderCXBCAdminNotificationEmail(data: CXBCAdminNotificationEmailData): string {
  const zoneName = data.zone.charAt(0).toUpperCase() + data.zone.slice(1);
  const timestamp = data.submittedAt
    ? new Date(data.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New CXBC Partner Application — ${data.businessName}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);border-radius:12px 12px 0 0;padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:bold;color:#FFFFFF;letter-spacing:2px;">COURIERX</span>
                    <span style="color:rgba(255,255,255,0.5);font-size:13px;margin-left:12px;">Super Admin Notification</span>
                  </td>
                  <td align="right">
                    <span style="background-color:#F40000;color:#FFFFFF;font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;letter-spacing:0.5px;">🏪 NEW CXBC APPLICATION</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background-color:#FFFFFF;padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 32px 20px;border-bottom:1px solid #E5E7EB;">
                    <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">
                      New Partner Application Received
                    </h1>
                    <p style="margin:0;font-size:13px;color:#6B7280;">
                      ${timestamp} IST &nbsp;·&nbsp; Action required: Review &amp; approve or reject
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Quick Stats -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:20px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
                      <tr>
                        <td style="padding:16px;background-color:#F9FAFB;border-right:1px solid #E5E7EB;width:33%;text-align:center;">
                          <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Business</p>
                          <p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#111827;">${data.businessName}</p>
                        </td>
                        <td style="padding:16px;background-color:#F9FAFB;border-right:1px solid #E5E7EB;width:33%;text-align:center;">
                          <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Zone</p>
                          <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:#F40000;">${zoneName}</p>
                        </td>
                        <td style="padding:16px;background-color:#F9FAFB;width:33%;text-align:center;">
                          <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Status</p>
                          <p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#D97706;">⏳ Pending</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Business Information -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 20px;">
                    <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;">🏢 Business Information</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                      ${renderDetailRow('Business Name', data.businessName)}
                      ${renderDetailRow('Owner Name', data.ownerName)}
                      ${renderDetailRow('PAN Number', data.panNumber)}
                      ${renderDetailRow('GST Number', data.gstNumber || 'Not provided')}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Contact Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 20px;">
                    <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;">📞 Contact Details</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                      ${renderDetailRow('Email', data.email)}
                      ${renderDetailRow('Phone', data.phone)}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Location -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 20px;">
                    <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;">📍 Location</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                      ${renderDetailRow('Address', data.address)}
                      ${renderDetailRow('City', data.city)}
                      ${renderDetailRow('State', data.state)}
                      ${renderDetailRow('Pincode', data.pincode)}
                      ${renderDetailRow('Zone', `${zoneName} India`)}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Required -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#FFF7ED 0%,#FFFBEB 100%);border:1px solid #FDE68A;border-radius:10px;padding:18px 20px;">
                      <tr>
                        <td>
                          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#92400E;">⚡ Action Required</p>
                          <p style="margin:0 0 14px;font-size:13px;color:#78350F;line-height:1.6;">
                            A new CXBC partner application is waiting for your review. Please log in to the admin panel to verify KYC documents and approve or reject this application.
                          </p>
                          <a href="https://courierx.in/admin/cxbc-partners" style="display:inline-block;padding:12px 28px;background-color:#F40000;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;letter-spacing:0.3px;">
                            Review Application →
                          </a>
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
                This is an automated notification from the <span style="color:#F40000;font-weight:600;">CourierX</span> CXBC Partner System.<br/>
                <a href="https://courierx.in/admin/cxbc-partners" style="color:#6B7280;text-decoration:none;">Open Admin Panel →</a>
                &nbsp;·&nbsp;
                <a href="https://courierx.in" style="color:#6B7280;text-decoration:none;">courierx.in</a>
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
