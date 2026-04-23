'use client';

import { useRef } from 'react';

const QUOTE = {
  number: 'CX-202604-4872',
  issueDate: '22 April 2026',
  validUntil: '24 April 2026',
  customer: {
    name: 'Ms. Snigdha Moharana',
    phone: '+91 9776846418',
  },
  from: { city: 'Telengapentha', state: 'Odisha', pin: '754001' },
  to: { city: 'Dhandhuka', state: 'Gujarat', pin: '382460' },
  weight: '120–150 kg',
  pieces: '12 pcs',
  description: 'Household Goods — 12 Trolley Bags',
  declaredValue: '₹1,50,000',
  plans: [
    {
      id: 'express',
      name: 'EXPRESS',
      icon: '⚡',
      days: '1–2 Working Days',
      baseFreight: 42000,
      insurance: 7500,
      packing: 3500,
      loading: 1500,
      surcharge: 1464,
      total: 55964,
      totalWords: 'Fifty-Five Thousand Nine Hundred Sixty-Four',
    },
    {
      id: 'economy',
      name: 'ECONOMY',
      icon: '⏳',
      days: '2–3 Working Days',
      baseFreight: 38500,
      insurance: 7500,
      packing: 3500,
      loading: 1500,
      surcharge: 1388,
      total: 52388,
      totalWords: 'Fifty-Two Thousand Three Hundred Eighty-Eight',
      featured: true,
    },
    {
      id: 'saver',
      name: 'SAVER',
      icon: '○',
      days: '3–4 Working Days',
      baseFreight: 35500,
      insurance: 7500,
      packing: 3000,
      loading: 1500,
      surcharge: 1698,
      total: 49198,
      totalWords: 'Forty-Nine Thousand One Hundred Ninety-Eight',
    },
  ],
  terms: [
    { title: 'Validity', text: 'Quotation is valid for 2 days from the date of issue.' },
    { title: 'Insurance', text: 'Covers declared value of ₹1,50,000. Claims subject to insurer\'s policy terms.' },
    { title: 'Payment Terms', text: '50% advance at booking. Balance payable prior to final delivery.' },
    { title: 'Transit Time', text: 'Working days only. Delays from weather, strikes, or force majeure excluded.' },
    { title: 'Prohibited Items', text: 'Flammables, perishables, cash, jewelry, and original documents strictly prohibited.' },
    { title: 'Weight Variances', text: 'Excess weight at pickup charged at actuals on a pro-rata basis.' },
  ],
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function QuotationPage() {
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    const el = printRef.current;
    if (!el) return;

    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;

    // If content is taller than one A4 page, add extra pages
    const pageH = pdf.internal.pageSize.getHeight();
    if (pdfH <= pageH) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
    } else {
      let yOffset = 0;
      let remaining = pdfH;
      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, pdfH);
        remaining -= pageH;
        yOffset += pageH;
        if (remaining > 0) pdf.addPage();
      }
    }

    pdf.save(`CourierX-Quotation-${QUOTE.number}.pdf`);
  };

  return (
    <div style={{ background: '#F5F4F0', minHeight: '100vh', padding: '32px 16px', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      {/* Download button — outside print area */}
      <div style={{ maxWidth: 900, margin: '0 auto 20px', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={() => window.print()}
          style={{
            background: 'transparent',
            border: '1.5px solid #262626',
            color: '#262626',
            padding: '10px 22px',
            borderRadius: 3,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
        >
          🖨 Print
        </button>
        <button
          onClick={handleDownloadPDF}
          style={{
            background: '#F40000',
            border: 'none',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 3,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
        >
          ↓ Download PDF
        </button>
      </div>

      {/* Quotation document */}
      <div
        ref={printRef}
        style={{
          maxWidth: 900,
          margin: '0 auto',
          background: '#fff',
          boxShadow: '0 4px 60px rgba(0,0,0,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Header />
        <RouteSection />
        <CustomerSection />
        <PricingSection />
        <BreakdownTable />
        <TermsSection />
        <AcceptanceSection />
        <Footer />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        @media print {
          body > *:not(#__next) { display: none; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function Header() {
  return (
    <div style={{ background: '#1A1A18', padding: '44px 52px 40px', position: 'relative', overflow: 'hidden' }}>
      {/* Watermark X */}
      <div style={{
        position: 'absolute', right: -20, top: -30,
        fontFamily: 'Syne, sans-serif', fontSize: 280, fontWeight: 800,
        color: 'rgba(255,255,255,0.04)', lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
      }}>X</div>

      {/* Top row: logo + doc badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        {/* Logo */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            {/* Inline SVG logo mark — simplified X mark */}
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="4" fill="#F40000"/>
              <path d="M8 8L28 28M28 8L8 28" stroke="white" strokeWidth="4.5" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>
                COURIER<span style={{ color: '#F40000' }}>X</span>
              </div>
              <div style={{ fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#9B9B93', fontWeight: 500, marginTop: 3 }}>
                Trusted · Fast · Insured
              </div>
            </div>
          </div>
        </div>

        {/* Doc badge */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#9B9B93', marginBottom: 6, fontWeight: 500 }}>
            Shipping Quotation
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>
            {QUOTE.number}
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2, padding: '4px 12px', marginTop: 8, display: 'inline-block',
          }}>
            <span style={{ fontSize: 11, color: '#F4825D', fontWeight: 500 }}>Valid until {QUOTE.validUntil}</span>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 28 }}>
        {[
          { label: 'Email', value: 'info@courierx.in' },
          { label: 'Phone', value: '+91 70083 68628' },
          { label: 'Website', value: 'courierx.in' },
        ].map((m, i) => (
          <div key={m.label} style={{ paddingRight: 24, borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none', marginRight: i < 2 ? 24 : 0 }}>
            <div style={{ fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#9B9B93', marginBottom: 5 }}>{m.label}</div>
            <div style={{ fontSize: 13, color: '#F4825D', fontWeight: 400 }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RouteSection() {
  return (
    <div style={{ background: '#F7F6F2', padding: '32px 52px', borderBottom: '1px solid #E2E1DC' }}>
      <SectionLabel>Shipment Route</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#1A1A18', marginBottom: 2 }}>{QUOTE.from.city}</div>
          <div style={{ fontSize: 12, color: '#6B6B65' }}>{QUOTE.from.state}</div>
          <div style={{ fontSize: 11, color: '#9B9B93', marginTop: 2 }}>PIN — {QUOTE.from.pin}</div>
        </div>

        {/* Arrow */}
        <div style={{ padding: '0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ position: 'relative', width: 120, height: 1, background: 'linear-gradient(90deg, #E2E1DC 0%, #F40000 50%, #E2E1DC 100%)' }}>
            <div style={{ position: 'absolute', right: -1, top: -4, width: 0, height: 0, borderLeft: '8px solid #F40000', borderTop: '4px solid transparent', borderBottom: '4px solid transparent' }} />
          </div>
          <div style={{ fontSize: 10, color: '#F40000', letterSpacing: 1, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {QUOTE.weight} · {QUOTE.pieces}
          </div>
        </div>

        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#1A1A18', marginBottom: 2 }}>{QUOTE.to.city}</div>
          <div style={{ fontSize: 12, color: '#6B6B65' }}>{QUOTE.to.state}</div>
          <div style={{ fontSize: 11, color: '#9B9B93', marginTop: 2 }}>PIN — {QUOTE.to.pin}</div>
        </div>
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
        {['Household Goods', '12 Trolley Bags', '120–150 kg', 'Insured Door-to-Door'].map(c => (
          <div key={c} style={{
            background: '#fff', border: '1px solid #E2E1DC', borderRadius: 20,
            padding: '5px 14px', fontSize: 11, color: '#1A1A18', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F40000' }} />
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerSection() {
  return (
    <div style={{ padding: '28px 52px', borderBottom: '1px solid #E2E1DC', display: 'flex', gap: 60, alignItems: 'flex-start' }}>
      <div>
        <SectionLabel>Prepared For</SectionLabel>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#1A1A18', marginBottom: 2 }}>{QUOTE.customer.name}</div>
        <div style={{ fontSize: 12, color: '#6B6B65', marginTop: 2 }}>{QUOTE.customer.phone}</div>
      </div>

      <div>
        <SectionLabel>&nbsp;</SectionLabel>
        <div style={{ display: 'flex', gap: 40 }}>
          {[
            { label: 'Issue Date', value: QUOTE.issueDate },
            { label: 'Valid Until', value: QUOTE.validUntil },
            { label: 'Declared Value', value: QUOTE.declaredValue },
          ].map(d => (
            <div key={d.label}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#6B6B65', marginBottom: 4 }}>{d.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A18' }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginLeft: 'auto', background: '#EDFBF5', border: '1px solid #B8EDD8', borderRadius: 3, padding: '8px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#1A7A4A', marginBottom: 2 }}>Service Type</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0D5C35' }}>Insured Door-to-Door</div>
      </div>
    </div>
  );
}

function PricingSection() {
  const planColors: Record<string, { header: string; badge?: string; badgeText?: string }> = {
    express: { header: '#1A3A2A' },
    economy: { header: '#0D2B4A', badge: '#0D2B4A', badgeText: '#7BBCF5' },
    saver: { header: '#2A1A3A' },
  };

  return (
    <div style={{ padding: '40px 52px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
        <SectionLabel style={{ marginBottom: 0 }}>Select Your Plan</SectionLabel>
        <div style={{ fontSize: 12, color: '#6B6B65', fontStyle: 'italic' }}>All prices include GST &amp; insurance</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {QUOTE.plans.map(plan => {
          const colors = planColors[plan.id];
          return (
            <div key={plan.id} style={{
              borderRadius: 3, overflow: 'hidden',
              border: plan.featured ? `1.5px solid ${colors.header}` : '1.5px solid transparent',
              boxShadow: plan.featured ? '0 8px 32px rgba(13,43,74,0.12)' : 'none',
            }}>
              {plan.featured && (
                <div style={{ background: colors.header, color: colors.badgeText, fontSize: 9, letterSpacing: '2.5px', fontWeight: 600, textAlign: 'center', padding: '5px 0' }}>
                  MOST POPULAR
                </div>
              )}
              {/* Plan header */}
              <div style={{ background: colors.header, padding: plan.featured ? '20px 22px 16px' : '20px 22px 16px' }}>
                <div style={{ fontSize: 18, marginBottom: 8 }}>{plan.icon}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 3 }}>{plan.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>{plan.days}</div>
              </div>

              {/* Price block */}
              <div style={{ padding: '18px 22px 20px', background: '#fff' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 30, fontWeight: 800, color: '#1A1A18', marginBottom: 2, letterSpacing: -1 }}>
                  {fmt(plan.total)}
                </div>
                <div style={{ fontSize: 10, color: '#9B9B93', marginBottom: 16, letterSpacing: '0.3px' }}>
                  Rupees {plan.totalWords} Only
                </div>

                <div style={{ borderTop: '1px solid #EFEFEB', paddingTop: 14 }}>
                  {[
                    ['Base Freight', plan.baseFreight],
                    ['Insurance', plan.insurance],
                    ['Packing & Material', plan.packing],
                    ['Loading & Unloading', plan.loading],
                    ['Priority Surcharge', plan.surcharge],
                  ].map(([label, val]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ fontSize: 11, color: '#9B9B93' }}>{label}</span>
                      <span style={{ fontSize: 11, color: '#1A1A18', fontWeight: 500 }}>{fmt(val as number)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E1DC', marginTop: 8, paddingTop: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A18' }}>Total Payable</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A18' }}>{fmt(plan.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BreakdownTable() {
  return (
    <div style={{ padding: '0 52px 40px' }}>
      <SectionLabel>Full Charge Breakdown</SectionLabel>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['Charge Description', 'Express (1–2 Days)', 'Economy (2–3 Days)', 'Saver (3–4 Days)'].map((h, i) => (
              <th key={h} style={{
                background: '#1A1A18', color: '#fff', padding: '10px 14px',
                textAlign: i === 0 ? 'left' : 'right',
                fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ['Base Freight (Priority Lane, 120–150 kg)', 42000, 38500, 35500],
            ['Insurance (Declared: ₹1,50,000)', 7500, 7500, 7500],
            ['Professional Packing & Materials', 3500, 3500, 3000],
            ['Loading & Unloading', 1500, 1500, 1500],
            ['Express / Priority Surcharge', 1464, 1388, 1698],
          ].map(([label, e, ec, s], idx) => (
            <tr key={label as string}>
              <td style={{ padding: '10px 14px', borderBottom: '1px solid #EFEFEB', color: '#1A1A18', background: idx % 2 === 1 ? '#F7F6F2' : '#fff' }}>{label}</td>
              {[e, ec, s].map((v, vi) => (
                <td key={vi} style={{ padding: '10px 14px', borderBottom: '1px solid #EFEFEB', textAlign: 'right', fontWeight: 500, background: idx % 2 === 1 ? '#F7F6F2' : '#fff' }}>
                  {fmt(v as number)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ padding: '10px 14px', borderTop: '2px solid #1A1A18', fontWeight: 700, fontSize: 13, background: '#EFEFEB' }}>Total Amount Payable</td>
            {[55964, 52388, 49198].map((v, i) => (
              <td key={i} style={{ padding: '10px 14px', borderTop: '2px solid #1A1A18', textAlign: 'right', fontWeight: 700, fontSize: 13, background: '#EFEFEB' }}>
                {fmt(v)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function TermsSection() {
  return (
    <div style={{ margin: '0 52px', borderTop: '1px solid #E2E1DC', padding: '32px 0' }}>
      <SectionLabel>Terms &amp; Conditions</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        {QUOTE.terms.map(t => (
          <div key={t.title} style={{
            background: '#F7F6F2', borderLeft: '2px solid #F40000',
            padding: '10px 14px', borderRadius: '0 2px 2px 0',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#1A1A18', letterSpacing: '0.5px', marginBottom: 3, textTransform: 'uppercase' }}>{t.title}</div>
            <div style={{ fontSize: 11, color: '#6B6B65', lineHeight: 1.5 }}>{t.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AcceptanceSection() {
  return (
    <div style={{ margin: '0 52px 40px', background: '#F7F6F2', border: '1px solid #E2E1DC', borderRadius: 3, padding: '28px 32px', marginTop: 24 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#1A1A18', marginBottom: 20 }}>Customer Acceptance</div>

      {/* Plan select buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {QUOTE.plans.map(plan => (
          <div key={plan.id} style={{
            flex: 1, border: '1.5px solid #E2E1DC', borderRadius: 3,
            padding: 12, background: '#fff', textAlign: 'center',
          }}>
            <div style={{ width: 16, height: 16, border: '1.5px solid #E2E1DC', borderRadius: '50%', margin: '0 auto 6px', background: '#fff' }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1A18', letterSpacing: '0.5px' }}>{plan.name}</div>
            <div style={{ fontSize: 12, color: '#6B6B65', marginTop: 2 }}>{fmt(plan.total)}</div>
          </div>
        ))}
      </div>

      {/* Signature row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {[
          { label: 'Customer Signature', sub: QUOTE.customer.name },
          { label: 'Date', sub: 'DD / MM / YYYY' },
          { label: 'For CourierX (Authorized)', sub: 'Authorized Signatory' },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#6B6B65', marginBottom: 8 }}>{s.label}</div>
            <div style={{ borderBottom: '1px solid #E2E1DC', height: 32, marginBottom: 4 }} />
            <div style={{ fontSize: 10, color: '#6B6B65' }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div style={{ background: '#1A1A18', padding: '20px 52px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
        COURIER<span style={{ color: '#F40000' }}>X</span>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>PAGE 1 OF 1</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'right', lineHeight: 1.7 }}>
        info@courierx.in<br />
        courierx.in · +91 70083 68628
      </div>
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#6B6B65', marginBottom: 20, fontWeight: 600, ...style }}>
      {children}
    </div>
  );
}
