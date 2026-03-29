interface GuestOtpEmailProps {
  otp: string;
  email: string;
}

export function renderGuestOtpEmail({ otp, email }: GuestOtpEmailProps): string {
  const digits = otp.split('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your CourierX Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#0F0F0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0F0F;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
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

                <!-- Red accent bar -->
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#F40000,#FF6B35,#F40000);font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:40px 36px;">

                    <!-- Shield icon -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding-bottom:24px;">
                          <div style="width:56px;height:56px;border-radius:50%;background-color:rgba(244,0,0,0.12);display:inline-block;text-align:center;line-height:56px;font-size:28px;">🔐</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Heading -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding-bottom:8px;">
                          <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">Verify Your Email</h1>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom:32px;">
                          <p style="margin:0;font-size:14px;color:#888888;line-height:1.5;">Enter this code to continue with your shipment booking</p>
                        </td>
                      </tr>
                    </table>

                    <!-- OTP Code Boxes -->
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
                      <tr>
${digits.map(d => `                        <td style="padding:0 4px;">
                          <div style="width:48px;height:56px;background-color:#262626;border:2px solid #333333;border-radius:10px;text-align:center;line-height:56px;font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:bold;color:#FFFFFF;letter-spacing:1px;">${d}</div>
                        </td>`).join('\n')}
                      </tr>
                    </table>

                    <!-- Timer notice -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding-top:24px;padding-bottom:28px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background-color:rgba(244,0,0,0.08);border-radius:20px;padding:8px 16px;">
                                <span style="font-size:12px;color:#F40000;font-weight:600;">⏱ Valid for 10 minutes</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-top:1px solid #2A2A2A;padding-top:24px;">
                          <p style="margin:0;font-size:12px;color:#666666;line-height:1.6;text-align:center;">
                            This code was requested for <span style="color:#AAAAAA;font-weight:600;">${email}</span><br>
                            If you didn't request this, you can safely ignore this email.
                          </p>
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
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;font-size:11px;color:#555555;line-height:1.5;">
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
