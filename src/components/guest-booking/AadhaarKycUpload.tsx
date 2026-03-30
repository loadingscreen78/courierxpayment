"use client";

import { useRef, useCallback } from 'react';
import { IdentificationCard, Upload, X, CircleNotch, Warning, CheckCircle, ShieldCheck } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import type { AadhaarOcrResult } from '@/hooks/useAadhaarOcr';

interface AadhaarKycUploadProps {
  aadhaarFront: File | null;
  aadhaarBack: File | null;
  onFrontChange: (file: File | null) => void;
  onBackChange: (file: File | null) => void;
  ocrResult: AadhaarOcrResult | null;
  isProcessing: boolean;
  ocrError: string;
  onProcess: () => void;
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
        <ShieldCheck className="h-5 w-5 text-[#FF6B00]" weight="duotone" />
        <h4 className="font-semibold text-sm">Aadhaar Verification</h4>
      </div>

      {/* Instructions — validation focused, not extraction */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20 p-3 text-xs space-y-1">
        <p className="font-medium text-blue-900 dark:text-blue-200">Required for international shipment verification:</p>
        <ul className="list-disc list-inside text-blue-800 dark:text-blue-300 space-y-0.5">
          <li>Upload front and back of your Aadhaar card</li>
          <li>Ensure the document is clear and readable</li>
          <li>Your details will be validated for customs compliance</li>
          <li>Accepted: JPG, PNG, PDF — max 5MB each</li>
        </ul>
      </div>

      {/* Upload cards */}
      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Back Side</label>
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

      {/* Validate button */}
      {aadhaarFront && !ocrResult && !isProcessing && (
        <Button type="button" onClick={onProcess} className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white gap-2">
          <ShieldCheck className="h-4 w-4" weight="bold" />
          Validate Aadhaar
        </Button>
      )}

      {/* Processing */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <CircleNotch className="h-5 w-5 animate-spin text-[#FF6B00]" />
            <div>
              <p className="text-sm font-medium">Validating your Aadhaar...</p>
              <p className="text-xs text-muted-foreground">Verifying document for compliance</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {ocrError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
          <Warning className="h-4 w-4 text-destructive shrink-0 mt-0.5" weight="fill" />
          <div>
            <p className="text-destructive font-medium">Validation failed. Please enter details manually.</p>
            <p className="text-xs text-muted-foreground mt-0.5">You can fill in the fields below.</p>
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
            Sender must be 18 years or older to book an international shipment.
          </p>
        </motion.div>
      )}

      {/* Success — clean, no DOB, no confidence badge, no raw data */}
      <AnimatePresence>
        {ocrResult && !isUnderAge && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-lg border border-candlestick-green/30 bg-candlestick-green/5 px-4 py-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-candlestick-green shrink-0" weight="fill" />
            <div>
              <p className="text-sm font-medium text-candlestick-green">Aadhaar validated successfully</p>
              <p className="text-xs text-muted-foreground">Your details have been verified and filled below. Please review.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
