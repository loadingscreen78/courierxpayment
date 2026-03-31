"use client";

import { useState } from 'react';
import { UserCirclePlus, Package, CreditCard, Truck, CheckCircle, UserCircle, Wallet, IdentificationCard, CurrencyInr } from '@phosphor-icons/react';
import { AnimatedSection, StaggerContainer, StaggerItem } from './AnimatedSection';
import { motion, AnimatePresence } from 'framer-motion';

const guestSteps = [
  {
    icon: Package,
    title: 'Enter Shipment Details',
    description: 'Fill in pickup & delivery addresses. Select domestic or international.',
    step: '01',
  },
  {
    icon: CurrencyInr,
    title: 'Compare Rates',
    description: 'Instantly compare rates from DHL, FedEx, Aramex, BlueDart & more.',
    step: '02',
  },
  {
    icon: CreditCard,
    title: 'Pay Online',
    description: 'Secure online payment. No account or wallet needed.',
    step: '03',
  },
  {
    icon: Truck,
    title: 'Doorstep Pickup',
    description: 'We collect from your doorstep — same-day pickup in metro cities.',
    step: '04',
  },
  {
    icon: CheckCircle,
    title: 'Track & Deliver',
    description: 'Real-time tracking until safe person to person delivery.',
    step: '05',
  },
];

const accountSteps = [
  {
    icon: IdentificationCard,
    title: 'Sign Up & KYC',
    description: 'Quick registration with Aadhaar verification. Unlock lower rates.',
    step: '01',
  },
  {
    icon: Wallet,
    title: 'Load Wallet',
    description: 'Add funds to your CourierX wallet for instant bookings.',
    step: '02',
  },
  {
    icon: Package,
    title: 'Create Shipment',
    description: 'Enter details, select domestic or international, and choose carrier at discounted rates.',
    step: '03',
  },
  {
    icon: Truck,
    title: 'Doorstep Pickup',
    description: 'Same-day pickup from your door. Pay directly from wallet.',
    step: '04',
  },
  {
    icon: CheckCircle,
    title: 'Track & Deliver',
    description: 'Real-time tracking, priority support, and delivery confirmation.',
    step: '05',
  },
];

type WorkflowTab = 'guest' | 'account';

export const HowItWorksSection = () => {
  const [activeTab, setActiveTab] = useState<WorkflowTab>('guest');
  const steps = activeTab === 'guest' ? guestSteps : accountSteps;

  return (
    <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
      
      <div className="container relative">
        <AnimatedSection className="text-center mb-8 sm:mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-coke-red/10 text-coke-red text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-typewriter mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg px-2">
            Book your person to person courier in 5 simple steps — domestic or international
          </p>
        </AnimatedSection>

        {/* Tab Toggle */}
        <AnimatedSection className="flex justify-center mb-10 sm:mb-16" delay={0.1}>
          <div className="inline-flex rounded-2xl border-2 border-border bg-muted/50 p-1.5 gap-1">
            <button
              onClick={() => setActiveTab('guest')}
              className={`relative px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-300 ${
                activeTab === 'guest'
                  ? 'text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === 'guest' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-coke-red rounded-xl shadow-lg shadow-coke-red/25"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <UserCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                Without Account
              </span>
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`relative px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-300 ${
                activeTab === 'account'
                  ? 'text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === 'account' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-coke-red rounded-xl shadow-lg shadow-coke-red/25"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <UserCirclePlus className="h-4 w-4 sm:h-5 sm:w-5" />
                With Account
                <span className="hidden sm:inline text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
                  SAVE 25%
                </span>
              </span>
            </button>
          </div>
        </AnimatedSection>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line - Desktop */}
          <div className="hidden lg:block absolute top-24 left-[10%] right-[10%] h-0.5">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary/20 via-coke-red/40 to-primary/20 origin-left"
            />
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
            >
              <StaggerContainer className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8" staggerDelay={0.1}>
                {steps.map((step, index) => (
                  <StaggerItem key={step.step}>
                    <motion.div
                      whileHover={{ y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="relative"
                    >
                      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 text-center relative z-10 h-full hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                        {/* Step Number */}
                        <motion.div
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 200 }}
                          className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-coke-red text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-coke-red/30"
                        >
                          {step.step}
                        </motion.div>
                        
                        {/* Icon */}
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 10 }}
                          transition={{ type: "spring", stiffness: 400 }}
                          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mt-4 mb-4"
                        >
                          <step.icon className="h-8 w-8 text-primary" />
                        </motion.div>
                        
                        <h3 className="font-bold mb-1 sm:mb-2 font-typewriter text-sm sm:text-lg">{step.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                      
                      {/* Arrow for mobile/tablet */}
                      {index < steps.length - 1 && (
                        <div className="lg:hidden flex justify-center my-4">
                          <motion.div
                            initial={{ height: 0 }}
                            whileInView={{ height: 32 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="w-0.5 bg-gradient-to-b from-coke-red/50 to-transparent"
                          />
                        </div>
                      )}
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Note */}
        <AnimatedSection className="text-center mt-8 sm:mt-12" delay={0.3}>
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {activeTab === 'guest' ? (
              <>Ship instantly — no sign-up needed. Want lower rates?{' '}
                <button
                  onClick={() => setActiveTab('account')}
                  className="text-coke-red font-medium hover:underline"
                >
                  Open a free account →
                </button>
              </>
            ) : (
              <>Account holders save up to <span className="font-semibold text-candlestick-green">25%</span> on every shipment with wallet payments and priority support.</>            )}
          </motion.p>
        </AnimatedSection>
      </div>
    </section>
  );
};
