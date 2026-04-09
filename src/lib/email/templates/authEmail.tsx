import * as React from 'react';

interface AuthEmailProps {
  type: 'signup' | 'recovery' | 'email_change' | 'invite';
  confirmationUrl: string;
  email: string;
}

export function renderAuthEmail({ type, confirmationUrl, email }: AuthEmailProps): string {
  const titles = {
    signup: 'Verify your email',
    recovery: 'Reset your password',
    email_change: 'Confirm email change',
    invite: 'You\'ve been invited',
  };

  const messages = {
    signup: 'Thanks for signing up! Please verify your email address to complete your registration.',
    recovery: 'We received a request to reset your password. Click the button below to create a new password.',
    email_change: 'Please confirm your new email address by clicking the button below.',
    invite: 'You\'ve been invited to join CourierX. Click the button below to accept the invitation.',
  };

  const buttonTexts = {
    signup: 'Verify Email',
    recovery: 'Reset Password',
    email_change: 'Confirm Email',
    invite: 'Accept Invitation',
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titles[type]} - CourierX</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #E31837 0%, #C41230 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">CourierX</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">International Shipping Made Simple</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px; font-weight: 600;">${titles[type]}</h2>
              <p style="margin: 0 0 24px; color: #666666; font-size: 16px; line-height: 1.5;">
                ${messages[type]}
              </p>
              
              <!-- Button -->
              <table role="presentation" style="margin: 32px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #E31837;">
                    <a href="${confirmationUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      ${buttonTexts[type]}
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; color: #999999; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; color: #E31837; font-size: 14px; word-break: break-all;">
                ${confirmationUrl}
              </p>
              
              <hr style="margin: 32px 0; border: none; border-top: 1px solid #eeeeee;">
              
              <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.5;">
                If you didn't request this email, you can safely ignore it. This link will expire in 24 hours.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 8px; color: #999999; font-size: 13px;">
                © 2026 Goldilocks Zone Private Limited
              </p>
              <p style="margin: 0; color: #999999; font-size: 13px;">
                <a href="https://courierx.in/contact" style="color: #E31837; text-decoration: none;">Contact Us</a> • 
                <a href="https://courierx.in/privacy-policy" style="color: #E31837; text-decoration: none;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
