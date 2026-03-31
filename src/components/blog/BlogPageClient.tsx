'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string | null;
  published_at: string | null;
  geo_region: string;
  geo_target_countries: string[];
}

interface BlogPageClientProps {
  initialPosts: BlogPost[];
  categories: string[];
}

const COLORS = {
  cokeRed: '#F40009',
  pencilBlack: '#2B2B2B',
  paperWhite: '#F9F9F9',
  white: '#FFFFFF',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function BlogPageClient({ initialPosts, categories }: BlogPageClientProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [posts] = useState(initialPosts);

  const filtered = activeCategory === 'All'
    ? posts
    : posts.filter(p => p.category === activeCategory);

  const featured = filtered[0];
  const articles = filtered.slice(1);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingHeader />

      <div
        className="w-full font-sans selection:bg-[#F40009] selection:text-white flex-1"
        style={{ backgroundColor: COLORS.paperWhite, color: COLORS.pencilBlack }}
      >
        {/* Decorative Top Right Shapes */}
        <div className="absolute top-0 right-0 overflow-hidden pointer-events-none w-64 h-64 opacity-50 hidden lg:block">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="absolute top-[-50px] right-[-20px] w-full h-full">
            <path fill="#E5E7EB" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,97.1,-2.4C97.4,13.2,92.1,29,82.8,42.5C73.5,56,60.2,67.2,45.4,75.1C30.6,83,14.3,87.6,0.3,86.9C-13.7,86.3,-27.4,80.4,-40.1,72C-52.8,63.6,-64.5,52.7,-72.7,39.6C-80.9,26.5,-85.6,11.3,-84.9,-3.6C-84.2,-18.5,-78.1,-33.1,-68.8,-44.6C-59.5,-56.1,-47,-64.5,-33.9,-72.2C-20.8,-79.9,-7.1,-86.9,7.3,-87.5C21.7,-88.1,43.4,-82.3,44.7,-76.4Z" transform="translate(100 100) scale(1.1)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 relative z-10">
          <main>
            {/* Page Title & Filters */}
            <section className="mb-12">
              <h1 className="text-5xl md:text-7xl font-bold mb-10 tracking-tight">Blog</h1>
              <div className="flex flex-wrap items-center gap-3">
                {(categories || ['All']).map((category: string) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className="px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300"
                    style={{
                      backgroundColor: activeCategory === category ? COLORS.pencilBlack : 'transparent',
                      color: activeCategory === category ? COLORS.paperWhite : COLORS.pencilBlack,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: activeCategory === category ? COLORS.pencilBlack : 'rgba(43, 43, 43, 0.2)',
                      boxShadow: activeCategory === category ? '0 4px 14px rgba(0,0,0,0.15)' : 'none',
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </section>

            {/* Featured Article */}
            {featured && (
              <section className="mb-16">
                <Link href={`/blog/${featured.slug}`}>
                  <div className="flex flex-col lg:flex-row rounded-[2.5rem] overflow-hidden shadow-sm">
                    {/* Left Content Area */}
                    <div
                      className="lg:w-1/2 p-10 md:p-16 flex flex-col justify-center"
                      style={{ backgroundColor: COLORS.pencilBlack, color: COLORS.paperWhite }}
                    >
                      <span
                        className="text-xs font-semibold uppercase tracking-widest mb-4 inline-block"
                        style={{ color: COLORS.cokeRed }}
                      >
                        {featured.category}
                      </span>
                      <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
                        {featured.title}
                      </h2>
                      {featured.excerpt && (
                        <p className="text-white/70 text-base md:text-lg mb-10 leading-relaxed max-w-lg">
                          {featured.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-4 group w-fit">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                          style={{ backgroundColor: COLORS.cokeRed }}
                        >
                          <ArrowRight size={18} color={COLORS.white} />
                        </div>
                        <span className="text-sm font-medium uppercase tracking-wider group-hover:underline underline-offset-4">
                          Read full article
                        </span>
                      </div>
                    </div>

                    {/* Right Image Area */}
                    <div
                      className="lg:w-1/2 h-80 lg:h-auto relative p-12 flex items-center justify-center border-l"
                      style={{ backgroundColor: '#EBEBEB', borderColor: 'rgba(255,255,255,0.1)' }}
                    >
                      <div className="relative w-full max-w-md aspect-video">
                        {featured.cover_image ? (
                          <img
                            src={featured.cover_image}
                            alt={featured.title}
                            className="w-full h-full object-cover rounded-2xl opacity-80 mix-blend-multiply filter grayscale contrast-125"
                          />
                        ) : (
                          <div className="w-full h-full rounded-2xl bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-500 text-sm">No image</span>
                          </div>
                        )}
                        {/* Overlay accents */}
                        <div className="absolute -top-4 -right-4 w-20 h-8 rounded-full border-2 border-[#2B2B2B]" />
                        <div className="absolute -bottom-6 left-10 w-16 h-4 rounded-full" style={{ backgroundColor: COLORS.cokeRed }} />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-[#F40009] rounded-full opacity-50" />
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Articles Grid */}
            {articles.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {articles.map((article) => (
                  <Link key={article.id} href={`/blog/${article.slug}`}>
                    <article className="flex flex-col group cursor-pointer">
                      {/* Image Container */}
                      <div className="overflow-hidden rounded-[2rem] mb-5 aspect-[4/3] bg-gray-200">
                        {article.cover_image ? (
                          <img
                            src={article.cover_image}
                            alt={article.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                            No image
                          </div>
                        )}
                      </div>
                      {/* Meta */}
                      <div className="flex items-center justify-between text-xs font-semibold mb-3">
                        <span
                          className="uppercase tracking-widest px-3 py-1 rounded-full bg-red-50"
                          style={{ color: COLORS.cokeRed }}
                        >
                          {article.category}
                        </span>
                        <span className="text-gray-500 font-medium">
                          {formatDate(article.published_at)}
                        </span>
                      </div>
                      {/* Title */}
                      <h3 className="text-xl md:text-2xl font-bold leading-snug mb-2 group-hover:text-[#F40009] transition-colors line-clamp-3">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-sm text-gray-500 line-clamp-2">{article.excerpt}</p>
                      )}
                    </article>
                  </Link>
                ))}
              </section>
            )}

            {/* Empty State */}
            {filtered.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">No articles found in this category.</p>
                <button
                  onClick={() => setActiveCategory('All')}
                  className="mt-4 text-sm font-medium underline underline-offset-4"
                  style={{ color: COLORS.cokeRed }}
                >
                  View all articles
                </button>
              </div>
            )}

            {/* SEO-rich static content for crawlers (AEO optimization) */}
            <section className="mt-20 pt-12 border-t border-gray-200">
              <h2 className="text-2xl font-bold mb-4">About the CourierX Blog</h2>
              <p className="text-gray-600 leading-relaxed max-w-3xl mb-6">
                The CourierX Blog is your go-to resource for everything related to person to person courier services from India.
                We cover international shipping compliance, medicine courier regulations, document delivery best practices,
                gift shipping tips, and the latest logistics industry updates. Whether you&apos;re sending a parcel to the USA,
                UK, Canada, Australia, or UAE, our expert guides help you navigate customs, compare courier rates from
                DHL, FedEx, Aramex, and BlueDart, and ship with confidence.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm text-gray-500">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Shipping Guides</h3>
                  <p>Step-by-step guides for sending medicines, documents, and gifts from India to 150+ countries with full compliance.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Rate Comparisons</h3>
                  <p>Compare international courier rates from DHL, FedEx, Aramex, BlueDart and find the cheapest option for your shipment.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Compliance Updates</h3>
                  <p>Stay updated on CSB-IV regulations, customs documentation requirements, and prohibited items for international shipping.</p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <LandingFooter />

      {/* Hidden crawlable links for SEO */}
      <div style={{ display: 'none' }}>
        <a href="/blog">CourierX Blog — Shipping & Logistics Insights</a>
        <a href="/services">Person to Person Courier Services India</a>
        <a href="/services/medicine-courier">Send Medicines Abroad from India</a>
        <a href="/services/document-courier">Document Courier from India</a>
        <a href="/services/gift-courier">Gift Courier from India</a>
        <a href="/public/rate-calculator">Courier Rate Calculator</a>
        <a href="/public/track">Track Shipment</a>
      </div>
    </div>
  );
}
