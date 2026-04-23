"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft, ArrowRight, FileCheck, AlertCircle,
  ShieldCheck, Loader2, CheckCircle2, RefreshCw, Lock,
} from "lucide-react";
import { CXBCApplicationData } from "@/views/cxbc/CXBCApply";
import { cn } from "@/lib/utils";

interface KYCDocumentsStepProps {
  data: CXBCApplicationData;
  onUpdate: (data: Partial<CXBCApplicationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type AadhaarStep = "input" | "otp" | "verified";

export const KYCDocumentsStep = ({ data, onUpdate, onNext, onBack }: KYCDocumentsStepProps) => {
  // ── Aadhaar OTP state ──────────────────────────────────────────────────────
  const [aadhaarStep, setAadhaarStep] = useState<AadhaarStep>(
    data.aadhaarVerified ? "verified" : "input"
  );
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Document upload state ──────────────────────────────────────────────────
  const [panFile, setPanFile] = useState<string>(data.kycPanUrl || "");
  const [shopPhoto, setShopPhoto] = useState<string>(data.shopPhotoUrl || "");
  const [docErrors, setDocErrors] = useState<{ pan?: string }>({});

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startResendTimer = () => {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  // ── Aadhaar number formatting (XXXX XXXX XXXX display) ────────────────────
  const formatAadhaarDisplay = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  };

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const digits = aadhaarNumber.replace(/\s/g, "");
    if (!/^\d{12}$/.test(digits)) {
      setAadhaarError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    setAadhaarError("");
    setOtpLoading(true);
    try {
      const res = await fetch("/api/cxbc/aadhaar-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaarNumber: digits }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAadhaarError(json.error || "Failed to send OTP. Please try again.");
        return;
      }
      setReferenceId(json.referenceId);
      setAadhaarStep("otp");
      startResendTimer();
    } catch {
      setAadhaarError("Network error. Please check your connection.");
    } finally {
      setOtpLoading(false);
    }
  };

  // ── OTP input handlers ─────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const otpStr = otp.join("");
    if (otpStr.length !== 6) {
      setAadhaarError("Please enter the complete 6-digit OTP.");
      return;
    }
    setAadhaarError("");
    setVerifyLoading(true);
    try {
      const res = await fetch("/api/cxbc/aadhaar-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId, otp: otpStr }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAadhaarError(json.error || "Invalid OTP. Please try again.");
        return;
      }
      onUpdate({
        aadhaarVerified: true,
        aadhaarVerifiedName: json.verifiedName,
        aadhaarMasked: json.maskedAadhaar,
      });
      setAadhaarStep("verified");
    } catch {
      setAadhaarError("Network error. Please check your connection.");
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Document upload ────────────────────────────────────────────────────────
  const handleFileChange = (type: "pan" | "shop") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = `pending-upload:${file.name}`;
    if (type === "pan") { setPanFile(url); onUpdate({ kycPanUrl: url }); }
    else { setShopPhoto(url); onUpdate({ shopPhotoUrl: url }); }
  };

  const getFileName = (url: string) =>
    url.startsWith("pending-upload:") ? url.replace("pending-upload:", "") : url.split("/").pop() || "Uploaded";

  // ── Proceed ────────────────────────────────────────────────────────────────
  const handleNext = () => {
    const errors: { pan?: string } = {};
    if (!panFile) errors.pan = "PAN card is required";
    setDocErrors(errors);
    if (Object.keys(errors).length === 0 && data.aadhaarVerified) onNext();
    else if (!data.aadhaarVerified) setAadhaarError("Please complete Aadhaar verification first.");
  };

  const otpFilled = otp.every((d) => d !== "");

  return (
    <div className="space-y-8">

      {/* ── Section 1: Aadhaar Verification ─────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
          <span className="text-sm font-semibold text-foreground">Aadhaar Verification</span>
          {data.aadhaarVerified && (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
            </span>
          )}
        </div>

        {/* INPUT STEP */}
        {aadhaarStep === "input" && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Verify with Aadhaar OTP</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  An OTP will be sent to your Aadhaar-linked mobile number
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadhaar-number" className="text-sm">Aadhaar Number *</Label>
              <div className="relative">
                <Input
                  id="aadhaar-number"
                  inputMode="numeric"
                  placeholder="XXXX  XXXX  XXXX"
                  value={formatAadhaarDisplay(aadhaarNumber)}
                  onChange={(e) => {
                    setAadhaarError("");
                    setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12));
                  }}
                  className="font-mono text-base tracking-[0.2em] pr-10 h-11"
                  maxLength={14}
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Your Aadhaar number is never stored — only used for OTP verification
              </p>
            </div>

            {aadhaarError && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{aadhaarError}</AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              onClick={handleSendOtp}
              disabled={otpLoading || aadhaarNumber.length < 12}
              className="w-full h-11"
            >
              {otpLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP...</>
              ) : (
                "Send OTP to Aadhaar-linked Mobile"
              )}
            </Button>
          </div>
        )}

        {/* OTP STEP */}
        {aadhaarStep === "otp" && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-1">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-foreground">Enter OTP</p>
              <p className="text-xs text-muted-foreground">
                Sent to the mobile number linked with your Aadhaar
              </p>
            </div>

            {/* OTP boxes */}
            <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={cn(
                    "w-11 h-13 text-center text-xl font-bold rounded-xl border-2 bg-background",
                    "focus:outline-none focus:ring-0 transition-all duration-150",
                    digit
                      ? "border-primary text-foreground"
                      : "border-border text-muted-foreground",
                    "focus:border-primary"
                  )}
                  style={{ height: "52px" }}
                />
              ))}
            </div>

            {aadhaarError && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{aadhaarError}</AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              onClick={handleVerifyOtp}
              disabled={verifyLoading || !otpFilled}
              className="w-full h-11"
            >
              {verifyLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
              ) : (
                <><ShieldCheck className="mr-2 h-4 w-4" /> Verify OTP</>
              )}
            </Button>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <button
                type="button"
                onClick={() => { setAadhaarStep("input"); setOtp(["","","","","",""]); setAadhaarError(""); }}
                className="hover:text-foreground transition-colors"
              >
                ← Change Aadhaar number
              </button>
              {resendTimer > 0 ? (
                <span>Resend in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <RefreshCw className="h-3 w-3" /> Resend OTP
                </button>
              )}
            </div>
          </div>
        )}

        {/* VERIFIED STEP */}
        {aadhaarStep === "verified" && (
          <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800">Aadhaar Verified Successfully</p>
                {data.aadhaarVerifiedName && (
                  <p className="text-sm text-green-700 mt-0.5 font-medium">{data.aadhaarVerifiedName}</p>
                )}
                {data.aadhaarMasked && (
                  <p className="text-xs text-green-600 font-mono mt-0.5">{data.aadhaarMasked}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAadhaarStep("input");
                  setOtp(["","","","","",""]);
                  setAadhaarError("");
                  onUpdate({ aadhaarVerified: false, aadhaarVerifiedName: "", aadhaarMasked: "" });
                }}
                className="text-xs text-green-600 hover:text-green-800 underline underline-offset-2 transition-colors flex-shrink-0"
              >
                Re-verify
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground">Document Upload</span>
        </div>
      </div>

      {/* ── Section 2: Documents ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
          <span className="text-sm font-semibold text-foreground">Upload Documents</span>
        </div>

        <Alert className="border-amber-200 bg-amber-50 py-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 text-xs">
            Upload clear, readable copies. Accepted: JPG, PNG, PDF (max 5MB each).
          </AlertDescription>
        </Alert>

        {/* PAN Card */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="pan-upload" className="text-sm font-medium flex items-center gap-2">
              PAN Card *
              {panFile && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </Label>
            {panFile && (
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">{getFileName(panFile)}</span>
            )}
          </div>
          <label
            htmlFor="pan-upload"
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-colors",
              panFile
                ? "border-green-300 bg-green-50 hover:bg-green-100"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            {panFile ? (
              <><FileCheck className="h-6 w-6 text-green-500" /><span className="text-xs text-green-600 font-medium">Uploaded — click to replace</span></>
            ) : (
              <><div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><span className="text-base">📄</span></div><span className="text-xs text-muted-foreground">Click to upload PAN card</span></>
            )}
            <input id="pan-upload" type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange("pan")} />
          </label>
          {docErrors.pan && <p className="text-xs text-destructive">{docErrors.pan}</p>}
        </div>

        {/* Shop Photo */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="shop-upload" className="text-sm font-medium flex items-center gap-2">
              Shop Photo
              <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              {shopPhoto && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </Label>
            {shopPhoto && (
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">{getFileName(shopPhoto)}</span>
            )}
          </div>
          <label
            htmlFor="shop-upload"
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-colors",
              shopPhoto
                ? "border-green-300 bg-green-50 hover:bg-green-100"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            {shopPhoto ? (
              <><FileCheck className="h-6 w-6 text-green-500" /><span className="text-xs text-green-600 font-medium">Uploaded — click to replace</span></>
            ) : (
              <><div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><span className="text-base">🏪</span></div><span className="text-xs text-muted-foreground">Click to upload shop front photo</span></>
            )}
            <input id="shop-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange("shop")} />
          </label>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          className="flex-1"
          disabled={!data.aadhaarVerified || !panFile}
        >
          Review Application <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {(!data.aadhaarVerified || !panFile) && (
        <p className="text-xs text-center text-muted-foreground -mt-2">
          {!data.aadhaarVerified ? "Complete Aadhaar verification to continue" : "Upload PAN card to continue"}
        </p>
      )}
    </div>
  );
};
