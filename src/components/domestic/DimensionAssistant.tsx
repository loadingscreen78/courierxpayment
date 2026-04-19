"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, X, Info } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface DimensionAssistantProps {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

const COMMON_SIZES = [
  { label: 'A4 Envelope', l: 32, w: 23, h: 1, icon: '📄', vol: 0.1 },
  { label: 'Shoebox', l: 33, w: 20, h: 12, icon: '👟', vol: 1.6 },
  { label: 'Small Parcel', l: 25, w: 20, h: 15, icon: '📦', vol: 1.5 },
  { label: 'Medium Box', l: 40, w: 30, h: 20, icon: '📦', vol: 4.8 },
  { label: 'Large Box', l: 50, w: 40, h: 30, icon: '📦', vol: 12.0 },
];

// Isometric 3D box — proper isometric projection
function IsoBox({ l, w, h }: { l: number; w: number; h: number }) {
  // Normalize to fit in 180×140 viewBox
  const maxDim = Math.max(l, w, h, 1);
  const scale = 55 / maxDim;
  const sw = w * scale;  // screen width (front face width)
  const sh = h * scale;  // screen height (front face height)
  const sd = l * scale * 0.5; // screen depth (isometric depth)

  // Isometric offsets: depth goes up-right at 30°
  const dx = sd * Math.cos(Math.PI / 6); // ≈ 0.866 * sd
  const dy = sd * Math.sin(Math.PI / 6); // ≈ 0.5 * sd

  // Anchor: bottom-left of front face
  const ox = 30;
  const oy = 110;

  // Front face corners (bottom-left origin)
  const fl = [ox, oy];
  const fr = [ox + sw, oy];
  const ftr = [ox + sw, oy - sh];
  const ftl = [ox, oy - sh];

  // Back face (shifted by depth)
  const bl = [ox + dx, oy - dy];
  const br = [ox + sw + dx, oy - dy];
  const btr = [ox + sw + dx, oy - sh - dy];
  const btl = [ox + dx, oy - sh - dy];

  const pts = (arr: number[][]) => arr.map(p => p.join(',')).join(' ');

  return (
    <svg viewBox="0 0 200 140" className="w-full h-full" style={{ overflow: 'visible' }}>
      <defs>
        <marker id="ah" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5" fill="#6b7280" strokeWidth="0" />
        </marker>
        <marker id="ahs" markerWidth="5" markerHeight="5" refX="1" refY="2.5" orient="auto">
          <path d="M5,0 L0,2.5 L5,5" fill="#6b7280" strokeWidth="0" />
        </marker>
      </defs>

      {/* Right face (depth) */}
      <motion.polygon
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        points={pts([fr, br, btr, ftr])}
        fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.2"
      />
      {/* Top face */}
      <motion.polygon
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        points={pts([ftl, ftr, btr, btl])}
        fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1.2"
      />
      {/* Front face */}
      <motion.polygon
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        points={pts([fl, fr, ftr, ftl])}
        fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.2"
      />

      {/* Width arrow — below front face */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <line x1={ox} y1={oy + 10} x2={ox + sw} y2={oy + 10} stroke="#3b82f6" strokeWidth="1.2" markerEnd="url(#ah)" markerStart="url(#ahs)" />
        <text x={ox + sw / 2} y={oy + 22} textAnchor="middle" fontSize="9" fontWeight="600" fill="#3b82f6">W {w || '?'} cm</text>
      </motion.g>

      {/* Height arrow — left of front face */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <line x1={ox - 10} y1={oy} x2={ox - 10} y2={oy - sh} stroke="#ef4444" strokeWidth="1.2" markerEnd="url(#ah)" markerStart="url(#ahs)" />
        <text x={ox - 14} y={oy - sh / 2} textAnchor="end" fontSize="9" fontWeight="600" fill="#ef4444">H {h || '?'} cm</text>
      </motion.g>

      {/* Length arrow — along top-right edge */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <line x1={ftr[0]} y1={ftr[1] - 8} x2={btr[0]} y2={btr[1] - 8} stroke="#16a34a" strokeWidth="1.2" markerEnd="url(#ah)" markerStart="url(#ahs)" />
        <text x={(ftr[0] + btr[0]) / 2 + 4} y={(ftr[1] + btr[1]) / 2 - 14} textAnchor="start" fontSize="9" fontWeight="600" fill="#16a34a">L {l || '?'} cm</text>
      </motion.g>

      {/* Tape lines on front face */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} opacity="0.4">
        <line x1={ox + sw / 2} y1={oy} x2={ox + sw / 2} y2={oy - sh} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2,2" />
        <line x1={ox} y1={oy - sh / 2} x2={ox + sw} y2={oy - sh / 2} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2,2" />
      </motion.g>
    </svg>
  );
}

export function DimensionAssistant({ lengthCm, widthCm, heightCm }: DimensionAssistantProps) {
  const [open, setOpen] = useState(false);

  const l = lengthCm || 30;
  const w = widthCm || 20;
  const h = heightCm || 15;
  const volWeight = ((l * w * h) / 5000).toFixed(2);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
      >
        <Ruler className="h-3.5 w-3.5" weight="bold" />
        How to measure
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                    <Ruler className="h-4 w-4 text-blue-600" weight="bold" />
                  </div>
                  <h3 className="font-semibold text-sm">How to Measure Your Package</h3>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* 3D Box */}
                <div className="bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/20 dark:to-slate-900/20 rounded-xl p-4">
                  <div style={{ height: 160 }}>
                    <IsoBox l={l} w={w} h={h} />
                  </div>
                  {(lengthCm || widthCm || heightCm) && (
                    <p className="text-center text-xs text-muted-foreground mt-1">
                      Volumetric weight: <span className="font-semibold text-foreground">{volWeight} kg</span>
                    </p>
                  )}
                </div>

                {/* Step-by-step */}
                <div className="space-y-3">
                  {[
                    { num: 1, color: 'green', label: 'Length', desc: 'The longest edge of your packed box — measure end to end.', example: 'e.g. 40 cm' },
                    { num: 2, color: 'blue', label: 'Width', desc: 'The second longest edge, perpendicular to the length.', example: 'e.g. 30 cm' },
                    { num: 3, color: 'red', label: 'Height', desc: 'The shortest edge — the depth or thickness of the box.', example: 'e.g. 20 cm' },
                  ].map(s => (
                    <div key={s.num} className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-${s.color}-100 dark:bg-${s.color}-950/40`}>
                        <span className={`text-xs font-bold text-${s.color}-600`}>{s.num}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.desc} <span className="text-muted-foreground/60">{s.example}</span></p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Volumetric weight tip */}
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" weight="fill" />
                    <span>Couriers charge by the higher of actual weight or volumetric weight (L × W × H ÷ 5000). Always measure your packed box, not the item inside.</span>
                  </p>
                </div>

                {/* Common sizes */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Common Package Sizes</p>
                  <div className="space-y-1.5">
                    {COMMON_SIZES.map(s => (
                      <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 text-xs">
                        <span className="flex items-center gap-2">
                          <span>{s.icon}</span>
                          <span className="font-medium">{s.label}</span>
                        </span>
                        <span className="text-muted-foreground">{s.l} × {s.w} × {s.h} cm</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
