import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPostClient } from '@/components/blog/BlogPostClient';
import { BreadcrumbJsonLd, BlogPostingJsonLd } from '@/components/seo/JsonLd';

interface Props {
  params: { slug: string };
}

async function getPost(slug: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://courierx.in';
    const res = await fetch(`${baseUrl}/api/public/blog?slug=${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.post || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Post Not Found' };

  const title = post.meta_title || `${post.title} | CourierX Blog`;
  const description = post.meta_description || post.excerpt || `Read "${post.title}" on the CourierX Blog.`;
  const ogImage = post.og_image || post.cover_image || '/lovable-uploads/19a008e8-fa55-402b-94a0-f1a05b4d70b4.png';
  const canonical = post.canonical_url || `https://courierx.in/blog/${post.slug}`;
  const keywords = (post.meta_keywords && post.meta_keywords.length > 0)
    ? post.meta_keywords
    : [
        'courier blog', 'shipping guide India', post.category?.toLowerCase(),
        'CourierX', 'person to person courier',
        ...(post.tags || []),
      ].filter(Boolean);

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'CourierX',
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: [post.author_name || 'CourierX Team'],
      section: post.category,
      tags: post.tags,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    other: {
      'geo.region': post.geo_region || 'IN',
      'geo.placename': 'India',
      'article:published_time': post.published_at || '',
      'article:modified_time': post.updated_at || '',
      'article:section': post.category || 'General',
      'article:tag': (post.tags || []).join(', '),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://courierx.in' },
          { name: 'Blog', url: 'https://courierx.in/blog' },
          { name: post.title, url: `https://courierx.in/blog/${post.slug}` },
        ]}
      />
      <BlogPostingJsonLd post={post} />
      <BlogPostClient post={post} />
    </>
  );
}
