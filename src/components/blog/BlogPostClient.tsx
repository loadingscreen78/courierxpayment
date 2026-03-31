'use client';

import Link from 'next/link';
import { ArrowLeft, Calendar, User, Tag, Globe } from 'lucide-react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string | null;
  published_at: string | null;
  updated_at: string;
  geo_region: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function BlogPostClient({ post }: { post: BlogPost }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingHeader />

      <div className="w-full font-sans flex-1" style={{ backgroundColor: '#F9F9F9', color: '#2B2B2B' }}>
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-8">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#F40009] transition-colors mb-8 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Blog
          </Link>

          {/* Article Header */}
          <article>
            <header className="mb-10">
              <span
                className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full bg-red-50 inline-block mb-4"
                style={{ color: '#F40009' }}
              >
                {post.category}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6 tracking-tight">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mb-6">
                  {post.excerpt}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <User size={14} />
                  {post.author_name || 'CourierX Team'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {formatDate(post.published_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe size={14} />
                  {post.geo_region}
                </span>
              </div>
            </header>

            {/* Cover Image */}
            {post.cover_image && (
              <div className="rounded-[2rem] overflow-hidden mb-10 aspect-video bg-gray-200">
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div
              className="prose prose-lg max-w-none prose-headings:tracking-tight prose-headings:font-bold prose-a:text-[#F40009] prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag size={14} className="text-gray-400" />
                  {post.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="mt-12 p-8 rounded-[2rem] text-center" style={{ backgroundColor: '#2B2B2B', color: '#F9F9F9' }}>
              <h3 className="text-2xl font-bold mb-3">Ready to Ship?</h3>
              <p className="text-white/70 mb-6 max-w-md mx-auto">
                Book your person to person courier from India. Compare rates from DHL, FedEx, Aramex, and BlueDart.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link
                  href="/public/book"
                  className="px-6 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-105"
                  style={{ backgroundColor: '#F40009' }}
                >
                  Ship Now
                </Link>
                <Link
                  href="/public/rate-calculator"
                  className="px-6 py-3 rounded-full text-sm font-semibold border border-white/20 text-white hover:bg-white/10 transition-all"
                >
                  Check Rates
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
