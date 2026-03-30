/**
 * Premium UX: Haptic feedback + sound utilities for mobile/tablet
 */

// ── Haptic Feedback ──────────────────────────────────────────────────────────

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

const VIBRATION_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20],
  error: [30, 50, 30, 50, 30],
  selection: 8,
};

export function haptic(pattern: HapticPattern = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(VIBRATION_PATTERNS[pattern]);
  } catch {
    // Silently fail — not all devices support vibration
  }
}

// ── Sound Effects ────────────────────────────────────────────────────────────

type SoundType = 'tap' | 'success' | 'error' | 'step' | 'select';

const audioCache = new Map<SoundType, AudioBuffer>();
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

// Generate tones programmatically — no external audio files needed
function generateTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  volume: number = 0.15,
  type: OscillatorType = 'sine',
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * (1 / duration) * 3); // Exponential decay
    let sample: number;
    switch (type) {
      case 'sine':
        sample = Math.sin(2 * Math.PI * frequency * t);
        break;
      case 'triangle':
        sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
        break;
      default:
        sample = Math.sin(2 * Math.PI * frequency * t);
    }
    data[i] = sample * envelope * volume;
  }
  return buffer;
}

const SOUND_CONFIGS: Record<SoundType, { freq: number; duration: number; volume: number; type: OscillatorType }> = {
  tap: { freq: 1200, duration: 0.06, volume: 0.08, type: 'sine' },
  success: { freq: 880, duration: 0.2, volume: 0.12, type: 'triangle' },
  error: { freq: 300, duration: 0.25, volume: 0.1, type: 'sine' },
  step: { freq: 660, duration: 0.1, volume: 0.1, type: 'triangle' },
  select: { freq: 1000, duration: 0.08, volume: 0.08, type: 'sine' },
};

export function playSound(sound: SoundType = 'tap') {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Resume context if suspended (required after user gesture on mobile)
    if (ctx.state === 'suspended') ctx.resume();

    const config = SOUND_CONFIGS[sound];
    let buffer = audioCache.get(sound);
    if (!buffer) {
      buffer = generateTone(ctx, config.freq, config.duration, config.volume, config.type);
      audioCache.set(sound, buffer);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  } catch {
    // Silently fail
  }
}

// ── Combined feedback ────────────────────────────────────────────────────────

export function feedback(hapticPattern: HapticPattern = 'light', sound: SoundType = 'tap') {
  haptic(hapticPattern);
  playSound(sound);
}

// Convenience presets
export const feedbackPresets = {
  tap: () => feedback('light', 'tap'),
  stepChange: () => feedback('medium', 'step'),
  select: () => feedback('selection', 'select'),
  success: () => feedback('success', 'success'),
  error: () => feedback('error', 'error'),
} as const;
