import type { Metadata } from 'next';
import Link from 'next/link';
import { FAQJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Send Documents Abroad from India — International Document Courier | Fast & Secure',
  description:
    'Ship important documents from India to USA, UK, Canada, Australia, UAE & 150+ countries. Legal papers, certificates, passports, visas. Secure, tracked delivery via DHL, FedEx, Aramex. 2-5 day express delivery.',
  keywords: [
    'send documents abroad from India',
    'international document courier India',
    'person to person document courier India',
    'document courier India to USA',
    'document courier India to UK',
    'send legal documents internationally',
    'send certificates abroad from India',
    'passport courier India',
    'visa document courier India',
    'express document delivery India',
    'cheapest document courier India',
    'send papers abroad from India',
    'international document shipping',
    'courier documents overseas from India',
    'book document courier online India',
    'personal document courier India',
  ],
  openGraph: {
    title: 'Send Documents Abroad from India — CourierX Document Courier',
    description: 'Fast & secure international document courier from India. Ship legal papers, certificates & documents to 150+ countries.',
    url: 'https://courierx.in/services/document-courier',
    type: 'website',
  },
  alternates: { canonical: 'https://courierx.in/services/document-courier' },
};

const documentFaqs = [
  {
    question: 'How do I send documents from India to the USA?',
    answer:
      'With CourierX, enter your pickup address in India and delivery address in the USA, select document type, and compare rates from DHL, FedEx, and Aramex. Book online, schedule a pickup, and track your document in real-time. Express delivery in 2-4 business days.',
  },
  {
    question: 'What documents can I send internationally from India?',
    answer:
      'You can send legal documents, educational certificates, degree certificates, birth certificates, marriage certificates, power of attorney, visa documents, passport copies, business contracts, and other important papers from India.',
  },
  {
    question: 'How much does it cost to courier documents from India to the UK?',
    answer:
      'Document courier rates from India to the UK start from approximately ₹900 for standard delivery. Express delivery via DHL or FedEx costs more but delivers in 2-3 business days. Use our rate calculator for exact pricing.',
  },
  {
    question: 'Is document courier from India safe and tracked?',
    answer:
      'Yes, all document shipments via CourierX are fully tracked with real-time updates. Documents are securely packaged in tamper-proof envelopes. You receive tracking updates via email and WhatsApp at every milestone.',
  },
];

export default function DocumentCourierPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://courierx.in' },
          { name: 'Services', url: 'https://courierx.in/services' },
          { name: 'Document Courier', url: 'https://courierx.in/services/document-courier' },
        ]}
      />
      <FAQJsonLd faqs={documentFaqs} />

      <div className="min-h-screen bg-background">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-primary font-typewriter">CourierX</Link>
            <nav className="hidden md:flex gap-6 text-sm">
              <Link href="/services/medicine-courier" className="hover:text-primary">Medicine Courier</Link>
              <Link href="/services/gift-courier" className="hover:text-primary">Gift Courier</Link>
              <Link href="/services/domestic-courier" className="hover:text-primary">Domestic Courier</Link>
              <Link href="/public/rate-calculator" className="hover:text-primary">Rate Calculator</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Send Documents Abroad from India — Person to Person Document Courier
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Fast, secure, and tracked person to person document courier from India. Ship legal papers, certificates, educational documents, and business contracts to USA, UK, Canada, Australia, UAE & 150+ countries. Book online, doorstep pickup.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">📄 Legal Documents</h3>
              <p className="text-sm text-muted-foreground">Power of attorney, affidavits, court documents, contracts — securely couriered worldwide.</p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">🎓 Certificates</h3>
              <p className="text-sm text-muted-foreground">Degree certificates, transcripts, birth/marriage certificates for immigration and education.</p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">🔒 Secure & Tracked</h3>
              <p className="text-sm text-muted-foreground">Tamper-proof packaging with real-time tracking. Email and WhatsApp updates at every step.</p>
            </div>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {documentFaqs.map((faq, i) => (
                <details key={i} className="border rounded-lg p-4">
                  <summary className="font-medium cursor-pointer">{faq.question}</summary>
                  <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="text-center bg-primary/5 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-3">Ready to Send Documents Abroad?</h2>
            <p className="text-muted-foreground mb-6">Compare rates from DHL, FedEx & Aramex. Express delivery in 2-4 days.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/auth" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90">
                Book Document Courier
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
