import type { Metadata } from 'next';
import { BreadcrumbJsonLd, BlogListJsonLd } from '@/components/seo/JsonLd';
import { BlogPageClient } from '@/components/blog/BlogPageClient';

// ── Aggressive SEO + GEO + AEO Metadata ──────────────────────────────────────
export const metadata: Metadata = {
  title: 'CourierX Blog — Shipping Guides, Logistics Tips & Compliance Updates from India',
  description:
    'Read expert guides on sending medicines, documents & gifts abroad from India. Shipping compliance, courier rate comparisons, logistics industry updates, and person to person courier tips from CourierX.',
  keywords: [
    'courier blog India',
    'shipping guide India',
    'send medicine abroad guide',
    'international courier tips',
    'logistics blog India',
    'courier compliance India',
    'CSB-IV shipping guide',
    'medicine courier guide India',
    'document courier tips',
    'gift shipping international',
    'DHL FedEx comparison India',
    'courier rate comparison',
    'person to person courier guide',
    'shipping from India blog',
    'courier industry updates India',
    'customs clearance guide India',
    'international shipping tips',
    'domestic courier guide India',
    'parcel delivery tips India',
    'CourierX blog',
  ],
  openGraph: {
    title: 'CourierX Blog — Shipping, Logistics & Compliance Insights',
    description:
      'Expert guides on international courier from India. Medicine shipping compliance, rate comparisons, logistics tips, and person to person courier insights.',
    url: 'https://courierx.in/blog',
    siteName: 'CourierX',
    type: 'website',
    images: [
      {
        url: '/lovable-uploads/19a008e8-fa55-402b-94a0-f1a05b4d70b4.png',
        width: 1200,
        height: 630,
        alt: 'CourierX Blog — Shipping & Logistics Insights from India',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CourierX Blog — Shipping & Logistics Insights from India',
    description:
      'Expert guides on sending medicines, documents & gifts abroad from India. Compliance, rate comparisons, and courier tips.',
    images: ['/lovable-uploads/19a008e8-fa55-402b-94a0-f1a05b4d70b4.png'],
  },
  alternates: {
    canonical: 'https://courierx.in/blog',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  other: {
    'geo.region': 'IN',
    'geo.placename': 'India',
    'ICBM': '20.5937, 78.9629',
    'content-language': 'en-IN',
  },
};

// Fetch posts server-side for SEO (crawlable HTML)
async function getPublishedPosts() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://courierx.in';
    const res = await fetch(`${baseUrl}/api/public/blog`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { posts: [], categories: ['All'] };
    return res.json();
  } catch {
    return { posts: [], categories: ['All'] };
  }
}

export default async function BlogPage() {
  const { posts, categories } = await getPublishedPosts();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://courierx.in' },
          { name: 'Blog', url: 'https://courierx.in/blog' },
        ]}
      />
      <BlogListJsonLd posts={posts} />
      <BlogPageClient initialPosts={posts} categories={categories} />
    </>
  );
}
