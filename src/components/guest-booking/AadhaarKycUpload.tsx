"use client";

import { useRef, useState, useCallback } from 'react';
import { IdentificationCard, Upload, X, CircleNotch, Warning, CheckCircle, ArrowClockwise, ShieldCheck } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import type { AadhaarOcrResult } from '@/hooks/useAadhaarOcr';

interface AadhaarKycUploadProps {
  /** Front file state */
  aadhaarFront: File | null;
  /** Back file state */
  aadhaarBack: File | null;
  /** Set front file */
  onFrontChange: (file: File | null) => void;
  /** Set back file */
  onBackChange: (file: File | null) => void;
  /** OCR result after processing */
  ocrResult: AadhaarOcrResult | null;
  /** Whether OCR is processing */
  isProcessing: boolean;
  /** OCR error message */
  ocrError: string;
  /** Trigger OCR processing */
  onProcess: () => void;
  /** Whether user is under 18 */
  isUnderAge: boolean;
}

const MAX_SIZE = 5 * 1024 * 1024;

export default function AadhaarKycUpload({
  aadhaarFront, aadhaarBack, onFrontChange, onBackChange,
  ocrResult, isProcessing, ocrError, onProcess, isUnderAge,
}: AadhaarKycUploadProps) {
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      alert('File must be under 5MB. Please compress or use a smaller image.');
      return;
    }
    if (side === 'front') onFrontChange(file);
    else onBackChange(file);
  }, [onFrontChange, onBackChange]);

  const removeFront = () => { onFrontChange(null); if (frontRef.current) frontRef.current.value = ''; };
  const removeBack = () => { onBackChange(null); if (backRef.current) backRef.current.value = ''; };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <IdentificationCard className="h-5 w-5 text-[#FF6B00]" weight="duotone" />
        <h4 className="font-semibold text-sm">Aadhaar Card Upload (KYC)</h4>
      </div>

      {/* Instructions */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs space-y-1">
        <p className="font-medium text-amber-900 dark:text-amber-200">Upload clear Aadhaar images for auto-fill:</p>
        <ul className="list-disc list-inside text-amber-800 dark:text-amber-300 space-y-0.5">
          <li>Place Aadhaar on a flat, well-lit surface</li>
          <li>All 4 corners must be visible — no glare or blur</li>
          <li>Name, address, and Aadhaar number must be readable</li>
          <li>Accepted: JPG, PNG, PDF — max 5MB each</li>
        </ul>
      </div>

      {/* Upload cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Front */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Front Side *</label>
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#FF6B00]/40 bg-[#FF6B00]/5 hover:bg-[#FF6B00]/10 p-4 cursor-pointer transition-colors relative">
            <input ref={frontRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => handleFile(e, 'front')} />
            {aadhaarFront ? (
              <div className="text-center">
                <IdentificationCard className="h-8 w-8 text-candlestick-green mx-auto" weight="duotone" />
                <p className="text-xs font-medium text-candlestick-green mt-1">Uploaded</p>
                <p className="text-xs text-muted-foreground truncate max-w-[120px]">{aadhaarFront.name}</p>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFront(); }} className="absolute top-2 right-2 p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive">
                  <X className="h-3 w-3" weight="bold" />
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-6 w-6 text-[#FF6B00] mx-auto" weight="duotone" />
                <p className="text-xs font-medium text-[#FF6B00]">Upload Front</p>
                <p className="text-[10px] text-muted-foreground">JPG, PNG or PDF</p>
              </div>
            )}
          </label>
        </div>

        {/* Back */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Back Side (Address)</label>
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#FF6B00]/40 bg-[#FF6B00]/5 hover:bg-[#FF6B00]/10 p-4 cursor-pointer transition-colors relative">
            <input ref={backRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => handleFile(e, 'back')} />
            {aadhaarBack ? (
              <div className="text-center">
                <IdentificationCard className="h-8 w-8 text-candlestick-green mx-auto" weight="duotone" />
                <p className="text-xs font-medium text-candlestick-green mt-1">Uploaded</p>
                <p className="text-xs text-muted-foreground truncate max-w-[120px]">{aadhaarBack.name}</p>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeBack(); }} className="absolute top-2 right-2 p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive">
                  <X className="h-3 w-3" weight="bold" />
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-6 w-6 text-[#FF6B00] mx-auto" weight="duotone" />
                <p className="text-xs font-medium text-[#FF6B00]">Upload Back</p>
                <p className="text-[10px] text-muted-foreground">JPG, PNG or PDF</p>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* Extract button */}
      {aadhaarFront && !ocrResult && !isProcessing && (
        <Button type="button" onClick={onProcess} className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white gap-2">
          <ShieldCheck className="h-4 w-4" weight="bold" />
          Extract & Verify Aadhaar Details
        </Button>
      )}

      {/* Processing spinner */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <CircleNotch className="h-5 w-5 animate-spin text-[#FF6B00]" />
            <div>
              <p className="text-sm font-medium">Extracting Aadhaar details...</p>
              <p className="text-xs text-muted-foreground">This may take 10-15 seconds</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {ocrError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
          <Warning className="h-4 w-4 text-destructive shrink-0 mt-0.5" weight="fill" />
          <div>
            <p className="text-destructive font-medium">{ocrError}</p>
            <p className="text-xs text-muted-foreground mt-0.5">You can enter details manually in the fields below.</p>
          </div>
        </div>
      )}

      {/* Under 18 block */}
      {isUnderAge && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30 text-center space-y-2">
          <Warning className="h-8 w-8 text-destructive mx-auto" weight="fill" />
          <p className="font-semibold text-destructive">Age Restriction</p>
          <p className="text-sm text-destructive/80">
            You must be 18 years or older to book a shipment. The Aadhaar indicates the sender is under 18.
          </p>
        </motion.div>
      )}

      {/* Success result preview */}
      <AnimatePresence>
        {ocrResult && !isUnderAge && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-lg border border-candlestick-green/30 bg-candlestick-green/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-candlestick-green" weight="fill" />
                <p className="text-sm font-semibold text-candlestick-green">Aadhaar Details Extracted</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                ocrResult.confidence === 'high' ? 'bg-candlestick-green/20 text-candlestick-green' :
                ocrResult.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {ocrResult.confidence} confidence
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {ocrResult.name && <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{ocrResult.name}</span></div>}
              {ocrResult.aadhaarNumber && <div><span className="text-muted-foreground">Aadhaar:</span> <span className="font-mono font-medium">XXXX XXXX {ocrResult.aadhaarNumber.slice(-4)}</span></div>}
              {ocrResult.dob && <div><span className="text-muted-foreground">DOB:</span> <span className="font-medium">{ocrResult.dob}</span></div>}
              {ocrResult.pincode && <div><span className="text-muted-foreground">Pincode:</span> <span className="font-medium">{ocrResult.pincode}</span></div>}
            </div>
            {ocrResult.warnings.length > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Warning className="h-3 w-3" weight="fill" />
                {ocrResult.warnings[0]} — please verify and correct below
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Fields below have been auto-filled. Please verify and correct if needed.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
