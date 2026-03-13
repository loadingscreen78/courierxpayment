"use client";

import { useState, useEffect, useRef } from 'react';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Marquee } from '@/components/ui/3d-testimonials';
import { AnimatedSection } from './AnimatedSection';
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

const AnimatedStat = ({ value, label }: { value: string; label: string }) => {
  const parseValue = (val: string) => {
    if (val.includes('/')) {
      const [num] = val.split('/');
      return { number: parseFloat(num) * 10, suffix: '/5', divisor: 10, isDecimal: true };
    } else if (val.includes('%')) {
      const num = parseFloat(val);
      return { number: num * 10, suffix: '%', divisor: 10, isDecimal: true };
    } else if (val.includes(',')) {
      const num = parseInt(val.replace(/,/g, '').replace('+', ''));
      return { number: num, suffix: '+', divisor: 1, isDecimal: false };
    } else {
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
    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    country: '🇮🇳 India',
  },
  {
    name: 'Rajesh Kumar',
    location: 'Bangalore → Dubai',
    type: 'Document Delivery',
    rating: 5,
    text: 'Sent important legal documents for my visa application. Tracking was excellent and documents arrived safely within 3 days.',
    avatar: 'RK',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    country: '🇮🇳 India',
  },
  {
    name: 'Anita Desai',
    location: 'Delhi → New York',
    type: 'Gift Package',
    rating: 5,
    text: 'Shipped Diwali sweets and gifts to my son in the US. CourierX handled customs perfectly and everything arrived fresh!',
    avatar: 'AD',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    country: '🇮🇳 India',
  },
  {
    name: 'Mohammed Ali',
    location: 'Chennai → Singapore',
    type: 'Medicine Shipment',
    rating: 5,
    text: 'Regular customer for 2 years now. Their medicine shipping compliance and customer support is unmatched.',
    avatar: 'MA',
    img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    country: '🇮🇳 India',
  },
  {
    name: 'Sarah Johnson',
    location: 'London → Mumbai',
    type: 'Gift Package',
    rating: 5,
    text: 'Sent birthday gifts to my friend in India. The tracking updates were real-time and delivery was right on schedule!',
    avatar: 'SJ',
    img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    country: '🇬🇧 UK',
  },
  {
    name: 'David Chen',
    location: 'Singapore → Delhi',
    type: 'Document Delivery',
    rating: 5,
    text: 'Fast and reliable document shipping. The customs clearance was handled seamlessly. Highly recommend!',
    avatar: 'DC',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    country: '🇸🇬 Singapore',
  },
  {
    name: 'Fatima Al-Rashid',
    location: 'Dubai → Hyderabad',
    type: 'Medicine Shipment',
    rating: 5,
    text: 'Needed urgent medicines delivered to my parents. CourierX expedited the shipment and it arrived in 2 days!',
    avatar: 'FA',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    country: '🇦🇪 UAE',
  },
  {
    name: 'Arjun Mehta',
    location: 'Pune → Toronto',
    type: 'Gift Package',
    rating: 5,
    text: 'Shipped homemade snacks and gifts for Raksha Bandhan. Everything was packed perfectly and arrived fresh!',
    avatar: 'AM',
    img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    country: '🇮🇳 India',
  },
  {
    name: 'Lisa Wong',
    location: 'Hong Kong → Kolkata',
    type: 'Document Delivery',
    rating: 5,
    text: 'Professional service for business documents. The online booking was super easy and tracking was spot on.',
    avatar: 'LW',
    img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
    country: '🇭🇰 Hong Kong',
  },
];

const stats = [
  { value: '50,000+', label: 'Shipments Delivered' },
  { value: '150+', label: 'Countries Served' },
  { value: '99.5%', label: 'On-Time Delivery' },
  { value: '4.9/5', label: 'Customer Rating' },
];

function TestimonialCard({ img, name, avatar, location, text, country, rating }: (typeof testimonials)[number]) {
  return (
    <Card className="w-52 shrink-0">
      <CardContent className="p-4">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-9">
            <AvatarImage src={img} alt={name} />
            <AvatarFallback>{avatar}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <figcaption className="text-sm font-medium text-foreground flex items-center gap-1">
              {name} <span className="text-xs">{country}</span>
            </figcaption>
            <p className="text-xs font-medium text-muted-foreground">{location}</p>
          </div>
        </div>
        <blockquote className="mt-3 text-xs text-muted-foreground leading-relaxed">
          &quot;{text}&quot;
        </blockquote>
        <div className="flex gap-0.5 mt-2">
          {Array.from({ length: rating }).map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

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

        {/* 3D Marquee Testimonials */}
        <div className="relative flex h-[420px] w-full max-w-[900px] mx-auto flex-row items-center justify-center overflow-hidden gap-1.5 [perspective:300px] mb-20">
          <div
            className="flex flex-row items-center gap-4"
            style={{
              transform:
                'translateX(-100px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)',
            }}
          >
            <Marquee vertical pauseOnHover repeat={3} className="[--duration:40s]">
              {testimonials.map((review) => (
                <TestimonialCard key={review.name} {...review} />
              ))}
            </Marquee>
            <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:40s]">
              {testimonials.map((review) => (
                <TestimonialCard key={review.name} {...review} />
              ))}
            </Marquee>
            <Marquee vertical pauseOnHover repeat={3} className="[--duration:40s]">
              {testimonials.map((review) => (
                <TestimonialCard key={review.name} {...review} />
              ))}
            </Marquee>
            <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:40s]">
              {testimonials.map((review) => (
                <TestimonialCard key={review.name} {...review} />
              ))}
            </Marquee>

            {/* Gradient overlays */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-background/80 to-transparent z-10"></div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent z-10"></div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background/80 to-transparent z-10"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background/80 to-transparent z-10"></div>
          </div>
        </div>

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
