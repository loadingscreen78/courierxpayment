'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const LAUNCH_DATE = new Date('2026-04-01T10:45:00+05:30').getTime();
const COOKIE_NAME = 'cx-launch-token';

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

  useEffect(() => { setUnlocked(isTokenValid()); }, []);

  useEffect(() => {
    if (unlocked) return;
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, [unlocked]);

  useEffect(() => {
    if (!locked || lockRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockRemaining((prev) => {
        if (prev <= 1) { setLocked(false); setAttemptsLeft(5); setError(''); return 0; }
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
      if (res.ok && data.success) { setUnlocked(true); return; }
      if (res.status === 429) {
        setLocked(true);
        setLockRemaining(data.remaining || 1800);
        if (data.attemptsExhausted) setShowLockedPage(true);
        return;
      }
      setAttemptsLeft(data.attemptsLeft ?? attemptsLeft - 1);
      setError(`Wrong password. ${data.attemptsLeft ?? attemptsLeft - 1} attempt${(data.attemptsLeft ?? attemptsLeft - 1) !== 1 ? 's' : ''} left.`);
      setPassword('');
      inputRef.current?.focus();
    } catch { setError('Connection error. Try again.'); }
    finally { setLoading(false); }
  }, [password, locked, loading, attemptsLeft]);

  if (unlocked === null) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#262626] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  if (showLockedPage) {
    return <LockedOutPage lockRemaining={lockRemaining} onRetry={() => {
      setShowLockedPage(false); setLocked(false); setAttemptsLeft(5); setError(''); setLockRemaining(0);
    }} />;
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div className="absolute inset-0 bg-[#FAFAF8]">
        <div className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #F40000 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, #262626 0%, transparent 50%),
                              radial-gradient(circle at 50% 80%, #F40000 0%, transparent 40%)`,
          }}
        />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="mb-8 text-center">
          <h1 className="font-typewriter text-4xl md:text-5xl tracking-tight text-[#262626] font-bold">
            Courier<span className="text-[#F40000]">X</span>
          </h1>
          <p className="mt-2 text-sm text-[#262626]/50 font-sans tracking-[0.2em] uppercase">
            Something big is coming
          </p>
        </div>
        <div className="flex gap-3 md:gap-5 mb-10">
          {([
            ['days', timeLeft.days],
            ['hours', timeLeft.hours],
            ['minutes', timeLeft.minutes],
            ['seconds', timeLeft.seconds],
          ] as const).map(([label, value]) => (
            <div key={label} className="flex flex-col items-center">
              <div className="relative w-16 h-20 md:w-20 md:h-24 rounded-xl bg-[#262626] flex items-center justify-center shadow-lg overflow-hidden">
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
        <p className="text-sm text-[#262626]/60 font-sans mb-8">
          Launching <span className="font-medium text-[#262626]">April 1, 2026</span> at <span className="font-medium text-[#262626]">10:45 AM IST</span>
        </p>
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
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="text-[#262626]/30 hover:text-[#262626]/60 transition-colors" tabIndex={-1}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button type="submit" disabled={locked || loading || !password.trim()}
                className="ml-1 px-4 py-1.5 bg-[#262626] text-[#FAFAF8] text-xs font-sans font-medium rounded-lg hover:bg-[#262626]/90 disabled:opacity-30 transition-all">
                {loading ? <div className="w-3 h-3 border border-[#FAFAF8] border-t-transparent rounded-full animate-spin" /> : 'Enter'}
              </button>
            </div>
          </form>
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
          {!locked && attemptsLeft < 5 && (
            <div className="mt-3 flex justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i < attemptsLeft ? 'bg-[#262626]/30' : 'bg-[#F40000]/60'}`} />
              ))}
            </div>
          )}
        </div>
        <p className="mt-12 text-[10px] text-[#262626]/25 font-sans">© 2026 CourierX. All rights reserved.</p>
      </div>
    </div>
  );
}

function LockedOutPage({ lockRemaining, onRetry }: { lockRemaining: number; onRetry: () => void }) {
  const [remaining, setRemaining] = useState(lockRemaining);
  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => { setRemaining((prev) => Math.max(0, prev - 1)); }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#262626] flex flex-col items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #F40000 0%, transparent 70%)' }} />
        <div className="absolute -bottom-1/3 -right-1/3 w-2/3 h-2/3 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #F40000 0%, transparent 70%)' }} />
      </div>
      <div className="relative z-10 text-center max-w-md">
        <div className="relative mb-6">
          <span className="font-typewriter text-[120px] md:text-[160px] font-bold leading-none text-[#FAFAF8]/[0.03]">403</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#F40000]/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-[#F40000]" />
            </div>
          </div>
        </div>
        <h2 className="font-typewriter text-2xl md:text-3xl font-bold text-[#FAFAF8] mb-3">Access Denied</h2>
        <p className="text-sm text-[#FAFAF8]/40 font-sans mb-8 leading-relaxed">Too many incorrect attempts. For security reasons, access has been temporarily restricted.</p>
        {remaining > 0 ? (
          <div className="inline-flex items-center gap-3 bg-[#FAFAF8]/5 border border-[#FAFAF8]/10 rounded-xl px-6 py-3">
            <div className="w-2 h-2 rounded-full bg-[#F40000] animate-pulse" />
            <span className="text-sm font-sans text-[#FAFAF8]/60">
              Try again in{' '}<span className="font-typewriter text-[#FAFAF8] font-medium">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>
            </span>
          </div>
        ) : (
          <button onClick={onRetry} className="px-6 py-3 bg-[#F40000] text-white text-sm font-sans font-medium rounded-xl hover:bg-[#d40000] transition-colors">Try Again</button>
        )}
        <p className="mt-12 text-[10px] text-[#FAFAF8]/15 font-sans">Courier<span className="text-[#F40000]/40">X</span> — Launching April 2026</p>
      </div>
    </div>
  );
}
