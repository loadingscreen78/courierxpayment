"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Globe, MagnifyingGlass, ArrowRight, CircleNotch, MapPin, Phone, ShieldCheck, Package } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { getAllCountriesForDropdown } from '@/lib/shipping/countries';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

type ShipType = 'domestic' | 'international';
type OtpStep = 'idle' | 'phone' | 'otp' | 'verifying';

interface PincodeMeta {
  state: string;
  district: string;
  areas: string[];
  loading: boolean;
  error: string | null;
}

const EMPTY_PIN: PincodeMeta = { state: '', district: '', areas: [], loading: false, error: null };

// ── Pincode lookup helper ────────────────────────────────────────────────────

function usePinLookup(pincode: string): PincodeMeta {
  const [meta, setMeta] = useState<PincodeMeta>(EMPTY_PIN);

  useEffect(() => {
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setMeta(EMPTY_PIN);
      return;
    }
    let cancelled = false;
    setMeta(prev => ({ ...prev, loading: true, error: null }));

    fetch(`/api/public/pincode-lookup?pincode=${pincode}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.success) {
          setMeta({
            state: data.state || '',
            district: data.district || '',
            areas: data.areas || (data.district ? [data.district] : []),
            loading: false,
            error: null,
          });
        } else {
          setMeta({ ...EMPTY_PIN, error: 'Invalid pincode' });
        }
      })
      .catch(() => {
        if (!cancelled) setMeta({ ...EMPTY_PIN, error: 'Lookup failed' });
      });

    return () => { cancelled = true; };
  }, [pincode]);

  return meta;
}

// ── Country list (memoised) ──────────────────────────────────────────────────

const countryOptions = (() => {
  try {
    return getAllCountriesForDropdown()
      .filter(c => c.isServed)
      .map(c => ({ code: c.code, name: c.name, flag: c.flag }));
  } catch {
    return [];
  }
})();

// ── Component ────────────────────────────────────────────────────────────────

export const HeroCTAForm = () => {
  const router = useRouter();

  // ── Ship Now state ──
  const [shipType, setShipType] = useState<ShipType>('international');
  const [pickupPin, setPickupPin] = useState('');
  const [dropPin, setDropPin] = useState('');
  const [destCountry, setDestCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [shipLoading, setShipLoading] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  // pin lookups
  const pickupMeta = usePinLookup(pickupPin);
  const dropMeta = usePinLookup(dropPin);

  // Close country dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Track state ──
  const [trackPhone, setTrackPhone] = useState('');
  const [trackAwb, setTrackAwb] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  // ── OTP state ──
  const [otpStep, setOtpStep] = useState<OtpStep>('idle');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [shipPhone, setShipPhone] = useState('');
  // store pending navigation data
  const [pendingNav, setPendingNav] = useState<{ path: string; params: URLSearchParams } | null>(null);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(p => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  // ── Detect domestic vs international ──
  const isDomestic = shipType === 'domestic';

  // ── Filtered countries ──
  const filteredCountries = countrySearch.length > 0
    ? countryOptions.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : countryOptions.slice(0, 15);

  // ── Send OTP ──
  const sendOtp = useCallback(async (phone: string) => {
    try {
      const res = await fetch('/api/auth/phone-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+91${phone}` }),
      });
      const json = await res.json();
      return json.success;
    } catch {
      return false;
    }
  }, []);

  // ── Verify OTP ──
  const verifyOtp = useCallback(async (phone: string, code: string) => {
    try {
      const res = await fetch('/api/auth/phone-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+91${phone}`, code }),
      });
      const json = await res.json();
      return json.success;
    } catch {
      return false;
    }
  }, []);

  // ── Ship Now submit — shows phone input step ──
  const handleShipNow = () => {
    const params = new URLSearchParams();

    if (isDomestic) {
      if (pickupPin.length !== 6 || dropPin.length !== 6) return;
      if (pickupMeta.error || dropMeta.error) return;
      params.set('pickupPincode', pickupPin);
      params.set('deliveryPincode', dropPin);
      if (pickupMeta.state) params.set('pickupState', pickupMeta.state);
      if (pickupMeta.district) params.set('pickupCity', pickupMeta.district);
      if (dropMeta.state) params.set('deliveryState', dropMeta.state);
      if (dropMeta.district) params.set('deliveryCity', dropMeta.district);
      setPendingNav({ path: '/public/book/domestic', params });
    } else {
      if (!destCountry || pickupPin.length !== 6 || pickupMeta.error) return;
      params.set('pickupPincode', pickupPin);
      if (pickupMeta.state) params.set('pickupState', pickupMeta.state);
      if (pickupMeta.district) params.set('pickupCity', pickupMeta.district);
      params.set('country', destCountry);
      setPendingNav({ path: '/public/book/international', params });
    }

    // Show phone input step
    setOtpStep('phone');
    setOtp('');
    setOtpError('');
  };

  // Send OTP after phone is entered
  const handleSendShipOtp = async () => {
    if (shipPhone.length !== 10) return;
    setShipLoading(true);
    setOtpError('');
    const ok = await sendOtp(shipPhone);
    setShipLoading(false);
    if (ok) {
      setOtpStep('otp');
      setResendTimer(30);
    } else {
      setOtpError('Failed to send OTP. Try again.');
    }
  };

  // Verify OTP and navigate
  const handleVerifyAndNavigate = async () => {
    if (otp.length !== 6 || !pendingNav) return;
    setOtpStep('verifying');
    setOtpError('');
    const ok = await verifyOtp(shipPhone, otp);
    if (ok && pendingNav) {
      pendingNav.params.set('phone', shipPhone);
      pendingNav.params.set('verified', '1');
      router.push(`${pendingNav.path}?${pendingNav.params.toString()}`);
    } else {
      setOtpError('Invalid OTP. Please try again.');
      setOtpStep('otp');
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setOtpError('');
    const ok = await sendOtp(shipPhone);
    if (ok) {
      setResendTimer(30);
    } else {
      setOtpError('Failed to resend OTP.');
    }
  };

  // ── Track submit ──
  const handleTrack = () => {
    if (!trackAwb.trim()) return;
    setTrackLoading(true);
    // If phone provided, could do OTP verification, but for tracking just redirect
    const params = new URLSearchParams();
    params.set('tracking', trackAwb.trim());
    if (trackPhone) params.set('phone', trackPhone);
    router.push(`/public/track?${params.toString()}`);
  };

  // ── Pin input helper ──
  const PinInput = ({ value, onChange, meta, placeholder }: {
    value: string;
    onChange: (v: string) => void;
    meta: PincodeMeta;
    placeholder: string;
  }) => (
    <div className="space-y-1">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" weight="bold" />
        <Input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="pl-9 h-11 rounded-xl border-border bg-background text-sm focus:border-coke-red focus:ring-coke-red/20"
        />
        {meta.loading && (
          <CircleNotch className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {meta.district && !meta.error && (
        <p className="text-xs text-muted-foreground pl-1">{meta.district}, {meta.state}</p>
      )}
      {meta.error && (
        <p className="text-xs text-destructive pl-1">{meta.error}</p>
      )}
    </div>
  );


  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm shadow-2xl shadow-black/10 overflow-hidden">
        <Tabs defaultValue="ship" className="w-full">
          {/* Tab Headers */}
          <TabsList className="w-full h-auto p-0 bg-muted/50 rounded-none border-b border-border grid grid-cols-2">
            <TabsTrigger
              value="ship"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-coke-red data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none py-3.5 text-sm font-semibold gap-2"
            >
              <Package className="h-4 w-4" weight="bold" />
              Ship Now
            </TabsTrigger>
            <TabsTrigger
              value="track"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-coke-red data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none py-3.5 text-sm font-semibold gap-2"
            >
              <MagnifyingGlass className="h-4 w-4" weight="bold" />
              Track Order
            </TabsTrigger>
          </TabsList>

          {/* ── Ship Now Tab ── */}
          <TabsContent value="ship" className="mt-0 p-5 space-y-4">
            {/* Domestic / International toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              <button
                onClick={() => setShipType('domestic')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
                  isDomestic
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Truck className="h-3.5 w-3.5" weight="bold" />
                Domestic
              </button>
              <button
                onClick={() => setShipType('international')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
                  !isDomestic
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Globe className="h-3.5 w-3.5" weight="bold" />
                International
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* ── OTP verification overlay ── */}
              {otpStep !== 'idle' && pendingNav ? (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="text-center space-y-1">
                    <ShieldCheck className="h-8 w-8 text-coke-red mx-auto" weight="bold" />
                    <p className="text-sm font-semibold text-foreground">Verify Your Phone</p>
                    <p className="text-xs text-muted-foreground">
                      {otpStep === 'phone' ? 'Enter your mobile number to continue' : `OTP sent to +91 ${shipPhone.slice(0, 2)}****${shipPhone.slice(-2)}`}
                    </p>
                  </div>

                  {/* Phone input step */}
                  {otpStep === 'phone' && (
                    <>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-xl bg-muted border border-r-0 border-border text-xs text-muted-foreground font-medium">
                          +91
                        </span>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="10-digit mobile"
                          value={shipPhone}
                          onChange={e => setShipPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="rounded-l-none border-l-0 h-11 text-sm"
                          autoFocus
                        />
                      </div>
                      <Button
                        className="w-full h-10 bg-coke-red hover:bg-coke-red/90 text-white text-sm font-semibold rounded-xl"
                        onClick={handleSendShipOtp}
                        disabled={shipPhone.length !== 10 || shipLoading}
                      >
                        {shipLoading ? <CircleNotch className="h-4 w-4 animate-spin" /> : <>Send OTP <ArrowRight className="h-4 w-4 ml-1" weight="bold" /></>}
                      </Button>
                    </>
                  )}

                  {/* OTP input step */}
                  {(otpStep === 'otp' || otpStep === 'verifying') && (
                    <>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map(i => (
                              <InputOTPSlot key={i} index={i} className="w-10 h-11 text-base" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <Button
                        className="w-full h-10 bg-coke-red hover:bg-coke-red/90 text-white text-sm font-semibold rounded-xl"
                        onClick={handleVerifyAndNavigate}
                        disabled={otp.length !== 6 || otpStep === 'verifying'}
                      >
                        {otpStep === 'verifying' ? (
                          <CircleNotch className="h-4 w-4 animate-spin" />
                        ) : (
                          <>Verify & Continue <ArrowRight className="h-4 w-4 ml-1" weight="bold" /></>
                        )}
                      </Button>

                      <p className="text-center text-xs text-muted-foreground">
                        {resendTimer > 0 ? (
                          <>Resend in <span className="font-semibold">{resendTimer}s</span></>
                        ) : (
                          <button className="text-coke-red hover:underline" onClick={handleResendOtp}>
                            Resend OTP
                          </button>
                        )}
                      </p>
                    </>
                  )}

                  {otpError && (
                    <p className="text-xs text-destructive text-center">{otpError}</p>
                  )}

                  <button
                    onClick={() => { setOtpStep('idle'); setPendingNav(null); setOtp(''); setOtpError(''); setResendTimer(0); }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
                  >
                    ← Back
                  </button>
                </motion.div>
              ) : isDomestic ? (
                /* ── Domestic Form ── */
                <motion.div
                  key="domestic"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-3"
                >
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pickup</p>
                  <PinInput
                    value={pickupPin}
                    onChange={setPickupPin}
                    meta={pickupMeta}
                    placeholder="Pickup pin code"
                  />

                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-1">Drop</p>
                  <PinInput
                    value={dropPin}
                    onChange={setDropPin}
                    meta={dropMeta}
                    placeholder="Drop pin code"
                  />

                  <Button
                    className="w-full h-11 bg-coke-red hover:bg-coke-red/90 text-white font-semibold rounded-xl shadow-lg shadow-coke-red/20 text-sm gap-2 mt-2"
                    onClick={handleShipNow}
                    disabled={pickupPin.length !== 6 || dropPin.length !== 6 || !!pickupMeta.error || !!dropMeta.error || pickupMeta.loading || dropMeta.loading}
                  >
                    Get Rates
                    <ArrowRight className="h-4 w-4" weight="bold" />
                  </Button>
                </motion.div>
              ) : (
                /* ── International Form ── */
                <motion.div
                  key="international"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-3"
                >
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pickup (India)</p>
                  <PinInput
                    value={pickupPin}
                    onChange={setPickupPin}
                    meta={pickupMeta}
                    placeholder="Pickup pin code"
                  />

                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-1">Destination Country</p>
                  <div className="relative" ref={countryRef}>
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" weight="bold" />
                    <Input
                      type="text"
                      placeholder="Search country..."
                      value={destCountry ? countryOptions.find(c => c.code === destCountry)?.name || countrySearch : countrySearch}
                      onChange={e => {
                        setCountrySearch(e.target.value);
                        setDestCountry('');
                        setShowCountryDropdown(true);
                      }}
                      onFocus={() => setShowCountryDropdown(true)}
                      className="pl-9 h-11 rounded-xl border-border bg-background text-sm focus:border-coke-red focus:ring-coke-red/20"
                    />
                    {showCountryDropdown && filteredCountries.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                        {filteredCountries.map(c => (
                          <button
                            key={c.code}
                            onClick={() => {
                              setDestCountry(c.code);
                              setCountrySearch(c.name);
                              setShowCountryDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left"
                          >
                            <span className="text-base">{c.flag}</span>
                            <span className="text-foreground">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full h-11 bg-coke-red hover:bg-coke-red/90 text-white font-semibold rounded-xl shadow-lg shadow-coke-red/20 text-sm gap-2 mt-2"
                    onClick={handleShipNow}
                    disabled={!destCountry || pickupPin.length !== 6 || !!pickupMeta.error || pickupMeta.loading}
                  >
                    Get Rates
                    <ArrowRight className="h-4 w-4" weight="bold" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* No-account note */}
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              No account needed. Phone verification required before booking.
            </p>
          </TabsContent>

          {/* ── Track Order Tab ── */}
          <TabsContent value="track" className="mt-0 p-5 space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tracking Number</p>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" weight="bold" />
                <Input
                  type="text"
                  placeholder="Enter AWB or tracking number"
                  value={trackAwb}
                  onChange={e => setTrackAwb(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTrack()}
                  className="pl-9 h-11 rounded-xl border-border bg-background text-sm focus:border-coke-red focus:ring-coke-red/20"
                />
              </div>

              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-1">Mobile Number <span className="text-muted-foreground/60">(optional)</span></p>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-xl bg-muted border border-r-0 border-border text-xs text-muted-foreground font-medium">
                  +91
                </span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={trackPhone}
                  onChange={e => setTrackPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="rounded-l-none border-l-0 h-11 text-sm"
                />
              </div>

              <Button
                className="w-full h-11 bg-coke-red hover:bg-coke-red/90 text-white font-semibold rounded-xl shadow-lg shadow-coke-red/20 text-sm gap-2 mt-1"
                onClick={handleTrack}
                disabled={!trackAwb.trim() || trackLoading}
              >
                {trackLoading ? (
                  <CircleNotch className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <MagnifyingGlass className="h-4 w-4" weight="bold" />
                    Track Shipment
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
