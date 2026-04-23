import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { renderCXBCAdminNotificationEmail } from '@/lib/email/templates/cxbcAdminNotificationEmail';

const ADMIN_EMAIL = 'info@courierx.in';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ownerName, businessName, email, phone,
      zone, city, state, pincode, panNumber,
      gstNumber, address, submittedAt,
    } = body;

    if (!ownerName || !businessName || !email || !phone || !zone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const html = renderCXBCAdminNotificationEmail({
      ownerName, businessName, email, phone,
      zone, city, state, pincode, panNumber,
      gstNumber: gstNumber || null,
      address, submittedAt,
    });

    const result = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `🏪 New CXBC Partner Application — ${businessName} (${city}, ${zone} Zone)`,
      html,
    });

    if (!result.success) {
      console.error('[CXBC Admin Notify] Failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: result.id });
  } catch (err: any) {
    console.error('[CXBC Admin Notify] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
