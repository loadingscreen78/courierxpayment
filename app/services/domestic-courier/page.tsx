import type { Metadata } from 'next';
import Link from 'next/link';
import { FAQJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Person to Person Domestic Courier India — Book Online | Door-to-Door Parcel Delivery',
  description:
    'India\'s only person to person domestic courier booking platform. Send parcels, medicines, documents & gifts door-to-door across India. Same-day pickup, real-time tracking, 1-5 day delivery. Compare BlueDart, DTDC, Delhivery rates online.',
  keywords: [
    'person to person courier India',
    'person to person domestic courier',
    'personal courier booking India',
    'book courier online India',
    'domestic courier booking India',
    'send parcel person to person India',
    'door to door courier India',
    'parcel delivery India',
    'courier service India',
    'send parcel within India',
    'cheapest courier India',
    'same day courier India',
    'express delivery India',
    'domestic shipping India',
    'online courier booking India',
    'parcel tracking India',
    'send parcel to friend India',
    'send parcel to family India',
    'individual courier booking India',
    'personal parcel delivery India',
    'book courier pickup online India',
    'doorstep pickup courier India',
    'BlueDart courier booking',
    'DTDC courier booking',
    'Delhivery courier booking',
  ],
  openGraph: {
    title: 'Person to Person Domestic Courier India — Book Online | CourierX',
    description: 'Book person to person domestic courier across India. Door-to-door delivery, real-time tracking, same-day pickup. Compare rates online.',
    url: 'https://courierx.in/services/domestic-courier',
    type: 'website',
  },
  alternates: { canonical: 'https://courierx.in/services/domestic-courier' },
};

const domesticFaqs = [
  {
    question: 'How do I book a person to person domestic courier in India?',
    answer:
      'With CourierX, enter your pickup and delivery pin codes, select package weight and dimensions, compare rates from multiple carriers like BlueDart, DTDC, and Delhivery, and book online. We schedule a doorstep pickup and provide real-time tracking until person to person delivery.',
  },
  {
    question: 'How much does person to person domestic courier cost in India?',
    answer:
      'Person to person domestic courier rates in India start from approximately ₹50 for a 0.5 kg package. Rates vary by weight, distance, and carrier. Use our rate calculator to compare prices from BlueDart, DTDC, Delhivery and more instantly.',
  },
  {
    question: 'How long does domestic person to person delivery take in India?',
    answer:
      'Standard person to person domestic delivery takes 2-5 business days depending on origin and destination. Express and same-day options are available for metro cities. Tier-2 and Tier-3 cities may take 3-7 days.',
  },
  {
    question: 'Do you offer same-day pickup for person to person domestic courier?',
    answer:
      'Yes, CourierX offers same-day doorstep pickup for person to person domestic shipments booked before 2 PM in most metro cities including Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Kolkata, and Pune.',
  },
  {
    question: 'What makes CourierX different from other domestic courier services?',
    answer:
      'CourierX is India\'s only person to person courier booking platform. Unlike business-focused courier aggregators, we are built specifically for individuals sending parcels to friends, family, and loved ones. Book online, get doorstep pickup, compare rates, and track in real-time.',
  },
  {
    question: 'Can I send medicines domestically through CourierX?',
    answer:
      'Yes, you can send prescription medicines person to person within India through CourierX. Upload your prescription, and we ensure compliant packaging and delivery. Same-day pickup available in metro cities.',
  },
];

export default function DomesticCourierPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://courierx.in' },
          { name: 'Services', url: 'https://courierx.in/services' },
          { name: 'Domestic Courier', url: 'https://courierx.in/services/domestic-courier' },
        ]}
      />
      <FAQJsonLd faqs={domesticFaqs} />

      <div className="min-h-screen bg-background">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-primary font-typewriter">CourierX</Link>
            <nav className="hidden md:flex gap-6 text-sm">
              <Link href="/services/medicine-courier" className="hover:text-primary">Medicine Courier</Link>
              <Link href="/services/document-courier" className="hover:text-primary">Document Courier</Link>
              <Link href="/services/gift-courier" className="hover:text-primary">Gift Courier</Link>
              <Link href="/public/rate-calculator" className="hover:text-primary">Rate Calculator</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Person to Person Domestic Courier India — Book Online, Doorstep Pickup
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            India&apos;s only person to person courier booking platform. Send parcels, medicines, documents, and gifts to friends and family across India. Book online, get same-day doorstep pickup, compare rates from BlueDart, DTDC, Delhivery, and track in real-time. Delivery in 1-5 business days.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">🚚 Person to Person</h3>
              <p className="text-sm text-muted-foreground">India&apos;s only courier platform built for individuals. Send parcels to friends, family, and loved ones — not just businesses.</p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">📍 Doorstep Pickup & Tracking</h3>
              <p className="text-sm text-muted-foreground">Same-day doorstep pickup in metro cities. Track your parcel at every step with live updates via WhatsApp.</p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">💰 Compare & Book Online</h3>
              <p className="text-sm text-muted-foreground">Compare rates from BlueDart, DTDC, Delhivery and more. Book your person to person courier in under 2 minutes.</p>
            </div>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {domesticFaqs.map((faq, i) => (
                <details key={i} className="border rounded-lg p-4">
                  <summary className="font-medium cursor-pointer">{faq.question}</summary>
                  <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="text-center bg-primary/5 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-3">Book Person to Person Courier Now</h2>
            <p className="text-muted-foreground mb-6">Compare rates, book online, and get same-day doorstep pickup across India.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/auth" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90">
                Book Person to Person Courier
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
