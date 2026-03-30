"use client";

import { useState, useCallback } from 'react';

export interface AadhaarOcrResult {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadhaarNumber: string;
  dob: string;
  age: number | null;
  gender: string;
  phone: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  fieldConfidence?: Record<string, number>;
}

interface UseAadhaarOcrReturn {
  /** Extracted data from OCR */
  ocrResult: AadhaarOcrResult | null;
  /** Whether OCR is currently processing */
  isProcessing: boolean;
  /** Error message if OCR failed */
  ocrError: string;
  /** Upload and process Aadhaar files */
  processAadhaar: (front: File, back: File | null) => Promise<AadhaarOcrResult | null>;
  /** Clear OCR state */
  clearOcr: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function useAadhaarOcr(): UseAadhaarOcrReturn {
  const [ocrResult, setOcrResult] = useState<AadhaarOcrResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrError, setOcrError] = useState('');

  const processAadhaar = useCallback(async (front: File, back: File | null): Promise<AadhaarOcrResult | null> => {
    setIsProcessing(true);
    setOcrError('');
    setOcrResult(null);

    // Validate file sizes
    if (front.size > MAX_FILE_SIZE) {
      setOcrError('Front file must be under 5MB');
      setIsProcessing(false);
      return null;
    }
    if (back && back.size > MAX_FILE_SIZE) {
      setOcrError('Back file must be under 5MB');
      setIsProcessing(false);
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('aadhaarFront', front);
      if (back) formData.append('aadhaarBack', back);

      const res = await fetch('/api/ocr/aadhaar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setOcrError(data.error || 'OCR processing failed');
        setIsProcessing(false);
        return null;
      }

      setOcrResult(data.data);
      return data.data as AadhaarOcrResult;
    } catch {
      setOcrError('Network error — please try again or enter details manually');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearOcr = useCallback(() => {
    setOcrResult(null);
    setOcrError('');
    setIsProcessing(false);
  }, []);

  return { ocrResult, isProcessing, ocrError, processAadhaar, clearOcr };
}
