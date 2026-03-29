import type { Metadata } from 'next';
import Link from 'next/link';
import { FAQJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Send Gifts Abroad from India — International Gift Courier | Personal Parcels',
  description:
    'Send personal gifts, care packages & parcels from India to USA, UK, Canada, Australia, UAE & 150+ countries. Secure packaging, real-time tracking. Compare DHL, FedEx, Aramex rates. 3-7 day delivery.',
  keywords: [
    'send gifts abroad from India',
    'international gift courier India',
    'person to person gift courier India',
    'send parcel from India to USA',
    'send parcel from India to UK',
    'gift courier India to Canada',
    'send care package from India',
    'personal parcel courier India',
    'send sweets abroad from India',
    'send rakhi abroad from India',
    'Diwali gift courier India',
    'international parcel from India',
    'cheapest gift courier India',
    'person to person courier India',
    'send birthday gift abroad from India',
    'book gift courier online India',
  ],
  openGraph: {
    title: 'Send Gifts Abroad from India — CourierX Gift Courier',
    description: 'Ship personal gifts & care packages from India to 150+ countries. Secure packaging, tracked delivery.',
    url: 'https://courierx.in/services/gift-courier',
    type: 'website',
  },
  alternates: { canonical: 'https://courierx.in/services/gift-courier' },
};

const giftFaqs = [
  {
    question: 'How do I send a gift from India to someone abroad?',
    answer:
      'With CourierX, enter your address in India and the recipient\'s international address, describe the gift contents, compare rates from DHL, FedEx, and Aramex, and book online. We handle customs documentation. Your gift is picked up from your doorstep and delivered in 3-7 days.',
  },
  {
    question: 'Can I send food items and sweets from India internationally?',
    answer:
      'You can send packaged, non-perishable food items and sweets from India to most countries. Items must be commercially packaged with ingredient labels. Fresh/perishable foods, homemade items without labels, and items containing meat may be restricted by destination country customs.',
  },
  {
    question: 'How much does it cost to send a gift parcel from India to the USA?',
    answer:
      'Gift parcel rates from India to the USA start from approximately ₹1,500 for a 1 kg package. Rates depend on weight, dimensions, and carrier. Use our free rate calculator to compare DHL, FedEx, and Aramex prices instantly.',
  },
  {
    question: 'Can I send Rakhi or Diwali gifts abroad from India?',
    answer:
      'Yes, CourierX is popular for sending festival gifts like Rakhi, Diwali sweets, and celebration packages from India. We recommend booking 7-10 days before the festival for timely delivery. Secure packaging ensures your gifts arrive safely.',
  },
];

export default function GiftCourierPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://courierx.in' },
          { name: 'Services', url: 'https://courierx.in/services' },
          { name: 'Gift Courier', url: 'https://courierx.in/services/gift-courier' },
        ]}
      />
      <FAQJsonLd faqs={giftFaqs} />

      <div className="min-h-screen bg-background">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-primary font-typewriter">CourierX</Link>
            <nav className="hidden md:flex gap-6 text-sm">
              <Link href="/services/medicine-courier" className="hover:text-primary">Medicine Courier</Link>
              <Link href="/services/document-courier" className="hover:text-primary">Document Courier</Link>
              <Link href="/services/domestic-courier" className="hover:text-primary">Domestic Courier</Link>
              <Link href="/public/rate-calculator" className="hover:text-primary">Rate Calculator</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Send Gifts Abroad from India — Person to Person Gift & Parcel Courier
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Ship personal gifts, care packages, festival gifts, and parcels person to person from India to USA, UK, Canada, Australia, UAE & 150+ countries. Secure packaging, real-time tracking, and doorstep pickup. Book online in 2 minutes.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">🎁 Personal Gifts</h3>
              <p className="text-sm text-muted-foreground">Birthday gifts, anniversary presents, care packages — send love across borders.</p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">🪔 Festival Specials</h3>
              <p className="text-sm text-muted-foreground">Rakhi, Diwali sweets, Holi colors, Christmas gifts — celebrate together from afar.</p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">📦 Care Packages</h3>
              <p className="text-sm text-muted-foreground">Send homesick essentials, snacks, and personal items to family abroad.</p>
            </div>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {giftFaqs.map((faq, i) => (
                <details key={i} className="border rounded-lg p-4">
                  <summary className="font-medium cursor-pointer">{faq.question}</summary>
                  <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="text-center bg-primary/5 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-3">Ready to Send Gifts Abroad?</h2>
            <p className="text-muted-foreground mb-6">Compare rates from DHL, FedEx & Aramex. Doorstep pickup across India.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/auth" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90">
                Book Gift Courier
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
