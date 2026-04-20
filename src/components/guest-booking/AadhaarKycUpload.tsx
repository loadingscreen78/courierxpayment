"use client";

import { useRef, useCallback, useState, useEffect } from 'react';
import { Upload, X, CircleNotch, Warning, CheckCircle, ShieldCheck, Camera, Eye, Fingerprint } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import type { AadhaarOcrResult } from '@/hooks/useAadhaarOcr';
import { CameraCapture } from '@/components/ui/CameraCapture';

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

// ── Upload Card sub-component ────────────────────────────────────────────────

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

// ── Aadhaar Camera Capture (mobile only) ─────────────────────────────────────

function AadhaarCameraCapture({ side, onCapture, onClose }: {
  side: 'front' | 'back'; onCapture: (file: File, side: 'front' | 'back') => void; onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [captured, setCaptured] = useState<string | null>(null);

  useEffect(() => {
    let s: MediaStream | null = null;
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        setStream(s);
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
      } catch { setError('Camera access denied. Please allow camera permission.'); }
    })();
    return () => { if (s) s.getTracks().forEach(t => t.stop()); };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCaptured(dataUrl);
  };

  const confirm = () => {
    if (!captured) return;
    fetch(captured).then(r => r.blob()).then(blob => {
      const file = new File([blob], `aadhaar_${side}_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file, side);
    });
  };

  const retake = () => setCaptured(null);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/90 text-white z-10">
        <p className="text-sm font-semibold">Capture Aadhaar {side === 'front' ? 'Front' : 'Back'}</p>
        <button onClick={() => { if (stream) stream.getTracks().forEach(t => t.stop()); onClose(); }} className="p-1">
          <X className="h-5 w-5" weight="bold" />
        </button>
      </div>
      {error ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <Warning className="h-10 w-10 text-amber-400 mx-auto" weight="fill" />
            <p className="text-white text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={onClose} className="text-white border-white/30">Close</Button>
          </div>
        </div>
      ) : captured ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative flex items-center justify-center bg-black p-4">
            <img src={captured} alt="Captured" className="max-w-full max-h-full rounded-lg object-contain" />
          </div>
          <div className="flex gap-3 p-4 bg-black/90">
            <Button onClick={retake} variant="outline" className="flex-1 text-white border-white/30 hover:bg-white/10">Retake</Button>
            <Button onClick={confirm} className="flex-1 bg-candlestick-green hover:bg-candlestick-green/90 text-white">Use Photo</Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative" style={{ width: '88%', aspectRatio: '1.6' }}>
                <div className="absolute inset-0 border-2 border-white/70 rounded-xl" />
                <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-[#FF6B00] rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-[#FF6B00] rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-[#FF6B00] rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-[#FF6B00] rounded-br-lg" />
                <div className="absolute -bottom-8 left-0 right-0 text-center">
                  <p className="text-white/80 text-xs">Align Aadhaar card within the frame</p>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 75% 55% at center, transparent 0%, rgba(0,0,0,0.6) 100%)'
            }} />
          </div>
          <div className="px-4 py-2 bg-black/90 text-center space-y-1">
            <p className="text-white/60 text-[10px]">Hold steady • Good lighting • No glare or shadows</p>
          </div>
          <div className="flex justify-center py-4 bg-black/90">
            <button onClick={capture} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}

// ── Animated Aadhaar Validation Loading Screen ───────────────────────────────

const validationSteps = [
  'Scanning document...',
  'Reading Aadhaar details...',
  'Verifying identity...',
  'Almost done...',
];

function AadhaarValidationLoader() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx(prev => (prev + 1) % validationSteps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl border border-[#FF6B00]/20 bg-gradient-to-b from-[#FF6B00]/[0.04] to-transparent p-6 sm:p-8 space-y-5"
    >
      {/* Animated fingerprint icon */}
      <div className="flex justify-center">
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-[#FF6B00]/20 blur-xl"
            style={{ width: 80, height: 80, top: -8, left: -8 }}
          />
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6B00]/20 to-[#FF6B00]/5 border border-[#FF6B00]/30 flex items-center justify-center"
          >
            <Fingerprint className="h-8 w-8 text-[#FF6B00]" weight="duotone" />
          </motion.div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1.5">
        <h4 className="font-semibold text-base">Validating Aadhaar</h4>
        <p className="text-xs text-muted-foreground">Please wait while we verify your document</p>
      </div>

      {/* Animated progress bar */}
      <div className="space-y-2">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8533]"
            animate={{ width: ['0%', '30%', '60%', '85%', '95%'] }}
            transition={{ duration: 8, ease: 'easeOut' }}
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-center text-muted-foreground"
          >
            {validationSteps[stepIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Pulsing dots */}
      <div className="flex justify-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            className="w-2 h-2 rounded-full bg-[#FF6B00]"
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AadhaarKycUpload({
  aadhaarFront, aadhaarBack, onFrontChange, onBackChange,
  ocrResult, isProcessing, ocrError, onProcess, isUnderAge,
}: AadhaarKycUploadProps) {
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState<'front' | 'back' | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  useEffect(() => { setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)); }, []);

  // Auto-trigger OCR when front image is uploaded (no manual button needed)
  useEffect(() => {
    if (aadhaarFront && !ocrResult && !isProcessing && !ocrError && !autoTriggered) {
      setAutoTriggered(true);
      // Small delay so the UI shows the uploaded thumbnail first
      const timer = setTimeout(() => onProcess(), 400);
      return () => clearTimeout(timer);
    }
    // Reset auto-trigger if front image is removed
    if (!aadhaarFront) {
      setAutoTriggered(false);
    }
  }, [aadhaarFront, ocrResult, isProcessing, ocrError, autoTriggered, onProcess]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) { alert('Only JPEG and PNG images are accepted.'); return; }
    if (file.size > MAX_SIZE) { alert('File must be under 5MB.'); return; }
    if (side === 'front') onFrontChange(file); else onBackChange(file);
  }, [onFrontChange, onBackChange]);

  const removeFront = () => { onFrontChange(null); setAutoTriggered(false); if (frontRef.current) frontRef.current.value = ''; };
  const removeBack = () => { onBackChange(null); if (backRef.current) backRef.current.value = ''; };
  const openPreview = (file: File) => setPreviewUrl(URL.createObjectURL(file));
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); };
  const handleCameraCapture = useCallback((file: File, side: 'front' | 'back') => {
    if (side === 'front') onFrontChange(file); else onBackChange(file);
    setCameraOpen(null);
  }, [onFrontChange, onBackChange]);

  // If processing, show the animated validation screen instead of upload UI
  if (isProcessing) {
    return (
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#FF6B00]" weight="duotone" />
          <h4 className="font-semibold text-sm">Aadhaar Verification</h4>
        </div>
        <AadhaarValidationLoader />
      </div>
    );
  }

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
          <li>Your sender address will be auto-filled from the Aadhaar details</li>
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <UploadCard label="Front Side *" file={aadhaarFront} inputRef={frontRef} onFileChange={(e) => handleFile(e, 'front')} onRemove={removeFront} onPreview={() => aadhaarFront && openPreview(aadhaarFront)} isMobile={isMobile} onCameraClick={() => setCameraOpen('front')} />
        <UploadCard label="Back Side *" file={aadhaarBack} inputRef={backRef} onFileChange={(e) => handleFile(e, 'back')} onRemove={removeBack} onPreview={() => aadhaarBack && openPreview(aadhaarBack)} isMobile={isMobile} onCameraClick={() => setCameraOpen('back')} />
      </div>
      {/* No manual "Validate Aadhaar" button — OCR triggers automatically on upload */}
      {ocrError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
          <Warning className="h-4 w-4 text-destructive shrink-0 mt-0.5" weight="fill" />
          <div>
            <p className="text-destructive font-medium">Validation failed. Please re-upload or enter details manually.</p>
            <p className="text-xs text-muted-foreground mt-0.5">You can fill in the fields below.</p>
          </div>
        </div>
      )}
      {isUnderAge && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30 text-center space-y-2">
          <Warning className="h-8 w-8 text-destructive mx-auto" weight="fill" />
          <p className="font-semibold text-destructive">Age Restriction</p>
          <p className="text-sm text-destructive/80">Sender must be 18 years or older to book an international shipment.</p>
        </motion.div>
      )}
      <AnimatePresence>
        {ocrResult && !isUnderAge && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-lg border border-candlestick-green/30 bg-candlestick-green/5 px-4 py-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-candlestick-green shrink-0" weight="fill" />
            <div><p className="text-sm font-medium text-candlestick-green">Aadhaar validated successfully</p><p className="text-xs text-muted-foreground">Your identity has been verified.</p></div>
          </motion.div>
        )}
      </AnimatePresence>
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
