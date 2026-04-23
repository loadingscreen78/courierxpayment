import { getEmailWrapper } from './shared';

export interface CXBCPartnerApprovalEmailData {
  ownerName: string;
  businessName: string;
  email: string;
  phone: string;
  zone: string;
  city: string;
  state: string;
  approvedAt?: string;
}

export function renderCXBCPartnerApprovalEmail(data: CXBCPartnerApprovalEmailData): string {
  const zoneName = data.zone.charAt(0).toUpperCase() + data.zone.slice(1);
  const approvedDate = data.approvedAt
    ? new Date(data.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const content = `
    <!-- Hero Banner -->
    <div style="background:linear-gradient(135deg,#0f0f0f 0%,#1a1a1a 50%,#0f0f0f 100%);border-radius:16px;padding:40px 32px;margin-bottom:32px;text-align:center;position:relative;overflow:hidden;">
      <div style="font-size:56px;line-height:1;margin-bottom:16px;">🎉</div>
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#F40000;font-weight:600;">Official Notice</p>
      <h2 style="margin:0 0 10px;font-family:'Courier Prime',Courier,monospace;font-size:28px;font-weight:800;color:#FFFFFF;line-height:1.2;">
        You're Approved!
      </h2>
      <p style="margin:0;font-size:15px;color:#AAAAAA;line-height:1.6;">
        Your CXBC Partner application has been<br/>
        <strong style="color:#22C55E;">approved by the Super Admin</strong>
      </p>
    </div>

    <!-- Greeting -->
    <p style="margin:0 0 8px;font-size:16px;color:#262626;font-weight:600;">
      Dear ${data.ownerName},
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.7;">
      We're thrilled to inform you that your application to become a <strong>CourierX Business Centre (CXBC) Partner</strong> has been officially reviewed and <strong style="color:#16A34A;">approved</strong>. Welcome to the CourierX partner network!
    </p>

    <!-- Approval Badge -->
    <div style="background:linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 100%);border:2px solid #22C55E;border-radius:16px;padding:24px 28px;margin-bottom:28px;text-align:center;">
      <div style="display:inline-block;background:#22C55E;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:12px;">✓</div>
      <p style="margin:0 0 4px;font-size:13px;color:#15803D;text-transform:uppercase;letter-spacing:2px;font-weight:700;">Partner Status</p>
      <p style="margin:0 0 4px;font-size:26px;font-weight:800;color:#15803D;font-family:'Courier Prime',Courier,monospace;">APPROVED</p>
      <p style="margin:0;font-size:13px;color:#16A34A;">Effective: ${approvedDate}</p>
    </div>

    <!-- Partner Details Card -->
    <div style="background:#FAFAF8;border:1px solid #E5E5E5;border-radius:16px;padding:24px 28px;margin-bottom:28px;">
      <h3 style="margin:0 0 18px;font-family:'Courier Prime',Courier,monospace;font-size:15px;color:#262626;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #F40000;padding-bottom:10px;display:inline-block;">
        📋 Your Partner Details
      </h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #F0F0F0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:50%;padding-right:8px;">
                  <p style="margin:0 0 2px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Business Name</p>
                  <p style="margin:0;font-size:14px;font-weight:700;color:#262626;">${data.businessName}</p>
                </td>
                <td style="width:50%;padding-left:8px;">
                  <p style="margin:0 0 2px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Owner Name</p>
                  <p style="margin:0;font-size:14px;font-weight:700;color:#262626;">${data.ownerName}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #F0F0F0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:50%;padding-right:8px;">
                  <p style="margin:0 0 2px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Email</p>
                  <p style="margin:0;font-size:14px;color:#262626;">${data.email}</p>
                </td>
                <td style="width:50%;padding-left:8px;">
                  <p style="margin:0 0 2px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Phone</p>
                  <p style="margin:0;font-size:14px;color:#262626;">${data.phone}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:50%;padding-right:8px;">
                  <p style="margin:0 0 2px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Location</p>
                  <p style="margin:0;font-size:14px;color:#262626;">${data.city}, ${data.state}</p>
                </td>
                <td style="width:50%;padding-left:8px;">
                  <p style="margin:0 0 2px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Assigned Zone</p>
                  <p style="margin:0;font-size:14px;font-weight:700;color:#F40000;">${zoneName} India</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- What's Next -->
    <div style="background:#262626;border-radius:16px;padding:28px;margin-bottom:28px;">
      <h3 style="margin:0 0 20px;font-family:'Courier Prime',Courier,monospace;font-size:15px;color:#FFFFFF;text-transform:uppercase;letter-spacing:1px;">
        🚀 What Happens Next?
      </h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #333;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;vertical-align:top;padding-top:2px;">
                  <div style="width:28px;height:28px;line-height:28px;text-align:center;background:#F40000;border-radius:50%;font-size:13px;font-weight:800;color:#FFF;">1</div>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#FFFFFF;">Log in to your CXBC Dashboard</p>
                  <p style="margin:0;font-size:13px;color:#999;">Access your partner panel at courierx.in/cxbc</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #333;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;vertical-align:top;padding-top:2px;">
                  <div style="width:28px;height:28px;line-height:28px;text-align:center;background:#F40000;border-radius:50%;font-size:13px;font-weight:800;color:#FFF;">2</div>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#FFFFFF;">Start Booking Shipments</p>
                  <p style="margin:0;font-size:13px;color:#999;">Book international shipments for your customers</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #333;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;vertical-align:top;padding-top:2px;">
                  <div style="width:28px;height:28px;line-height:28px;text-align:center;background:#F40000;border-radius:50%;font-size:13px;font-weight:800;color:#FFF;">3</div>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#FFFFFF;">Manage Your Wallet</p>
                  <p style="margin:0;font-size:13px;color:#999;">Add funds and track your earnings in real-time</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;vertical-align:top;padding-top:2px;">
                  <div style="width:28px;height:28px;line-height:28px;text-align:center;background:#F40000;border-radius:50%;font-size:13px;font-weight:800;color:#FFF;">4</div>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#FFFFFF;">Grow Your Business</p>
                  <p style="margin:0;font-size:13px;color:#999;">Earn commissions on every shipment you process</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- Benefits Strip -->
    <div style="margin-bottom:28px;">
      <h3 style="margin:0 0 16px;font-family:'Courier Prime',Courier,monospace;font-size:15px;color:#262626;">
        🌟 Your Partner Benefits
      </h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:50%;padding:0 6px 12px 0;vertical-align:top;">
            <div style="background:#FFF5F5;border:1px solid #FECACA;border-radius:12px;padding:16px;">
              <div style="font-size:24px;margin-bottom:8px;">💰</div>
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#262626;">Commission Earnings</p>
              <p style="margin:0;font-size:12px;color:#666;">Earn on every shipment booked through your centre</p>
            </div>
          </td>
          <td style="width:50%;padding:0 0 12px 6px;vertical-align:top;">
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px;">
              <div style="font-size:24px;margin-bottom:8px;">📊</div>
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#262626;">Real-time Dashboard</p>
              <p style="margin:0;font-size:12px;color:#666;">Track all shipments and wallet balance live</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="width:50%;padding:0 6px 0 0;vertical-align:top;">
            <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:16px;">
              <div style="font-size:24px;margin-bottom:8px;">🤝</div>
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#262626;">Dedicated Support</p>
              <p style="margin:0;font-size:12px;color:#666;">Priority partner support from our team</p>
            </div>
          </td>
          <td style="width:50%;padding:0 0 0 6px;vertical-align:top;">
            <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px;">
              <div style="font-size:24px;margin-bottom:8px;">🌍</div>
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#262626;">Global Reach</p>
              <p style="margin:0;font-size:12px;color:#666;">Ship to 200+ countries through CourierX</p>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin:32px 0;">
      <a href="https://courierx.in/cxbc/dashboard" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#F40000 0%,#CC0000 100%);color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:800;font-size:16px;font-family:'Courier Prime',Courier,monospace;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(244,0,0,0.3);">
        Access CXBC Dashboard →
      </a>
    </div>

    <!-- Divider -->
    <div style="border-top:1px solid #E5E5E5;margin:28px 0;"></div>

    <!-- Footer Note -->
    <div style="text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#555;line-height:1.6;">
        This approval was issued by the <strong>CourierX Super Admin</strong>.<br/>
        If you have any questions, our partner support team is here to help.
      </p>
      <p style="margin:0 0 4px;font-size:12px;color:#999;">
        <a href="mailto:support@courierx.in" style="color:#F40000;text-decoration:none;">support@courierx.in</a>
        &nbsp;·&nbsp;
        <a href="https://courierx.in" style="color:#F40000;text-decoration:none;">courierx.in</a>
        &nbsp;·&nbsp;
        <a href="https://courierx.in/cxbc" style="color:#F40000;text-decoration:none;">CXBC Portal</a>
      </p>
      <p style="margin:8px 0 0;font-size:11px;color:#BBB;">
        © ${new Date().getFullYear()} CourierX. All rights reserved.
      </p>
    </div>
  `;

  return getEmailWrapper(content);
}
