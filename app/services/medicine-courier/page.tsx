import type { Metadata } from 'next';
import Link from 'next/link';
import { FAQJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Send Medicines Abroad from India — International Medicine Courier | Prescription Shipping',
  description:
    'Ship prescription medicines from India to USA, UK, Canada, Australia, UAE & 150+ countries. CSB-IV compliant medicine courier. Customs-cleared, temperature-safe packaging. Compare DHL, FedEx, Aramex rates. 3-7 day delivery.',
  keywords: [
    'send medicines abroad from India',
    'international medicine courier India',
    'ship prescription medicine from India',
    'person to person medicine courier India',
    'medicine courier India to USA',
    'medicine courier India to UK',
    'send medicine to Canada from India',
    'send medicine to Australia from India',
    'send medicine to UAE from India',
    'prescription medicine shipping India',
    'CSB-IV medicine export India',
    'courier medicine internationally',
    'pharmacy courier India',
    'send Ayurvedic medicine abroad',
    'medicine parcel India international',
    'cheapest medicine courier India',
    'book medicine courier online India',
    'personal medicine courier India',
  ],
  openGraph: {
    title: 'Send Medicines Abroad from India — CourierX Medicine Courier',
    description:
      'Ship prescription medicines from India to 150+ countries. CSB-IV compliant, customs-cleared, temperature-safe. Compare DHL, FedEx, Aramex rates.',
    url: 'https://courierx.in/services/medicine-courier',
    type: 'website',
  },
  alternates: { canonical: 'https://courierx.in/services/medicine-courier' },
};

const medicineFaqs = [
  {
    question: 'How do I send prescription medicines from India to the USA?',
    answer:
      'With CourierX, you can ship prescription medicines from India to the USA in 3 simple steps: enter pickup and delivery addresses, upload your prescription, and choose a carrier (DHL, FedEx, or Aramex). We handle CSB-IV customs documentation and ensure compliant delivery in 3-7 business days.',
  },
  {
    question: 'Is it legal to send medicines internationally from India?',
    answer:
      'Yes, it is legal to send prescription medicines for personal use from India under CSB-IV (Courier Shipping Bill IV) regulations. CourierX ensures all shipments are compliant with Indian customs export rules and destination country import regulations. A valid prescription is required.',
  },
  {
    question: 'What medicines can I send abroad from India?',
    answer:
      'You can send most prescription medicines, Ayurvedic medicines, OTC drugs, and health supplements from India. Narcotic and psychotropic substances listed under NDPS Act are prohibited. CourierX validates each shipment for compliance before dispatch.',
  },
  {
    question: 'How much does it cost to send medicines from India to the UK?',
    answer:
      'Medicine courier rates from India to the UK start from approximately ₹1,200 for a 0.5 kg package. Rates vary by weight, carrier, and delivery speed. Use our free rate calculator to compare DHL, FedEx, and Aramex prices instantly.',
  },
  {
    question: 'How long does international medicine delivery take from India?',
    answer:
      'International medicine delivery from India typically takes 3-7 business days depending on the destination country and carrier selected. Express options via DHL and FedEx can deliver in 2-4 days to major countries like USA, UK, Canada, and Australia.',
  },
  {
    question: 'Do I need a prescription to send medicines abroad from India?',
    answer:
      'Yes, a valid prescription from a registered medical practitioner is required for shipping prescription medicines internationally from India. This is mandatory for customs clearance under CSB-IV regulations.',
  },
];

export default function MedicineCourierPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://courierx.in' },
          { name: 'Services', url: 'https://courierx.in/services' },
          { name: 'Medicine Courier', url: 'https://courierx.in/services/medicine-courier' },
        ]}
      />
      <FAQJsonLd faqs={medicineFaqs} />

      <div className="min-h-screen bg-background">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-primary font-typewriter">
              CourierX
            </Link>
            <nav className="hidden md:flex gap-6 text-sm">
              <Link href="/services/document-courier" className="hover:text-primary">Document Courier</Link>
              <Link href="/services/gift-courier" className="hover:text-primary">Gift Courier</Link>
              <Link href="/services/domestic-courier" className="hover:text-primary">Domestic Courier</Link>
              <Link href="/public/rate-calculator" className="hover:text-primary">Rate Calculator</Link>
              <Link href="/public/track" className="hover:text-primary">Track Shipment</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Send Medicines Abroad from India — Person to Person Medicine Courier
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Ship prescription medicines, Ayurvedic medicines, and health supplements person to person from India to USA, UK, Canada, Australia, UAE, and 150+ countries. CSB-IV compliant, customs-cleared, with temperature-safe packaging. Book online, doorstep pickup.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">🏥 Prescription Medicines</h3>
              <p className="text-sm text-muted-foreground">Ship prescribed medicines with valid prescription. Full customs documentation handled by CourierX.</p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">🌿 Ayurvedic & OTC</h3>
              <p className="text-sm text-muted-foreground">Send Ayurvedic medicines, homeopathy, and over-the-counter health products internationally.</p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">🌡️ Temperature-Safe</h3>
              <p className="text-sm text-muted-foreground">Proper packaging for temperature-sensitive medicines. Reliable cold-chain options available.</p>
            </div>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">How to Send Medicines from India</h2>
            <ol className="space-y-4 list-decimal list-inside text-muted-foreground">
              <li><span className="font-medium text-foreground">Enter addresses</span> — Provide pickup (India) and delivery (international) addresses</li>
              <li><span className="font-medium text-foreground">Upload prescription</span> — Attach a valid prescription for customs compliance</li>
              <li><span className="font-medium text-foreground">Compare rates</span> — Get instant quotes from DHL, FedEx, and Aramex</li>
              <li><span className="font-medium text-foreground">Book & ship</span> — Pay online, schedule pickup, and track in real-time</li>
            </ol>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Popular Medicine Courier Routes from India</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {['USA', 'UK', 'Canada', 'Australia', 'UAE', 'Singapore', 'Germany', 'New Zealand', 'Saudi Arabia', 'Qatar'].map((country) => (
                <div key={country} className="flex items-center gap-2 p-3 border rounded-lg text-sm">
                  <span>🇮🇳 India → {country}</span>
                  <span className="ml-auto text-xs text-muted-foreground">3-7 days</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {medicineFaqs.map((faq, i) => (
                <details key={i} className="border rounded-lg p-4 group">
                  <summary className="font-medium cursor-pointer">{faq.question}</summary>
                  <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="text-center bg-primary/5 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-3">Ready to Send Medicines Abroad?</h2>
            <p className="text-muted-foreground mb-6">Compare rates from DHL, FedEx & Aramex. Book in under 2 minutes.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/auth" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90">
                Book Medicine Courier
              </Link>
              <Link href="/public/rate-calculator" className="border px-6 py-3 rounded-lg font-medium hover:bg-muted">
                Check Rates
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
