"use client";

import { UserPlus, Package, CreditCard, Truck, CheckCircle } from 'lucide-react';
import { AnimatedSection, StaggerContainer, StaggerItem } from './AnimatedSection';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: UserPlus,
    title: 'Sign Up & KYC',
    description: 'Quick registration with Aadhaar verification for compliance.',
    step: '01',
  },
  {
    icon: Package,
    title: 'Create Shipment',
    description: 'Enter details, upload documents, and select your carrier.',
    step: '02',
  },
  {
    icon: CreditCard,
    title: 'Pay & Confirm',
    description: 'Secure payment from your wallet. Minimum ₹1,000 balance required.',
    step: '03',
  },
  {
    icon: Truck,
    title: 'Schedule Pickup',
    description: 'We collect from your doorstep and handle all logistics.',
    step: '04',
  },
  {
    icon: CheckCircle,
    title: 'Track & Receive',
    description: 'Real-time updates until safe delivery to your recipient.',
    step: '05',
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
      
      <div className="container relative">
        <AnimatedSection className="text-center mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-coke-red/10 text-coke-red text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-typewriter mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Ship your items internationally in 5 simple steps
          </p>
        </AnimatedSection>

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
          
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8" staggerDelay={0.15}>
            {steps.map((step, index) => (
              <StaggerItem key={step.step}>
                <motion.div
                  whileHover={{ y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <div className="bg-card border border-border rounded-2xl p-6 text-center relative z-10 h-full hover:shadow-xl hover:border-primary/30 transition-all duration-300">
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
                    
                    <h3 className="font-bold mb-2 font-typewriter text-lg">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
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
        </div>
      </div>
    </section>
  );
};
