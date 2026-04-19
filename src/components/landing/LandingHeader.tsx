"use client";

import { useState, useEffect, useRef } from 'react';
import { List, X, CaretRight, UserPlus, User, SignOut, Gauge, UserCircle } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export const LandingHeader = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null);
  const { user, profile, signOut } = useAuth();

  const isSignedIn = !!user;
  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Account';
  const avatarUrl = profile?.avatar_url;
  const initials = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openDropdown = () => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setDropdownOpen(true);
  };

  const closeDropdown = () => {
    dropdownTimeout.current = setTimeout(() => setDropdownOpen(false), 150);
  };

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  const navLinks = [
    { label: 'Track', href: '/public/track' },
    { label: 'Calculate', href: '/public/rate-calculator' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? 'bg-background/90 backdrop-blur-xl shadow-sm border-b border-border/50'
          : 'bg-background border-b border-border/40'
      )}
    >
      <div className="flex items-center justify-between h-16 px-6 lg:px-12">
        {/* Logo — left */}
        <Link href="/" className="flex items-center shrink-0">
          <img
            alt="CourierX"
            src="/logo.svg"
            className="h-9 w-auto object-contain"
          />
        </Link>

        {/* Desktop: nav links + CTAs — right */}
        <div className="hidden lg:flex items-center gap-1">
          <nav className="flex items-center">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-3.5 py-2 text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted/60"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Divider */}
          <div className="mx-4 h-6 w-px bg-border" />

          {/* Auth buttons - show profile if signed in */}
          {isSignedIn ? (
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={openDropdown}
              onMouseLeave={closeDropdown}
            >
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/60 transition-colors"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-8 w-8 rounded-full object-cover border-2 border-coke-red/30"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-coke-red flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {initials}
                  </div>
                )}
                <span className="text-[15px] font-semibold text-foreground">{displayName}</span>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-xl shadow-black/10 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-border/50">
                      <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setDropdownOpen(false); router.push('/dashboard'); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <Gauge className="h-4 w-4 text-muted-foreground" weight="bold" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); router.push('/profile'); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <UserCircle className="h-4 w-4 text-muted-foreground" weight="bold" />
                        Profile
                      </button>
                    </div>
                    <div className="border-t border-border/50 py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <SignOut className="h-4 w-4" weight="bold" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link
                href="/auth"
                className="px-4 py-2 text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted/60"
              >
                Sign In
              </Link>

              <Link
                href="/register"
                className="flex items-center gap-1.5 ml-1 px-5 py-2.5 text-[15px] font-semibold bg-[#c85050] hover:bg-[#b04545] text-white rounded-xl transition-colors shadow-md shadow-[#c85050]/20"
              >
                Open Account
              </Link>
            </>
          )}
        </div>

        {/* Mobile: hamburger */}
        <div className="lg:hidden flex items-center">
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
              className="px-4 py-4 border-t border-border/50 space-y-2"
            >
              {isSignedIn ? (
                <button
                  className="w-full h-11 rounded-xl text-sm font-semibold bg-coke-red hover:bg-red-600 text-white transition-colors flex items-center justify-center gap-2"
                  onClick={() => { router.push('/dashboard'); setMobileMenuOpen(false); }}
                >
                  <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  Go to Dashboard
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    className="flex-1 h-11 rounded-xl text-sm font-medium border border-border hover:bg-muted/60 transition-colors"
                    onClick={() => { router.push('/auth'); setMobileMenuOpen(false); }}
                  >
                    Sign In
                  </button>
                  <button
                    className="flex-1 h-11 rounded-xl text-sm font-semibold bg-[#c85050] hover:bg-[#b04545] text-white transition-colors flex items-center justify-center gap-1.5"
                    onClick={() => { router.push('/register'); setMobileMenuOpen(false); }}
                  >
                    Open Account
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
