"use client";

import { useState } from 'react';
import { List, X, Package, CaretRight, UserPlus, CaretDown } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export const LandingHeader = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Track', href: '/public/track' },
    { label: 'Calculate', href: '/public/rate-calculator' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <div className="sticky top-0 z-50">
      {/* --- Main Dark Navbar --- */}
      <header className="w-full bg-[#0a0a0c] text-white h-[72px] flex items-center justify-between px-6 lg:px-12">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <img
            alt="CourierX"
            src="/logo.svg"
            className="h-9 w-auto object-contain brightness-0 invert"
          />
        </Link>

        {/* Desktop: Nav links + CTA */}
        <div className="hidden lg:flex items-center">
          <nav className="flex items-center space-x-8 mr-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[15px] font-medium text-gray-200 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/auth" className="text-[15px] font-medium text-gray-200 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/open-account" className="text-[15px] font-medium text-gray-200 hover:text-white transition-colors flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" />
              Open Account
            </Link>
          </nav>

          {/* Ship Now CTA */}
          <button
            onClick={() => router.push('/public/book')}
            className="bg-white text-black px-5 py-2.5 rounded-md flex items-center text-[15px] font-semibold hover:bg-gray-100 transition-colors"
          >
            <Package className="h-4 w-4 mr-1.5" />
            Ship Now
            <CaretDown className="h-4 w-4 ml-1.5" />
          </button>
        </div>

        {/* Mobile: hamburger */}
        <div className="lg:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white hover:text-gray-300 p-1"
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileMenuOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X className="h-6 w-6" />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <List className="h-6 w-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* --- Alert Ticker Bar --- */}
      <div className="w-full bg-[#fde8e8] h-[38px] flex items-center px-6 lg:px-12 overflow-hidden border-b border-red-100">
        <div className="flex items-center justify-between w-full whitespace-nowrap text-[13px] font-medium text-gray-800">
          <span>India&apos;s only person-to-person courier booking platform — no middlemen, transparent pricing.</span>
          <div className="hidden md:flex items-center ml-8 font-bold tracking-wide shrink-0">
            <span>UPDATES:</span>
            <span className="w-2.5 h-2.5 bg-[#e83e3e] mx-3 inline-block rounded-sm" />
            <span className="font-medium">Same-day delivery now available in select cities</span>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="lg:hidden overflow-hidden bg-[#0a0a0c] border-t border-white/10"
          >
            <div className="py-3 px-4 space-y-0.5">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-3 text-sm font-medium text-gray-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                  >
                    {link.label}
                    <CaretRight className="h-4 w-4 text-gray-500" />
                  </Link>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="px-4 py-4 border-t border-white/10 space-y-2"
            >
              <div className="flex gap-2">
                <button
                  className="flex-1 h-11 rounded-xl text-sm font-medium border border-white/20 text-white hover:bg-white/10 transition-colors"
                  onClick={() => { router.push('/auth'); setMobileMenuOpen(false); }}
                >
                  Sign In
                </button>
                <button
                  className="flex-1 h-11 rounded-xl text-sm font-medium border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                  onClick={() => { router.push('/open-account'); setMobileMenuOpen(false); }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Open Account
                </button>
              </div>
              <button
                className="w-full h-12 rounded-xl text-sm font-semibold bg-white text-black hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
                onClick={() => { router.push('/public/book'); setMobileMenuOpen(false); }}
              >
                <Package className="h-4 w-4" />
                Ship Now
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
