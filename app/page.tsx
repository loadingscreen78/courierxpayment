import type { Metadata } from 'next';
import { SectionLoader } from '@/components/landing/SectionLoader';
import { LaunchGateWrapper } from '@/components/launch/LaunchGateWrapper';
import dynamic from 'next/dynamic';

// ── SEO Metadata (rendered server-side, fully crawlable) ──────────────────────
export const metadata: Metadata = {
  title: 'CourierX — Send Medicines, Documents & Gifts Abroad from India | International Courier',
  description:
    'India\'s trusted international courier aggregator. Send prescription medicines, documents & personal gifts to USA, UK, Canada, Australia, UAE & 150+ countries. CSB-IV compliant. Compare DHL, FedEx, Aramex rates. Fast 3–7 day delivery.',
  keywords: [
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
    'DHL FedEx Aramex India',
    'medicine courier service India',
    'person to person courier India',
    'international parcel delivery India',
    'domestic courier India',
    'courier aggregator India',
    'CourierX',
  ],
  openGraph: {
    title: 'CourierX — Send Medicines, Documents & Gifts from India to 150+ Countries',
    description:
      'India\'s #1 international courier aggregator. Ship prescription medicines, documents & gifts. Compare DHL, FedEx, Aramex rates. CSB-IV compliant. 3–7 day delivery.',
    url: 'https://courierx.in',
    siteName: 'CourierX',
    type: 'website',
    images: [
      {
        url: '/lovable-uploads/19a008e8-fa55-402b-94a0-f1a05b4d70b4.png',
        width: 1200,
        height: 630,
        alt: 'CourierX — International Courier from India for Medicines, Documents & Gifts',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CourierX — International Courier for Medicines, Documents & Gifts',
    description:
      'Send medicines, documents & gifts from India to 150+ countries. CSB-IV compliant. Compare DHL, FedEx, Aramex. 3–7 day delivery.',
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
    <LaunchGateWrapper>
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
        <a href="/about">About CourierX</a>
        <a href="/public/rate-calculator">International Shipping Rate Calculator</a>
        <a href="/public/track">Track Shipment</a>
        <a href="/contact">Contact Us</a>
        <a href="/services/medicine-courier">Send Medicines Abroad from India</a>
        <a href="/services/document-courier">International Document Courier</a>
        <a href="/services/gift-courier">Send Gifts Abroad from India</a>
        <a href="/services/domestic-courier">Domestic Courier India</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/refund-policy">Refund Policy</a>
        <a href="/shipping-policy">Shipping Policy</a>
        <a href="/prohibited-items">Prohibited Items</a>
        <a href="/cxbc/apply">Become a CourierX Business Partner</a>
      </div>
    </div>
    </LaunchGateWrapper>
  );
}
