"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Package,
  Globe,
  Shield,
  Clock,
  Award,
  Target,
  Heart,
  Zap,
  TrendingUp,
  Plane,
} from 'lucide-react';
import { LandingHeader, LandingFooter } from '@/components/landing';
import { useSeo } from '@/hooks/useSeo';
import { WorldMap } from '@/components/ui/world-map';

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

// Counter animation hook
const useCountUp = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!isInView || hasStarted.current) return;
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
  }, [end, duration, isInView]);

  return { count, ref };
};

// Timeline data
const timelineData = [
  {
    year: '2019',
    title: 'The Beginning',
    description: 'CourierX was founded with a vision to simplify international shipping from India.',
    icon: Zap,
    color: 'bg-coke-red',
  },
  {
    year: '2020',
    title: 'Medicine Shipping Launch',
    description: 'Became the first CSB-IV compliant platform for international medicine shipping.',
    icon: Shield,
    color: 'bg-candlestick-green',
  },
  {
    year: '2021',
    title: 'Global Expansion',
    description: 'Expanded to 100+ countries with partnerships with DHL, FedEx, and Aramex.',
    icon: Globe,
    color: 'bg-primary',
  },
  {
    year: '2022',
    title: '25,000 Shipments',
    description: 'Crossed 25,000 successful shipments with 99.5% on-time delivery rate.',
    icon: TrendingUp,
    color: 'bg-amber-500',
  },
  {
    year: '2023',
    title: 'AI-Powered Platform',
    description: 'Launched AI-driven customs compliance and real-time tracking system.',
    icon: Target,
    color: 'bg-purple-500',
  },
  {
    year: '2024',
    title: '50,000+ Shipments',
    description: 'Serving 150+ countries with industry-leading customer satisfaction.',
    icon: Award,
    color: 'bg-coke-red',
  },
];

// Team data
const teamData = [
  { name: 'Arjun Mehta', role: 'Founder & CEO', avatar: 'AM' },
  { name: 'Priya Sharma', role: 'COO', avatar: 'PS' },
  { name: 'Vikram Singh', role: 'CTO', avatar: 'VS' },
  { name: 'Neha Gupta', role: 'Head of Operations', avatar: 'NG' },
];

// Values data
const valuesData = [
  {
    icon: Shield,
    title: 'Trust & Compliance',
    description: 'CSB-IV certified with 100% customs compliance',
  },
  {
    icon: Clock,
    title: 'Speed & Reliability',
    description: '3-7 days delivery with real-time tracking',
  },
  {
    icon: Heart,
    title: 'Customer First',
    description: '24/7 support with 4.9/5 customer rating',
  },
  {
    icon: Globe,
    title: 'Global Reach',
    description: 'Shipping to 150+ countries worldwide',
  },
];

// Stats data
const statsData = [
  { value: 50000, suffix: '+', label: 'Shipments Delivered' },
  { value: 150, suffix: '+', label: 'Countries Served' },
  { value: 99, suffix: '%', label: 'On-Time Delivery' },
  { value: 24, suffix: '/7', label: 'Customer Support' },
];

// StatCard component to properly use hooks
const StatCard = ({ stat, index }: { stat: typeof statsData[0]; index: number }) => {
  const { count, ref } = useCountUp(stat.value, 2000);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="rounded-3xl bg-card border border-border p-6 flex flex-col justify-center items-center text-center hover:border-coke-red/30 transition-all duration-300"
    >
      <span
        ref={ref}
        className="text-4xl md:text-5xl font-bold font-typewriter text-coke-red"
      >
        {count.toLocaleString()}{stat.suffix}
      </span>
      <span className="text-sm text-muted-foreground mt-2">{stat.label}</span>
    </motion.div>
  );
};

// Partners
const partners = ['DHL', 'FedEx', 'Aramex', 'ShipGlobal', 'BlueDart', 'DTDC'];

// Timeline with Road Component
interface TimelineItem {
  year: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

// Milestone positions on the road (t values from 0 to 1)
const milestonePositions = [0.08, 0.24, 0.41, 0.58, 0.75, 0.92];

// Road path with gentler curves that stay within viewBox
const roadPath =
  'M600 0 C350 150, 850 300, 600 450 C350 600, 850 750, 600 900 C350 1050, 850 1200, 600 1350 C350 1500, 850 1650, 600 1800';

// Calculate position and angle on bezier curve
const getPointOnCurve = (t: number): { x: number; y: number; angle: number } => {
  const segments = [
    { p0: { x: 600, y: 0 }, p1: { x: 350, y: 150 }, p2: { x: 850, y: 300 }, p3: { x: 600, y: 450 } },
    { p0: { x: 600, y: 450 }, p1: { x: 350, y: 600 }, p2: { x: 850, y: 750 }, p3: { x: 600, y: 900 } },
    { p0: { x: 600, y: 900 }, p1: { x: 350, y: 1050 }, p2: { x: 850, y: 1200 }, p3: { x: 600, y: 1350 } },
    { p0: { x: 600, y: 1350 }, p1: { x: 350, y: 1500 }, p2: { x: 850, y: 1650 }, p3: { x: 600, y: 1800 } },
  ];

  const totalSegments = segments.length;
  const segmentIndex = Math.min(Math.floor(t * totalSegments), totalSegments - 1);
  const localT = (t * totalSegments) - segmentIndex;
  const seg = segments[segmentIndex];

  const mt = 1 - localT;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = localT * localT;
  const t3 = t2 * localT;

  const x = mt3 * seg.p0.x + 3 * mt2 * localT * seg.p1.x + 3 * mt * t2 * seg.p2.x + t3 * seg.p3.x;
  const y = mt3 * seg.p0.y + 3 * mt2 * localT * seg.p1.y + 3 * mt * t2 * seg.p2.y + t3 * seg.p3.y;

  const dx = 3 * mt2 * (seg.p1.x - seg.p0.x) + 6 * mt * localT * (seg.p2.x - seg.p1.x) + 3 * t2 * (seg.p3.x - seg.p2.x);
  const dy = 3 * mt2 * (seg.p1.y - seg.p0.y) + 6 * mt * localT * (seg.p2.y - seg.p1.y) + 3 * t2 * (seg.p3.y - seg.p2.y);
  
  const tangentAngle = Math.atan2(dx, dy) * (180 / Math.PI);
  const tiltAngle = Math.max(-25, Math.min(25, -tangentAngle));

  return { x, y, angle: tiltAngle };
};

// Get milestone position on curve
const getMilestonePosition = (index: number) => {
  const t = milestonePositions[index];
  return getPointOnCurve(t);
};

const TimelineWithRoad = ({ timelineData }: { timelineData: TimelineItem[] }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const truckProgress = useTransform(scrollYProgress, [0.1, 0.9], [0, 1]);
  const [truckPos, setTruckPos] = useState({ x: 600, y: 0, angle: 0 });
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = truckProgress.on('change', (v) => {
      const clampedV = Math.max(0, Math.min(1, v));
      const pos = getPointOnCurve(clampedV);
      setTruckPos(pos);
      setCurrentProgress(clampedV);
    });
    return () => unsubscribe();
  }, [truckProgress]);

  return (
    <section ref={sectionRef} className="py-24 relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-coke-red/10 text-coke-red text-sm font-medium mb-4">
            Our Journey
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-typewriter">
            The <span className="text-coke-red">CourierX</span> Story
          </h2>
        </motion.div>

        {/* Road Timeline */}
        <div className="relative">
          {/* SVG Road Path with Truck */}
          <svg
            className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-full max-w-4xl hidden lg:block pointer-events-none"
            viewBox="0 0 1200 1800"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
            style={{ zIndex: 1, overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="roadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#374151" />
                <stop offset="100%" stopColor="#1f2937" />
              </linearGradient>
              <filter id="roadShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3" />
              </filter>
              <filter id="headlightGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="headlightBeam" cx="50%" cy="0%" r="100%" fx="50%" fy="0%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#fef08a" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
              </radialGradient>
              <filter id="smokeBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
              <filter id="milestoneGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {/* Road Background - extends beyond viewport */}
            <path
              d={roadPath}
              stroke="url(#roadGradient)"
              strokeWidth="80"
              strokeLinecap="round"
              fill="none"
              filter="url(#roadShadow)"
            />

            {/* Road Center Line - White base (full line) */}
            <path
              d={roadPath}
              stroke="#ffffff"
              strokeWidth="4"
              strokeDasharray="20 15"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />

            {/* Road Center Line - Red progress (fills as truck moves) */}
            <path
              d={roadPath}
              stroke="#E31837"
              strokeWidth="4"
              strokeDasharray="20 15"
              strokeLinecap="round"
              fill="none"
              strokeDashoffset={1800 * (1 - currentProgress)}
              style={{
                strokeDasharray: `${1800 * currentProgress} ${1800 * (1 - currentProgress)}`,
              }}
            />
            
            {/* Road Edge Lines */}
            <path
              d={roadPath}
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity="0.5"
              transform="translate(-35, 0)"
            />
            <path
              d={roadPath}
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity="0.5"
              transform="translate(35, 0)"
            />

            {/* Milestone markers on the road - simple numbered checkpoints */}
            {timelineData.map((item, index) => {
              const pos = getMilestonePosition(index);
              const isReached = currentProgress >= milestonePositions[index] - 0.02;

              return (
                <g key={item.year} transform={`translate(${pos.x}, ${pos.y})`}>
                  {/* Glow effect when reached */}
                  {isReached && (
                    <motion.circle
                      cx="0"
                      cy="0"
                      r="35"
                      fill="#E31837"
                      opacity="0.3"
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  {/* Simple checkpoint circle */}
                  <motion.circle
                    cx="0"
                    cy="0"
                    r="24"
                    fill={isReached ? '#E31837' : '#374151'}
                    stroke="#ffffff"
                    strokeWidth="3"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: isReached ? 1 : 0.9 }}
                    transition={{ duration: 0.3 }}
                  />
                  {/* Year number */}
                  <text
                    x="0"
                    y="5"
                    fontSize="13"
                    fontWeight="bold"
                    fill="#ffffff"
                    textAnchor="middle"
                  >
                    {item.year.slice(-2)}
                  </text>
                </g>
              );
            })}

            {/* Headlight illumination on road (dark mode only) */}
            <ellipse
              cx={truckPos.x}
              cy={truckPos.y + 80}
              rx="50"
              ry="70"
              fill="url(#headlightBeam)"
              className="opacity-0 dark:opacity-100"
            />

            {/* Truck Group - Tilts with curve */}
            <g transform={`translate(${truckPos.x}, ${truckPos.y}) rotate(${truckPos.angle})`}>
              {/* Exhaust Smoke Particles */}
              <g className="smoke-particles">
                <motion.circle
                  cx="-8"
                  cy="-45"
                  r="6"
                  fill="#9ca3af"
                  opacity="0.4"
                  filter="url(#smokeBlur)"
                  animate={{ cy: [-45, -70, -95], opacity: [0.4, 0.2, 0], r: [6, 10, 14] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                />
                <motion.circle
                  cx="0"
                  cy="-45"
                  r="5"
                  fill="#9ca3af"
                  opacity="0.3"
                  filter="url(#smokeBlur)"
                  animate={{ cy: [-45, -75, -100], opacity: [0.3, 0.15, 0], r: [5, 9, 12] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
                />
                <motion.circle
                  cx="8"
                  cy="-45"
                  r="4"
                  fill="#9ca3af"
                  opacity="0.35"
                  filter="url(#smokeBlur)"
                  animate={{ cy: [-45, -65, -90], opacity: [0.35, 0.18, 0], r: [4, 8, 11] }}
                  transition={{ duration: 1.3, repeat: Infinity, delay: 0.6 }}
                />
              </g>

              {/* Truck Shadow */}
              <ellipse cx="0" cy="42" rx="30" ry="8" fill="rgba(0,0,0,0.3)" />
              
              {/* Vibrating Truck Body */}
              <motion.g
                animate={{ x: [-1, 1, -1, 0.5, -0.5], y: [-0.5, 0.5, -0.5, 0.3, -0.3] }}
                transition={{ duration: 0.15, repeat: Infinity }}
              >
                {/* Truck Container/Body */}
                <rect x="-22" y="-40" width="44" height="50" rx="3" fill="#E31837" />
                {/* Container Details */}
                <rect x="-20" y="-38" width="40" height="2" rx="1" fill="#B91C1C" />
                <rect x="-20" y="-32" width="40" height="2" rx="1" fill="#B91C1C" />
                
                {/* CourierX Logo */}
                <text x="0" y="-10" fontSize="14" fill="white" fontWeight="bold" textAnchor="middle">CX</text>
                
                {/* Cabin */}
                <rect x="-18" y="10" width="36" height="28" rx="4" fill="#B91C1C" />
                {/* Windshield */}
                <rect x="-14" y="14" width="28" height="14" rx="2" fill="#87CEEB" opacity="0.9" />
                {/* Windshield Reflection */}
                <rect x="-12" y="16" width="8" height="10" rx="1" fill="#ffffff" opacity="0.3" />
                
                {/* Headlights */}
                <rect x="-16" y="36" width="8" height="5" rx="2" className="fill-gray-400 dark:fill-yellow-300" />
                <rect x="8" y="36" width="8" height="5" rx="2" className="fill-gray-400 dark:fill-yellow-300" />
                
                {/* Headlight Glow (dark mode) */}
                <circle cx="-12" cy="38" r="8" className="fill-transparent dark:fill-yellow-300/40" filter="url(#headlightGlow)" />
                <circle cx="12" cy="38" r="8" className="fill-transparent dark:fill-yellow-300/40" filter="url(#headlightGlow)" />
                
                {/* Wheels */}
                <circle cx="-18" cy="40" r="7" fill="#1f2937" />
                <circle cx="-18" cy="40" r="4" fill="#4b5563" />
                <circle cx="18" cy="40" r="7" fill="#1f2937" />
                <circle cx="18" cy="40" r="4" fill="#4b5563" />
                
                {/* Wheel spinning effect */}
                <motion.g animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}>
                  <line x1="-18" y1="37" x2="-18" y2="43" stroke="#6b7280" strokeWidth="1" />
                  <line x1="-21" y1="40" x2="-15" y2="40" stroke="#6b7280" strokeWidth="1" />
                </motion.g>
                <motion.g animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}>
                  <line x1="18" y1="37" x2="18" y2="43" stroke="#6b7280" strokeWidth="1" />
                  <line x1="15" y1="40" x2="21" y2="40" stroke="#6b7280" strokeWidth="1" />
                </motion.g>
                
                {/* Side mirrors */}
                <rect x="-24" y="18" width="4" height="6" rx="1" fill="#374151" />
                <rect x="20" y="18" width="4" height="6" rx="1" fill="#374151" />
              </motion.g>
            </g>
          </svg>

          {/* Timeline Items */}
          <div className="relative space-y-16 lg:space-y-24">
            {timelineData.map((item, index) => {
              const isEven = index % 2 === 0;
              const isReached = currentProgress >= milestonePositions[index] - 0.02;
              return (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className={`flex items-center ${
                    isEven ? 'lg:justify-start' : 'lg:justify-end'
                  } justify-center`}
                >
                  {/* Content */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`${isEven ? 'lg:text-right lg:pr-[55%]' : 'lg:text-left lg:pl-[55%]'} text-center lg:text-inherit w-full`}
                  >
                    <motion.div
                      animate={isReached ? { 
                        borderColor: 'rgba(227, 24, 55, 0.3)',
                        boxShadow: '0 20px 40px rgba(227, 24, 55, 0.1)'
                      } : {}}
                      className={`inline-block bg-card border border-border rounded-3xl p-8 max-w-md transition-all duration-500 ${
                        isReached ? 'border-coke-red/30 shadow-xl' : 'hover:border-coke-red/30 hover:shadow-xl'
                      }`}
                    >
                      <span className="text-4xl font-bold font-typewriter text-coke-red">
                        {item.year}
                      </span>
                      <h3 className="text-xl font-bold mt-2 mb-3">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </motion.div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const About = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);

  useSeo({
    title: 'About Us | CourierX - India\'s Trusted International Courier',
    description: 'Learn about CourierX, India\'s leading international courier aggregator. Our mission, values, team, and journey to becoming the most trusted shipping partner.',
    canonicalPath: '/about',
  });

  const { displayText: heroText, ref: heroRef } = useTypingEffect(
    'Connecting India to the World',
    40
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-background">
      <LandingHeader />

      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-[70vh] flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-coke-red/5 via-background to-primary/5" />
        
        {/* Mobile Background Animations */}
        <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
          {/* Animated gradient orbs */}
          <motion.div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-coke-red/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-coke-red/10 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          
          {/* Floating icons */}
          <motion.div
            className="absolute top-24 right-6 opacity-20"
            animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Globe className="w-8 h-8 text-coke-red" />
          </motion.div>
          <motion.div
            className="absolute top-40 left-4 opacity-15"
            animate={{ y: [0, -12, 0], rotate: [0, -8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
          >
            <Package className="w-6 h-6 text-coke-red" />
          </motion.div>
          <motion.div
            className="absolute bottom-32 right-8 opacity-20"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
          >
            <Shield className="w-7 h-7 text-coke-red" />
          </motion.div>
          <motion.div
            className="absolute bottom-48 left-6 opacity-15"
            animate={{ y: [0, -8, 0], x: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: 0.3 }}
          >
            <Plane className="w-6 h-6 text-coke-red transform -rotate-45" />
          </motion.div>
          
          {/* Animated circles */}
          <motion.div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full border border-coke-red/10"
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full border border-coke-red/5"
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Glowing dots */}
          <motion.div
            className="absolute top-1/3 right-1/4 w-2 h-2 bg-coke-red rounded-full"
            animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-2/3 left-1/4 w-1.5 h-1.5 bg-coke-red rounded-full"
            animate={{ opacity: [0.15, 0.5, 0.15], scale: [1, 1.3, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute top-1/2 right-1/3 w-1 h-1 bg-coke-red rounded-full"
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
          />
          <motion.div
            className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-coke-red rounded-full"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: 0.7 }}
          />
        </div>
        
        {/* World Map Background */}
        <div className="absolute inset-0 flex items-end justify-center opacity-20 dark:opacity-30 overflow-hidden">
          <div className="w-full max-w-7xl translate-y-[15%]">
            <WorldMap
              lineColor="#dc2626"
              dots={[
                {
                  start: { lat: 20.5937, lng: 78.9629 }, // India
                  end: { lat: 40.7128, lng: -74.006 }, // New York
                },
                {
                  start: { lat: 20.5937, lng: 78.9629 }, // India
                  end: { lat: 51.5074, lng: -0.1278 }, // London
                },
                {
                  start: { lat: 20.5937, lng: 78.9629 }, // India
                  end: { lat: -33.8688, lng: 151.2093 }, // Sydney
                },
                {
                  start: { lat: 20.5937, lng: 78.9629 }, // India
                  end: { lat: 25.2048, lng: 55.2708 }, // Dubai
                },
                {
                  start: { lat: 20.5937, lng: 78.9629 }, // India
                  end: { lat: 1.3521, lng: 103.8198 }, // Singapore
                },
                {
                  start: { lat: 20.5937, lng: 78.9629 }, // India
                  end: { lat: -1.2921, lng: 36.8219 }, // Nairobi
                },
              ]}
            />
          </div>
        </div>
        
        <div className="absolute inset-0">
          {[
            { left: 5, top: 10, dur: 5, delay: 0.2 },
            { left: 15, top: 30, dur: 6, delay: 0.5 },
            { left: 25, top: 50, dur: 4.5, delay: 0.8 },
            { left: 35, top: 20, dur: 5.5, delay: 1.1 },
            { left: 45, top: 70, dur: 6.5, delay: 0.3 },
            { left: 55, top: 40, dur: 4, delay: 0.9 },
            { left: 65, top: 60, dur: 5, delay: 1.4 },
            { left: 75, top: 15, dur: 6, delay: 0.6 },
            { left: 85, top: 45, dur: 4.5, delay: 1.0 },
            { left: 95, top: 75, dur: 5.5, delay: 0.4 },
            { left: 10, top: 80, dur: 6, delay: 1.2 },
            { left: 20, top: 25, dur: 4, delay: 0.7 },
            { left: 30, top: 65, dur: 5, delay: 1.5 },
            { left: 40, top: 35, dur: 6.5, delay: 0.1 },
            { left: 50, top: 85, dur: 4.5, delay: 1.3 },
            { left: 60, top: 5, dur: 5.5, delay: 0.4 },
            { left: 70, top: 55, dur: 6, delay: 1.6 },
            { left: 80, top: 90, dur: 4, delay: 0.8 },
            { left: 90, top: 22, dur: 5, delay: 1.1 },
            { left: 98, top: 58, dur: 6.5, delay: 0.2 },
          ].map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.1, 0.3, 0.1],
                y: [0, -30, 0],
              }}
              transition={{
                duration: p.dur,
                repeat: Infinity,
                delay: p.delay,
              }}
              className="absolute w-1 h-1 rounded-full bg-coke-red/30"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
              }}
            />
          ))}
        </div>

        <div className="container relative z-10 text-center space-y-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coke-red/10 text-coke-red text-sm font-medium mb-6">
              <Package className="h-4 w-4" />
              About CourierX
            </span>
          </motion.div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-typewriter leading-tight">
            <span ref={heroRef} className="text-foreground">
              {heroText}
            </span>
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-coke-red"
            >
              |
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-xl text-muted-foreground max-w-3xl mx-auto"
          >
            India&apos;s most trusted international courier aggregator, making global shipping
            accessible, affordable, and compliant for everyone.
          </motion.p>
        </div>
      </motion.section>


      {/* Bento Grid Section */}
      <section className="py-24 relative">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Our Story
            </span>
            <h2 className="text-3xl md:text-5xl font-bold font-typewriter mb-4">
              Why Choose <span className="text-coke-red">CourierX</span>?
            </h2>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[200px]">
            {/* Large Card - Mission */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="col-span-1 md:col-span-2 row-span-2 rounded-3xl bg-gradient-to-br from-coke-red to-coke-red/80 p-8 text-white relative overflow-hidden group"
            >
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
              <motion.div
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/10"
              />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <Target className="h-12 w-12 mb-4 opacity-80" />
                  <h3 className="text-2xl md:text-3xl font-bold font-typewriter mb-4">Our Mission</h3>
                </div>
                <p className="text-lg text-white/90 leading-relaxed">
                  To democratize international shipping from India by providing fast, compliant,
                  and affordable courier services that connect families, businesses, and communities
                  across the globe.
                </p>
              </div>
            </motion.div>

            {/* Stats Cards */}
            {statsData.slice(0, 2).map((stat, index) => (
              <StatCard key={stat.label} stat={stat} index={index} />
            ))}

            {/* Vision Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="col-span-1 md:col-span-2 rounded-3xl bg-gradient-to-br from-charcoal to-charcoal/90 p-8 text-white relative overflow-hidden"
            >
              <Globe className="absolute -right-6 -bottom-6 h-32 w-32 text-white/5" />
              <div className="relative z-10">
                <Plane className="h-10 w-10 mb-4 text-candlestick-green" />
                <h3 className="text-xl font-bold font-typewriter mb-2">Our Vision</h3>
                <p className="text-white/80">
                  To become the most trusted and innovative international shipping platform,
                  setting new standards in compliance, speed, and customer experience.
                </p>
              </div>
            </motion.div>

            {/* More Stats */}
            {statsData.slice(2).map((stat, index) => (
              <StatCard key={stat.label} stat={stat} index={index} />
            ))}
          </div>
        </div>
      </section>


      {/* Values Section */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        {/* Mobile Background Animations */}
        <div className="lg:hidden absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-10 right-4 opacity-10"
            animate={{ y: [0, -20, 0], rotate: [0, 15, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Shield className="w-12 h-12 text-coke-red" />
          </motion.div>
          <motion.div
            className="absolute bottom-20 left-4 opacity-10"
            animate={{ y: [0, -15, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
          >
            <Heart className="w-10 h-10 text-coke-red" />
          </motion.div>
          <motion.div
            className="absolute top-1/2 right-6 opacity-10"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
          >
            <Clock className="w-8 h-8 text-coke-red" />
          </motion.div>
          <motion.div
            className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-coke-red/5 blur-2xl"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-candlestick-green/5 blur-2xl"
            animate={{ scale: [1.2, 1, 1.2] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
        </div>
        
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-candlestick-green/10 text-candlestick-green text-sm font-medium mb-4">
              Our Values
            </span>
            <h2 className="text-3xl md:text-5xl font-bold font-typewriter">
              What We <span className="text-coke-red">Stand For</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valuesData.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-coke-red/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-card border border-border rounded-3xl p-8 h-full hover:border-coke-red/30 transition-all duration-300">
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className="w-14 h-14 rounded-2xl bg-coke-red/10 flex items-center justify-center mb-6"
                  >
                    <value.icon className="h-7 w-7 text-coke-red" />
                  </motion.div>
                  <h3 className="text-xl font-bold font-typewriter mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section with Road and Truck */}
      <TimelineWithRoad timelineData={timelineData} />

      {/* Team Section */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        {/* Mobile Background Animations */}
        <div className="lg:hidden absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-16 left-6 opacity-10"
            animate={{ y: [0, -15, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 3.5, repeat: Infinity }}
          >
            <Award className="w-10 h-10 text-coke-red" />
          </motion.div>
          <motion.div
            className="absolute bottom-24 right-8 opacity-10"
            animate={{ y: [0, -12, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: 0.7 }}
          >
            <Target className="w-8 h-8 text-coke-red" />
          </motion.div>
          <motion.div
            className="absolute top-1/3 right-4 w-2 h-2 bg-coke-red rounded-full"
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-1/3 left-8 w-1.5 h-1.5 bg-coke-red rounded-full"
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute -top-16 right-0 w-32 h-32 rounded-full bg-primary/5 blur-2xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </div>
        
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Leadership
            </span>
            <h2 className="text-3xl md:text-5xl font-bold font-typewriter">
              Meet Our <span className="text-coke-red">Team</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamData.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className="group"
              >
                <div className="bg-card border border-border rounded-3xl p-8 text-center hover:border-coke-red/30 transition-all duration-300 hover:shadow-xl">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-coke-red to-coke-red/60 flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-lg"
                  >
                    {member.avatar}
                  </motion.div>
                  <h3 className="text-xl font-bold font-typewriter">{member.name}</h3>
                  <p className="text-muted-foreground mt-1">{member.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-candlestick-green/10 text-candlestick-green text-sm font-medium mb-4">
              Partners
            </span>
            <h2 className="text-3xl md:text-5xl font-bold font-typewriter">
              Trusted <span className="text-coke-red">Carrier Partners</span>
            </h2>
          </motion.div>

          <div className="flex flex-wrap justify-center items-center gap-12">
            {partners.map((partner, index) => (
              <motion.div
                key={partner}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.1 }}
                className="text-3xl md:text-4xl font-bold text-muted-foreground/50 hover:text-coke-red transition-colors duration-300 cursor-default"
              >
                {partner}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Mobile Background Animations */}
        <div className="lg:hidden absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-8 right-4 opacity-15"
            animate={{ y: [0, -20, 0], rotate: [0, 15, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Package className="w-10 h-10 text-coke-red" />
          </motion.div>
          <motion.div
            className="absolute bottom-16 left-6 opacity-15"
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
          >
            <Plane className="w-8 h-8 text-coke-red transform -rotate-45" />
          </motion.div>
          <motion.div
            className="absolute top-1/2 left-4 opacity-10"
            animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
          >
            <Globe className="w-6 h-6 text-coke-red" />
          </motion.div>
          <motion.div
            className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-coke-red/10 blur-3xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-coke-red/10 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
        </div>
        
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl metallic-light dark:metallic-dark p-12 md:p-20 text-center overflow-hidden"
          >
            <div className="absolute inset-0 opacity-30 pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-5xl font-bold font-typewriter mb-6">
                  Ready to Ship with <span className="text-coke-red">CourierX</span>?
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                  Join thousands of satisfied customers who trust us for their international shipping needs.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <motion.a
                    href="/auth?panel=customer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-coke-red text-white rounded-xl font-semibold shadow-lg shadow-coke-red/30 hover:shadow-xl hover:shadow-coke-red/40 transition-all duration-300"
                  >
                    <Package className="h-5 w-5" />
                    Start Shipping
                  </motion.a>
                  <motion.a
                    href="/public/rate-calculator"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-card border border-border rounded-xl font-semibold hover:border-coke-red/30 transition-all duration-300"
                  >
                    Calculate Rates
                  </motion.a>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default About;
