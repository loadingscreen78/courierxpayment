"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, ArrowCounterClockwise, Check, Warning } from '@phosphor-icons/react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

export type CameraDocumentType =
  | 'aadhaar-front'
  | 'aadhaar-back'
  | 'passport-identity'
  | 'passport-address'
  | 'document'
  | 'general';

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
  documentType?: CameraDocumentType;
}

const INSTRUCTIONS: Record<CameraDocumentType, { title: string; hints: string[] }> = {
  'aadhaar-front': {
    title: 'Position the front of your Aadhaar card',
    hints: ['Ensure your photo and name are clearly visible', 'Avoid glare and shadows'],
  },
  'aadhaar-back': {
    title: 'Position the back of your Aadhaar card',
    hints: ['Ensure the address and QR code are visible', 'Keep the card flat and steady'],
  },
  'passport-identity': {
    title: 'Position the photo page of the passport',
    hints: ['Ensure MRZ code at bottom is visible', 'Capture the full page without cutting edges'],
  },
  'passport-address': {
    title: 'Position the address page of the passport',
    hints: ['Ensure all text is clearly readable', 'Capture the full page'],
  },
  document: {
    title: 'Position your document within the frame',
    hints: ['Ensure all text is clearly visible', 'Avoid glare and shadows'],
  },
  general: {
    title: 'Position your document within the frame',
    hints: ['Ensure all text is clearly visible', 'Good lighting helps'],
  },
};

const FILE_NAMES: Record<CameraDocumentType, string> = {
  'aadhaar-front': 'aadhaar-front-capture.jpg',
  'aadhaar-back': 'aadhaar-back-capture.jpg',
  'passport-identity': 'passport-identity-capture.jpg',
  'passport-address': 'passport-address-capture.jpg',
  document: 'document-capture.jpg',
  general: 'capture.jpg',
};

export function CameraCapture({ open, onOpenChange, onCapture, documentType = 'general' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [captured, setCaptured] = useState<string | null>(null);
  const info = INSTRUCTIONS[documentType];

  // Start camera when sheet opens
  useEffect(() => {
    if (!open) return;
    let s: MediaStream | null = null;
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      } catch {
        setError('Camera access denied. Please allow camera permission and try again.');
      }
    })();
    return () => {
      if (s) s.getTracks().forEach((t) => t.stop());
      setStream(null);
      setCaptured(null);
      setError('');
    };
  }, [open]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCaptured(canvas.toDataURL('image/jpeg', 0.85));
  }, []);

  const handleRetake = () => setCaptured(null);

  const handleConfirm = useCallback(() => {
    if (!captured) return;
    fetch(captured)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], FILE_NAMES[documentType], { type: 'image/jpeg' });
        onCapture(file);
        onOpenChange(false);
      });
  }, [captured, documentType, onCapture, onOpenChange]);

  const handleClose = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[100dvh] p-0 flex flex-col bg-black [&>button]:hidden">
        <VisuallyHidden.Root><SheetTitle>Camera Capture</SheetTitle></VisuallyHidden.Root>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/90 text-white shrink-0 z-10">
          <p className="text-sm font-semibold truncate pr-2">{info.title}</p>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" weight="bold" />
          </button>
        </div>

        {error ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="space-y-3">
              <Warning className="h-10 w-10 text-amber-400 mx-auto" weight="fill" />
              <p className="text-white text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={handleClose} className="text-white border-white/30">
                Close
              </Button>
            </div>
          </div>
        ) : captured ? (
          /* Preview */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 relative flex items-center justify-center bg-black p-4 min-h-0">
              <img src={captured} alt="Captured" className="max-w-full max-h-full rounded-lg object-contain" />
            </div>
            <div className="flex gap-3 p-4 bg-black/90 shrink-0">
              <Button onClick={handleRetake} variant="outline" className="flex-1 text-white border-white/30 hover:bg-white/10 gap-1.5">
                <ArrowCounterClockwise className="h-4 w-4" /> Retake
              </Button>
              <Button onClick={handleConfirm} className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-1.5">
                <Check className="h-4 w-4" weight="bold" /> Use Photo
              </Button>
            </div>
          </div>
        ) : (
          /* Live viewfinder */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 relative overflow-hidden bg-black min-h-0">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {/* Dark overlay with cutout */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 78% 50% at center, transparent 0%, rgba(0,0,0,0.65) 100%)',
              }} />
              {/* Document frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative" style={{ width: '88%', aspectRatio: '1.6' }}>
                  <div className="absolute inset-0 border-2 border-white/60 rounded-xl" />
                  {/* Corner markers */}
                  <div className="absolute -top-px -left-px w-7 h-7 border-t-[3px] border-l-[3px] border-coke-red rounded-tl-lg" />
                  <div className="absolute -top-px -right-px w-7 h-7 border-t-[3px] border-r-[3px] border-coke-red rounded-tr-lg" />
                  <div className="absolute -bottom-px -left-px w-7 h-7 border-b-[3px] border-l-[3px] border-coke-red rounded-bl-lg" />
                  <div className="absolute -bottom-px -right-px w-7 h-7 border-b-[3px] border-r-[3px] border-coke-red rounded-br-lg" />
                </div>
              </div>
            </div>
            {/* Hints */}
            <div className="px-4 py-2 bg-black/90 text-center space-y-0.5 shrink-0">
              {info.hints.map((h, i) => (
                <p key={i} className="text-white/70 text-[11px]">{h}</p>
              ))}
            </div>
            {/* Capture button */}
            <div className="flex justify-center py-4 bg-black/90 shrink-0">
              <button
                onClick={handleCapture}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-white" />
              </button>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </SheetContent>
    </Sheet>
  );
}
