export interface ContactFormEmailProps {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  reason: string;
  message: string;
}

export function renderContactFormEmail({
  firstName,
  lastName,
  email,
  phone,
  reason,
  message,
}: ContactFormEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #F40000 0%, #C00000 100%); padding: 32px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                      New Contact Form Submission
                    </h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                      CourierX Contact Form
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    
                    <!-- Customer Info -->
                    <div style="margin-bottom: 32px;">
                      <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 18px; font-weight: 600;">
                        Customer Information
                      </h2>
                      
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 12px; background-color: #f9f9f9; border-radius: 8px; margin-bottom: 8px;">
                            <p style="margin: 0; color: #666666; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Name</p>
                            <p style="margin: 4px 0 0; color: #1a1a1a; font-size: 16px; font-weight: 500;">${firstName} ${lastName}</p>
                          </td>
                        </tr>
                        <tr><td style="height: 8px;"></td></tr>
                        <tr>
                          <td style="padding: 12px; background-color: #f9f9f9; border-radius: 8px;">
                            <p style="margin: 0; color: #666666; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                            <p style="margin: 4px 0 0; color: #1a1a1a; font-size: 16px; font-weight: 500;">
                              <a href="mailto:${email}" style="color: #F40000; text-decoration: none;">${email}</a>
                            </p>
                          </td>
                        </tr>
                        ${phone ? `
                        <tr><td style="height: 8px;"></td></tr>
                        <tr>
                          <td style="padding: 12px; background-color: #f9f9f9; border-radius: 8px;">
                            <p style="margin: 0; color: #666666; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Phone</p>
                            <p style="margin: 4px 0 0; color: #1a1a1a; font-size: 16px; font-weight: 500;">
                              <a href="tel:${phone}" style="color: #F40000; text-decoration: none;">${phone}</a>
                            </p>
                          </td>
                        </tr>
                        ` : ''}
                        <tr><td style="height: 8px;"></td></tr>
                        <tr>
                          <td style="padding: 12px; background-color: #f9f9f9; border-radius: 8px;">
                            <p style="margin: 0; color: #666666; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Inquiry Type</p>
                            <p style="margin: 4px 0 0; color: #1a1a1a; font-size: 16px; font-weight: 500;">${reason}</p>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Message -->
                    <div style="margin-bottom: 32px;">
                      <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 18px; font-weight: 600;">
                        Message
                      </h2>
                      <div style="padding: 20px; background-color: #f9f9f9; border-left: 4px solid #F40000; border-radius: 8px;">
                        <p style="margin: 0; color: #333333; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                      </div>
                    </div>

                    <!-- Quick Actions -->
                    <div style="text-align: center; padding: 24px; background-color: #f9f9f9; border-radius: 8px;">
                      <p style="margin: 0 0 16px; color: #666666; font-size: 14px;">Quick Actions</p>
                      <a href="mailto:${email}?subject=Re: Your CourierX Inquiry" 
                         style="display: inline-block; background-color: #F40000; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; margin: 0 8px;">
                        Reply to Customer
                      </a>
                    </div>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #999999; font-size: 13px;">
                      © 2026 Goldilocks Zone Private Limited
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 13px;">
                      This is an automated notification from your CourierX contact form.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
