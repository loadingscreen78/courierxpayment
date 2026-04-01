import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { userEmail, userName, reason } = await req.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'CourierX <noreply@courierx.in>',
      to: [userEmail],
      subject: 'CourierX Account Application Update',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Application Update</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Account Application Update</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        Hi ${userName || 'there'},
                      </p>
                      
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        Thank you for your interest in opening a CourierX account. After reviewing your application, we regret to inform you that we are unable to approve your account at this time.
                      </p>
                      
                      ${reason ? `
                      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 30px 0; border-radius: 8px;">
                        <h3 style="margin: 0 0 12px; color: #991b1b; font-size: 16px;">Reason:</h3>
                        <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
                          ${reason}
                        </p>
                      </div>
                      ` : ''}
                      
                      <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 8px;">
                        <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 18px;">You Can Still Ship With Us!</h3>
                        <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
                          Even without an account, you can use our guest shipping service to send packages domestically and internationally at standard rates.
                        </p>
                      </div>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://courierx.in'}/public/book" 
                           style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          Ship as Guest
                        </a>
                      </div>
                      
                      <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                        If you believe this decision was made in error or have questions, please contact our support team.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                        <strong>CourierX</strong> - Your Trusted Shipping Partner
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        © ${new Date().getFullYear()} CourierX. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('[account-rejected] Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[account-rejected] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
