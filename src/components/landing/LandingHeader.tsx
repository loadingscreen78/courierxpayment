"use client";

import { useState, useEffect } from 'react';
import { List, X, Package, CaretRight, UserPlus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export const LandingHeader = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Track', href: '/public/track' },
    { label: 'Calculate', href: '/public/rate-calculator' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled 
          ? 'bg-background/90 backdrop-blur-xl shadow-sm border-b border-border/50' 
          : 'bg-transparent'
      )}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <motion.img
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              alt="CourierX"
              src="/logo.svg"
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="relative px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted/60 group"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/auth')}
              className="rounded-xl text-sm"
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/open-account')}
              className="gap-1.5 rounded-xl text-sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Open Account
            </Button>
            <Button
              size="sm"
              onClick={() => router.push('/public/book')}
              className="gap-1.5 bg-coke-red hover:bg-red-600 text-white rounded-xl shadow-md shadow-coke-red/20 hover:shadow-coke-red/30 transition-all duration-200 text-sm"
            >
              <Package className="h-3.5 w-3.5" />
              Ship Now
            </Button>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl hover:bg-muted/60 transition-colors"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <List className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
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
              className="lg:hidden overflow-hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
            >
              <div className="py-3 px-1 space-y-0.5">
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
                      className="flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl hover:bg-muted/60 transition-colors"
                    >
                      {link.label}
                      <CaretRight className="h-4 w-4 text-muted-foreground/50" />
                    </Link>
                  </motion.div>
                ))}
              </div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="flex gap-2 px-4 py-4 border-t border-border/50"
              >
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => { router.push('/auth'); setMobileMenuOpen(false); }}
                >
                  Sign In
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl gap-1.5"
                  onClick={() => { router.push('/open-account'); setMobileMenuOpen(false); }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Open Account
                </Button>
                <Button
                  className="flex-1 bg-coke-red hover:bg-red-600 text-white rounded-xl gap-1.5"
                  onClick={() => { router.push('/public/book'); setMobileMenuOpen(false); }}
                >
                  <Package className="h-3.5 w-3.5" />
                  Ship Now
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};
