"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MagnifyingGlass, Package, CheckCircle, Globe, Phone, Shield,
  CaretDown, X, CalendarBlank, ArrowClockwise, Circle,
} from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LandingHeader, LandingFooter } from '@/components/landing';
import { useSeo } from '@/hooks/useSeo';
import { motion, AnimatePresence } from 'framer-motion';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { STATUS_LABEL_MAP, LEG_LABEL_MAP } from '@/lib/shipment-lifecycle/statusLabelMap';
import type { ShipmentStatus, ShipmentLeg, TimelineSource } from '@/lib/shipment-lifecycle/types';
import dynamic from 'next/dynamic';

const ShipmentMap = dynamic(() => import('@/components/tracking/ShipmentMap'), { ssr: false });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrackingShipment {
  id: string;
  tracking_number: string;
  current_status: ShipmentStatus;
  current_leg: ShipmentLeg;
  domestic_awb: string | null;
  international_awb: string | null;
  recipient_name: string;
  destination_country: string;
  destination_address: string;
  origin_address: string;
  weight_kg: number | null;
  shipment_type: string;
  created_at: string;
}

interface TrackingTimelineEntry {
  id: string;
  status: ShipmentStatus;
  leg: ShipmentLeg;
  source: TimelineSource;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<TimelineSource, string> = {
  NIMBUS: 'bg-blue-500',
  INTERNAL: 'bg-amber-500',
  SIMULATION: 'bg-purple-500',
  SYSTEM: 'bg-gray-400',
};

const SOURCE_LABELS: Record<TimelineSource, string> = {
  NIMBUS: 'NimbusPost',
  INTERNAL: 'Warehouse',
  SIMULATION: 'International',
  SYSTEM: 'System',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function getEstimatedDelivery(createdAt: string): string {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// OTP Modal (phone search)
// ---------------------------------------------------------------------------

const OTPModal = ({
  phone,
  onVerify,
  onResend,
  onClose,
}: {
  phone: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onClose: () => void;
}) => {
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setResendTimer(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleResend = () => {
    onResend();
    setResendTimer(30);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold font-typewriter text-foreground">Verify Your Number</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Enter the 6-digit OTP sent to +91 {phone.slice(0, 2)}****{phone.slice(-2)}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} weight="bold" />
          </button>
        </div>
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 bg-coke-red hover:bg-coke-red/90"
          onClick={() => { setVerifying(true); onVerify(otp); }}
          disabled={otp.length !== 6 || verifying}
        >
          <Shield size={20} weight="bold" className="mr-2" />
          {verifying ? 'Verifying...' : 'Verify & Track'}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {resendTimer > 0 ? (
            <>Resend OTP in <span className="font-semibold">{resendTimer}s</span></>
          ) : (
            <button className="text-coke-red hover:underline" onClick={handleResend}>
              Resend OTP
            </button>
          )}
        </p>
      </motion.div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Timeline Component
// ---------------------------------------------------------------------------

const TrackingTimeline = ({ entries }: { entries: TrackingTimelineEntry[] }) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No tracking events yet. Check back soon.
      </div>
    );
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <ol className="space-y-0">
      {sorted.map((entry, idx) => {
        const statusInfo = STATUS_LABEL_MAP[entry.status];
        const dotColor = SOURCE_COLORS[entry.source] ?? 'bg-gray-400';
        const isLast = idx === sorted.length - 1;
        const location = (entry.metadata?.location as string) || '';

        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn('mt-1 h-3 w-3 rounded-full shrink-0', dotColor)} />
              {!isLast && <span className="w-0.5 flex-1 bg-border mt-1" />}
            </div>
            <div className="flex-1 pb-5">
              <p className={cn('text-sm font-semibold', isLast ? 'text-coke-red' : 'text-foreground')}>
                {statusInfo?.label ?? entry.status}
              </p>
              {location && (
                <p className="text-xs text-muted-foreground">{location}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(entry.created_at)}</p>
              <span className="text-[10px] font-medium text-muted-foreground/60">
                via {SOURCE_LABELS[entry.source] ?? entry.source}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const PublicTracking = () => {
  const searchParams = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [shipment, setShipment] = useState<TrackingShipment | null>(null);
  const [timeline, setTimeline] = useState<TrackingTimelineEntry[]>([]);

  useSeo({
    title: 'Track Your Shipment | CourierX',
    description: 'Track your international shipment from India with real-time updates.',
    canonicalPath: '/public/track',
  });

  const fetchTracking = async (awb: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/track?awb=${encodeURIComponent(awb.trim())}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'No shipment found with this tracking number.');
        setShipment(null);
        setTimeline([]);
        return;
      }

      setShipment(json.shipment);
      setTimeline(json.timeline ?? []);
    } catch {
      setError('Failed to fetch tracking data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTrackByNumber = () => {
    if (!trackingNumber.trim()) return;
    setShipment(null);
    setTimeline([]);
    fetchTracking(trackingNumber);
  };

  // Auto-search if tracking number is in URL params
  useEffect(() => {
    const urlTracking = searchParams.get('tracking');
    if (urlTracking && !shipment && !loading) {
      setTrackingNumber(urlTracking);
      fetchTracking(urlTracking);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendPhoneOtp = async () => {
    try {
      const res = await fetch('/api/auth/phone-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+91${phoneNumber}` }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to send OTP. Please try again.');
        return false;
      }
      return true;
    } catch {
      setError('Failed to send OTP. Please try again.');
      return false;
    }
  };

  const handlePhoneSearch = async () => {
    setError('');
    if (phoneNumber.length !== 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    const sent = await sendPhoneOtp();
    if (sent) setShowOTP(true);
  };

  const handleOTPVerify = async (otp: string) => {
    // Verify OTP via FAST2SMS
    try {
      const res = await fetch('/api/auth/phone-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+91${phoneNumber}`, code: otp }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Invalid OTP. Please try again.');
        return;
      }
    } catch {
      setError('OTP verification failed.');
      return;
    }

    setShowOTP(false);
    setLoading(true);
    setError('');

    // Look up shipment by phone
    try {
      const res = await fetch(`/api/track?awb=${encodeURIComponent(phoneNumber)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError('No shipment found for this phone number.');
      } else {
        setShipment(json.shipment);
        setTimeline(json.timeline ?? []);
        setTrackingNumber(json.shipment.tracking_number);
      }
    } catch {
      setError('Failed to fetch tracking data.');
    } finally {
      setLoading(false);
    }
  };

  const currentStatusInfo = shipment ? STATUS_LABEL_MAP[shipment.current_status] : null;
  const currentLegLabel = shipment ? LEG_LABEL_MAP[shipment.current_leg] : null;

  // Progress percentage based on lifecycle
  const PROGRESS_MAP: Record<ShipmentStatus, number> = {
    PENDING: 5, BOOKING_CONFIRMED: 10, PICKED_UP: 20, IN_TRANSIT: 35,
    OUT_FOR_DELIVERY: 45, DELIVERED: 55, ARRIVED_AT_WAREHOUSE: 60,
    QUALITY_CHECKED: 65, PACKAGED: 70, DISPATCH_APPROVED: 75,
    DISPATCHED: 80, IN_INTERNATIONAL_TRANSIT: 85, CUSTOMS_CLEARANCE: 90,
    INTL_OUT_FOR_DELIVERY: 95, INTL_DELIVERED: 100, FAILED: 0,
  };
  const progress = shipment ? (PROGRESS_MAP[shipment.current_status] ?? 10) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingHeader />

      <AnimatePresence>
        {showOTP && (
          <OTPModal
            phone={phoneNumber}
            onVerify={handleOTPVerify}
            onResend={sendPhoneOtp}
            onClose={() => setShowOTP(false)}
          />
        )}
      </AnimatePresence>

      <main className="flex-1 py-16">
        <div className="container max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-coke-red/10 text-coke-red mb-6"
            >
              <Globe size={20} weight="bold" />
              <span className="font-semibold text-sm">Real-Time Tracking</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold font-typewriter text-foreground mb-4">
              Track Your Shipment
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Enter your tracking number for live updates from NimbusPost.
            </p>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <div className="max-w-2xl mx-auto">
              <div className="p-2 rounded-2xl bg-card border border-border shadow-lg">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Enter tracking number (e.g., CX-...)"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTrackByNumber()}
                    className="flex-1 h-14 text-lg border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50"
                  />
                  <Button
                    size="lg"
                    className="h-14 px-10 gap-2 bg-coke-red hover:bg-coke-red/90 text-white font-semibold rounded-xl"
                    onClick={handleTrackByNumber}
                    disabled={!trackingNumber.trim() || loading}
                  >
                    <MagnifyingGlass size={20} weight="bold" />
                    {loading ? 'Tracking...' : 'Track'}
                  </Button>
                </div>
              </div>

              {/* Advanced Search Toggle */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Search by Phone</span>
                  <CaretDown size={16} weight="bold" className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
                  >
                    <div className="mt-4 p-6 rounded-2xl bg-muted/50 border border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <Phone size={20} weight="bold" className="text-coke-red" />
                        <span className="font-semibold text-foreground">Search by Phone Number</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Enter the phone number used during booking. We&apos;ll send an OTP for verification.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 flex">
                          <span className="inline-flex items-center px-4 rounded-l-xl bg-muted border border-r-0 border-border text-muted-foreground">
                            +91
                          </span>
                          <Input
                            placeholder="10-digit mobile number"
                            value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="flex-1 h-12 rounded-l-none border-l-0"
                          />
                        </div>
                        <Button
                          className="h-12 px-6 bg-foreground hover:bg-foreground/90 text-background"
                          onClick={handlePhoneSearch}
                          disabled={phoneNumber.length !== 10}
                        >
                          <Shield size={16} weight="bold" className="mr-2" />
                          Send OTP
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl mx-auto mb-8 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tracking Result */}
          <AnimatePresence>
            {shipment && (
              <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.4 }}
                className="grid md:grid-cols-5 gap-6"
              >
                {/* Left — Timeline */}
                <div className="md:col-span-2 order-2 md:order-1">
                  <Card className="border-border rounded-2xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold font-typewriter text-foreground">
                          Shipment Timeline
                        </h3>
                        <button
                          onClick={() => fetchTracking(shipment.tracking_number || shipment.domestic_awb || '', true)}
                          disabled={refreshing}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        >
                          <ArrowClockwise size={14} weight="bold" className={refreshing ? 'animate-spin' : ''} />
                          {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                      </div>
                      <TrackingTimeline entries={timeline} />
                    </CardContent>
                  </Card>
                </div>

                {/* Right — Status & Details */}
                <div className="md:col-span-3 order-1 md:order-2 space-y-4">
                  {/* Status Banner */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-coke-red to-coke-red/80 p-6 text-white shadow-xl shadow-coke-red/20"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white/70 text-sm">Current Status</p>
                        <p className="text-2xl font-bold font-typewriter mt-1">
                          {currentStatusInfo?.label ?? shipment.current_status}
                        </p>
                        <p className="text-white/70 text-sm mt-1">{currentLegLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/70 text-sm">Est. Delivery</p>
                        <p className="font-semibold mt-1">{getEstimatedDelivery(shipment.created_at)}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-white rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-white/60 text-xs mt-1">{progress}% complete</p>
                    </div>
                  </motion.div>

                  {/* Route Map */}
                  <ShipmentMap
                    origin={shipment.origin_address}
                    destination={shipment.destination_address}
                    destinationCountry={shipment.destination_country}
                    currentLeg={shipment.current_leg}
                    currentStatus={shipment.current_status}
                  />

                  {/* Shipment Info */}
                  <Card className="border-border rounded-2xl">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b border-border">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <Package size={20} weight="bold" className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-typewriter font-bold">{shipment.tracking_number}</p>
                          <p className="text-xs text-muted-foreground capitalize">{shipment.shipment_type} shipment</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Recipient</p>
                          <p className="font-medium">{shipment.recipient_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Destination</p>
                          <p className="font-medium">{shipment.destination_country}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Origin</p>
                          <p className="font-medium text-xs">{shipment.origin_address}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Weight</p>
                          <p className="font-medium">{shipment.weight_kg ? `${shipment.weight_kg} kg` : 'N/A'}</p>
                        </div>
                        {shipment.domestic_awb && (
                          <div>
                            <p className="text-muted-foreground text-xs">Domestic AWB</p>
                            <p className="font-typewriter text-xs">{shipment.domestic_awb}</p>
                          </div>
                        )}
                        {shipment.international_awb && (
                          <div>
                            <p className="text-muted-foreground text-xs">Intl AWB</p>
                            <p className="font-typewriter text-xs">{shipment.international_awb}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Leg Progress Steps */}
                  <Card className="border-border rounded-2xl">
                    <CardContent className="p-6">
                      <h4 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Journey Progress</h4>
                      <div className="flex items-center gap-2">
                        {(['DOMESTIC', 'COUNTER', 'INTERNATIONAL', 'COMPLETED'] as ShipmentLeg[]).map((leg, idx) => {
                          const legOrder = ['DOMESTIC', 'COUNTER', 'INTERNATIONAL', 'COMPLETED'];
                          const currentIdx = legOrder.indexOf(shipment.current_leg);
                          const isDone = idx < currentIdx;
                          const isCurrent = idx === currentIdx;
                          return (
                            <div key={leg} className="flex items-center gap-2 flex-1">
                              <div className="flex flex-col items-center flex-1">
                                <div className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                                  isDone ? 'bg-green-500 text-white' :
                                  isCurrent ? 'bg-coke-red text-white ring-2 ring-coke-red/30' :
                                  'bg-muted text-muted-foreground'
                                )}>
                                  {isDone ? <CheckCircle size={16} weight="bold" /> : idx + 1}
                                </div>
                                <p className={cn('text-[10px] mt-1 text-center', isCurrent ? 'text-coke-red font-semibold' : 'text-muted-foreground')}>
                                  {LEG_LABEL_MAP[leg].split(' ')[0]}
                                </p>
                              </div>
                              {idx < 3 && (
                                <div className={cn('h-0.5 flex-1 -mt-4', isDone ? 'bg-green-500' : 'bg-border')} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};

export default PublicTracking;
