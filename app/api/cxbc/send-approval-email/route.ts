import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';
import { sendEmail } from '@/lib/email/resend';
import { renderCXBCPartnerApprovalEmail } from '@/lib/email/templates/cxbcPartnerApprovalEmail';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    const { data: application, error } = await supabase
      .from('cxbc_partner_applications')
      .select('owner_name, business_name, email, phone, zone, city, state, reviewed_at')
      .eq('id', applicationId)
      .maybeSingle();

    if (error || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const html = renderCXBCPartnerApprovalEmail({
      ownerName: application.owner_name,
      businessName: application.business_name,
      email: application.email,
      phone: application.phone,
      zone: application.zone,
      city: application.city,
      state: application.state,
      approvedAt: application.reviewed_at ?? undefined,
    });

    const result = await sendEmail({
      to: application.email,
      subject: `🎉 Congratulations! Your CXBC Partner Application is Approved — ${application.business_name}`,
      html,
    });

    if (!result.success) {
      console.error('[CXBC Approval Email] Failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: result.id });
  } catch (err: any) {
    console.error('[CXBC Approval Email] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
