"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Globe,
  Headphones,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Building2,
  Navigation,
} from 'lucide-react';
import { LandingHeader, LandingFooter } from '@/components/landing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// Typing effect hook
const useTypingEffect = (text: string, speed: number = 50, startOnView: boolean = true) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!startOnView || !isInView || hasStarted.current) return;
    hasStarted.current = true;

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, isInView, startOnView]);

  return { displayText, isComplete, ref };
};

// Office locations data
const officeLocations = [
  {
    id: 1,
    city: 'Pune',
    country: 'India',
    address: 'A/1801, Gagan Unnati, Kondhwa BK, Pune – 411048',
    phone: '+91 8484050057',
    email: 'info@courierx.in',
    coordinates: { x: 52, y: 42 },
    isHQ: true,
    timezone: 'IST (UTC+5:30)',
  },
  {
    id: 2,
    city: 'Eastern India',
    country: 'India',
    address: 'Eastern India Operations',
    phone: '+91 7008368628',
    email: 'info@courierx.in',
    coordinates: { x: 62, y: 38 },
    isHQ: false,
    timezone: 'IST (UTC+5:30)',
  },
];

const contactReasons = [
  { value: 'shipping', label: 'Shipping Inquiry' },
  { value: 'tracking', label: 'Track My Shipment' },
  { value: 'pricing', label: 'Pricing & Quotes' },
  { value: 'partnership', label: 'Business Partnership' },
  { value: 'complaint', label: 'File a Complaint' },
  { value: 'feedback', label: 'Feedback & Suggestions' },
  { value: 'other', label: 'Other' },
];

const stats = [
  { value: '24/7', label: 'Support Available' },
  { value: '<2hr', label: 'Response Time' },
  { value: '98%', label: 'Resolution Rate' },
  { value: '4.9/5', label: 'Customer Rating' },
];

// Animated Map Component
const InteractiveMap = ({ 
  locations, 
  selectedLocation, 
  onSelectLocation 
}: { 
  locations: typeof officeLocations;
  selectedLocation: number | null;
  onSelectLocation: (id: number) => void;
}) => {
  return (
    <div className="relative w-full aspect-[2/1] bg-gradient-to-br from-charcoal/5 to-primary/5 rounded-3xl overflow-hidden border border-border">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(227, 24, 55, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(227, 24, 55, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Animated Globe Lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50">
        {/* Latitude lines */}
        {[15, 25, 35, 45].map((y, i) => (
          <motion.path
            key={`lat-${i}`}
            d={`M 5 ${y} Q 50 ${y + (i % 2 === 0 ? 3 : -3)} 95 ${y}`}
            stroke="currentColor"
            strokeWidth="0.2"
            fill="none"
            className="text-muted-foreground/30"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: i * 0.2 }}
          />
        ))}
        {/* Longitude lines */}
        {[20, 35, 50, 65, 80].map((x, i) => (
          <motion.path
            key={`lng-${i}`}
            d={`M ${x} 5 Q ${x + (i % 2 === 0 ? 3 : -3)} 25 ${x} 45`}
            stroke="currentColor"
            strokeWidth="0.2"
            fill="none"
            className="text-muted-foreground/30"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.5 + i * 0.2 }}
          />
        ))}
        
        {/* Connection lines between offices */}
        {locations.slice(1).map((loc, i) => (
          <motion.line
            key={`connection-${i}`}
            x1={locations[0].coordinates.x}
            y1={locations[0].coordinates.y}
            x2={loc.coordinates.x}
            y2={loc.coordinates.y}
            stroke="#E31837"
            strokeWidth="0.3"
            strokeDasharray="2 2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 1.5, delay: 1 + i * 0.3 }}
          />
        ))}
      </svg>

      {/* Location Pins */}
      {locations.map((location, index) => (
        <motion.button
          key={location.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: 'spring', 
            stiffness: 200, 
            delay: 0.5 + index * 0.15 
          }}
          onClick={() => onSelectLocation(location.id)}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
          style={{ 
            left: `${location.coordinates.x}%`, 
            top: `${location.coordinates.y}%` 
          }}
        >
          {/* Pulse ring */}
          <motion.div
            className={`absolute inset-0 rounded-full ${
              location.isHQ ? 'bg-coke-red' : 'bg-primary'
            }`}
            animate={{ 
              scale: selectedLocation === location.id ? [1, 2, 1] : [1, 1.5, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Pin */}
          <motion.div
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            className={`relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all ${
              selectedLocation === location.id
                ? 'bg-coke-red ring-4 ring-coke-red/30'
                : location.isHQ
                ? 'bg-coke-red'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {location.isHQ ? (
              <Building2 className="w-4 h-4 text-white" />
            ) : (
              <MapPin className="w-4 h-4 text-white" />
            )}
          </motion.div>
          
          {/* Label */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ 
              opacity: selectedLocation === location.id ? 1 : 0,
              y: selectedLocation === location.id ? 0 : 5
            }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <span className="px-2 py-1 bg-card border border-border rounded-lg text-xs font-medium shadow-lg">
              {location.city}
              {location.isHQ && (
                <span className="ml-1 text-coke-red">(HQ)</span>
              )}
            </span>
          </motion.div>
        </motion.button>
      ))}

      {/* Floating particles - using deterministic positions to avoid hydration mismatch */}
      {[
        { left: 25, top: 30, duration: 3.5, delay: 0.2 },
        { left: 35, top: 45, duration: 4.2, delay: 0.8 },
        { left: 50, top: 25, duration: 3.8, delay: 1.4 },
        { left: 65, top: 55, duration: 4.5, delay: 0.5 },
        { left: 40, top: 65, duration: 3.2, delay: 1.1 },
        { left: 70, top: 35, duration: 4.0, delay: 1.8 },
        { left: 55, top: 50, duration: 3.6, delay: 0.3 },
        { left: 30, top: 60, duration: 4.3, delay: 1.6 },
      ].map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-coke-red/40"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
};

// Contact Form Component
const ContactForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast({
      title: 'Message Sent!',
      description: 'We\'ll get back to you within 24 hours.',
    });
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full flex flex-col items-center justify-center text-center p-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 rounded-full bg-candlestick-green/20 flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-10 h-10 text-candlestick-green" />
        </motion.div>
        <h3 className="text-2xl font-bold font-typewriter mb-2">Thank You!</h3>
        <p className="text-muted-foreground mb-6">
          Your message has been received. Our team will respond shortly.
        </p>
        <Button onClick={() => setIsSubmitted(false)} variant="outline">
          Send Another Message
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input 
            id="firstName" 
            placeholder="John" 
            required 
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input 
            id="lastName" 
            placeholder="Doe" 
            required 
            className="bg-background/50"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="john@example.com" 
          required 
          className="bg-background/50"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input 
          id="phone" 
          type="tel" 
          placeholder="+91 98765 43210" 
          className="bg-background/50"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="reason">How can we help?</Label>
        <Select required>
          <SelectTrigger className="bg-background/50">
            <SelectValue placeholder="Select a topic" />
          </SelectTrigger>
          <SelectContent>
            {contactReasons.map((reason) => (
              <SelectItem key={reason.value} value={reason.value}>
                {reason.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="message">Your Message</Label>
        <Textarea 
          id="message" 
          placeholder="Tell us more about your inquiry..."
          rows={4}
          required
          className="bg-background/50 resize-none"
        />
      </div>
      
      <Button 
        type="submit" 
        size="lg"
        className="w-full bg-coke-red hover:bg-coke-red/90 shadow-lg shadow-coke-red/25"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
          />
        ) : (
          <>
            Send Message
            <Send className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
};


// Main Contact Page Component
const Contact = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const isHeroInView = useInView(heroRef, { once: true });
  const [selectedLocation, setSelectedLocation] = useState<number | null>(1);
  const [isMounted, setIsMounted] = useState(false);

  const { displayText: heroText, ref: typingRef } = useTypingEffect(
    'Get in Touch',
    60
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  const selectedOffice = officeLocations.find(loc => loc.id === selectedLocation);

  return (
    <div ref={containerRef} className="min-h-screen bg-background">
      <LandingHeader />

      {!isMounted ? (
        /* Loading skeleton to prevent hydration mismatch */
        <div className="flex items-center justify-center min-h-[50vh] pt-20">
          <div className="animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-muted" />
          </div>
        </div>
      ) : (
        <>
          {/* Hero Section */}
          <motion.section
            ref={heroRef}
            style={{ opacity: heroOpacity, scale: heroScale }}
            className="relative min-h-[50vh] flex items-center justify-center overflow-hidden pt-20"
          >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-coke-red/5 via-background to-primary/5" />
        
        {/* Animated circles - deterministic to avoid hydration mismatch */}
        <div className="absolute inset-0 overflow-hidden">
          {[
            { size: 300, duration: 20 },
            { size: 500, duration: 30 },
            { size: 700, duration: 40 },
          ].map((circle, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-coke-red/10"
              style={{
                width: `${circle.size}px`,
                height: `${circle.size}px`,
                left: '50%',
                top: '50%',
                x: '-50%',
                y: '-50%',
              }}
              animate={{ 
                rotate: 360,
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                rotate: { duration: circle.duration, repeat: Infinity, ease: 'linear' },
                scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
              }}
            />
          ))}
        </div>

        <div className="container relative z-10 text-center space-y-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coke-red/10 text-coke-red text-sm font-medium mb-4">
              <Headphones className="h-4 w-4" />
              We&apos;re Here to Help
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold font-typewriter"
          >
            <span ref={typingRef} className="text-foreground">
              {heroText}
            </span>
            {heroText.length > 0 && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                className="text-coke-red"
              >
                |
              </motion.span>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Have questions about shipping? Need support? Our global team is ready to assist you 24/7.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-8 pt-8"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isHeroInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl font-bold font-typewriter text-coke-red">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
          </motion.section>

          {/* Company Identity - Indiano Ventures */}
          <section className="py-10">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative rounded-3xl bg-card border border-border p-8 md:p-12 shadow-xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-coke-red/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-coke-red/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-coke-red" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Operated by</p>
                        <h3 className="text-2xl font-bold font-typewriter">Indiano Ventures Private Limited</h3>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      CourierX™ is a brand of Indiano Ventures Private Limited, a registered company in India providing reliable international and domestic courier services.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                      <MapPin className="h-5 w-5 text-coke-red mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Registered Address</p>
                        <p className="text-sm text-muted-foreground">A/1801, Gagan Unnati, Kondhwa BK, Pune – 411048, Maharashtra, India</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                        <Mail className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-xs text-muted-foreground">info@courierx.in</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                        <Phone className="h-5 w-5 text-candlestick-green shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Phone</p>
                          <p className="text-xs text-muted-foreground">+91 8484050057</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Main Content */}
          <section className="py-16 relative">
            <div className="container">
              <div className="grid lg:grid-cols-2 gap-12 items-start">
                {/* Left: Contact Form */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-coke-red/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-coke-red" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-typewriter">Send a Message</h2>
                    <p className="text-sm text-muted-foreground">We typically respond within 2 hours</p>
                  </div>
                </div>
                <ContactForm />
              </div>
            </motion.div>

            {/* Right: Map & Office Info */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Interactive Map */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold font-typewriter">Our Global Offices</h3>
                    <p className="text-xs text-muted-foreground">Click on a pin to see details</p>
                  </div>
                </div>
                
                <InteractiveMap 
                  locations={officeLocations}
                  selectedLocation={selectedLocation}
                  onSelectLocation={setSelectedLocation}
                />
              </div>

              {/* Selected Office Details */}
              <motion.div
                key={selectedLocation}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-card border border-border rounded-3xl p-6 shadow-xl"
              >
                {selectedOffice && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold font-typewriter">
                            {selectedOffice.city}
                          </h3>
                          {selectedOffice.isHQ && (
                            <span className="px-2 py-0.5 bg-coke-red/10 text-coke-red text-xs font-medium rounded-full">
                              Headquarters
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedOffice.country}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {selectedOffice.timezone}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                        <MapPin className="h-5 w-5 text-coke-red mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Address</p>
                          <p className="text-sm text-muted-foreground">{selectedOffice.address}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <a 
                          href={`tel:${selectedOffice.phone}`}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <Phone className="h-5 w-5 text-candlestick-green" />
                          <div>
                            <p className="text-sm font-medium">Phone</p>
                            <p className="text-xs text-muted-foreground">{selectedOffice.phone}</p>
                          </div>
                        </a>
                        
                        <a 
                          href={`mailto:${selectedOffice.email}`}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <Mail className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">Email</p>
                            <p className="text-xs text-muted-foreground truncate">{selectedOffice.email}</p>
                          </div>
                        </a>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full group">
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                      <ArrowRight className="h-4 w-4 ml-auto transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Contact Cards */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Quick Contact
            </span>
            <h2 className="text-3xl md:text-4xl font-bold font-typewriter">
              Other Ways to <span className="text-coke-red">Reach Us</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Phone,
                title: 'East India',
                description: 'Speak directly with our Eastern India team',
                action: '+91 7008368628',
                actionLabel: 'Call Now',
                color: 'bg-candlestick-green',
                href: 'tel:+917008368628',
              },
              {
                icon: Phone,
                title: 'West India',
                description: 'Speak directly with our Western India team',
                action: '+91 8484050057',
                actionLabel: 'Call Now',
                color: 'bg-primary',
                href: 'tel:+918484050057',
              },
              {
                icon: Mail,
                title: 'Email Us',
                description: 'Send us a detailed inquiry',
                action: 'info@courierx.in',
                actionLabel: 'Send Email',
                color: 'bg-coke-red',
                href: 'mailto:info@courierx.in',
              },
            ].map((item, index) => (
              <motion.a
                key={item.title}
                href={item.href}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group bg-card border border-border rounded-3xl p-8 text-center hover:border-coke-red/30 hover:shadow-xl transition-all duration-300"
              >
                <motion.div
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}
                >
                  <item.icon className="h-8 w-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold font-typewriter mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{item.description}</p>
                <p className="font-semibold text-foreground mb-4">{item.action}</p>
                <span className="inline-flex items-center gap-2 text-coke-red font-medium group-hover:gap-3 transition-all">
                  {item.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ CTA */}
      <section className="py-16">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl bg-gradient-to-r from-coke-red to-coke-red/80 p-12 text-center text-white overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
            
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6"
              >
                <Sparkles className="h-8 w-8" />
              </motion.div>
              <h2 className="text-3xl md:text-4xl font-bold font-typewriter mb-4">
                Looking for Quick Answers?
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8">
                Check out our comprehensive FAQ section for instant answers to common questions about shipping, tracking, and more.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white text-coke-red hover:bg-white/90 shadow-lg"
              >
                Visit Help Center
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
          </section>
        </>
      )}

      <LandingFooter />
    </div>
  );
};

export default Contact;
