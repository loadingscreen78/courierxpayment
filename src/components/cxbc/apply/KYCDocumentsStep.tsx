"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft, ArrowRight, FileCheck, AlertCircle,
  ShieldCheck, Loader2, CheckCircle2,
  Lock, ExternalLink, Smartphone, BookOpen,
} from "lucide-react";
import { CXBCApplicationData } from "@/views/cxbc/CXBCApply";
import { cn } from "@/lib/utils";

interface KYCDocumentsStepProps {
  data: CXBCApplicationData;
  onUpdate: (data: Partial<CXBCApplicationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type VerifyMethod = "otp" | "digilocker";
type OtpStep = "input" | "sent" | "verified";
type DigiLockerStep = "idle" | "initiated" | "polling" | "verified";

// Verhoeff checksum for Aadhaar validation
const verhoeffD = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const verhoeffP = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];
function validateVerhoeff(num: string): boolean {
  let c = 0;
  const rev = num.split("").reverse();
  for (let i = 0; i < rev.length; i++) {
    c = verhoeffD[c][verhoeffP[i % 8][parseInt(rev[i], 10)]];
  }
  return c === 0;
}

const formatAadhaar = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 12);
  const p: string[] = [];
  for (let i = 0; i < d.length; i += 4) p.push(d.slice(i, i + 4));
  return p.join(" ");
};

export function KYCDocumentsStep({ data, onUpdate, onNext, onBack }: KYCDocumentsStepProps) {
  const [method, setMethod] = useState<VerifyMethod>("digilocker");

  // OTP flow state
  const [otpStep, setOtpStep] = useState<OtpStep>("input");
  const [aadhaarRaw, setAadhaarRaw] = useState("");
  const [aadhaarFormatted, setAadhaarFormatted] = useState("");
  const [aadhaarError, setAadhaarError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // DigiLocker flow state
  const [dlStep, setDlStep] = useState<DigiLockerStep>("idle");
  const [dlVerificationId, setDlVerificationId] = useState("");
  const [dlLoading, setDlLoading] = useState(false);
  const [dlError, setDlError] = useState("");
  const [dlPolling, setDlPolling] = useState(false);

  const [error, setError] = useState("");

  // Poll DigiLocker status after redirect back
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const kyc = params.get("kyc");
    const vid = params.get("vid");
    if (kyc === "digilocker" && vid) {
      setMethod("digilocker");
      setDlVerificationId(vid);
      setDlStep("polling");
      pollDigiLocker(vid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── OTP helpers ──────────────────────────────────────────────────────────

  const handleAadhaarInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
    setAadhaarRaw(raw);
    setAadhaarFormatted(formatAadhaar(raw));
    setAadhaarError("");
  };

  const handleSendOtp = async () => {
    if (!/^\d{12}$/.test(aadhaarRaw)) {
      setAadhaarError("Enter a valid 12-digit Aadhaar number.");
      return;
    }
    if (!validateVerhoeff(aadhaarRaw)) {
      setAadhaarError("Invalid Aadhaar number (checksum failed).");
      return;
    }
    setOtpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cxbc/aadhaar-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaarNumber: aadhaarRaw }),
      });
      const json = await res.json();
      // Cashfree discontinued OKYC — auto-switch to DigiLocker
      if (json.code === "OKYC_DEPRECATED" || res.status === 410) {
        setMethod("digilocker");
        setError("Aadhaar OTP is no longer supported. Switched to DigiLocker verification.");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to send OTP");
      setReferenceId(json.referenceId);
      setOtpStep("sent");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Enter the 6-digit OTP.");
      return;
    }
    setOtpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cxbc/aadhaar-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId, otp }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "OTP verification failed");
      onUpdate({
        aadhaarVerified: true,
        aadhaarVerifiedName: json.verifiedName || "",
        aadhaarMasked: json.maskedAadhaar || "",
      });
      setOtpStep("verified");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  // ── DigiLocker helpers ────────────────────────────────────────────────────

  const handleInitiateDigiLocker = async () => {
    setDlLoading(true);
    setDlError("");
    try {
      const res = await fetch("/api/cxbc/digilocker/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to initiate DigiLocker");
      setDlVerificationId(json.verificationId);
      setDlStep("initiated");
      // Redirect to DigiLocker
      window.location.href = json.digilockerUrl;
    } catch (err: any) {
      setDlError(err.message);
    } finally {
      setDlLoading(false);
    }
  };

  const pollDigiLocker = async (vid: string) => {
    setDlPolling(true);
    setDlError("");
    try {
      const res = await fetch("/api/cxbc/digilocker/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId: vid }),
      });
      const json = await res.json();
      if (res.status === 202) {
        setDlError("Verification not completed yet. Please complete the DigiLocker flow and try again.");
        setDlStep("initiated");
        return;
      }
      if (!res.ok) throw new Error(json.error || "DigiLocker verification failed");
      onUpdate({
        aadhaarVerified: true,
        aadhaarVerifiedName: json.verifiedName || "",
        aadhaarMasked: json.maskedAadhaar || "",
      });
      setDlStep("verified");
    } catch (err: any) {
      setDlError(err.message);
      setDlStep("idle");
    } finally {
      setDlPolling(false);
    }
  };

  const isVerified = data.aadhaarVerified;

  return (
    <div className="space-y-6">
      {/* ── Aadhaar Verification Card ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-semibold text-sm">Aadhaar Verification</p>
            <p className="text-xs text-muted-foreground">Required for partner onboarding</p>
          </div>
          {isVerified && (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
            </span>
          )}
        </div>

        {isVerified ? (
          /* ── Already verified ─────────────────────────────────────────── */
          <div className="px-5 py-5 space-y-2">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                {data.aadhaarVerifiedName && (
                  <p className="text-sm font-semibold text-foreground">{data.aadhaarVerifiedName}</p>
                )}
                {data.aadhaarMasked && (
                  <p className="text-xs text-muted-foreground font-mono">{data.aadhaarMasked}</p>
                )}
                <p className="text-xs text-green-700 mt-0.5">Aadhaar verified successfully</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-5">
            {/* ── Method Toggle ─────────────────────────────────────────── */}
            <div className="flex rounded-lg border border-border overflow-hidden bg-muted/20 p-1 gap-1">
              <button
                type="button"
                onClick={() => { setMethod("otp"); setError(""); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                  method === "otp"
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="h-4 w-4" />
                Aadhaar OTP
              </button>
              <button
                type="button"
                onClick={() => { setMethod("digilocker"); setError(""); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                  method === "digilocker"
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BookOpen className="h-4 w-4" />
                DigiLocker
              </button>
            </div>

            {/* ── OTP Method ────────────────────────────────────────────── */}
            {method === "otp" && (
              <div className="space-y-4">
                {otpStep === "input" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="aadhaar">Aadhaar Number</Label>
                      <Input
                        id="aadhaar"
                        type="text"
                        inputMode="numeric"
                        maxLength={14}
                        placeholder="XXXX XXXX XXXX"
                        value={aadhaarFormatted}
                        onChange={handleAadhaarInput}
                        className="font-mono tracking-widest text-center text-lg"
                      />
                      {aadhaarError && (
                        <p className="text-xs text-destructive">{aadhaarError}</p>
                      )}
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5">
                      <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      OTP will be sent to your Aadhaar-linked mobile number. We never store your full Aadhaar.
                    </div>
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                    >
                      {otpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Send OTP
                    </Button>
                  </>
                )}

                {otpStep === "sent" && (
                  <>
                    <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5">
                      OTP sent to your Aadhaar-linked mobile. Enter it below.
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6-digit OTP"
                        value={otp}
                        onChange={e => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
                        className="font-mono tracking-widest text-center text-lg"
                      />
                      {otpError && <p className="text-xs text-destructive">{otpError}</p>}
                    </div>
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setOtpStep("input"); setOtp(""); setError(""); }}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={handleVerifyOtp}
                        disabled={otpLoading}
                      >
                        {otpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Verify OTP
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── DigiLocker Method ─────────────────────────────────────── */}
            {method === "digilocker" && (
              <div className="space-y-4">
                {dlStep === "idle" && (
                  <>
                    <div className="space-y-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
                      <p>You&apos;ll be redirected to DigiLocker to authenticate with your Aadhaar-linked mobile and grant consent.</p>
                      <p className="text-xs">Government-approved · No document upload needed · Expires in 10 min</p>
                    </div>
                    {dlError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{dlError}</AlertDescription>
                      </Alert>
                    )}
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleInitiateDigiLocker}
                      disabled={dlLoading}
                    >
                      {dlLoading
                        ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        : <ExternalLink className="h-4 w-4 mr-2" />}
                      Verify via DigiLocker
                    </Button>
                  </>
                )}

                {dlStep === "initiated" && (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
                      Complete the DigiLocker flow in the opened tab, then come back and click below.
                    </div>
                    {dlError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{dlError}</AlertDescription>
                      </Alert>
                    )}
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => pollDigiLocker(dlVerificationId)}
                      disabled={dlPolling}
                    >
                      {dlPolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      I&apos;ve completed DigiLocker — Continue
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => { setDlStep("idle"); setDlError(""); }}
                    >
                      Start over
                    </Button>
                  </div>
                )}

                {dlStep === "polling" && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Fetching your verified Aadhaar data...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Document Uploads ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
          <FileCheck className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-semibold text-sm">Supporting Documents</p>
            <p className="text-xs text-muted-foreground">Upload clear photos or scans</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          <DocumentUpload
            label="Aadhaar Card (Front & Back)"
            value={data.kycAadhaarUrl}
            onChange={url => onUpdate({ kycAadhaarUrl: url })}
            hint="JPG, PNG or PDF · Max 5 MB"
          />
          <DocumentUpload
            label="PAN Card"
            value={data.kycPanUrl}
            onChange={url => onUpdate({ kycPanUrl: url })}
            hint="JPG, PNG or PDF · Max 5 MB"
          />
          <DocumentUpload
            label="Shop / Business Photo"
            value={data.shopPhotoUrl}
            onChange={url => onUpdate({ shopPhotoUrl: url })}
            hint="Clear photo of your shop front · Max 5 MB"
          />
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!isVerified}
          className="flex-1"
        >
          Continue <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {!isVerified && (
        <p className="text-center text-xs text-muted-foreground">
          Complete Aadhaar verification to proceed
        </p>
      )}
    </div>
  );
}

// ── Minimal document upload widget ───────────────────────────────────────────

interface DocumentUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}

function DocumentUpload({ label, value, onChange, hint }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large. Max 5 MB.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      // Use a public Supabase storage bucket for CXBC KYC docs
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const ext = file.name.split(".").pop();
      const path = `cxbc-kyc/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("kyc-documents").getPublicUrl(path);
      onChange(urlData.publicUrl);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <span className="text-xs text-green-700 flex-1 truncate">Uploaded</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-muted-foreground hover:text-destructive underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border",
          "px-4 py-5 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors",
          uploading && "opacity-60 pointer-events-none",
        )}>
          {uploading
            ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            : <FileCheck className="h-5 w-5 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">
            {uploading ? "Uploading..." : "Click to upload"}
          </span>
          {hint && <span className="text-xs text-muted-foreground/70">{hint}</span>}
          <input type="file" accept="image/*,.pdf" className="sr-only" onChange={handleFile} disabled={uploading} />
        </label>
      )}
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
    </div>
  );
}

export const KYCDocumentsStep = ({ data, onUpdate, onNext, onBack }: KYCDocumentsStepProps) => {
  const [method, setMethod] = useState<VerifyMethod>("otp");

  // -- OTP state --------------------------------------------------------------
  const [otpStep, setOtpStep] = useState<AadhaarOtpStep>(data.aadhaarVerified ? "verified" : "input");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- DigiLocker state -------------------------------------------------------
  const [dlStep, setDlStep] = useState<DigiLockerStep>(data.aadhaarVerified ? "verified" : "idle");
  const [dlVerificationId, setDlVerificationId] = useState("");
  const [dlReferenceId, setDlReferenceId] = useState<string | undefined>(undefined);
  const [dlLoading, setDlLoading] = useState(false);
  const [dlPollLoading, setDlPollLoading] = useState(false);
  const [dlError, setDlError] = useState("");

  // -- Document upload state --------------------------------------------------
  const [panFile, setPanFile] = useState<string>(data.kycPanUrl || "");
  const [shopPhoto, setShopPhoto] = useState<string>(data.shopPhotoUrl || "");
  const [docErrors, setDocErrors] = useState<{ pan?: string }>({});

  // -- On mount: check if returning from DigiLocker redirect -----------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("kyc") === "digilocker") {
      const vid = params.get("vid") || sessionStorage.getItem("cxbc_dl_vid") || "";
      if (vid) {
        setMethod("digilocker");
        setDlVerificationId(vid);
        setDlStep("initiated");
      }
    }
  }, []);

  // -- Timer ------------------------------------------------------------------
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startResendTimer = () => {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; });
    }, 1000);
  };

  const formatAadhaar = (val: string) =>
    val.replace(/\D/g, "").slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1 ").trim();

  // -- OTP: Send --------------------------------------------------------------
  const handleSendOtp = async () => {
    const digits = aadhaarNumber.replace(/\s/g, "");
    if (!/^\d{12}$/.test(digits)) { setOtpError("Please enter a valid 12-digit Aadhaar number."); return; }
    setOtpError(""); setOtpLoading(true);
    try {
      const res = await fetch("/api/cxbc/aadhaar-otp/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaarNumber: digits }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { setOtpError(json.error || "Failed to send OTP."); return; }
      setReferenceId(json.referenceId);
      setOtpStep("otp");
      startResendTimer();
    } catch { setOtpError("Network error. Please check your connection."); }
    finally { setOtpLoading(false); }
  };

  // -- OTP: Input handlers ----------------------------------------------------
  const handleOtpChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const next = [...otp]; next[i] = v.slice(-1); setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p.length === 6) { setOtp(p.split("")); otpRefs.current[5]?.focus(); }
    e.preventDefault();
  };

  // -- OTP: Verify ------------------------------------------------------------
  const handleVerifyOtp = async () => {
    const otpStr = otp.join("");
    if (otpStr.length !== 6) { setOtpError("Please enter the complete 6-digit OTP."); return; }
    setOtpError(""); setVerifyLoading(true);
    try {
      const res = await fetch("/api/cxbc/aadhaar-otp/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId, otp: otpStr }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { setOtpError(json.error || "Invalid OTP."); return; }
      onUpdate({ aadhaarVerified: true, aadhaarVerifiedName: json.verifiedName, aadhaarMasked: json.maskedAadhaar });
      setOtpStep("verified");
    } catch { setOtpError("Network error. Please check your connection."); }
    finally { setVerifyLoading(false); }
  };

  const resetOtp = () => {
    setOtpStep("input"); setOtp(["","","","","",""]); setOtpError("");
    onUpdate({ aadhaarVerified: false, aadhaarVerifiedName: "", aadhaarMasked: "" });
  };

  // -- DigiLocker: Initiate ---------------------------------------------------
  const handleDigiLockerInitiate = async () => {
    setDlError(""); setDlLoading(true);
    try {
      const res = await fetch("/api/cxbc/digilocker/initiate", {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok || !json.success) { setDlError(json.error || "Failed to initiate DigiLocker."); return; }
      setDlVerificationId(json.verificationId);
      setDlReferenceId(json.referenceId);
      sessionStorage.setItem("cxbc_dl_vid", json.verificationId);
      if (json.referenceId) sessionStorage.setItem("cxbc_dl_rid", String(json.referenceId));
      window.open(json.digilockerUrl, "_blank", "noopener,noreferrer");
      setDlStep("initiated");
    } catch { setDlError("Network error. Please check your connection."); }
    finally { setDlLoading(false); }
  };

  // -- DigiLocker: Poll / Fetch -----------------------------------------------
  const handleDigiLockerFetch = async () => {
    const vid = dlVerificationId || sessionStorage.getItem("cxbc_dl_vid") || "";
    const rid = dlReferenceId || sessionStorage.getItem("cxbc_dl_rid") || undefined;
    if (!vid) { setDlError("Verification ID missing. Please start again."); return; }
    setDlError(""); setDlPollLoading(true);
    try {
      const res = await fetch("/api/cxbc/digilocker/fetch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId: vid, referenceId: rid }),
      });
      const json = await res.json();
      if (res.status === 202) { setDlError("DigiLocker verification not completed yet. Please finish the DigiLocker flow and try again."); return; }
      if (!res.ok || !json.success) { setDlError(json.error || "Verification failed."); return; }
      onUpdate({ aadhaarVerified: true, aadhaarVerifiedName: json.verifiedName, aadhaarMasked: json.maskedAadhaar });
      setDlStep("verified");
      sessionStorage.removeItem("cxbc_dl_vid");
      sessionStorage.removeItem("cxbc_dl_rid");
    } catch { setDlError("Network error. Please check your connection."); }
    finally { setDlPollLoading(false); }
  };

  const resetDigiLocker = () => {
    setDlStep("idle"); setDlError(""); setDlVerificationId(""); setDlReferenceId(undefined);
    onUpdate({ aadhaarVerified: false, aadhaarVerifiedName: "", aadhaarMasked: "" });
    sessionStorage.removeItem("cxbc_dl_vid");
    sessionStorage.removeItem("cxbc_dl_rid");
  };

  // -- Document upload --------------------------------------------------------
  const handleFileChange = (type: "pan" | "shop") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = `pending-upload:${file.name}`;
    if (type === "pan") { setPanFile(url); onUpdate({ kycPanUrl: url }); }
    else { setShopPhoto(url); onUpdate({ shopPhotoUrl: url }); }
  };
  const getFileName = (url: string) =>
    url.startsWith("pending-upload:") ? url.replace("pending-upload:", "") : url.split("/").pop() || "Uploaded";

  // -- Proceed ----------------------------------------------------------------
  const handleNext = () => {
    const errors: { pan?: string } = {};
    if (!panFile) errors.pan = "PAN card is required";
    setDocErrors(errors);
    if (!data.aadhaarVerified) { setOtpError("Please complete Aadhaar verification first."); return; }
    if (Object.keys(errors).length === 0) onNext();
  };

  const isVerified = data.aadhaarVerified;
  const otpFilled = otp.every((d) => d !== "");

  return (
    <div className="space-y-8">

      {/* -- Section 1: Aadhaar Verification ------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</div>
          <span className="text-sm font-semibold text-foreground">Aadhaar Verification</span>
          {isVerified && <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>}
        </div>

        {/* Verified card � shown for both methods */}
        {isVerified ? (
          <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800">Aadhaar Verified Successfully</p>
                {data.aadhaarVerifiedName && <p className="text-sm text-green-700 mt-0.5 font-medium">{data.aadhaarVerifiedName}</p>}
                {data.aadhaarMasked && <p className="text-xs text-green-600 font-mono mt-0.5">{data.aadhaarMasked}</p>}
              </div>
              <button type="button" onClick={method === "digilocker" ? resetDigiLocker : resetOtp}
                className="text-xs text-green-600 hover:text-green-800 underline underline-offset-2 shrink-0">
                Re-verify
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Method tabs */}
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button type="button" onClick={() => setMethod("otp")}
                className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                  method === "otp" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50")}>
                <Smartphone className="h-4 w-4" /> Aadhaar OTP
              </button>
              <button type="button" onClick={() => setMethod("digilocker")}
                className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-l border-border",
                  method === "digilocker" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50")}>
                <ShieldCheck className="h-4 w-4" /> DigiLocker
              </button>
            </div>

            {/* -- OTP Method -- */}
            {method === "otp" && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                {otpStep === "input" && (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Verify with Aadhaar OTP</p>
                        <p className="text-xs text-muted-foreground mt-0.5">OTP sent to your Aadhaar-linked mobile number</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Aadhaar Number *</label>
                      <div className="relative">
                        <input inputMode="numeric" placeholder="XXXX  XXXX  XXXX"
                          value={formatAadhaar(aadhaarNumber)}
                          onChange={(e) => { setOtpError(""); setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12)); }}
                          className="w-full h-11 px-3 pr-10 rounded-xl border border-border bg-background font-mono text-base tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                          maxLength={14} />
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Never stored � used only for OTP delivery</p>
                    </div>
                    {otpError && <Alert variant="destructive" className="py-2.5"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{otpError}</AlertDescription></Alert>}
                    <Button type="button" onClick={handleSendOtp} disabled={otpLoading || aadhaarNumber.length < 12} className="w-full h-11">
                      {otpLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending OTP...</> : "Send OTP to Aadhaar-linked Mobile"}
                    </Button>
                  </>
                )}

                {otpStep === "otp" && (
                  <>
                    <div className="text-center space-y-1">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-1">
                        <ShieldCheck className="h-6 w-6 text-blue-600" />
                      </div>
                      <p className="text-sm font-semibold">Enter OTP</p>
                      <p className="text-xs text-muted-foreground">Sent to your Aadhaar-linked mobile number</p>
                    </div>
                    <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <input key={i} ref={(el) => { otpRefs.current[i] = el; }}
                          type="text" inputMode="numeric" maxLength={1} value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className={cn("w-11 text-center text-xl font-bold rounded-xl border-2 bg-background focus:outline-none transition-all",
                            digit ? "border-primary text-foreground" : "border-border text-muted-foreground", "focus:border-primary")}
                          style={{ height: "52px" }} />
                      ))}
                    </div>
                    {otpError && <Alert variant="destructive" className="py-2.5"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{otpError}</AlertDescription></Alert>}
                    <Button type="button" onClick={handleVerifyOtp} disabled={verifyLoading || !otpFilled} className="w-full h-11">
                      {verifyLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : <><ShieldCheck className="mr-2 h-4 w-4" />Verify OTP</>}
                    </Button>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <button type="button" onClick={() => { setOtpStep("input"); setOtp(["","","","","",""]); setOtpError(""); }} className="hover:text-foreground transition-colors">? Change number</button>
                      {resendTimer > 0 ? <span>Resend in {resendTimer}s</span> : (
                        <button type="button" onClick={handleSendOtp} disabled={otpLoading} className="flex items-center gap-1 hover:text-foreground transition-colors">
                          <RefreshCw className="h-3 w-3" /> Resend OTP
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* -- DigiLocker Method -- */}
            {method === "digilocker" && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                {dlStep === "idle" && (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Verify via DigiLocker</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Government-approved verification � no document upload needed</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 space-y-2">
                      {["Authenticate with your DigiLocker account", "Allow Aadhaar document access", "Return here � we fetch your details automatically"].map((s, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm text-indigo-800">
                          <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          {s}
                        </div>
                      ))}
                    </div>
                    {dlError && <Alert variant="destructive" className="py-2.5"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{dlError}</AlertDescription></Alert>}
                    <Button type="button" onClick={handleDigiLockerInitiate} disabled={dlLoading} className="w-full h-11">
                      {dlLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Opening DigiLocker...</> : <><ExternalLink className="mr-2 h-4 w-4" />Verify via DigiLocker</>}
                    </Button>
                  </>
                )}

                {dlStep === "initiated" && (
                  <>
                    <div className="text-center space-y-2 py-2">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 mb-1">
                        <ExternalLink className="h-6 w-6 text-indigo-600" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">DigiLocker Opened</p>
                      <p className="text-xs text-muted-foreground">Complete the verification in the DigiLocker window, then click below</p>
                    </div>
                    {dlError && <Alert variant="destructive" className="py-2.5"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{dlError}</AlertDescription></Alert>}
                    <Button type="button" onClick={handleDigiLockerFetch} disabled={dlPollLoading} className="w-full h-11">
                      {dlPollLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking status...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />I've completed DigiLocker verification</>}
                    </Button>
                    <button type="button" onClick={resetDigiLocker} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
                      ? Start again
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* -- Divider -------------------------------------------------------- */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">Document Upload</span></div>
      </div>

      {/* -- Section 2: Documents ------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</div>
          <span className="text-sm font-semibold text-foreground">Upload Documents</span>
        </div>

        <Alert className="border-amber-200 bg-amber-50 py-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 text-xs">Upload clear, readable copies. Accepted: JPG, PNG, PDF (max 5MB each).</AlertDescription>
        </Alert>

        {/* PAN Card */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="pan-upload" className="text-sm font-medium flex items-center gap-2">
              PAN Card * {panFile && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </Label>
            {panFile && <span className="text-xs text-muted-foreground truncate max-w-[160px]">{getFileName(panFile)}</span>}
          </div>
          <label htmlFor="pan-upload" className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-colors",
            panFile ? "border-green-300 bg-green-50 hover:bg-green-100" : "border-border hover:border-primary/50 hover:bg-muted/30")}>
            {panFile ? <><FileCheck className="h-6 w-6 text-green-500" /><span className="text-xs text-green-600 font-medium">Uploaded � click to replace</span></>
              : <><div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><span className="text-base">??</span></div><span className="text-xs text-muted-foreground">Click to upload PAN card</span></>}
            <input id="pan-upload" type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange("pan")} />
          </label>
          {docErrors.pan && <p className="text-xs text-destructive">{docErrors.pan}</p>}
        </div>

        {/* Shop Photo */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="shop-upload" className="text-sm font-medium flex items-center gap-2">
              Shop Photo <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              {shopPhoto && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </Label>
            {shopPhoto && <span className="text-xs text-muted-foreground truncate max-w-[160px]">{getFileName(shopPhoto)}</span>}
          </div>
          <label htmlFor="shop-upload" className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-colors",
            shopPhoto ? "border-green-300 bg-green-50 hover:bg-green-100" : "border-border hover:border-primary/50 hover:bg-muted/30")}>
            {shopPhoto ? <><FileCheck className="h-6 w-6 text-green-500" /><span className="text-xs text-green-600 font-medium">Uploaded � click to replace</span></>
              : <><div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><span className="text-base">??</span></div><span className="text-xs text-muted-foreground">Click to upload shop front photo</span></>}
            <input id="shop-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange("shop")} />
          </label>
        </div>
      </div>

      {/* -- Navigation ----------------------------------------------------- */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        <Button type="button" onClick={handleNext} className="flex-1" disabled={!isVerified || !panFile}>
          Review Application <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      {(!isVerified || !panFile) && (
        <p className="text-xs text-center text-muted-foreground -mt-2">
          {!isVerified ? "Complete Aadhaar verification to continue" : "Upload PAN card to continue"}
        </p>
      )}
    </div>
  );
};
