"use client";

import { useState, useEffect, useRef } from 'react';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedSection, StaggerContainer, StaggerItem } from './AnimatedSection';
import { motion, useInView } from 'framer-motion';

// Counter animation hook
const useCountUp = (end: number, duration: number = 2000, startOnView: boolean = true) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!startOnView || !isInView || hasStarted.current) return;
    hasStarted.current = true;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration, isInView, startOnView]);

  return { count, ref };
};

// Counter component for different stat formats
const AnimatedStat = ({ value, label }: { value: string; label: string }) => {
  // Parse the value to extract number and suffix
  const parseValue = (val: string) => {
    if (val.includes('/')) {
      // Rating format: 4.9/5
      const [num] = val.split('/');
      return { number: parseFloat(num) * 10, suffix: '/5', divisor: 10, isDecimal: true };
    } else if (val.includes('%')) {
      // Percentage: 99.5%
      const num = parseFloat(val);
      return { number: num * 10, suffix: '%', divisor: 10, isDecimal: true };
    } else if (val.includes(',')) {
      // Large number: 50,000+
      const num = parseInt(val.replace(/,/g, '').replace('+', ''));
      return { number: num, suffix: '+', divisor: 1, isDecimal: false };
    } else {
      // Simple number: 150+
      const num = parseInt(val.replace('+', ''));
      return { number: num, suffix: '+', divisor: 1, isDecimal: false };
    }
  };

  const { number, suffix, divisor, isDecimal } = parseValue(value);
  const { count, ref } = useCountUp(number, 2000);

  const displayValue = isDecimal 
    ? (count / divisor).toFixed(1)
    : count.toLocaleString('en-IN');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="space-y-2"
    >
      <motion.p
        whileHover={{ scale: 1.05 }}
        className="text-3xl md:text-4xl font-bold font-typewriter text-coke-red"
      >
        <span ref={ref}>{displayValue}</span>{suffix}
      </motion.p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
};

const testimonials = [
  {
    name: 'Priya Sharma',
    location: 'Mumbai → London',
    type: 'Medicine Shipment',
    rating: 5,
    text: 'CourierX made shipping my mother\'s medicines to London so easy. The prescription verification was smooth and delivery was faster than expected!',
    avatar: 'PS',
  },
  {
    name: 'Rajesh Kumar',
    location: 'Bangalore → Dubai',
    type: 'Document Delivery',
    rating: 5,
    text: 'Sent important legal documents for my visa application. Tracking was excellent and documents arrived safely within 3 days.',
    avatar: 'RK',
  },
  {
    name: 'Anita Desai',
    location: 'Delhi → New York',
    type: 'Gift Package',
    rating: 5,
    text: 'Shipped Diwali sweets and gifts to my son in the US. CourierX handled customs perfectly and everything arrived fresh!',
    avatar: 'AD',
  },
  {
    name: 'Mohammed Ali',
    location: 'Chennai → Singapore',
    type: 'Medicine Shipment',
    rating: 5,
    text: 'Regular customer for 2 years now. Their medicine shipping compliance and customer support is unmatched.',
    avatar: 'MA',
  },
];

const stats = [
  { value: '50,000+', label: 'Shipments Delivered' },
  { value: '150+', label: 'Countries Served' },
  { value: '99.5%', label: 'On-Time Delivery' },
  { value: '4.9/5', label: 'Customer Rating' },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Decorative Quote */}
      <div className="absolute top-20 left-10 opacity-[0.03]">
        <Quote className="w-64 h-64 text-foreground" />
      </div>
      
      <div className="container relative">
        <AnimatedSection className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-typewriter mb-4">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Join thousands of satisfied customers who trust CourierX for their international shipping needs.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20" staggerDelay={0.12}>
          {testimonials.map((testimonial) => (
            <StaggerItem key={testimonial.name}>
              <motion.div whileHover={{ y: -8 }} transition={{ duration: 0.3 }}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-4 h-full flex flex-col">
                    <motion.div
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Quote className="h-8 w-8 text-coke-red/30" />
                    </motion.div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed flex-grow">
                      &quot;{testimonial.text}&quot;
                    </p>
                    
                    <div className="flex gap-0.5">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        </motion.div>
                      ))}
                    </div>
                    
                    <div className="pt-4 border-t border-border flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-coke-red/20 to-primary/20 flex items-center justify-center text-sm font-bold text-primary"
                      >
                        {testimonial.avatar}
                      </motion.div>
                      <div>
                        <p className="font-semibold text-sm">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Stats Section */}
        <AnimatedSection delay={0.3}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center p-8 rounded-2xl bg-card border border-border">
            {stats.map((stat) => (
              <AnimatedStat key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};
