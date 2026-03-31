'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const LAUNCH_DATE = new Date('2026-04-01T10:45:00+05:30').getTime();
const COOKIE_NAME = 'cx-launch-token';
const ANIM_SEEN_KEY = 'cx-launch-anim-seen';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft {
  const diff = Math.max(0, LAUNCH_DATE - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function isTokenValid(): boolean {
  const token = getCookie(COOKIE_NAME);
  if (!token) return false;
  try {
    const data = JSON.parse(atob(token));
    return data.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function LaunchGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [locked, setLocked] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showLockedPage, setShowLockedPage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check existing session on mount
  useEffect(() => {
    const valid = isTokenValid();
    setUnlocked(valid);
    // If returning user (cookie valid), check if they've seen the animation
    if (valid) {
      try {
        const seen = sessionStorage.getItem(ANIM_SEEN_KEY);
        if (seen) {
          setAnimationDone(true);
        } else {
          setShowAnimation(true);
        }
      } catch {
        setAnimationDone(true);
      }
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (unlocked) return;
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, [unlocked]);

  // Lockout countdown
  useEffect(() => {
    if (!locked || lockRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockRemaining((prev) => {
        if (prev <= 1) {
          setLocked(false);
          setAttemptsLeft(5);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [locked, lockRemaining]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (locked || loading || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/launch-gate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUnlocked(true);
        // Fresh unlock — play animation
        setShowAnimation(true);
        return;
      }

      if (res.status === 429) {
        setLocked(true);
        setLockRemaining(data.remaining || 1800);
        if (data.attemptsExhausted) {
          setShowLockedPage(true);
        }
        return;
      }

      // Wrong password
      setAttemptsLeft(data.attemptsLeft ?? attemptsLeft - 1);
      setError(`Wrong password. ${data.attemptsLeft ?? attemptsLeft - 1} attempt${(data.attemptsLeft ?? attemptsLeft - 1) !== 1 ? 's' : ''} left.`);
      setPassword('');
      inputRef.current?.focus();
    } catch {
      setError('Connection error. Try again.');
    } finally {
      setLoading(false);
    }
  }, [password, locked, loading, attemptsLeft]);

  const handleAnimationEnd = useCallback(() => {
    setShowAnimation(false);
    setAnimationDone(true);
    try { sessionStorage.setItem(ANIM_SEEN_KEY, '1'); } catch {}
  }, []);

  // Still checking session
  if (unlocked === null) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#262626] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Unlocked + animation playing
  if (unlocked && showAnimation && !animationDone) {
    return <CinematicLaunchAnimation onComplete={handleAnimationEnd} />;
  }

  // Unlocked + animation done — show the site
  if (unlocked && animationDone) return <>{children}</>;

  // Unlocked but waiting (shouldn't happen, fallback)
  if (unlocked) return <>{children}</>;

  // Rate limited — show branded 404-style error page
  if (showLockedPage) {
    return <LockedOutPage lockRemaining={lockRemaining} onRetry={() => {
      setShowLockedPage(false);
      setLocked(false);
      setAttemptsLeft(5);
      setError('');
      setLockRemaining(0);
    }} />;
  }

  // Main gate UI
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Blurred background hint */}
      <div className="absolute inset-0 bg-[#FAFAF8]">
        <div className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #F40000 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, #262626 0%, transparent 50%),
                              radial-gradient(circle at 50% 80%, #F40000 0%, transparent 40%)`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <h1 className="font-typewriter text-4xl md:text-5xl tracking-tight text-[#262626] font-bold">
            Courier<span className="text-[#F40000]">X</span>
          </h1>
          <p className="mt-2 text-sm text-[#262626]/50 font-sans tracking-[0.2em] uppercase">
            Something big is coming
          </p>
        </div>

        {/* Countdown — Apple-inspired minimal blocks */}
        <div className="flex gap-3 md:gap-5 mb-10">
          {([
            ['days', timeLeft.days],
            ['hours', timeLeft.hours],
            ['minutes', timeLeft.minutes],
            ['seconds', timeLeft.seconds],
          ] as const).map(([label, value]) => (
            <div key={label} className="flex flex-col items-center">
              <div className="relative w-16 h-20 md:w-20 md:h-24 rounded-xl bg-[#262626] flex items-center justify-center shadow-lg overflow-hidden">
                {/* Subtle split line */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                <span className="font-typewriter text-3xl md:text-4xl font-bold text-[#FAFAF8] tabular-nums">
                  {String(value).padStart(2, '0')}
                </span>
              </div>
              <span className="mt-2 text-[10px] md:text-xs font-sans uppercase tracking-[0.15em] text-[#262626]/40">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Launch date */}
        <p className="text-sm text-[#262626]/60 font-sans mb-8">
          Launching <span className="font-medium text-[#262626]">April 1, 2026</span> at <span className="font-medium text-[#262626]">10:45 AM IST</span>
        </p>

        {/* Password gate */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center gap-2 bg-white border border-[#262626]/10 rounded-xl px-4 py-3 shadow-sm focus-within:border-[#262626]/30 focus-within:shadow-md transition-all">
              <Lock className="w-4 h-4 text-[#262626]/30 flex-shrink-0" />
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access code"
                disabled={locked}
                className="flex-1 bg-transparent text-sm font-sans text-[#262626] placeholder:text-[#262626]/30 outline-none disabled:opacity-50"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#262626]/30 hover:text-[#262626]/60 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="submit"
                disabled={locked || loading || !password.trim()}
                className="ml-1 px-4 py-1.5 bg-[#262626] text-[#FAFAF8] text-xs font-sans font-medium rounded-lg hover:bg-[#262626]/90 disabled:opacity-30 transition-all"
              >
                {loading ? (
                  <div className="w-3 h-3 border border-[#FAFAF8] border-t-transparent rounded-full animate-spin" />
                ) : 'Enter'}
              </button>
            </div>
          </form>

          {/* Error / Status */}
          {error && (
            <div className="mt-3 flex items-center gap-2 text-xs font-sans text-[#F40000]">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {locked && !showLockedPage && (
            <div className="mt-3 text-xs font-sans text-[#262626]/50 text-center">
              Too many attempts. Try again in {Math.floor(lockRemaining / 60)}:{String(lockRemaining % 60).padStart(2, '0')}
            </div>
          )}

          {/* Attempts indicator */}
          {!locked && attemptsLeft < 5 && (
            <div className="mt-3 flex justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i < attemptsLeft ? 'bg-[#262626]/30' : 'bg-[#F40000]/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-12 text-[10px] text-[#262626]/25 font-sans">
          © 2026 CourierX. All rights reserved.
        </p>
      </div>
    </div>
  );
}

/* ── Branded "Locked Out" page (shown after 5 failed attempts) ──────────── */
function LockedOutPage({ lockRemaining, onRetry }: { lockRemaining: number; onRetry: () => void }) {
  const [remaining, setRemaining] = useState(lockRemaining);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#262626] flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Animated background accents */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #F40000 0%, transparent 70%)' }}
        />
        <div className="absolute -bottom-1/3 -right-1/3 w-2/3 h-2/3 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #F40000 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 text-center max-w-md">
        {/* Large 404-style number */}
        <div className="relative mb-6">
          <span className="font-typewriter text-[120px] md:text-[160px] font-bold leading-none text-[#FAFAF8]/[0.03]">
            403
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#F40000]/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-[#F40000]" />
            </div>
          </div>
        </div>

        <h2 className="font-typewriter text-2xl md:text-3xl font-bold text-[#FAFAF8] mb-3">
          Access Denied
        </h2>
        <p className="text-sm text-[#FAFAF8]/40 font-sans mb-8 leading-relaxed">
          Too many incorrect attempts. For security reasons, access has been temporarily restricted.
        </p>

        {remaining > 0 ? (
          <div className="inline-flex items-center gap-3 bg-[#FAFAF8]/5 border border-[#FAFAF8]/10 rounded-xl px-6 py-3">
            <div className="w-2 h-2 rounded-full bg-[#F40000] animate-pulse" />
            <span className="text-sm font-sans text-[#FAFAF8]/60">
              Try again in{' '}
              <span className="font-typewriter text-[#FAFAF8] font-medium">
                {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
              </span>
            </span>
          </div>
        ) : (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-[#F40000] text-white text-sm font-sans font-medium rounded-xl hover:bg-[#d40000] transition-colors"
          >
            Try Again
          </button>
        )}

        <p className="mt-12 text-[10px] text-[#FAFAF8]/15 font-sans">
          Courier<span className="text-[#F40000]/40">X</span> — Launching April 2026
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CINEMATIC LAUNCH ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function easeInCubic(t: number): number {
  return t * t * t;
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function CinematicLaunchAnimation({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'countdown' | 'animation'>('countdown');
  const [countdown, setCountdown] = useState(5);
  const [act, setAct] = useState(0);
  const animRef = useRef<number>(0);

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('animation');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Main animation loop
  useEffect(() => {
    if (phase !== 'animation') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const startTime = performance.now();

    // Responsive sizing
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    function draw(now: number) {
      if (!running || !ctx) return;
      const t = (now - startTime) / 1000;

      if (t < 3) setAct(1);
      else if (t < 18) setAct(2);
      else if (t < 45) setAct(3);
      else if (t < 55) setAct(4);
      else setAct(5);

      ctx.clearRect(0, 0, W, H);

      if (t < 3) drawAct1(ctx, W, H, t);
      else if (t < 18) drawAct2(ctx, W, H, t - 3);
      else if (t < 45) drawAct3(ctx, W, H, t - 18);
      else if (t < 55) drawAct4(ctx, W, H, t - 45);
      else drawAct5(ctx, W, H, t - 55);

      if (t < 60) animRef.current = requestAnimationFrame(draw);
      else onComplete();
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [phase, onComplete]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1A1A1A', overflow: 'hidden', zIndex: 9999 }}>
      {/* Progress chip */}
      <div style={{
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(230,51,39,0.15)', border: '1px solid rgba(230,51,39,0.3)',
        borderRadius: 20, padding: '6px 20px', zIndex: 100,
        fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#E63327'
      }}>
        {act === 0 ? 'INITIALIZING' : act === 1 ? 'ACT 1 — COUNTDOWN ZERO' :
         act === 2 ? 'ACT 2 — WORLD MAP' : act === 3 ? 'ACT 3 — BOOKING FLOW' :
         act === 4 ? 'ACT 4 — SUCCESS' : 'ACT 5 — REVEAL'}
      </div>

      {/* Skip button */}
      {act < 5 && (
        <button onClick={onComplete} style={{
          position: 'absolute', bottom: 30, right: 30, zIndex: 100,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 8, padding: '8px 24px', color: '#aaa', fontSize: 13,
          cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif"
        }}>Skip →</button>
      )}

      {/* Countdown overlay */}
      {phase === 'countdown' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 120, fontWeight: 700,
            color: '#E63327', textShadow: '0 0 60px rgba(230,51,39,0.5)',
            transition: 'transform 0.3s', transform: `scale(${1 + (countdown === 0 ? 0.3 : 0)})`
          }}>{String(countdown).padStart(2, '0')}</div>
          <p style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18, color: '#666',
            letterSpacing: 8, marginTop: 20
          }}>SOMETHING BIG IS COMING</p>
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} style={{
        width: '100%', height: '100%',
        opacity: phase === 'animation' ? 1 : 0, transition: 'opacity 0.5s'
      }} />
    </div>
  );
}

// ── ACT 1: Countdown Zero + Shockwave ─────────────────────────────────────
function drawAct1(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;

  // Timer display
  if (t < 1.5) {
    const scale = 1 + easeOutCubic(Math.min(t / 0.3, 1)) * 0.2;
    ctx.save();
    ctx.translate(cx, cy - 40);
    ctx.scale(scale, scale);
    ctx.font = `bold ${Math.min(W * 0.07, 100)}px 'Courier New', monospace`;
    ctx.fillStyle = '#E63327';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(230,51,39,0.6)';
    ctx.shadowBlur = 40;
    ctx.fillText('00:00:00', 0, 0);
    ctx.restore();
  }

  // Shockwave
  if (t > 0.3 && t < 2.5) {
    const st = (t - 0.3) / 2.2;
    const radius = easeOutCubic(st) * Math.max(W, H);
    const alpha = 1 - easeOutCubic(st);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(230,51,39,${alpha * 0.8})`;
    ctx.lineWidth = 4 - st * 3;
    ctx.stroke();
    if (t > 0.6) {
      const st2 = (t - 0.6) / 2.2;
      const r2 = easeOutCubic(Math.min(st2, 1)) * Math.max(W, H) * 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, r2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(230,51,39,${(1 - easeOutCubic(Math.min(st2, 1))) * 0.4})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // "SOMETHING BIG IS COMING" shatter
  if (t > 0.5 && t < 2.5) {
    const st = (t - 0.5) / 1.0;
    const text = 'SOMETHING BIG IS COMING';
    ctx.font = `bold ${Math.min(W * 0.025, 36)}px 'IBM Plex Sans', sans-serif`;
    if (st < 0.3) {
      ctx.fillStyle = `rgba(255,255,255,${easeOutCubic(st / 0.3)})`;
      ctx.textAlign = 'center';
      ctx.fillText(text, cx, cy + 80);
    } else {
      const shatterT = (st - 0.3) / 0.7;
      ctx.textAlign = 'left';
      const totalW = ctx.measureText(text).width;
      let xOff = cx - totalW / 2;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const cw = ctx.measureText(ch).width;
        const angle = (i - text.length / 2) * 0.3;
        const dist = easeInCubic(Math.min(shatterT, 1)) * 400;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist + easeInCubic(Math.min(shatterT, 1)) * 200;
        ctx.save();
        ctx.translate(xOff + dx, cy + 80 + dy);
        ctx.rotate(shatterT * angle * 2);
        ctx.fillStyle = `rgba(255,255,255,${1 - easeInCubic(Math.min(shatterT, 1))})`;
        ctx.fillText(ch, 0, 0);
        ctx.restore();
        xOff += cw;
      }
    }
  }

  // Fade to black
  if (t > 2.2) {
    ctx.fillStyle = `rgba(26,26,26,${easeInCubic(Math.min((t - 2.2) / 0.8, 1))})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ── ACT 2: World Map + Plane Journey ──────────────────────────────────────
const continentPaths: { points: [number, number][] }[] = [
  { points: [[0.48,0.35],[0.50,0.30],[0.54,0.28],[0.56,0.32],[0.58,0.38],[0.57,0.48],[0.55,0.58],[0.52,0.65],[0.48,0.62],[0.46,0.55],[0.45,0.45],[0.48,0.35]] },
  { points: [[0.46,0.18],[0.48,0.15],[0.52,0.13],[0.56,0.15],[0.58,0.18],[0.56,0.22],[0.54,0.26],[0.50,0.28],[0.48,0.26],[0.46,0.22],[0.46,0.18]] },
  { points: [[0.58,0.15],[0.65,0.12],[0.72,0.14],[0.78,0.18],[0.82,0.22],[0.80,0.30],[0.76,0.35],[0.72,0.38],[0.68,0.40],[0.64,0.38],[0.60,0.34],[0.58,0.28],[0.58,0.15]] },
  { points: [[0.64,0.32],[0.66,0.30],[0.68,0.32],[0.69,0.36],[0.68,0.42],[0.66,0.46],[0.64,0.44],[0.63,0.38],[0.64,0.32]] },
  { points: [[0.12,0.15],[0.18,0.12],[0.25,0.14],[0.30,0.18],[0.32,0.24],[0.28,0.30],[0.24,0.34],[0.20,0.36],[0.16,0.32],[0.12,0.26],[0.10,0.20],[0.12,0.15]] },
  { points: [[0.24,0.42],[0.28,0.38],[0.32,0.42],[0.34,0.50],[0.32,0.58],[0.30,0.65],[0.28,0.72],[0.26,0.68],[0.24,0.60],[0.22,0.52],[0.24,0.42]] },
  { points: [[0.78,0.55],[0.82,0.52],[0.86,0.54],[0.88,0.58],[0.86,0.62],[0.82,0.64],[0.78,0.62],[0.76,0.58],[0.78,0.55]] },
];
const flightPath: [number, number][] = [
  [0.66,0.38],[0.58,0.30],[0.52,0.20],[0.46,0.18],[0.52,0.22],[0.60,0.30],[0.66,0.38],
];
const waypointLabels = ['Mumbai','Dubai','Frankfurt','London','Istanbul','Riyadh','Delhi'];

function drawAct2(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, W, H);
  const fadeIn = easeOutCubic(Math.min(t / 1.5, 1));

  // Grid
  ctx.globalAlpha = fadeIn * 0.08;
  ctx.strokeStyle = '#E63327';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.globalAlpha = 1;

  // Continents
  ctx.globalAlpha = fadeIn;
  for (const c of continentPaths) {
    ctx.beginPath();
    c.points.forEach((p, i) => { const x = p[0]*W, y = p[1]*H; i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
    ctx.closePath();
    ctx.fillStyle = 'rgba(230,51,39,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,51,39,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Plane
  if (t > 1.5) {
    const progress = easeInOutCubic(Math.min((t - 1.5) / 12, 1));
    const totalSeg = flightPath.length - 1;
    const segFloat = progress * totalSeg;
    const segIdx = Math.min(Math.floor(segFloat), totalSeg - 1);
    const segT = segFloat - segIdx;
    const p0 = flightPath[segIdx], p1 = flightPath[Math.min(segIdx + 1, flightPath.length - 1)];
    const midX = (p0[0]+p1[0])/2, midY = (p0[1]+p1[1])/2 - 0.05;
    const st = easeInOutCubic(segT);
    const px = ((1-st)*(1-st)*p0[0] + 2*(1-st)*st*midX + st*st*p1[0]) * W;
    const py = ((1-st)*(1-st)*p0[1] + 2*(1-st)*st*midY + st*st*p1[1]) * H;

    // Trail
    ctx.beginPath();
    const trailStart = Math.max(0, progress - 0.15);
    for (let i = 0; i <= 30; i++) {
      const tp = lerp(trailStart, progress, i/30);
      const sf = tp * totalSeg;
      const si = Math.min(Math.floor(sf), totalSeg - 1);
      const sst = sf - si;
      const sp0 = flightPath[si], sp1 = flightPath[Math.min(si+1, flightPath.length-1)];
      const smx = (sp0[0]+sp1[0])/2, smy = (sp0[1]+sp1[1])/2 - 0.05;
      const est = easeInOutCubic(sst);
      const tx = ((1-est)*(1-est)*sp0[0]+2*(1-est)*est*smx+est*est*sp1[0])*W;
      const ty = ((1-est)*(1-est)*sp0[1]+2*(1-est)*est*smy+est*est*sp1[1])*H;
      i === 0 ? ctx.moveTo(tx,ty) : ctx.lineTo(tx,ty);
    }
    const grad = ctx.createLinearGradient(px-100,py,px,py);
    grad.addColorStop(0,'rgba(230,51,39,0)');
    grad.addColorStop(1,'rgba(230,51,39,0.8)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Plane heading
    const angle = Math.atan2(p1[1]-p0[1], p1[0]-p0[0]);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.font = `${Math.min(W*0.025,36)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(230,51,39,0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText('✈️', 0, 0);
    ctx.restore();

    // Waypoint pins
    for (let i = 0; i <= segIdx; i++) {
      const wp = flightPath[i];
      const pinAge = t - 1.5 - (i/totalSeg)*12;
      if (pinAge > 0) {
        const ps = easeOutCubic(Math.min(pinAge/0.5,1));
        ctx.save();
        ctx.translate(wp[0]*W, wp[1]*H);
        ctx.scale(ps,ps);
        ctx.beginPath(); ctx.arc(0,-8,6,0,Math.PI*2); ctx.fillStyle='#E63327'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-4,-4); ctx.lineTo(0,6); ctx.lineTo(4,-4); ctx.fill();
        ctx.font = "11px 'IBM Plex Sans', sans-serif";
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(waypointLabels[i], 0, 20);
        const pulseR = 10+(pinAge%2)*15;
        ctx.beginPath(); ctx.arc(0,-8,pulseR,0,Math.PI*2);
        ctx.strokeStyle = `rgba(230,51,39,${(1-(pinAge%2)/2)*0.3})`;
        ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ── ACT 3: Form Simulation ────────────────────────────────────────────────
interface FormPanel { title: string; fields: { label: string; value: string; type: 'click'|'type'|'select'|'button'; hint?: string }[]; duration: number; }
const formPanels: FormPanel[] = [
  { title:'Ship Now', fields:[{label:'Domestic Shipping',value:'',type:'click'}], duration:3 },
  { title:'Shipment Details', fields:[
    {label:'Type',value:'Document',type:'select'},
    {label:'Pickup Pincode',value:'753001',type:'type',hint:'📍 Cuttack, Odisha'},
    {label:'Delivery Pincode',value:'603203',type:'type',hint:'📍 Kanchipuram, Tamil Nadu'},
    {label:'Weight',value:'Up to 1 kg',type:'select'},
    {label:'Declared Value (₹)',value:'25',type:'type'},
    {label:'Dimensions (cm)',value:'12 × 1 × 1',type:'type'},
    {label:'Calculate Rates',value:'',type:'button'},
  ], duration:10 },
  { title:'Available Rates', fields:[
    {label:'Xpressbees Air',value:'₹1,007',type:'click'},
    {label:'DTDC Surface',value:'₹856',type:'click'},
    {label:'BlueDart Express',value:'₹1,245',type:'click'},
  ], duration:4 },
  { title:'Sender & Receiver', fields:[
    {label:'Full Name',value:'Jagannath',type:'type'},
    {label:'Phone',value:'9078241990',type:'type'},
    {label:'Address',value:'Dargha Bazar, Cuttack',type:'type'},
    {label:'Pincode',value:'753001',type:'type'},
    {label:'City',value:'Cuttack',type:'type'},
  ], duration:6 },
  { title:'Booking Summary & Payment', fields:[
    {label:'ID Verification',value:'Aadhaar Card',type:'click'},
    {label:'Coupon Code',value:'LAUNCH52',type:'type'},
    {label:'Pay Now',value:'',type:'button'},
  ], duration:4 },
];

function drawAct3(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, W, H);

  let panelIdx = 0, panelT = t;
  for (let i = 0; i < formPanels.length; i++) {
    if (panelT < formPanels[i].duration) { panelIdx = i; break; }
    panelT -= formPanels[i].duration;
    if (i === formPanels.length - 1) { panelIdx = i; panelT = formPanels[i].duration; }
  }
  const panel = formPanels[panelIdx];
  const panelProgress = panelT / panel.duration;
  const cardW = Math.min(600, W * 0.85), cardH = Math.min(500, 120 + panel.fields.length * 60);
  const cardX = (W - cardW) / 2, cardY = (H - cardH) / 2;
  const slideIn = easeOutCubic(Math.min(panelT / 0.5, 1));

  ctx.globalAlpha = slideIn;
  ctx.save();
  ctx.translate(0, (1 - slideIn) * 60);

  // Card
  ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, cardX, cardY, cardW, cardH, 16); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // Step + Title
  ctx.font = "bold 11px 'Space Mono', monospace"; ctx.fillStyle = '#E63327'; ctx.textAlign = 'left';
  ctx.fillText(`STEP ${panelIdx+1} OF ${formPanels.length}`, cardX+30, cardY+35);
  ctx.font = "bold 22px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#1A1A1A';
  ctx.fillText(panel.title, cardX+30, cardY+65);

  const fieldStartY = cardY + 95, fieldH = 52;
  for (let i = 0; i < panel.fields.length; i++) {
    const field = panel.fields[i];
    const fy = fieldStartY + i * fieldH;
    const fp = Math.min(Math.max(0, (panelProgress * panel.fields.length - i)), 1);
    if (fp <= 0) continue;

    if (field.type === 'button') {
      ctx.globalAlpha = slideIn * easeOutCubic(fp);
      if (fp > 0.7) { ctx.shadowColor = 'rgba(230,51,39,0.5)'; ctx.shadowBlur = 20; }
      ctx.fillStyle = '#E63327';
      roundRect(ctx, cardX+30, fy, 200, 40, 8); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      ctx.font = "bold 14px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center'; ctx.fillText(field.label, cardX+130, fy+25); ctx.textAlign = 'left';
      ctx.globalAlpha = slideIn;
    } else if (field.type === 'click') {
      const sel = fp > 0.5;
      ctx.fillStyle = sel ? 'rgba(230,51,39,0.08)' : '#F8F8F8';
      ctx.strokeStyle = sel ? '#E63327' : '#E0E0E0'; ctx.lineWidth = sel ? 2 : 1;
      roundRect(ctx, cardX+30, fy, cardW-60, 40, 8); ctx.fill(); ctx.stroke();
      ctx.font = "600 14px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = sel ? '#E63327' : '#333';
      ctx.fillText(field.label + (field.value ? ` — ${field.value}` : ''), cardX+50, fy+25);
    } else {
      ctx.font = "500 11px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#888';
      ctx.fillText(field.label, cardX+30, fy+12);
      ctx.fillStyle = '#F5F5F5';
      ctx.strokeStyle = fp > 0.3 && fp < 0.9 ? '#E63327' : '#E0E0E0';
      ctx.lineWidth = fp > 0.3 && fp < 0.9 ? 2 : 1;
      roundRect(ctx, cardX+30, fy+16, cardW-60, 30, 6); ctx.fill(); ctx.stroke();
      const typP = Math.max(0, (fp-0.2)/0.6);
      const chars = Math.floor(typP * field.value.length);
      const disp = field.value.substring(0, chars);
      ctx.font = "14px 'Space Mono', monospace"; ctx.fillStyle = '#1A1A1A';
      ctx.fillText(disp, cardX+40, fy+36);
      if (fp > 0.2 && fp < 0.9 && Math.floor(t*3)%2===0) {
        ctx.fillStyle = '#E63327';
        ctx.fillRect(cardX+40+ctx.measureText(disp).width+2, fy+22, 2, 18);
      }
      if (field.hint && chars >= field.value.length) {
        ctx.font = "12px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#4CAF50';
        ctx.fillText(field.hint, cardX+40, fy+56);
      }
    }
  }

  // Red cursor dot
  const ci = Math.min(Math.floor(panelProgress * panel.fields.length), panel.fields.length-1);
  const cY = fieldStartY + ci * fieldH + 20, cX = cardX + cardW - 50;
  const clicking = (panelProgress*panel.fields.length)%1 > 0.4 && (panelProgress*panel.fields.length)%1 < 0.6;
  const cs = clicking ? 1.4 : 1;
  ctx.beginPath(); ctx.arc(cX,cY,8*cs,0,Math.PI*2); ctx.fillStyle='rgba(230,51,39,0.9)'; ctx.fill();
  ctx.beginPath(); ctx.arc(cX,cY,14*cs,0,Math.PI*2); ctx.strokeStyle='rgba(230,51,39,0.3)'; ctx.lineWidth=2; ctx.stroke();

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ── ACT 4: Success + Plane Morph ──────────────────────────────────────────
function drawAct4(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#1A1A1A'; ctx.fillRect(0, 0, W, H);
  const cx = W/2, cy = H/2;

  // Red flash
  if (t < 1.5) {
    const ft = t/1.5;
    const a = ft < 0.3 ? easeOutCubic(ft/0.3) : 1 - easeOutCubic((ft-0.3)/0.7);
    ctx.fillStyle = `rgba(230,51,39,${a*0.6})`; ctx.fillRect(0,0,W,H);
  }

  // Confetti
  if (t > 0.5 && t < 4) {
    const ct = t - 0.5;
    for (let i = 0; i < 80; i++) {
      const x = (Math.sin(i*137.508)*0.5+0.5)*W;
      const y = -20 + ct*(100+(i%5)*60);
      if (y > H+20) continue;
      const a = Math.max(0, Math.min(1, 1-(ct-2.5)/1));
      if (a <= 0) continue;
      ctx.save();
      ctx.translate(x+Math.sin(ct*3+i)*30, y);
      ctx.rotate(ct*(2+i%4));
      ctx.globalAlpha = a;
      ctx.fillStyle = ['#E63327','#FFFFFF','#FFD700','#E63327','#FFF'][i%5];
      const sz = 4+(i%3)*3;
      ctx.fillRect(-sz/2,-sz/4,sz,sz/2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // "BOOKING CONFIRMED"
  if (t > 1 && t < 3.5) {
    const tt = (t-1)/2.5;
    ctx.globalAlpha = tt < 0.3 ? easeOutCubic(tt/0.3) : tt > 0.8 ? 1-easeOutCubic((tt-0.8)/0.2) : 1;
    ctx.font = `bold ${Math.min(W*0.035,48)}px 'IBM Plex Sans', sans-serif`;
    ctx.fillStyle = '#FFF'; ctx.textAlign = 'center';
    ctx.fillText('✅ BOOKING CONFIRMED', cx, cy-20);
    ctx.font = `${Math.min(W*0.013,18)}px 'Space Mono', monospace`;
    ctx.fillStyle = '#E63327';
    ctx.fillText('AWB: CX-2027-LAUNCH-001', cx, cy+30);
    ctx.globalAlpha = 1;
  }

  // Plane morph
  if (t > 3.5) {
    const mt = (t-3.5)/6.5;
    const spin = Math.min(mt/0.4, 1);
    const move = Math.max(0, (mt-0.4)/0.6);
    const sz = spin < 1 ? lerp(20,80,easeOutCubic(spin)) : lerp(80,16,easeInOutCubic(move));
    const px = spin < 1 ? cx : lerp(cx,120,easeInOutCubic(move));
    const py = spin < 1 ? cy : lerp(cy,60,easeInOutCubic(move));
    const rot = spin < 1 ? easeOutCubic(spin)*Math.PI*2 : Math.PI*2;

    ctx.save(); ctx.translate(px,py); ctx.rotate(rot);
    ctx.shadowColor = 'rgba(230,51,39,0.6)'; ctx.shadowBlur = 30;
    ctx.font = `${sz}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✈️', 0, 0);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.restore();

    if (move > 0.3) drawLandingAssembly(ctx, W, H, (move-0.3)/0.7);
  }
}

function drawLandingAssembly(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const navT = easeOutCubic(Math.min(t/0.3,1));
  const navY = lerp(-60,0,navT);
  ctx.fillStyle = 'rgba(250,250,248,0.95)'; ctx.fillRect(0,navY,W,60);
  ctx.fillStyle = '#1A1A1A'; ctx.font = "bold 20px 'IBM Plex Sans', sans-serif"; ctx.textAlign = 'left';
  ctx.fillText('CourierX', 140, navY+37);
  const links = ['Track','Calculate','About','Contact'];
  ctx.font = "14px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#666';
  links.forEach((l,i) => ctx.fillText(l, W/2-150+i*100, navY+37));
  ctx.fillStyle = '#E63327'; roundRect(ctx,W-200,navY+15,120,32,8); ctx.fill();
  ctx.font = "bold 13px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center'; ctx.fillText('Ship Now', W-140, navY+36); ctx.textAlign = 'left';

  if (t > 0.2) {
    const ht = easeOutCubic(Math.min((t-0.2)/0.4,1));
    ctx.globalAlpha = ht;
    const hl = "India's Only Person to Person Courier Booking Platform";
    const show = Math.floor(ht * hl.length);
    ctx.font = `bold ${Math.min(W*0.03,42)}px 'IBM Plex Sans', sans-serif`; ctx.fillStyle = '#1A1A1A';
    const maxW = W*0.4; const words = hl.substring(0,show).split(' ');
    let line = '', lineY = 200;
    for (const w of words) {
      const test = line+w+' ';
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trim(),100,lineY); line=w+' '; lineY+=52; }
      else line = test;
    }
    ctx.fillText(line.trim(),100,lineY);
    if (ht > 0.5) {
      ctx.font = "16px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#666';
      ctx.fillText('Send medicines, documents & gifts — across India and to 150+ countries',100,lineY+50);
    }
    ctx.globalAlpha = 1;
  }

  if (t > 0.4) {
    const ct = easeOutCubic(Math.min((t-0.4)/0.4,1));
    const cx = lerp(W+100,W-500,ct);
    ctx.shadowColor='rgba(0,0,0,0.1)'; ctx.shadowBlur=20; ctx.shadowOffsetY=5;
    ctx.fillStyle='#FFF'; roundRect(ctx,cx,160,400,350,16); ctx.fill();
    ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    ctx.font="bold 18px 'IBM Plex Sans', sans-serif"; ctx.fillStyle='#1A1A1A';
    ctx.fillText('Quick Ship',cx+30,200);
    ['From','To','Weight','Type'].forEach((f,i) => {
      const fy=220+i*55;
      ctx.font="11px 'IBM Plex Sans', sans-serif"; ctx.fillStyle='#999'; ctx.fillText(f,cx+30,fy);
      ctx.fillStyle='#F0F0F0'; roundRect(ctx,cx+30,fy+5,340,32,6); ctx.fill();
    });
    ctx.fillStyle='#E63327'; roundRect(ctx,cx+30,450,340,40,8); ctx.fill();
    ctx.font="bold 14px 'IBM Plex Sans', sans-serif"; ctx.fillStyle='#FFF';
    ctx.textAlign='center'; ctx.fillText('Get Rates →',cx+200,475); ctx.textAlign='left';
  }
}

// ── ACT 5: Landing Page Reveal ────────────────────────────────────────────
function drawAct5(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#FAFAF8'; ctx.fillRect(0,0,W,H);

  // Navbar
  ctx.fillStyle = 'rgba(250,250,248,0.98)'; ctx.fillRect(0,0,W,60);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0,60); ctx.lineTo(W,60); ctx.stroke();
  ctx.font = "bold 22px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#1A1A1A'; ctx.textAlign = 'left';
  ctx.fillText('✈️ CourierX', 80, 38);
  ['Track','Calculate','About','Contact'].forEach((l,i) => {
    ctx.font = "14px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#666';
    ctx.fillText(l, W/2-150+i*100, 38);
  });
  ctx.fillStyle = '#E63327'; roundRect(ctx,W-210,16,140,32,8); ctx.fill();
  ctx.font = "bold 12px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center'; ctx.fillText('Ship Now — Save 52%', W-140, 37); ctx.textAlign = 'left';

  // Hero
  ctx.font = `bold ${Math.min(W*0.035,48)}px 'IBM Plex Sans', sans-serif`; ctx.fillStyle = '#1A1A1A';
  ["India's Only","Person to Person","Courier Booking"].forEach((l,i) => ctx.fillText(l, 100, 180+i*58));
  ctx.font = "17px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#666';
  ctx.fillText('Send medicines, documents & gifts — across India and 150+ countries.', 100, 380);
  ctx.fillText('Doorstep pickup. Real-time tracking. Best rates guaranteed.', 100, 405);

  // Ship Now button pulse
  const ps = t > 0.5 && t < 1.5 ? 1+Math.sin((t-0.5)*Math.PI*4)*0.05 : 1;
  ctx.save(); ctx.translate(170,460); ctx.scale(ps,ps);
  ctx.fillStyle = '#E63327';
  if (t > 0.5 && t < 1.5) { ctx.shadowColor='rgba(230,51,39,0.4)'; ctx.shadowBlur=20; }
  roundRect(ctx,-70,-20,140,44,10); ctx.fill();
  ctx.shadowColor='transparent'; ctx.shadowBlur=0;
  ctx.font = "bold 15px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center'; ctx.fillText('Ship Now →', 0, 4);
  ctx.restore(); ctx.textAlign = 'left';

  // Booking card
  const bx = W-480;
  ctx.shadowColor='rgba(0,0,0,0.08)'; ctx.shadowBlur=30; ctx.shadowOffsetY=8;
  ctx.fillStyle='#FFF'; roundRect(ctx,bx,120,400,380,16); ctx.fill();
  ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0;
  ctx.font="bold 18px 'IBM Plex Sans', sans-serif"; ctx.fillStyle='#1A1A1A';
  ctx.fillText('Quick Ship',bx+30,160);
  ['From Pincode','To Pincode','Weight','Shipment Type'].forEach((f,i) => {
    const fy=180+i*55;
    ctx.font="11px 'IBM Plex Sans', sans-serif"; ctx.fillStyle='#999'; ctx.fillText(f,bx+30,fy);
    ctx.fillStyle='#F5F5F5'; roundRect(ctx,bx+30,fy+6,340,32,6); ctx.fill();
    ctx.strokeStyle='#E8E8E8'; ctx.lineWidth=1; ctx.stroke();
  });
  ctx.fillStyle='#E63327'; roundRect(ctx,bx+30,410,340,42,8); ctx.fill();
  ctx.font="bold 14px 'IBM Plex Sans', sans-serif"; ctx.fillStyle='#FFF';
  ctx.textAlign='center'; ctx.fillText('Get Instant Rates →',bx+200,436); ctx.textAlign='left';

  // Carrier logos
  const carriers = ['DHL','FedEx','Aramex','BlueDart','DTDC','ShipGlobal'];
  const cy = H-100;
  carriers.forEach((c,i) => {
    const delay = 1.5+i*0.25;
    const a = t > delay ? easeOutCubic(Math.min((t-delay)/0.5,1)) : 0;
    ctx.globalAlpha = a*0.5;
    ctx.font = "bold 20px 'IBM Plex Sans', sans-serif"; ctx.fillStyle = '#1A1A1A';
    ctx.fillText(c, 100+i*150, cy);
  });
  ctx.globalAlpha = 1;
  if (t > 1.2) {
    ctx.globalAlpha = easeOutCubic(Math.min((t-1.2)/0.5,1));
    ctx.font="11px 'IBM Plex Sans', sans-serif"; ctx.fillStyle='#999';
    ctx.fillText('TRUSTED CARRIER PARTNERS — DOMESTIC & INTERNATIONAL',100,cy-30);
    ctx.globalAlpha = 1;
  }

  // Tagline
  if (t > 3) {
    ctx.globalAlpha = easeOutCubic(Math.min((t-3)/1,1));
    ctx.font = "bold 16px 'Space Mono', monospace"; ctx.fillStyle = '#E63327';
    ctx.textAlign = 'center'; ctx.fillText('Now Live — Ship Anywhere.', W/2, H-30);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}
