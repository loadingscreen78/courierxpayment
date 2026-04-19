"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, X, Info, Cube } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface DimensionAssistantProps {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

const COMMON_SIZES = [
  { label: 'Envelope / Documents', l: 32, w: 23, h: 2, icon: '📄' },
  { label: 'Shoebox Size', l: 33, w: 20, h: 12, icon: '👟' },
  { label: 'Small Parcel', l: 25, w: 20, h: 15, icon: '📦' },
  { label: 'Medium Box', l: 40, w: 30, h: 20, icon: '📦' },
  { label: 'Large Box', l: 50, w: 40, h: 30, icon: '📦' },
];

export function DimensionAssistant({ lengthCm, widthCm, heightCm }: DimensionAssistantProps) {
  const [open, setOpen] = useState(false);

  // Normalize dimensions for the 3D box visualization (max 100px)
  const maxDim = Math.max(lengthCm || 30, widthCm || 20, heightCm || 15, 1);
  const scale = 80 / maxDim;
  const boxW = Math.max((widthCm || 20) * scale, 20);
  const boxH = Math.max((heightCm || 15) * scale, 15);
  const boxD = Math.max((lengthCm || 30) * scale * 0.5, 10);

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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                    <Ruler className="h-4 w-4 text-blue-600" weight="bold" />
                  </div>
                  <h3 className="font-semibold text-base">How to Measure Your Package</h3>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* 3D Box Visualization */}
                <div className="flex justify-center py-4">
                  <div className="relative" style={{ width: 200, height: 160 }}>
                    {/* Isometric box */}
                    <svg viewBox="0 0 200 160" className="w-full h-full">
                      {/* Back face */}
                      <motion.polygon
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        points={`${100 - boxW / 2},${80 - boxH} ${100 + boxW / 2},${80 - boxH} ${100 + boxW / 2 + boxD},${80 - boxH - boxD * 0.6} ${100 - boxW / 2 + boxD},${80 - boxH - boxD * 0.6}`}
                        fill="hsl(var(--muted))"
                        stroke="hsl(var(--border))"
                        strokeWidth="1.5"
                      />
                      {/* Left face */}
                      <motion.polygon
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        points={`${100 - boxW / 2},${80} ${100 - boxW / 2},${80 - boxH} ${100 - boxW / 2 + boxD},${80 - boxH - boxD * 0.6} ${100 - boxW / 2 + boxD},${80 - boxD * 0.6}`}
                        fill="hsl(210 40% 94%)"
                        stroke="hsl(210 40% 70%)"
                        strokeWidth="1.5"
                      />
                      {/* Front face */}
                      <motion.polygon
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        points={`${100 - boxW / 2},${80} ${100 + boxW / 2},${80} ${100 + boxW / 2},${80 - boxH} ${100 - boxW / 2},${80 - boxH}`}
                        fill="hsl(210 40% 98%)"
                        stroke="hsl(210 40% 70%)"
                        strokeWidth="1.5"
                      />
                      {/* Top face */}
                      <motion.polygon
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        points={`${100 - boxW / 2},${80 - boxH} ${100 + boxW / 2},${80 - boxH} ${100 + boxW / 2 + boxD},${80 - boxH - boxD * 0.6} ${100 - boxW / 2 + boxD},${80 - boxH - boxD * 0.6}`}
                        fill="hsl(210 40% 90%)"
                        stroke="hsl(210 40% 70%)"
                        strokeWidth="1.5"
                      />
                      {/* Right face */}
                      <motion.polygon
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 }}
                        points={`${100 + boxW / 2},${80} ${100 + boxW / 2},${80 - boxH} ${100 + boxW / 2 + boxD},${80 - boxH - boxD * 0.6} ${100 + boxW / 2 + boxD},${80 - boxD * 0.6}`}
                        fill="hsl(210 40% 88%)"
                        stroke="hsl(210 40% 70%)"
                        strokeWidth="1.5"
                      />

                      {/* Dimension labels */}
                      {/* Width (bottom) */}
                      <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                        <line x1={100 - boxW / 2} y1="90" x2={100 + boxW / 2} y2="90" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arrowBlue)" markerStart="url(#arrowBlueStart)" />
                        <text x="100" y="105" textAnchor="middle" className="text-[11px] font-semibold" fill="#3b82f6">Width {widthCm || '?'} cm</text>
                      </motion.g>
                      {/* Height (left) */}
                      <motion.g initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                        <line x1={100 - boxW / 2 - 12} y1="80" x2={100 - boxW / 2 - 12} y2={80 - boxH} stroke="#ef4444" strokeWidth="1.5" />
                        <text x={100 - boxW / 2 - 16} y={80 - boxH / 2} textAnchor="end" className="text-[11px] font-semibold" fill="#ef4444">Height {heightCm || '?'} cm</text>
                      </motion.g>
                      {/* Length (top-right) */}
                      <motion.g initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
                        <text x={100 + boxW / 2 + boxD / 2 + 5} y={80 - boxH - boxD * 0.3 - 5} textAnchor="start" className="text-[11px] font-semibold" fill="#22c55e">Length {lengthCm || '?'} cm</text>
                      </motion.g>

                      <defs>
                        <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#3b82f6" /></marker>
                        <marker id="arrowBlueStart" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto"><path d="M6,0 L0,3 L6,6" fill="#3b82f6" /></marker>
                      </defs>
                    </svg>
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-green-600">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Length (longest side)</p>
                      <p className="text-xs text-muted-foreground">Measure the longest edge of your packed box from end to end.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Width (second longest)</p>
                      <p className="text-xs text-muted-foreground">Measure the next longest edge perpendicular to the length.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-red-600">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Height (shortest side)</p>
                      <p className="text-xs text-muted-foreground">Measure the remaining edge — the depth/height of the box.</p>
                    </div>
                  </div>
                </div>

                {/* Volumetric weight info */}
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" weight="fill" />
                    <span>Couriers charge by the higher of actual weight or volumetric weight (L × W × H ÷ 5000). Accurate dimensions help you get the right rate.</span>
                  </p>
                </div>

                {/* Common sizes */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Common Package Sizes</p>
                  <div className="grid grid-cols-1 gap-1.5">
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
