"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Password Gate ──────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '2027') { onUnlock(); }
    else { setError(true); setPin(''); setTimeout(() => setError(false), 1500); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#1A1A1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Sans', 'Space Mono', sans-serif", zIndex: 9999
    }}>
      <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 32 }}>
          <img src="/logo.svg" alt="CourierX" style={{ height: 48, filter: 'brightness(0) invert(1)', marginBottom: 16 }} />
          <p style={{ color: '#888', fontSize: 14, fontFamily: "'Space Mono', monospace" }}>ENTER ACCESS PIN</p>
        </div>
        <input
          ref={inputRef}
          type="password"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          style={{
            width: 200, padding: '16px 24px', fontSize: 32, textAlign: 'center',
            background: '#111', border: error ? '2px solid #E63327' : '2px solid #333',
            borderRadius: 12, color: '#fff', fontFamily: "'Space Mono', monospace",
            letterSpacing: 16, outline: 'none', transition: 'border-color 0.3s'
          }}
        />
        {error && <p style={{ color: '#E63327', marginTop: 12, fontSize: 13 }}>Invalid PIN</p>}
        <div style={{ marginTop: 24 }}>
          <button type="submit" style={{
            padding: '12px 48px', background: '#E63327', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: 1
          }}>UNLOCK</button>
        </div>
      </form>
    </div>
  );
}

// ── Main Launch Animation ──────────────────────────────────────────────────
export default function LaunchPage() {
  const [unlocked, setUnlocked] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'countdown' | 'animation'>('countdown');
  const [countdown, setCountdown] = useState(5);
  const [act, setAct] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [skipVisible] = useState(true);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  // Skip handler
  const handleSkip = useCallback(() => {
    setAct(5);
    setElapsed(55);
  }, []);

  // Countdown
  useEffect(() => {
    if (!unlocked) return;
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('animation');
      startTimeRef.current = performance.now();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [unlocked, phase, countdown]);

  // Main animation loop
  useEffect(() => {
    if (phase !== 'animation') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const W = 1920, H = 1080;
    canvas.width = W;
    canvas.height = H;

    const startTime = performance.now();

    function draw(now: number) {
      if (!running || !ctx) return;
      const t = (now - startTime) / 1000; // seconds
      setElapsed(t);

      // Determine act
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
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [phase]);

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1A1A1A', overflow: 'hidden' }}>
      {/* Progress chip */}
      <div style={{
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(230,51,39,0.15)', border: '1px solid rgba(230,51,39,0.3)',
        borderRadius: 20, padding: '6px 20px', zIndex: 100,
        fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#E63327'
      }}>
        {act === 0 ? 'INITIALIZING' :
         act === 1 ? 'ACT 1 — COUNTDOWN ZERO' :
         act === 2 ? 'ACT 2 — WORLD MAP' :
         act === 3 ? 'ACT 3 — BOOKING FLOW' :
         act === 4 ? 'ACT 4 — SUCCESS' :
         'ACT 5 — REVEAL'}
      </div>

      {/* Skip button */}
      {skipVisible && act < 5 && (
        <button onClick={handleSkip} style={{
          position: 'absolute', bottom: 30, right: 30, zIndex: 100,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 8, padding: '8px 24px', color: '#aaa', fontSize: 13,
          cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif"
        }}>
          Skip →
        </button>
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
          }}>
            {String(countdown).padStart(2, '0')}
          </div>
          <p style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18, color: '#666',
            letterSpacing: 8, marginTop: 20
          }}>
            SOMETHING BIG IS COMING
          </p>
        </div>
      )}

      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%', height: '100%', objectFit: 'contain',
          opacity: phase === 'animation' ? 1 : 0,
          transition: 'opacity 0.5s'
        }}
      />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// DRAWING FUNCTIONS
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

// ── ACT 1: Countdown Zero + Shockwave ─────────────────────────────────────
function drawAct1(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // Dark background
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;

  // Timer display
  if (t < 1.5) {
    const scale = 1 + easeOutCubic(Math.min(t / 0.3, 1)) * 0.2;
    ctx.save();
    ctx.translate(cx, cy - 40);
    ctx.scale(scale, scale);
    ctx.font = "bold 100px 'Courier New', monospace";
    ctx.fillStyle = '#E63327';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(230,51,39,0.6)';
    ctx.shadowBlur = 40;
    ctx.fillText('00:00:00', 0, 0);
    ctx.restore();
  }

  // Shockwave pulse
  if (t > 0.3 && t < 2.5) {
    const st = (t - 0.3) / 2.2;
    const radius = easeOutCubic(st) * Math.max(W, H);
    const alpha = 1 - easeOutCubic(st);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(230,51,39,${alpha * 0.8})`;
    ctx.lineWidth = 4 - st * 3;
    ctx.stroke();

    // Second ring
    if (t > 0.6) {
      const st2 = (t - 0.6) / 2.2;
      const r2 = easeOutCubic(Math.min(st2, 1)) * Math.max(W, H) * 0.8;
      const a2 = 1 - easeOutCubic(Math.min(st2, 1));
      ctx.beginPath();
      ctx.arc(cx, cy, r2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(230,51,39,${a2 * 0.4})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // "SOMETHING BIG IS COMING" shatter effect
  if (t > 0.5 && t < 2.5) {
    const st = (t - 0.5) / 1.0;
    const text = 'SOMETHING BIG IS COMING';
    ctx.font = "bold 36px 'IBM Plex Sans', sans-serif";
    ctx.textAlign = 'center';

    if (st < 0.3) {
      // Appear
      const a = easeOutCubic(st / 0.3);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillText(text, cx, cy + 80);
    } else {
      // Shatter - letters fly apart
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
        const alpha = 1 - easeInCubic(Math.min(shatterT, 1));
        const rot = shatterT * angle * 2;

        ctx.save();
        ctx.translate(xOff + dx, cy + 80 + dy);
        ctx.rotate(rot);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillText(ch, 0, 0);
        ctx.restore();
        xOff += cw;
      }
    }
  }

  // Fade to black at end
  if (t > 2.2) {
    const fadeT = (t - 2.2) / 0.8;
    ctx.fillStyle = `rgba(26,26,26,${easeInCubic(Math.min(fadeT, 1))})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ── ACT 2: World Map + Plane Journey ──────────────────────────────────────
// Simplified world map continent outlines
const continentPaths: { points: [number, number][] }[] = [
  // Africa
  { points: [[0.48,0.35],[0.50,0.30],[0.54,0.28],[0.56,0.32],[0.58,0.38],[0.57,0.48],[0.55,0.58],[0.52,0.65],[0.48,0.62],[0.46,0.55],[0.45,0.45],[0.48,0.35]] },
  // Europe
  { points: [[0.46,0.18],[0.48,0.15],[0.52,0.13],[0.56,0.15],[0.58,0.18],[0.56,0.22],[0.54,0.26],[0.50,0.28],[0.48,0.26],[0.46,0.22],[0.46,0.18]] },
  // Asia
  { points: [[0.58,0.15],[0.65,0.12],[0.72,0.14],[0.78,0.18],[0.82,0.22],[0.80,0.30],[0.76,0.35],[0.72,0.38],[0.68,0.40],[0.64,0.38],[0.60,0.34],[0.58,0.28],[0.58,0.15]] },
  // India subcontinent
  { points: [[0.64,0.32],[0.66,0.30],[0.68,0.32],[0.69,0.36],[0.68,0.42],[0.66,0.46],[0.64,0.44],[0.63,0.38],[0.64,0.32]] },
  // North America
  { points: [[0.12,0.15],[0.18,0.12],[0.25,0.14],[0.30,0.18],[0.32,0.24],[0.28,0.30],[0.24,0.34],[0.20,0.36],[0.16,0.32],[0.12,0.26],[0.10,0.20],[0.12,0.15]] },
  // South America
  { points: [[0.24,0.42],[0.28,0.38],[0.32,0.42],[0.34,0.50],[0.32,0.58],[0.30,0.65],[0.28,0.72],[0.26,0.68],[0.24,0.60],[0.22,0.52],[0.24,0.42]] },
  // Australia
  { points: [[0.78,0.55],[0.82,0.52],[0.86,0.54],[0.88,0.58],[0.86,0.62],[0.82,0.64],[0.78,0.62],[0.76,0.58],[0.78,0.55]] },
];

// Flight path waypoints (normalized 0-1)
const flightPath: [number, number][] = [
  [0.66, 0.38], // India
  [0.58, 0.30], // Middle East
  [0.52, 0.20], // Europe
  [0.46, 0.18], // Western Europe
  [0.52, 0.22], // Back east
  [0.60, 0.30], // Middle East return
  [0.66, 0.38], // India return
];

const waypointLabels = ['Mumbai', 'Dubai', 'Frankfurt', 'London', 'Istanbul', 'Riyadh', 'Delhi'];

function drawAct2(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // t: 0 to 15 seconds
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, W, H);

  // Fade in
  const fadeIn = easeOutCubic(Math.min(t / 1.5, 1));

  // Grid overlay
  ctx.globalAlpha = fadeIn * 0.08;
  ctx.strokeStyle = '#E63327';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Draw continents
  ctx.globalAlpha = fadeIn;
  for (const continent of continentPaths) {
    ctx.beginPath();
    for (let i = 0; i < continent.points.length; i++) {
      const x = continent.points[i][0] * W;
      const y = continent.points[i][1] * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(230,51,39,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,51,39,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Plane animation (starts at t=1.5)
  if (t > 1.5) {
    const planeT = (t - 1.5) / 12; // 0 to 1 over 12 seconds
    const progress = easeInOutCubic(Math.min(planeT, 1));

    // Get position along path
    const totalSegments = flightPath.length - 1;
    const segFloat = progress * totalSegments;
    const segIdx = Math.min(Math.floor(segFloat), totalSegments - 1);
    const segT = segFloat - segIdx;

    const p0 = flightPath[segIdx];
    const p1 = flightPath[Math.min(segIdx + 1, flightPath.length - 1)];

    // Curved interpolation with control point
    const midX = (p0[0] + p1[0]) / 2;
    const midY = (p0[1] + p1[1]) / 2 - 0.05; // arc upward
    const st = easeInOutCubic(segT);
    const px = (1 - st) * (1 - st) * p0[0] + 2 * (1 - st) * st * midX + st * st * p1[0];
    const py = (1 - st) * (1 - st) * p0[1] + 2 * (1 - st) * st * midY + st * st * p1[1];

    const planeX = px * W;
    const planeY = py * H;

    // Motion trail
    ctx.beginPath();
    let trailStart = Math.max(0, progress - 0.15);
    for (let i = 0; i <= 30; i++) {
      const tp = lerp(trailStart, progress, i / 30);
      const sf = tp * totalSegments;
      const si = Math.min(Math.floor(sf), totalSegments - 1);
      const sst = sf - si;
      const sp0 = flightPath[si];
      const sp1 = flightPath[Math.min(si + 1, flightPath.length - 1)];
      const smx = (sp0[0] + sp1[0]) / 2;
      const smy = (sp0[1] + sp1[1]) / 2 - 0.05;
      const est = easeInOutCubic(sst);
      const tx = ((1 - est) * (1 - est) * sp0[0] + 2 * (1 - est) * est * smx + est * est * sp1[0]) * W;
      const ty = ((1 - est) * (1 - est) * sp0[1] + 2 * (1 - est) * est * smy + est * est * sp1[1]) * H;
      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    const grad = ctx.createLinearGradient(planeX - 100, planeY, planeX, planeY);
    grad.addColorStop(0, 'rgba(230,51,39,0)');
    grad.addColorStop(1, 'rgba(230,51,39,0.8)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Calculate heading for rotation
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const angle = Math.atan2(dy, dx);

    // Plane emoji
    ctx.save();
    ctx.translate(planeX, planeY);
    ctx.rotate(angle);
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(230,51,39,0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText('✈️', 0, 0);
    ctx.restore();

    // Waypoint pin drops
    for (let i = 0; i <= segIdx; i++) {
      const wp = flightPath[i];
      const wpx = wp[0] * W;
      const wpy = wp[1] * H;
      const pinAge = t - 1.5 - (i / totalSegments) * 12;
      if (pinAge > 0) {
        const pinScale = easeOutCubic(Math.min(pinAge / 0.5, 1));
        ctx.save();
        ctx.translate(wpx, wpy);
        ctx.scale(pinScale, pinScale);

        // Pin
        ctx.beginPath();
        ctx.arc(0, -8, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#E63327';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(0, 6);
        ctx.lineTo(4, -4);
        ctx.fillStyle = '#E63327';
        ctx.fill();

        // Label
        ctx.font = "11px 'IBM Plex Sans', sans-serif";
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(waypointLabels[i], 0, 20);

        // Pulse ring
        const pulseR = 10 + (pinAge % 2) * 15;
        const pulseA = 1 - (pinAge % 2) / 2;
        ctx.beginPath();
        ctx.arc(0, -8, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(230,51,39,${pulseA * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }
    }
  }

  ctx.globalAlpha = 1;
}


// ── ACT 3: Form Simulation ────────────────────────────────────────────────
interface FormPanel {
  title: string;
  fields: { label: string; value: string; type: 'click' | 'type' | 'select' | 'button'; hint?: string }[];
  duration: number; // seconds for this panel
}

const formPanels: FormPanel[] = [
  {
    title: 'Ship Now',
    fields: [
      { label: 'Domestic Shipping', value: '', type: 'click' },
    ],
    duration: 3,
  },
  {
    title: 'Shipment Details',
    fields: [
      { label: 'Type', value: 'Document', type: 'select' },
      { label: 'Pickup Pincode', value: '753001', type: 'type', hint: '📍 Cuttack, Odisha' },
      { label: 'Delivery Pincode', value: '603203', type: 'type', hint: '📍 Kanchipuram, Tamil Nadu' },
      { label: 'Weight', value: 'Up to 1 kg', type: 'select' },
      { label: 'Declared Value (₹)', value: '25', type: 'type' },
      { label: 'Dimensions (cm)', value: '12 × 1 × 1', type: 'type' },
      { label: 'Calculate Rates', value: '', type: 'button' },
    ],
    duration: 10,
  },
  {
    title: 'Available Rates',
    fields: [
      { label: 'Xpressbees Air', value: '₹1,007', type: 'click' },
      { label: 'DTDC Surface', value: '₹856', type: 'click' },
      { label: 'BlueDart Express', value: '₹1,245', type: 'click' },
    ],
    duration: 4,
  },
  {
    title: 'Sender & Receiver',
    fields: [
      { label: 'Full Name', value: 'Jagannath', type: 'type' },
      { label: 'Phone', value: '9078241990', type: 'type' },
      { label: 'Address', value: 'Dargha Bazar, Cuttack', type: 'type' },
      { label: 'Pincode', value: '753001', type: 'type' },
      { label: 'City', value: 'Cuttack', type: 'type' },
    ],
    duration: 6,
  },
  {
    title: 'Booking Summary & Payment',
    fields: [
      { label: 'ID Verification', value: 'Aadhaar Card', type: 'click' },
      { label: 'Coupon Code', value: 'LAUNCH52', type: 'type' },
      { label: 'Pay Now', value: '', type: 'button' },
    ],
    duration: 4,
  },
];

function drawAct3(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // t: 0 to 27 seconds
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, W, H);

  // Determine which panel we're on
  let panelIdx = 0;
  let panelT = t;
  let cumTime = 0;
  for (let i = 0; i < formPanels.length; i++) {
    if (panelT < formPanels[i].duration) { panelIdx = i; break; }
    panelT -= formPanels[i].duration;
    cumTime += formPanels[i].duration;
    if (i === formPanels.length - 1) { panelIdx = i; panelT = formPanels[i].duration; }
  }

  const panel = formPanels[panelIdx];
  const panelProgress = panelT / panel.duration;

  // Panel card
  const cardW = 600, cardH = Math.min(500, 120 + panel.fields.length * 60);
  const cardX = (W - cardW) / 2;
  const cardY = (H - cardH) / 2;

  // Slide in animation
  const slideIn = easeOutCubic(Math.min(panelT / 0.5, 1));
  const offsetY = (1 - slideIn) * 60;
  const cardAlpha = slideIn;

  ctx.globalAlpha = cardAlpha;
  ctx.save();
  ctx.translate(0, offsetY);

  // Card background
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();

  // Card shadow
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Step indicator
  ctx.font = "bold 11px 'Space Mono', monospace";
  ctx.fillStyle = '#E63327';
  ctx.textAlign = 'left';
  ctx.fillText(`STEP ${panelIdx + 1} OF ${formPanels.length}`, cardX + 30, cardY + 35);

  // Title
  ctx.font = "bold 22px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#1A1A1A';
  ctx.fillText(panel.title, cardX + 30, cardY + 65);

  // Fields
  const fieldStartY = cardY + 95;
  const fieldH = 52;

  for (let i = 0; i < panel.fields.length; i++) {
    const field = panel.fields[i];
    const fy = fieldStartY + i * fieldH;
    const fieldProgress = Math.max(0, (panelProgress * panel.fields.length - i) / 1);
    const fp = Math.min(fieldProgress, 1);

    if (fp <= 0) continue;

    if (field.type === 'button') {
      // Button
      const btnW = 200, btnH = 40;
      const btnX = cardX + 30;
      const btnY = fy;
      const btnAlpha = easeOutCubic(fp);
      ctx.globalAlpha = cardAlpha * btnAlpha;

      // Glow on click
      const isClicked = fp > 0.7;
      if (isClicked) {
        ctx.shadowColor = 'rgba(230,51,39,0.5)';
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = '#E63327';
      roundRect(ctx, btnX, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      ctx.font = "bold 14px 'IBM Plex Sans', sans-serif";
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(field.label, btnX + btnW / 2, btnY + 25);
      ctx.textAlign = 'left';
      ctx.globalAlpha = cardAlpha;
    } else if (field.type === 'click') {
      // Clickable card
      const isSelected = fp > 0.5;
      ctx.fillStyle = isSelected ? 'rgba(230,51,39,0.08)' : '#F8F8F8';
      ctx.strokeStyle = isSelected ? '#E63327' : '#E0E0E0';
      ctx.lineWidth = isSelected ? 2 : 1;
      roundRect(ctx, cardX + 30, fy, cardW - 60, 40, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = "600 14px 'IBM Plex Sans', sans-serif";
      ctx.fillStyle = isSelected ? '#E63327' : '#333';
      ctx.fillText(field.label + (field.value ? ` — ${field.value}` : ''), cardX + 50, fy + 25);
    } else {
      // Input field
      ctx.font = "500 11px 'IBM Plex Sans', sans-serif";
      ctx.fillStyle = '#888';
      ctx.fillText(field.label, cardX + 30, fy + 12);

      // Input box
      ctx.fillStyle = '#F5F5F5';
      ctx.strokeStyle = fp > 0.3 && fp < 0.9 ? '#E63327' : '#E0E0E0';
      ctx.lineWidth = fp > 0.3 && fp < 0.9 ? 2 : 1;
      roundRect(ctx, cardX + 30, fy + 16, cardW - 60, 30, 6);
      ctx.fill();
      ctx.stroke();

      // Typed text (character by character)
      const typingProgress = Math.max(0, (fp - 0.2) / 0.6);
      const charsToShow = Math.floor(typingProgress * field.value.length);
      const displayText = field.value.substring(0, charsToShow);

      ctx.font = "14px 'Space Mono', monospace";
      ctx.fillStyle = '#1A1A1A';
      ctx.fillText(displayText, cardX + 40, fy + 36);

      // Typing cursor blink
      if (fp > 0.2 && fp < 0.9) {
        const cursorX = cardX + 40 + ctx.measureText(displayText).width + 2;
        if (Math.floor(t * 3) % 2 === 0) {
          ctx.fillStyle = '#E63327';
          ctx.fillRect(cursorX, fy + 22, 2, 18);
        }
      }

      // Hint text
      if (field.hint && charsToShow >= field.value.length) {
        ctx.font = "12px 'IBM Plex Sans', sans-serif";
        ctx.fillStyle = '#4CAF50';
        ctx.fillText(field.hint, cardX + 40, fy + 56);
      }
    }
  }

  // Red cursor dot
  const cursorFieldIdx = Math.min(Math.floor(panelProgress * panel.fields.length), panel.fields.length - 1);
  const cursorTargetY = fieldStartY + cursorFieldIdx * fieldH + 20;
  const cursorTargetX = cardX + cardW - 50;
  const isClicking = (panelProgress * panel.fields.length) % 1 > 0.4 && (panelProgress * panel.fields.length) % 1 < 0.6;
  const cursorScale = isClicking ? 1.4 : 1;

  ctx.beginPath();
  ctx.arc(cursorTargetX, cursorTargetY, 8 * cursorScale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(230,51,39,0.9)';
  ctx.fill();

  // Cursor ring
  ctx.beginPath();
  ctx.arc(cursorTargetX, cursorTargetY, 14 * cursorScale, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(230,51,39,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ── ACT 4: Success + Plane Morph ──────────────────────────────────────────
function drawAct4(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // t: 0 to 10 seconds
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;

  // Red success flash (0-1.5s)
  if (t < 1.5) {
    const flashT = t / 1.5;
    const alpha = flashT < 0.3 ? easeOutCubic(flashT / 0.3) : 1 - easeOutCubic((flashT - 0.3) / 0.7);
    ctx.fillStyle = `rgba(230,51,39,${alpha * 0.6})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Confetti (0.5-4s)
  if (t > 0.5 && t < 4) {
    const confettiT = t - 0.5;
    for (let i = 0; i < 80; i++) {
      const seed = i * 137.508;
      const x = (Math.sin(seed) * 0.5 + 0.5) * W;
      const startY = -20;
      const speed = 100 + (i % 5) * 60;
      const y = startY + confettiT * speed;
      const size = 4 + (i % 3) * 3;
      const rot = confettiT * (2 + i % 4);

      if (y > H + 20) continue;
      const alpha = Math.min(1, 1 - (confettiT - 2.5) / 1);
      if (alpha <= 0) continue;

      ctx.save();
      ctx.translate(x + Math.sin(confettiT * 3 + i) * 30, y);
      ctx.rotate(rot);
      ctx.globalAlpha = Math.max(0, alpha);

      const colors = ['#E63327', '#FFFFFF', '#FFD700', '#E63327', '#FFF'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // "BOOKING CONFIRMED" text (1-3s)
  if (t > 1 && t < 3.5) {
    const textT = (t - 1) / 2.5;
    const alpha = textT < 0.3 ? easeOutCubic(textT / 0.3) : textT > 0.8 ? 1 - easeOutCubic((textT - 0.8) / 0.2) : 1;
    ctx.globalAlpha = alpha;
    ctx.font = "bold 48px 'IBM Plex Sans', sans-serif";
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('✅ BOOKING CONFIRMED', cx, cy - 20);

    ctx.font = "18px 'Space Mono', monospace";
    ctx.fillStyle = '#E63327';
    ctx.fillText('AWB: CX-2027-LAUNCH-001', cx, cy + 30);
    ctx.globalAlpha = 1;
  }

  // Plane spin + morph (3.5-10s)
  if (t > 3.5) {
    const morphT = (t - 3.5) / 6.5;

    // Plane grows from center, spins, then shrinks to top-left
    const spinPhase = Math.min(morphT / 0.4, 1); // 0-40%: grow + spin
    const movePhase = Math.max(0, (morphT - 0.4) / 0.6); // 40-100%: move to logo position

    const planeSize = spinPhase < 1
      ? lerp(20, 80, easeOutCubic(spinPhase))
      : lerp(80, 16, easeInOutCubic(movePhase));

    const planeX = spinPhase < 1
      ? cx
      : lerp(cx, 120, easeInOutCubic(movePhase));

    const planeY = spinPhase < 1
      ? cy
      : lerp(cy, 60, easeInOutCubic(movePhase));

    const rotation = spinPhase < 1
      ? easeOutCubic(spinPhase) * Math.PI * 2
      : Math.PI * 2;

    ctx.save();
    ctx.translate(planeX, planeY);
    ctx.rotate(rotation);

    // Glow trail
    ctx.shadowColor = 'rgba(230,51,39,0.6)';
    ctx.shadowBlur = 30;

    ctx.font = `${planeSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✈️', 0, 0);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.restore();

    // Landing page assembly (starts at morphT > 0.5)
    if (movePhase > 0.3) {
      const assembleT = (movePhase - 0.3) / 0.7;
      drawLandingPageAssembly(ctx, W, H, assembleT);
    }
  }
}

// ── Landing Page Assembly Helper ──────────────────────────────────────────
function drawLandingPageAssembly(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // Navbar slide in from top
  const navT = easeOutCubic(Math.min(t / 0.3, 1));
  const navY = lerp(-60, 0, navT);
  ctx.fillStyle = 'rgba(250,250,248,0.95)';
  ctx.fillRect(0, navY, W, 60);
  ctx.fillStyle = '#1A1A1A';
  ctx.font = "bold 20px 'IBM Plex Sans', sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText('CourierX', 140, navY + 37);

  // Nav links
  const links = ['Track', 'Calculate', 'About', 'Contact'];
  ctx.font = "14px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#666';
  for (let i = 0; i < links.length; i++) {
    ctx.fillText(links[i], W / 2 - 150 + i * 100, navY + 37);
  }

  // Ship Now button in nav
  ctx.fillStyle = '#E63327';
  roundRect(ctx, W - 200, navY + 15, 120, 32, 8);
  ctx.fill();
  ctx.font = "bold 13px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.fillText('Ship Now', W - 140, navY + 36);
  ctx.textAlign = 'left';

  // Hero section
  if (t > 0.2) {
    const heroT = easeOutCubic(Math.min((t - 0.2) / 0.4, 1));
    const heroAlpha = heroT;
    ctx.globalAlpha = heroAlpha;

    // Hero headline - typewriter effect
    const headline = 'India\'s Only Person to Person Courier Booking Platform';
    const charsToShow = Math.floor(heroT * headline.length);
    ctx.font = "bold 42px 'IBM Plex Sans', sans-serif";
    ctx.fillStyle = '#1A1A1A';

    // Word wrap
    const maxW = W * 0.4;
    const words = headline.substring(0, charsToShow).split(' ');
    let line = '';
    let lineY = 200;
    for (const word of words) {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > maxW && line) {
        ctx.fillText(line.trim(), 100, lineY);
        line = word + ' ';
        lineY += 52;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), 100, lineY);

    // Subtext
    if (heroT > 0.5) {
      ctx.font = "16px 'IBM Plex Sans', sans-serif";
      ctx.fillStyle = '#666';
      ctx.fillText('Send medicines, documents & gifts — across India and to 150+ countries', 100, lineY + 50);
    }

    ctx.globalAlpha = 1;
  }

  // Booking mockup card slides in from right
  if (t > 0.4) {
    const cardT = easeOutCubic(Math.min((t - 0.4) / 0.4, 1));
    const cardX = lerp(W + 100, W - 500, cardT);

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    roundRect(ctx, cardX, 160, 400, 350, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Card content
    ctx.font = "bold 18px 'IBM Plex Sans', sans-serif";
    ctx.fillStyle = '#1A1A1A';
    ctx.fillText('Quick Ship', cardX + 30, 200);

    // Mini form fields
    const miniFields = ['From', 'To', 'Weight', 'Type'];
    for (let i = 0; i < miniFields.length; i++) {
      const fy = 220 + i * 55;
      ctx.font = "11px 'IBM Plex Sans', sans-serif";
      ctx.fillStyle = '#999';
      ctx.fillText(miniFields[i], cardX + 30, fy);
      ctx.fillStyle = '#F0F0F0';
      roundRect(ctx, cardX + 30, fy + 5, 340, 32, 6);
      ctx.fill();
    }

    // Get Rates button
    ctx.fillStyle = '#E63327';
    roundRect(ctx, cardX + 30, 450, 340, 40, 8);
    ctx.fill();
    ctx.font = "bold 14px 'IBM Plex Sans', sans-serif";
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'center';
    ctx.fillText('Get Rates →', cardX + 200, 475);
    ctx.textAlign = 'left';
  }
}

// ── ACT 5: Landing Page Reveal ────────────────────────────────────────────
function drawAct5(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // t: 0 to 5 seconds
  // Full landing page snaps into place
  ctx.fillStyle = '#FAFAF8';
  ctx.fillRect(0, 0, W, H);

  // Full navbar
  ctx.fillStyle = 'rgba(250,250,248,0.98)';
  ctx.fillRect(0, 0, W, 60);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 60);
  ctx.lineTo(W, 60);
  ctx.stroke();

  // Logo area
  ctx.font = "bold 22px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#1A1A1A';
  ctx.textAlign = 'left';
  ctx.fillText('✈️ CourierX', 80, 38);

  // Nav links
  const links = ['Track', 'Calculate', 'About', 'Contact'];
  ctx.font = "14px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#666';
  for (let i = 0; i < links.length; i++) {
    ctx.fillText(links[i], W / 2 - 150 + i * 100, 38);
  }

  // Sign In + Open Account
  ctx.font = "14px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#666';
  ctx.textAlign = 'right';
  ctx.fillText('Sign In', W - 240, 38);

  ctx.fillStyle = '#E63327';
  roundRect(ctx, W - 210, 16, 140, 32, 8);
  ctx.fill();
  ctx.font = "bold 12px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.fillText('Ship Now — Save 52%', W - 140, 37);
  ctx.textAlign = 'left';

  // Hero section
  ctx.font = "bold 48px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#1A1A1A';
  const heroLines = ["India's Only", "Person to Person", "Courier Booking"];
  for (let i = 0; i < heroLines.length; i++) {
    ctx.fillText(heroLines[i], 100, 180 + i * 58);
  }

  // Subtext
  ctx.font = "17px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#666';
  ctx.fillText('Send medicines, documents & gifts — across India and 150+ countries.', 100, 380);
  ctx.fillText('Doorstep pickup. Real-time tracking. Best rates guaranteed.', 100, 405);

  // Ship Now button with pulse
  const pulseScale = t > 0.5 && t < 1.5 ? 1 + Math.sin((t - 0.5) * Math.PI * 4) * 0.05 : 1;
  ctx.save();
  ctx.translate(170, 460);
  ctx.scale(pulseScale, pulseScale);
  ctx.fillStyle = '#E63327';
  if (t > 0.5 && t < 1.5) {
    ctx.shadowColor = 'rgba(230,51,39,0.4)';
    ctx.shadowBlur = 20;
  }
  roundRect(ctx, -70, -20, 140, 44, 10);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.font = "bold 15px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.fillText('Ship Now →', 0, 4);
  ctx.restore();
  ctx.textAlign = 'left';

  // Booking mockup card on right
  const cardX = W - 480;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, cardX, 120, 400, 380, 16);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.font = "bold 18px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#1A1A1A';
  ctx.fillText('Quick Ship', cardX + 30, 160);

  const miniFields = ['From Pincode', 'To Pincode', 'Weight', 'Shipment Type'];
  for (let i = 0; i < miniFields.length; i++) {
    const fy = 180 + i * 55;
    ctx.font = "11px 'IBM Plex Sans', sans-serif";
    ctx.fillStyle = '#999';
    ctx.fillText(miniFields[i], cardX + 30, fy);
    ctx.fillStyle = '#F5F5F5';
    roundRect(ctx, cardX + 30, fy + 6, 340, 32, 6);
    ctx.fill();
    ctx.strokeStyle = '#E8E8E8';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.fillStyle = '#E63327';
  roundRect(ctx, cardX + 30, 410, 340, 42, 8);
  ctx.fill();
  ctx.font = "bold 14px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.fillText('Get Instant Rates →', cardX + 200, 436);
  ctx.textAlign = 'left';

  // Carrier logos fade up sequentially
  const carriers = ['DHL', 'FedEx', 'Aramex', 'BlueDart', 'DTDC', 'ShipGlobal'];
  const carrierY = H - 100;
  ctx.font = "bold 20px 'IBM Plex Sans', sans-serif";

  for (let i = 0; i < carriers.length; i++) {
    const delay = 1.5 + i * 0.25;
    const alpha = t > delay ? easeOutCubic(Math.min((t - delay) / 0.5, 1)) : 0;
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = '#1A1A1A';
    ctx.fillText(carriers[i], 100 + i * 150, carrierY);
  }
  ctx.globalAlpha = 1;

  // Carrier section label
  if (t > 1.2) {
    const labelAlpha = easeOutCubic(Math.min((t - 1.2) / 0.5, 1));
    ctx.globalAlpha = labelAlpha;
    ctx.font = "11px 'IBM Plex Sans', sans-serif";
    ctx.fillStyle = '#999';
    ctx.fillText('TRUSTED CARRIER PARTNERS — DOMESTIC & INTERNATIONAL', 100, carrierY - 30);
    ctx.globalAlpha = 1;
  }

  // Tagline: "Now Live — Ship Anywhere."
  if (t > 3) {
    const tagAlpha = easeOutCubic(Math.min((t - 3) / 1, 1));
    ctx.globalAlpha = tagAlpha;
    ctx.font = "bold 16px 'Space Mono', monospace";
    ctx.fillStyle = '#E63327';
    ctx.textAlign = 'center';
    ctx.fillText('Now Live — Ship Anywhere.', W / 2, H - 30);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

// ── Utility: Rounded Rectangle ────────────────────────────────────────────
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
