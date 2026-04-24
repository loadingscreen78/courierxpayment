"use client";

import { useRef, useCallback, useState, useEffect } from 'react';
import { Upload, X, ShieldCheck, Camera, Eye, Warning } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraCapture } from '@/components/ui/CameraCapture';

interface AadhaarKycUploadProps {
  aadhaarFront: File | null;
  aadhaarBack: File | null;
  onFrontChange: (file: File | null) => void;
  onBackChange: (file: File | null) => void;
}

const MAX_SIZE = 5 * 1024 * 1024;

// ── Upload Card ──────────────────────────────────────────────────────────────

function UploadCard({ label, file, inputRef, onFileChange, onRemove, onPreview, isMobile, onCameraClick }: {
  label: string; file: File | null; inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void; onPreview: () => void; isMobile: boolean; onCameraClick: () => void;
}) {
  const thumbUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {file ? (
        <div className="rounded-xl border border-candlestick-green/40 bg-candlestick-green/5 p-2 space-y-2">
          <div className="relative aspect-[1.6] rounded-lg overflow-hidden bg-muted">
            {thumbUrl && <img src={thumbUrl} alt={label} className="w-full h-full object-cover" />}
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={onPreview} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors">
              <Eye className="h-3.5 w-3.5" weight="duotone" /> View
            </button>
            <button type="button" onClick={(e) => { e.preventDefault(); onRemove(); }} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
              <X className="h-3.5 w-3.5" weight="bold" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#FF6B00]/40 bg-[#FF6B00]/5 hover:bg-[#FF6B00]/10 p-4 cursor-pointer transition-colors">
            <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onFileChange} />
            <Upload className="h-6 w-6 text-[#FF6B00]" weight="duotone" />
            <p className="text-xs font-medium text-[#FF6B00]">Upload Image</p>
            <p className="text-[10px] text-muted-foreground">JPEG or PNG only</p>
          </label>
          {isMobile && (
            <button type="button" onClick={onCameraClick} className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl border border-blue-300 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors">
              <Camera className="h-4 w-4" weight="duotone" /> Capture with Camera
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AadhaarKycUpload({
  aadhaarFront, aadhaarBack, onFrontChange, onBackChange,
}: AadhaarKycUploadProps) {
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState<'front' | 'back' | null>(null);

  useEffect(() => { setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)); }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) { alert('Only JPEG and PNG images are accepted.'); return; }
    if (file.size > MAX_SIZE) { alert('File must be under 5MB.'); return; }
    if (side === 'front') onFrontChange(file); else onBackChange(file);
  }, [onFrontChange, onBackChange]);

  const removeFront = () => { onFrontChange(null); if (frontRef.current) frontRef.current.value = ''; };
  const removeBack = () => { onBackChange(null); if (backRef.current) backRef.current.value = ''; };
  const openPreview = (file: File) => setPreviewUrl(URL.createObjectURL(file));
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#FF6B00]" weight="duotone" />
        <h4 className="font-semibold text-sm">Aadhaar Verification</h4>
      </div>
      <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs space-y-1">
        <p className="font-medium text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-600" weight="fill" />
          Aadhaar upload requirements
        </p>
        <ul className="list-disc list-inside text-amber-800 dark:text-amber-300 space-y-0.5">
          <li>Both front and back sides are mandatory</li>
          <li>Upload clear, well-lit images — JPEG or PNG, max 5 MB each</li>
          <li>Ensure all text, photo, and QR code are fully visible</li>
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <UploadCard label="Front Side *" file={aadhaarFront} inputRef={frontRef} onFileChange={(e) => handleFile(e, 'front')} onRemove={removeFront} onPreview={() => aadhaarFront && openPreview(aadhaarFront)} isMobile={isMobile} onCameraClick={() => setCameraOpen('front')} />
        <UploadCard label="Back Side *" file={aadhaarBack} inputRef={backRef} onFileChange={(e) => handleFile(e, 'back')} onRemove={removeBack} onPreview={() => aadhaarBack && openPreview(aadhaarBack)} isMobile={isMobile} onCameraClick={() => setCameraOpen('back')} />
      </div>
      {/* Image preview modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={closePreview}>
            <button onClick={closePreview} className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white z-10"><X className="h-6 w-6" weight="bold" /></button>
            <img src={previewUrl} alt="Aadhaar preview" className="max-w-full max-h-[85vh] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Mobile camera */}
      <CameraCapture
        open={cameraOpen !== null}
        onOpenChange={(open) => { if (!open) setCameraOpen(null); }}
        onCapture={(file) => {
          if (cameraOpen === 'front') onFrontChange(file);
          else if (cameraOpen === 'back') onBackChange(file);
          setCameraOpen(null);
        }}
        documentType={cameraOpen === 'front' ? 'aadhaar-front' : 'aadhaar-back'}
      />
    </div>
  );
}
