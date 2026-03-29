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
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand */}
          <AnimatedSection direction="up" delay={0}>
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <img src={logoMain.src} alt="CourierX" className="h-10 w-auto rounded-lg" />
                <span className="font-bold text-xl font-typewriter">CourierX</span>
              </div>
              <p className="text-paper-white/60 text-sm leading-relaxed">
                India&apos;s trusted international courier aggregator for medicines, documents, and personal gifts. 
                Fast, compliant, and secure shipping worldwide.
              </p>
              <div className="flex gap-3">
                {socialLinks.map((social, index) => (
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
            <div className="space-y-5">
              <h3 className="font-semibold text-lg font-typewriter">Quick Links</h3>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleNavClick(link.href)}
                      className="text-paper-white/60 hover:text-paper-white text-sm transition-all duration-200 inline-block hover:translate-x-1"
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
            <div className="space-y-5">
              <h3 className="font-semibold text-lg font-typewriter">Support</h3>
              <ul className="space-y-3">
                {supportLinks.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <button
                        onClick={() => handleNavClick(link.href)}
                        className="text-paper-white/60 hover:text-paper-white text-sm transition-all duration-200 inline-block hover:translate-x-1"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        className="text-paper-white/60 hover:text-paper-white text-sm transition-all duration-200 inline-block hover:translate-x-1"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </AnimatedSection>

          {/* Contact */}
          <AnimatedSection direction="up" delay={0.3}>
            <div className="space-y-5">
              <h3 className="font-semibold text-lg font-typewriter">Contact Us</h3>
              <ul className="space-y-4">
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
            className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm text-paper-white/40 flex-wrap justify-center"
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

