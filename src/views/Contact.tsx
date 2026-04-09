"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
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
import dynamic from 'next/dynamic';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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
    label: 'Headquarters',
    address: 'A/1801, Gagan Unnati, Katraj Kondhwa Road, Near ISKCON Temple, Kondhwa BK, Pune – 411048, Maharashtra',
    phone: '+91 8484050057',
    email: 'info@courierx.in',
    lng: 73.8567,
    lat: 18.5204,
    isHQ: true,
    timezone: 'IST (UTC+5:30)',
  },
  {
    id: 2,
    city: 'Cuttack',
    country: 'India',
    label: 'Registered Office',
    address: 'At, Rathagadasahi, Urali, Cuttack, Cuttack Sadar, Orissa, India, 753011',
    phone: '+91 7008368628',
    email: 'info@courierx.in',
    lng: 85.8245,
    lat: 20.4625,
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

// Mapbox Office Map Component
const InteractiveMap = ({ 
  locations, 
  selectedLocation, 
  onSelectLocation 
}: { 
  locations: typeof officeLocations;
  selectedLocation: number | null;
  onSelectLocation: (id: number) => void;
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      interactive: true,
      attributionControl: false,
      minZoom: 4.5,
      maxZoom: 15,
    });

    // Fit bounds to show both offices clearly - India view
    const bounds = new mapboxgl.LngLatBounds();
    locations.forEach(loc => bounds.extend([loc.lng, loc.lat]));
    map.fitBounds(bounds, { 
      padding: { top: 80, bottom: 80, left: 80, right: 80 },
      maxZoom: 5.8,
      duration: 0 
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      // Add route line between offices
      map.addSource('office-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: locations.map(l => [l.lng, l.lat]),
          },
        },
      });

      map.addLayer({
        id: 'office-route-line',
        type: 'line',
        source: 'office-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#F40000',
          'line-width': 2,
          'line-dasharray': [4, 4],
          'line-opacity': 0.5,
        },
      });

      // Add markers with labels
      locations.forEach((loc) => {
        // Create marker container
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; flex-direction: column; align-items: center; cursor: pointer;';
        
        // Create marker pin
        const el = document.createElement('div');
        el.style.cssText = `
          width: 44px; height: 44px; border-radius: 50%;
          background: ${loc.isHQ ? '#F40000' : '#1a1a1a'};
          border: 4px solid white;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s;
        `;
        el.innerHTML = loc.isHQ
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M3 21V7l9-4 9 4v14H3zm2-2h14V8.2l-7-3.1L5 8.2V19zm3-2h2v-4h4v4h2v-6l-5-3-5 3v6z"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
        
        // Create label
        const label = document.createElement('div');
        label.style.cssText = `
          margin-top: 8px;
          padding: 4px 10px;
          background: white;
          border: 1px solid ${loc.isHQ ? '#F40000' : '#1a1a1a'};
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          color: ${loc.isHQ ? '#F40000' : '#1a1a1a'};
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        `;
        label.textContent = loc.label;
        
        container.appendChild(el);
        container.appendChild(label);

        container.addEventListener('mouseenter', () => { 
          el.style.transform = 'scale(1.15)'; 
          label.style.transform = 'scale(1.05)';
        });
        container.addEventListener('mouseleave', () => { 
          el.style.transform = 'scale(1)'; 
          label.style.transform = 'scale(1)';
        });
        container.addEventListener('click', () => {
          onSelectLocation(loc.id);
          map.flyTo({ center: [loc.lng, loc.lat], zoom: 12, duration: 1000 });
        });

        const marker = new mapboxgl.Marker({ element: container, anchor: 'bottom' })
          .setLngLat([loc.lng, loc.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [token, locations, onSelectLocation]);

  // Fly to selected location
  useEffect(() => {
    if (!mapRef.current || !selectedLocation) return;
    const loc = locations.find(l => l.id === selectedLocation);
    if (loc) {
      mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 12, duration: 1000 });
    }
  }, [selectedLocation, locations]);

  if (!token) {
    return (
      <div className="w-full aspect-[2/1] bg-muted rounded-3xl flex items-center justify-center text-muted-foreground text-sm">
        Map unavailable
      </div>
    );
  }

  return (
    <div className="w-full aspect-[2/1] rounded-2xl overflow-hidden border border-border">
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
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
  const [selectedLocation, setSelectedLocation] = useState<number | null>(1);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const selectedOffice = officeLocations.find(loc => loc.id === selectedLocation);

  return (
    <div ref={containerRef} className="min-h-screen bg-background">
      <LandingHeader />

      {!isMounted ? (
        <div className="flex items-center justify-center min-h-[20vh] pt-20">
          <div className="animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-muted" />
          </div>
        </div>
      ) : (
        <>
          {/* Compact Header */}
          <section className="pt-28 pb-8">
            <div className="container text-center space-y-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coke-red/10 text-coke-red text-sm font-medium">
                <Headphones className="h-4 w-4" />
                We&apos;re Here to Help
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-typewriter">
                Get in Touch
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Have questions about shipping? Need support? Our team is ready to assist you 24/7.
              </p>
              <div className="flex flex-wrap justify-center gap-8 pt-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-2xl font-bold font-typewriter text-coke-red">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
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
              {/* Company Info Card */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-coke-red/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-coke-red" />
                  </div>
                  <div>
                    <h3 className="font-bold font-typewriter">Goldilocks Zone Private Limited</h3>
                    <p className="text-xs text-muted-foreground">Operating CourierX™</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  A registered company in India providing reliable international and domestic courier services.
                </p>
                
                {/* Addresses */}
                <div className="space-y-3 mb-4 pb-4 border-b border-border">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-coke-red mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-coke-red">Headquarters</p>
                      <p className="text-xs text-muted-foreground">A/1801, Gagan Unnati, Kondhwa BK, Pune – 411048, Maharashtra</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary">Registered Office</p>
                      <p className="text-xs text-muted-foreground">At, Rathagadasahi, Urali, Cuttack, Cuttack Sadar, Orissa, 753011</p>
                      <p className="text-xs text-muted-foreground mt-1">CIN: U52290OD2026PTC053323</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <a 
                    href="mailto:info@courierx.in"
                    className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Email</p>
                      <p className="text-xs text-muted-foreground">info@courierx.in</p>
                    </div>
                  </a>
                  <a 
                    href="tel:+918484050057"
                    className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <Phone className="h-4 w-4 text-candlestick-green shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Phone</p>
                      <p className="text-xs text-muted-foreground">+91 8484050057</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Interactive Map */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold font-typewriter">Our Offices</h3>
                    <p className="text-xs text-muted-foreground">Click on a location to view details</p>
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
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            selectedOffice.isHQ 
                              ? 'bg-coke-red/10 text-coke-red' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {selectedOffice.label}
                          </span>
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
                        <div className="flex-1">
                          <p className="text-sm font-medium">Address</p>
                          <p className="text-sm text-muted-foreground">{selectedOffice.address}</p>
                          {!selectedOffice.isHQ && (
                            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                              CIN: U52290OD2026PTC053323
                            </p>
                          )}
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

                    <Button variant="outline" className="w-full group" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOffice.address)}`, '_blank')}>
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
