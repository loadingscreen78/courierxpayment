// JSON-LD Structured Data for SEO, AEO, and GEO optimization
export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CourierX',
    url: 'https://courierx.in',
    logo: 'https://courierx.in/logo.svg',
    description:
      'India\'s only person to person courier booking platform. Book domestic and international courier online for medicines, documents, gifts, and personal parcels. Door-to-door delivery across India and to 150+ countries.',
    foundingDate: '2024',
    sameAs: [],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['English', 'Hindi'],
        areaServed: ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'DE'],
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebSiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CourierX',
    url: 'https://courierx.in',
    description:
      'Person to person courier booking platform from India — domestic and international shipping for medicines, documents, and gifts.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://courierx.in/public/track?awb={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}


export function CourierServiceJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Person to Person Courier Booking Service',
    provider: {
      '@type': 'Organization',
      name: 'CourierX',
      url: 'https://courierx.in',
    },
    name: 'Person to Person Courier Booking — Domestic & International from India',
    description:
      'Book personal courier online — send medicines, documents, gifts, and parcels person to person. Domestic delivery across India and international shipping to 150+ countries via DHL, FedEx, Aramex, BlueDart. Door-to-door pickup, real-time tracking.',
    areaServed: [
      {
        '@type': 'Country',
        name: 'India',
      },
      {
        '@type': 'GeoShape',
        name: 'Worldwide — 150+ countries',
      },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Courier Services',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'International Medicine Courier',
            description:
              'Send prescription medicines person to person from India to USA, UK, Canada, Australia, UAE, and 150+ countries. CSB-IV compliant with customs documentation.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'International Document Courier',
            description:
              'Fast and secure person to person document delivery from India. Ship legal papers, certificates, and important documents worldwide.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'International Gift Courier',
            description:
              'Send personal gifts person to person from India to loved ones abroad. Secure packaging and reliable delivery to 150+ countries.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Domestic Courier India — Person to Person',
            description:
              'Book person to person domestic courier across India. Door-to-door parcel delivery with same-day pickup, real-time tracking, and 1-5 day delivery.',
          },
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function FAQJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BlogPostingJsonLd({ post }: {
  post: {
    title: string;
    slug: string;
    excerpt?: string | null;
    content?: string;
    cover_image?: string | null;
    author_name?: string | null;
    published_at?: string | null;
    updated_at?: string;
    category?: string;
    tags?: string[];
  };
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || '',
    image: post.cover_image || 'https://courierx.in/lovable-uploads/19a008e8-fa55-402b-94a0-f1a05b4d70b4.png',
    url: `https://courierx.in/blog/${post.slug}`,
    datePublished: post.published_at || new Date().toISOString(),
    dateModified: post.updated_at || post.published_at || new Date().toISOString(),
    author: {
      '@type': 'Person',
      name: post.author_name || 'CourierX Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'CourierX',
      url: 'https://courierx.in',
      logo: {
        '@type': 'ImageObject',
        url: 'https://courierx.in/logo.svg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://courierx.in/blog/${post.slug}`,
    },
    articleSection: post.category || 'General',
    keywords: (post.tags || []).join(', '),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BlogListJsonLd({ posts }: {
  posts: { title: string; slug: string; excerpt?: string | null; published_at?: string | null }[];
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'CourierX Blog — Shipping, Logistics & Compliance Insights from India',
    description: 'Expert guides on international courier from India, medicine shipping compliance, logistics tips, and courier industry updates from CourierX.',
    url: 'https://courierx.in/blog',
    publisher: {
      '@type': 'Organization',
      name: 'CourierX',
      url: 'https://courierx.in',
    },
    blogPost: posts.slice(0, 10).map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.excerpt || '',
      url: `https://courierx.in/blog/${p.slug}`,
      datePublished: p.published_at || new Date().toISOString(),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
