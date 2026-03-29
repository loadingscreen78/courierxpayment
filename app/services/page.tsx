import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Courier Services — Person to Person Domestic & International Shipping from India',
  description:
    'CourierX is India\'s only person to person courier booking platform. Book domestic courier across India or international medicine, document & gift courier to 150+ countries. Compare BlueDart, DHL, FedEx, Aramex rates. Doorstep pickup, real-time tracking.',
  keywords: [
    'person to person courier India',
    'personal courier booking India',
    'courier services India',
    'domestic courier booking India',
    'international courier India',
    'medicine courier India',
    'document courier India',
    'gift courier India',
    'book courier online India',
    'door to door courier India',
    'parcel delivery India',
    'send parcel person to person',
  ],
  openGraph: {
    title: 'Courier Services — Person to Person Domestic & International | CourierX',
    description: 'Book person to person courier — domestic across India or international to 150+ countries. Medicine, document, gift & parcel delivery.',
    url: 'https://courierx.in/services',
    type: 'website',
  },
  alternates: { canonical: 'https://courierx.in/services' },
};

const services = [
  {
    title: 'Person to Person Domestic Courier',
    description: 'Book domestic courier online — send parcels, medicines, documents & gifts person to person across India. Same-day doorstep pickup, 1-5 day delivery.',
    href: '/services/domestic-courier',
    emoji: '🚚',
  },
  {
    title: 'International Medicine Courier',
    description: 'Ship prescription medicines, Ayurvedic medicines & health supplements person to person from India to 150+ countries. CSB-IV compliant.',
    href: '/services/medicine-courier',
    emoji: '💊',
  },
  {
    title: 'International Document Courier',
    description: 'Fast & secure person to person delivery of legal papers, certificates, educational documents & business contracts from India worldwide.',
    href: '/services/document-courier',
    emoji: '📄',
  },
  {
    title: 'International Gift Courier',
    description: 'Send personal gifts, care packages, festival gifts & parcels person to person from India to loved ones abroad. Secure packaging & tracking.',
    href: '/services/gift-courier',
    emoji: '🎁',
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
            Person to Person Courier Services — Domestic & International from India
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10">
            CourierX is India&apos;s only person to person courier booking platform. Send parcels, medicines, documents, and gifts to friends and family — across India or to 150+ countries. Compare rates from BlueDart, DHL, FedEx, Aramex and more.
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
