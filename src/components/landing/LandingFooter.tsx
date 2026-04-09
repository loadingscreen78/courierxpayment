"use client";

import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
const logoMain = { src: '/lovable-uploads/logo.png' };
import { motion } from 'framer-motion';
import { AnimatedSection } from './AnimatedSection';
import { useRouter } from 'next/navigation';

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
];

const quickLinks = [
  { label: 'Track Shipment', href: '/public/track' },
  { label: 'Rate Calculator', href: '/public/rate-calculator' },
  { label: 'Domestic Courier', href: '/services/domestic-courier' },
  { label: 'Blog', href: '/blog' },
  { label: 'Ship Medicine', href: '/auth' },
  { label: 'Ship Documents', href: '/auth' },
  { label: 'Ship Gifts', href: '/auth' },
];

const supportLinks = [
  { label: 'Contact Us', href: '/contact' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Refund & Cancellation', href: '/refund-policy' },
  { label: 'Shipping & Compliance', href: '/shipping-policy' },
  { label: 'Prohibited Items', href: '/prohibited-items' },
  { label: 'KYC & Verification', href: '/kyc-policy' },
  { label: 'Chargeback Policy', href: '/chargeback-policy' },
  { label: 'Data Retention', href: '/data-retention-policy' },
];

export const LandingFooter = () => {
  const router = useRouter();
  const [currentYear, setCurrentYear] = useState(2026);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleNavClick = (href: string) => {
    if (href.startsWith('/')) {
      router.push(href);
    }
  };

  return (
    <footer className="bg-charcoal text-paper-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-paper-white/20 to-transparent" />
      
      <div className="container py-10 sm:py-16">
        {/* ── Mobile: Brand section full-width on top ── */}
        <div className="lg:hidden mb-8">
          <AnimatedSection direction="up" delay={0}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex items-center gap-3">
                <img src={logoMain.src} alt="CourierX" className="h-10 w-auto rounded-lg" />
              </div>
              <p className="text-paper-white/60 text-sm leading-relaxed max-w-xs">
                India&apos;s only person to person courier booking platform. Send medicines, documents, gifts &amp; parcels across India and worldwide.
              </p>
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 rounded-full bg-paper-white/10 flex items-center justify-center hover:bg-coke-red/80 transition-colors duration-300"
                    aria-label={social.label}
                  >
                    <social.icon className="h-5 w-5" />
                  </motion.a>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>

        {/* ── Link columns ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 sm:gap-12">
          {/* Brand — desktop only (mobile version is above) */}
          <AnimatedSection direction="up" delay={0} className="hidden lg:block">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <img src={logoMain.src} alt="CourierX" className="h-10 w-auto rounded-lg" />
              </div>
              <p className="text-paper-white/60 text-sm leading-relaxed">
                India&apos;s only person to person courier booking platform. Send medicines, documents, gifts &amp; parcels 
                door-to-door across India and to 150+ countries.
              </p>
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 rounded-full bg-paper-white/10 flex items-center justify-center hover:bg-coke-red/80 transition-colors duration-300"
                    aria-label={social.label}
                  >
                    <social.icon className="h-5 w-5" />
                  </motion.a>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Quick Links */}
          <AnimatedSection direction="up" delay={0.1}>
            <div className="space-y-4">
              <h3 className="font-semibold text-sm sm:text-lg font-typewriter text-paper-white/90">Quick Links</h3>
              <ul className="space-y-2.5">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleNavClick(link.href)}
                      className="text-paper-white/60 hover:text-paper-white text-xs sm:text-sm transition-all duration-200 inline-block hover:translate-x-1"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </AnimatedSection>

          {/* Support */}
          <AnimatedSection direction="up" delay={0.2}>
            <div className="space-y-4">
              <h3 className="font-semibold text-sm sm:text-lg font-typewriter text-paper-white/90">Support</h3>
              <ul className="space-y-2.5">
                {supportLinks.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <button
                        onClick={() => handleNavClick(link.href)}
                        className="text-paper-white/60 hover:text-paper-white text-xs sm:text-sm transition-all duration-200 inline-block hover:translate-x-1"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        className="text-paper-white/60 hover:text-paper-white text-xs sm:text-sm transition-all duration-200 inline-block hover:translate-x-1"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </AnimatedSection>

          {/* Contact — full width on mobile */}
          <AnimatedSection direction="up" delay={0.3} className="col-span-2 lg:col-span-1">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm sm:text-lg font-typewriter text-paper-white/90">Contact Us</h3>
              
              {/* Mobile: compact horizontal layout */}
              <div className="lg:hidden space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-coke-red mt-0.5 shrink-0" />
                  <span className="text-paper-white/60 text-xs leading-relaxed">
                    A/1801, Gagan Unnati, Kondhwa BK, Pune – 411048, Maharashtra
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <a href="tel:+918484050057" className="flex items-center gap-2 text-paper-white/60 hover:text-paper-white text-xs transition-colors">
                    <Phone className="h-3.5 w-3.5 text-coke-red shrink-0" />
                    +91 8484050057
                  </a>
                  <a href="tel:+917008368628" className="flex items-center gap-2 text-paper-white/60 hover:text-paper-white text-xs transition-colors">
                    <Phone className="h-3.5 w-3.5 text-coke-red shrink-0" />
                    +91 7008368628
                  </a>
                  <a href="mailto:info@courierx.in" className="flex items-center gap-2 text-paper-white/60 hover:text-paper-white text-xs transition-colors">
                    <Mail className="h-3.5 w-3.5 text-coke-red shrink-0" />
                    info@courierx.in
                  </a>
                </div>
              </div>

              {/* Desktop: vertical layout */}
              <ul className="hidden lg:block space-y-4">
                <li className="flex items-start gap-3 group">
                  <MapPin className="h-5 w-5 text-paper-white/60 mt-0.5 group-hover:text-coke-red transition-colors" />
                  <span className="text-paper-white/60 text-sm">
                    A/1801, Gagan Unnati, Kondhwa BK,<br />
                    Pune – 411048, Maharashtra, India
                  </span>
                </li>
                <li>
                  <motion.a
                    href="tel:+917008368628"
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 group"
                  >
                    <Phone className="h-5 w-5 text-paper-white/60 group-hover:text-coke-red transition-colors" />
                    <span className="text-paper-white/60 group-hover:text-paper-white text-sm transition-colors">
                      +91 7008368628 (East India)
                    </span>
                  </motion.a>
                </li>
                <li>
                  <motion.a
                    href="tel:+918484050057"
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 group"
                  >
                    <Phone className="h-5 w-5 text-paper-white/60 group-hover:text-coke-red transition-colors" />
                    <span className="text-paper-white/60 group-hover:text-paper-white text-sm transition-colors">
                      +91 8484050057 (West India)
                    </span>
                  </motion.a>
                </li>
                <li>
                  <motion.a
                    href="mailto:info@courierx.in"
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 group"
                  >
                    <Mail className="h-5 w-5 text-paper-white/60 group-hover:text-coke-red transition-colors" />
                    <span className="text-paper-white/60 group-hover:text-paper-white text-sm transition-colors">
                      info@courierx.in
                    </span>
                  </motion.a>
                </li>
              </ul>
            </div>
          </AnimatedSection>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-paper-white/10">
        <div className="container py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-paper-white/40 text-xs sm:text-sm"
          >
            © {currentYear} CourierX. All rights reserved.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 sm:gap-6 text-[10px] sm:text-sm text-paper-white/40 flex-wrap justify-center"
          >
            <span className="hover:text-paper-white/60 transition-colors cursor-default">CSB-IV Compliant</span>
            <span className="text-paper-white/20">•</span>
            <span className="hover:text-paper-white/60 transition-colors cursor-default">ISO 9001 Certified</span>
            <span className="text-paper-white/20">•</span>
            <span className="hover:text-paper-white/60 transition-colors cursor-default">IATA Approved</span>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

