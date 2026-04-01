import type { Metadata } from 'next';
import { SectionLoader } from '@/components/landing/SectionLoader';
import dynamic from 'next/dynamic';

// ── SEO Metadata (rendered server-side, fully crawlable) ──────────────────────
export const metadata: Metadata = {
  title: 'CourierX — Person to Person Courier Booking India | Send Medicines, Documents & Gifts',
  description:
    'India\'s only person to person courier booking platform. Book domestic & international courier online — send medicines, documents & personal gifts door-to-door across India and to USA, UK, Canada, Australia, UAE & 150+ countries. Compare DHL, FedEx, Aramex, BlueDart rates. Doorstep pickup, real-time tracking.',
  keywords: [
    'person to person courier booking',
    'person to person courier India',
    'personal courier service India',
    'book courier online India',
    'domestic courier booking India',
    'door to door courier India',
    'send parcel person to person',
    'individual courier booking India',
    'personal parcel delivery India',
    'international courier India',
    'send medicines abroad from India',
    'ship prescription medicine internationally',
    'send documents overseas from India',
    'send gifts abroad from India',
    'courier India to USA',
    'courier India to UK',
    'courier India to Canada',
    'courier India to Australia',
    'courier India to UAE',
    'cheapest international courier India',
    'CSB-IV compliant shipping',
    'DHL FedEx Aramex BlueDart India',
    'medicine courier service India',
    'domestic parcel delivery India',
    'online courier booking doorstep pickup',
    'courier aggregator India',
    'CourierX',
  ],
  openGraph: {
    title: 'CourierX — India\'s Only Person to Person Courier Booking Platform',
    description:
      'Book personal courier online. Send medicines, documents & gifts person to person — across India and to 150+ countries. Doorstep pickup, real-time tracking, best rates.',
    url: 'https://courierx.in',
    siteName: 'CourierX',
    type: 'website',
    images: [
      {
        url: '/lovable-uploads/19a008e8-fa55-402b-94a0-f1a05b4d70b4.png',
        width: 1200,
        height: 630,
        alt: 'CourierX — Person to Person Courier Booking India | Domestic & International',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CourierX — Person to Person Courier Booking | Domestic & International',
    description:
      'Book personal courier online. Send medicines, documents & gifts person to person across India and to 150+ countries. Doorstep pickup, real-time tracking.',
    images: ['/lovable-uploads/19a008e8-fa55-402b-94a0-f1a05b4d70b4.png'],
  },
  alternates: {
    canonical: 'https://courierx.in',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

// ── Below-fold sections loaded lazily (no SSR needed, reduces initial JS) ─────
const LandingHeader = dynamic(
  () => import('@/components/landing/LandingHeader').then((m) => m.LandingHeader),
  { ssr: false }
);
const LandingFooter = dynamic(
  () => import('@/components/landing/LandingFooter').then((m) => m.LandingFooter),
  { ssr: false }
);
const HeroSection = dynamic(
  () => import('@/components/landing/HeroSection').then((m) => m.HeroSection),
  { ssr: false }
);
const FeaturesSection = dynamic(
  () => import('@/components/landing/FeaturesSection').then((m) => m.FeaturesSection),
  { ssr: false }
);
const HowItWorksSection = dynamic(
  () => import('@/components/landing/HowItWorksSection').then((m) => m.HowItWorksSection),
  { ssr: false }
);
const TestimonialsSection = dynamic(
  () => import('@/components/landing/TestimonialsSection').then((m) => m.TestimonialsSection),
  { ssr: false }
);
const CTASection = dynamic(
  () => import('@/components/landing/CTASection').then((m) => m.CTASection),
  { ssr: false }
);

// ── Page (Server Component — no "use client") ─────────────────────────────────
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header is client-side (scroll detection, mobile menu) */}
      <LandingHeader />

      <main className="flex-1">
        {/* Hero is above-the-fold — rendered immediately, no lazy wrapper */}
        <HeroSection />

        {/* Below-fold sections: each wrapped in SectionLoader so they only
            mount when the user scrolls near them, keeping initial JS small */}
        <section id="features">
          <SectionLoader rootMargin="300px">
            <FeaturesSection />
          </SectionLoader>
        </section>

        <SectionLoader rootMargin="300px">
          <HowItWorksSection />
        </SectionLoader>

        <SectionLoader rootMargin="300px">
          <TestimonialsSection />
        </SectionLoader>

        <SectionLoader rootMargin="300px">
          <CTASection />
        </SectionLoader>
      </main>

      <LandingFooter />

      {/* Static links for crawlers — hidden visually but present in HTML */}
      <div style={{ display: 'none' }}>
        <a href="/blog">CourierX Blog — Shipping, Logistics & Compliance Insights</a>
        <a href="/about">About CourierX — Person to Person Courier Booking</a>
        <a href="/public/rate-calculator">Courier Rate Calculator — Domestic & International</a>
        <a href="/public/track">Track Shipment</a>
        <a href="/contact">Contact Us</a>
        <a href="/services">Person to Person Courier Services India</a>
        <a href="/services/domestic-courier">Person to Person Domestic Courier India</a>
        <a href="/services/medicine-courier">Send Medicines Abroad from India — Person to Person</a>
        <a href="/services/document-courier">Person to Person Document Courier from India</a>
        <a href="/services/gift-courier">Send Gifts Abroad from India — Person to Person</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/refund-policy">Refund Policy</a>
        <a href="/shipping-policy">Shipping Policy</a>
        <a href="/prohibited-items">Prohibited Items</a>
        <a href="/cxbc/apply">Become a CourierX Business Partner</a>
      </div>
    </div>
  );
}
