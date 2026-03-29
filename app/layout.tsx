import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import { OrganizationJsonLd, WebSiteJsonLd, CourierServiceJsonLd } from "@/components/seo/JsonLd";
import "@/index.css";

export const metadata: Metadata = {
  title: {
    default: "CourierX — Person to Person Courier Booking | Send Medicines, Documents & Gifts from India",
    template: "%s | CourierX"
  },
  description: "India's only person to person courier booking platform. Book domestic & international courier online — send medicines, documents & gifts door-to-door across India and to 150+ countries. Compare DHL, FedEx, Aramex, BlueDart rates. Doorstep pickup, real-time tracking.",
  keywords: [
    "person to person courier booking",
    "person to person courier India",
    "personal courier service India",
    "send parcel person to person India",
    "book courier online India",
    "domestic courier booking India",
    "door to door courier India",
    "courier booking for personal items",
    "send parcel to friend India",
    "send parcel to family India",
    "individual courier booking India",
    "personal parcel delivery India",
    "international courier India",
    "send medicines abroad from India",
    "ship prescription medicine internationally",
    "international medicine courier",
    "send documents overseas from India",
    "international document courier India",
    "send gifts abroad from India",
    "courier service India to USA",
    "courier service India to UK",
    "courier service India to Canada",
    "courier service India to Australia",
    "courier service India to UAE",
    "CSB-IV compliant shipping",
    "DHL courier India",
    "FedEx courier India",
    "Aramex courier India",
    "BlueDart courier India",
    "cheapest international courier India",
    "domestic courier India",
    "parcel delivery India",
    "courier aggregator India",
    "send medicine to USA from India",
    "send medicine to UK from India",
    "prescription medicine courier",
    "international shipping rates India",
    "online courier booking India",
    "book courier pickup online",
    "CourierX",
  ],
  authors: [{ name: "CourierX" }],
  creator: "CourierX",
  publisher: "CourierX",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://courierx.in'),
  alternates: {
    canonical: 'https://courierx.in',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://courierx.in',
    siteName: 'CourierX',
    title: 'CourierX — Person to Person Courier Booking | Domestic & International Shipping India',
    description: 'India's only person to person courier booking platform. Send medicines, documents & gifts across India and to 150+ countries. Book online, doorstep pickup, real-time tracking.',
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
    title: 'CourierX — Person to Person Courier Booking India',
    description: 'Book personal courier online — send medicines, documents & gifts person to person across India and to 150+ countries. Doorstep pickup, real-time tracking.',
    images: ['/lovable-uploads/19a008e8-fa55-402b-94a0-f1a05b4d70b4.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  other: {
    'geo.region': 'IN',
    'geo.placename': 'India',
    'ICBM': '20.5937, 78.9629',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  localStorage.setItem('courierx-theme', 'light');
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-background text-foreground" suppressHydrationWarning>
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <CourierServiceJsonLd />
        <Providers>{children}</Providers>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
