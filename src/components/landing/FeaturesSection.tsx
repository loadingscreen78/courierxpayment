"use client";

import { Pill, FileText, Gift, Truck, Clock, Globe, Headphones, ShieldCheck, Shield, House } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedSection, StaggerContainer, StaggerItem } from './AnimatedSection';
import { motion } from 'framer-motion';

const shipmentTypes = [
  {
    icon: Pill,
    title: 'Medicines',
    description: 'Ship prescription medicines person to person with proper documentation and temperature control. CSB-IV compliant.',
    features: ['Doctor prescription support', '90-day supply limit', 'Temperature monitoring'],
    color: 'text-coke-red',
    bgColor: 'bg-coke-red/10',
    hoverBorder: 'hover:border-coke-red/30',
  },
  {
    icon: FileText,
    title: 'Documents',
    description: 'Send legal documents, certificates, and important papers person to person — delivered securely worldwide.',
    features: ['Tamper-proof packaging', 'Signature confirmation', 'Express delivery'],
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    hoverBorder: 'hover:border-primary/30',
  },
  {
    icon: Gift,
    title: 'Gifts & Parcels',
    description: 'Book person to person courier for personal gifts, care packages, and parcels to loved ones across the globe.',
    features: ['Custom declarations', 'Gift wrapping option', 'Duty-free guidance'],
    color: 'text-candlestick-green',
    bgColor: 'bg-candlestick-green/20',
    hoverBorder: 'hover:border-candlestick-green/30',
  },
  {
    icon: House,
    title: 'Domestic Courier',
    description: 'Person to person domestic courier booking across India. Door-to-door parcel delivery with same-day pickup.',
    features: ['Same-day pickup', 'Pan-India coverage', '1-5 day delivery'],
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    hoverBorder: 'hover:border-amber-500/30',
  },
];

const features = [
  {
    icon: Shield,
    title: 'Person to Person',
    description: 'India\'s only platform built for personal courier booking between individuals.',
  },
  {
    icon: Truck,
    title: 'Multiple Carriers',
    description: 'Compare DHL, FedEx, Aramex, BlueDart, DTDC — pick the best rate.',
  },
  {
    icon: Clock,
    title: 'Doorstep Pickup',
    description: 'Same-day pickup from your door. No need to visit a courier office.',
  },
  {
    icon: Globe,
    title: 'Domestic & International',
    description: 'Ship across India or to 150+ countries with real-time tracking.',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Dedicated customer support via WhatsApp and email.',
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-muted/30 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-coke-red/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-candlestick-green/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="container relative">
        {/* Section Header */}
        <AnimatedSection className="text-center mb-10 sm:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Shipping Categories
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-typewriter mb-4">
            What Can You Ship?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg px-2">
            Person to person courier booking for medicines, documents, gifts, and parcels — domestic and international.
          </p>
        </AnimatedSection>

        {/* Shipment Type Cards */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8 mb-16 sm:mb-24" staggerDelay={0.15}>
          {shipmentTypes.map((type) => (
            <StaggerItem key={type.title}>
              <motion.div whileHover={{ y: -8 }} transition={{ duration: 0.3 }}>
                <Card className={`group h-full border-2 transition-all duration-300 ${type.hoverBorder} hover:shadow-xl bg-card/80 backdrop-blur-sm`}>
                  <CardContent className="p-5 sm:p-8 space-y-4 sm:space-y-5">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className={`w-16 h-16 rounded-2xl ${type.bgColor} flex items-center justify-center`}
                    >
                      <type.icon className={`h-8 w-8 ${type.color}`} />
                    </motion.div>
                    <h3 className="text-2xl font-bold font-typewriter">{type.title}</h3>
                    <p className="text-muted-foreground">{type.description}</p>
                    <ul className="space-y-2 pt-2">
                      {type.features.map((feature, idx) => (
                        <li key={feature} className="flex items-center gap-3 text-sm">
                          <motion.div
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            viewport={{ once: true }}
                            className={`w-2 h-2 rounded-full ${type.color.replace('text-', 'bg-')}`}
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Why Choose Section */}
        <AnimatedSection className="text-center mb-8 sm:mb-12" delay={0.2}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-candlestick-green/20 text-foreground text-sm font-medium mb-4">
            Our Advantages
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-typewriter mb-4">
            Why Choose CourierX?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg px-2">
            The only courier platform in India built for person to person shipments — simple, affordable, and worry-free.
          </p>
        </AnimatedSection>

        {/* Features Grid */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6" staggerDelay={0.1}>
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="text-center p-4 sm:p-6 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300 h-full"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
                >
                  <feature.icon className="h-7 w-7 text-primary" />
                </motion.div>
                <h3 className="font-semibold mb-2 font-typewriter">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};
