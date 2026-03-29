import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Courier Services — International & Domestic Shipping from India',
  description:
    'CourierX offers international medicine courier, document courier, gift courier, and domestic parcel delivery from India. Compare DHL, FedEx, Aramex rates. CSB-IV compliant. 150+ countries.',
  keywords: [
    'courier services India',
    'international courier India',
    'domestic courier India',
    'medicine courier India',
    'document courier India',
    'gift courier India',
    'shipping services India',
    'parcel delivery India',
  ],
  openGraph: {
    title: 'Courier Services — CourierX International & Domestic Shipping',
    description: 'Medicine, document, gift & domestic courier from India. Compare rates from DHL, FedEx, Aramex.',
    url: 'https://courierx.in/services',
    type: 'website',
  },
  alternates: { canonical: 'https://courierx.in/services' },
};

const services = [
  {
    title: 'International Medicine Courier',
    description: 'Ship prescription medicines, Ayurvedic medicines & health supplements from India to 150+ countries. CSB-IV compliant with customs documentation.',
    href: '/services/medicine-courier',
    emoji: '💊',
  },
  {
    title: 'International Document Courier',
    description: 'Fast & secure delivery of legal papers, certificates, educational documents & business contracts from India worldwide.',
    href: '/services/document-courier',
    emoji: '📄',
  },
  {
    title: 'International Gift Courier',
    description: 'Send personal gifts, care packages, festival gifts & parcels from India to loved ones abroad. Secure packaging & tracking.',
    href: '/services/gift-courier',
    emoji: '🎁',
  },
  {
    title: 'Domestic Courier India',
    description: 'Affordable door-to-door parcel delivery across India. Same-day pickup, real-time tracking, 1-5 day delivery.',
    href: '/services/domestic-courier',
    emoji: '🚚',
  },
];

export default function ServicesPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://courierx.in' },
          { name: 'Services', url: 'https://courierx.in/services' },
        ]}
      />
      <div className="min-h-screen bg-background">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-primary font-typewriter">CourierX</Link>
            <nav className="hidden md:flex gap-6 text-sm">
              <Link href="/public/rate-calculator" className="hover:text-primary">Rate Calculator</Link>
              <Link href="/public/track" className="hover:text-primary">Track Shipment</Link>
              <Link href="/about" className="hover:text-primary">About</Link>
              <Link href="/contact" className="hover:text-primary">Contact</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Courier Services — International & Domestic Shipping from India
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10">
            CourierX is India's trusted courier aggregator. Ship medicines, documents, gifts internationally or send parcels domestically. Compare rates from DHL, FedEx, Aramex and more.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-12">
            {services.map((service) => (
              <Link key={service.href} href={service.href} className="border rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow group">
                <div className="text-3xl mb-3">{service.emoji}</div>
                <h2 className="text-xl font-semibold mb-2 group-hover:text-primary">{service.title}</h2>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </Link>
            ))}
          </div>

          <div className="text-center bg-primary/5 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-3">Get Started with CourierX</h2>
            <p className="text-muted-foreground mb-6">Compare rates, book online, and ship from your doorstep.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/auth" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90">
                Sign Up Free
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
