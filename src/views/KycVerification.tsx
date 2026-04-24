"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowRight, Loader2, CheckCircle2, MapPin, ExternalLink, Lock, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
const logoMain = { src: '/lovable-uploads/logo.png' };

// ── Types ────────────────────────────────────────────────────────────────────

type DocType = 'aadhaar' | 'pan' | 'passport' | 'voter_id';
type AadhaarMethod = 'digilocker' | 'uid_lookup';
type KycStep = 'select_doc' | 'enter_details' | 'redirect' | 'verifying' | 'success';

const DOC_OPTIONS: { type: DocType; label: string; icon: string; desc: string }[] = [
  { type: 'aadhaar',   label: 'Aadhaar',   icon: '/logos/doc-aadhaar.svg',   desc: 'Verify via DigiLocker or UID lookup' },
  { type: 'pan',       label: 'PAN Card',  icon: '/logos/doc-pan.svg',       desc: 'Instant PAN database verification' },
  { type: 'passport',  label: 'Passport',  icon: '/logos/doc-passport.svg',  desc: 'Passport number + date of birth' },
  { type: 'voter_id',  label: 'Voter ID',  icon: '/logos/doc-voterid.svg',   desc: 'EPIC number verification' },
];

// Verhoeff for Aadhaar checksum
const verhoeffD = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const verhoeffP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
function validateVerhoeff(num: string) {
  let c = 0;
  const rev = num.split('').reverse();
  for (let i = 0; i < rev.length; i++) c = verhoeffD[c][verhoeffP[i % 8][parseInt(rev[i], 10)]];
  return c === 0;
}
const formatAadhaar = (v: string) => { const d = v.replace(/\D/g,'').slice(0,12); const p: string[] = []; for (let i=0;i<d.length;i+=4) p.push(d.slice(i,i+4)); return p.join(' '); };

// ── Inner component ──────────────────────────────────────────────────────────

function KycVerificationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<KycStep>('select_doc');
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [aadhaarMethod, setAadhaarMethod] = useState<AadhaarMethod>('digilocker');
  const [isLoading, setIsLoading] = useState(false);

  // Aadhaar fields
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [formattedAadhaar, setFormattedAadhaar] = useState('');
  const [aadhaarError, setAadhaarError] = useState('');
  const [digilockerUrl, setDigilockerUrl] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [referenceId, setReferenceId] = useState<number | null>(null);

  // PAN fields
  const [pan, setPan] = useState('');
  const [panName, setPanName] = useState('');
  const [panError, setPanError] = useState('');

  // Passport fields
  const [passportNumber, setPassportNumber] = useState('');
  const [passportDob, setPassportDob] = useState('');
  const [passportError, setPassportError] = useState('');

  // Voter ID fields
  const [voterId, setVoterId] = useState('');
  const [voterIdError, setVoterIdError] = useState('');

  // Success state
  const [verifiedName, setVerifiedName] = useState('');
  const [verifiedAddress, setVerifiedAddress] = useState('');
  const [maskedDoc, setMaskedDoc] = useState('');

  const from = searchParams.get('from') || '/dashboard';

  // Handle DigiLocker callback
  useEffect(() => {
    const cbVerificationId = searchParams.get('verification_id');
    const cbReferenceId = searchParams.get('reference_id');
    if (cbVerificationId || cbReferenceId) {
      if (cbVerificationId) setVerificationId(cbVerificationId);
      if (cbReferenceId) setReferenceId(Number(cbReferenceId));
      setSelectedDoc('aadhaar');
      setAadhaarMethod('digilocker');
      setStep('verifying');
    }
  }, [searchParams]);

  useEffect(() => {
    if (step === 'verifying' && (referenceId || verificationId)) {
      completeDigiLockerVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, referenceId, verificationId]);

  useEffect(() => {
    if (!loading && (profile?.aadhaar_verified || (profile as any)?.kyc_verified)) {
      router.replace(from);
    }
  }, [profile, loading, router, from]);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  };

  // ── Aadhaar handlers ───────────────────────────────────────────────────────

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
    setFormattedAadhaar(formatAadhaar(value));
    setAadhaarNumber(value);
    setAadhaarError('');
  };

  const handleAadhaarSubmit = async () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) { setAadhaarError('Enter a valid 12-digit Aadhaar number'); return; }
    if (!validateVerhoeff(aadhaarNumber)) { setAadhaarError('Invalid Aadhaar number'); return; }
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired. Please log in again.');
      const res = await fetch('/api/kyc/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aadhaarNumber, method: aadhaarMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate KYC');

      if (aadhaarMethod === 'uid_lookup') {
        // Direct success — no redirect needed
        setVerifiedName(data.verifiedName || '');
        setVerifiedAddress(data.verifiedAddress || '');
        setMaskedDoc(data.maskedAadhaar || '');
        await refreshProfile();
        setStep('success');
        toast({ title: 'KYC Complete', description: 'Your Aadhaar has been verified.' });
      } else {
        setDigilockerUrl(data.digilockerUrl);
        setVerificationId(data.verificationId);
        setReferenceId(data.referenceId ?? null);
        setStep('redirect');
      }
    } catch (err) {
      toast({ title: 'KYC failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const completeDigiLockerVerification = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired. Please log in again.');
      const res = await fetch('/api/kyc/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referenceId, verificationId, aadhaarNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setVerifiedName(data.verifiedName || '');
      setVerifiedAddress(data.verifiedAddress || '');
      setMaskedDoc(data.maskedAadhaar || '');
      await refreshProfile();
      setStep('success');
      toast({ title: 'KYC Complete', description: 'Your Aadhaar has been verified.' });
    } catch (err) {
      toast({ title: 'Verification Failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
      setStep('select_doc');
      setSelectedDoc(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ── PAN / Passport / Voter ID handler ─────────────────────────────────────

  const handleDocumentVerify = async () => {
    if (!selectedDoc || selectedDoc === 'aadhaar') return;

    // Validate
    if (selectedDoc === 'pan') {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase())) { setPanError('Invalid PAN format (e.g. ABCDE1234F)'); return; }
    }
    if (selectedDoc === 'passport') {
      if (!/^[A-Z][0-9]{7}$/.test(passportNumber.toUpperCase())) { setPassportError('Invalid passport number (e.g. A1234567)'); return; }
      if (!passportDob) { setPassportError('Date of birth is required'); return; }
    }
    if (selectedDoc === 'voter_id') {
      if (voterId.trim().length < 6) { setVoterIdError('Enter a valid EPIC number'); return; }
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired. Please log in again.');

      const body: Record<string, string> = { docType: selectedDoc };
      if (selectedDoc === 'pan') { body.pan = pan.toUpperCase(); body.name = panName; }
      if (selectedDoc === 'passport') { body.passportNumber = passportNumber.toUpperCase(); body.dob = passportDob; }
      if (selectedDoc === 'voter_id') { body.voterId = voterId.toUpperCase(); }

      const res = await fetch('/api/kyc/verify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setVerifiedName(data.verifiedName || '');
      setMaskedDoc(
        selectedDoc === 'pan' ? `${pan.slice(0,3)}XXXXXXX` :
        selectedDoc === 'passport' ? `${passportNumber.slice(0,2)}XXXXX` :
        `${voterId.slice(0,3)}XXXXX`
      );
      await refreshProfile();
      setStep('success');
      toast({ title: 'KYC Complete', description: 'Your identity has been verified.' });
    } catch (err) {
      toast({ title: 'Verification Failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const progressStep = step === 'select_doc' ? 1 : step === 'enter_details' ? 2 : step === 'redirect' || step === 'verifying' ? 2 : 3;
  const KYC_STEPS = ['Choose Document', 'Verify', 'Done'];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logoMain.src} alt="CourierX" className="h-16 w-auto rounded-lg" />
          <h1 className="font-typewriter text-2xl font-bold text-foreground">KYC Verification</h1>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-between px-2">
          {KYC_STEPS.map((label, i) => {
            const stepNum = i + 1;
            const isCompleted = progressStep > stepNum;
            const isActive = progressStep === stepNum;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${isCompleted ? 'bg-emerald-600 text-white' : isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-muted text-muted-foreground'}`}>
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
                  </div>
                  <span className={`mt-1.5 text-[11px] font-medium whitespace-nowrap ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                </div>
                {i < KYC_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mt-[-18px] ${progressStep > stepNum ? 'bg-emerald-600' : 'bg-border'}`} />}
              </div>
            );
          })}
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-typewriter text-xl flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Identity Verification
            </CardTitle>
            <CardDescription>
              {step === 'select_doc' && 'Choose a document to verify your identity'}
              {step === 'enter_details' && `Enter your ${DOC_OPTIONS.find(d => d.type === selectedDoc)?.label} details`}
              {step === 'redirect' && 'Complete verification on DigiLocker'}
              {step === 'verifying' && 'Completing your verification...'}
              {step === 'success' && 'Your identity has been verified successfully'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* Step 1: Document selection */}
            {step === 'select_doc' && (
              <div className="space-y-3">
                {DOC_OPTIONS.map(doc => (
                  <button
                    key={doc.type}
                    onClick={() => { setSelectedDoc(doc.type); setStep('enter_details'); }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-left group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
                      <img src={doc.icon} alt={doc.label} className="h-8 w-8 object-contain" draggable={false} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{doc.label}</p>
                      <p className="text-xs text-muted-foreground">{doc.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Enter details */}
            {step === 'enter_details' && selectedDoc === 'aadhaar' && (
              <div className="space-y-4">
                {/* Aadhaar method toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                  {(['digilocker', 'uid_lookup'] as AadhaarMethod[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setAadhaarMethod(m)}
                      className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${aadhaarMethod === m ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {m === 'digilocker' ? '🔐 DigiLocker' : '🔢 UID Lookup'}
                    </button>
                  ))}
                </div>
                {aadhaarMethod === 'digilocker' && (
                  <Alert><Lock className="h-4 w-4" /><AlertDescription className="text-xs">You'll be redirected to DigiLocker to authenticate with your Aadhaar-linked mobile OTP.</AlertDescription></Alert>
                )}
                {aadhaarMethod === 'uid_lookup' && (
                  <Alert><FileText className="h-4 w-4" /><AlertDescription className="text-xs">Your Aadhaar number is verified directly against the UIDAI database. No redirect needed.</AlertDescription></Alert>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Aadhaar Number</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="XXXX XXXX XXXX"
                    className="font-mono tracking-widest text-center text-lg"
                    value={formattedAadhaar}
                    onChange={handleAadhaarChange}
                  />
                  {aadhaarError && <p className="text-xs text-destructive">{aadhaarError}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setStep('select_doc'); setSelectedDoc(null); setFormattedAadhaar(''); setAadhaarNumber(''); setAadhaarError(''); }}>Back</Button>
                  <Button className="flex-1 btn-press" onClick={handleAadhaarSubmit} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    {aadhaarMethod === 'digilocker' ? 'Open DigiLocker' : 'Verify Now'}
                  </Button>
                </div>
              </div>
            )}

            {step === 'enter_details' && selectedDoc === 'pan' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">PAN Number</label>
                  <Input placeholder="ABCDE1234F" maxLength={10} value={pan} onChange={e => { setPan(e.target.value.toUpperCase()); setPanError(''); }} className="font-mono tracking-widest uppercase" />
                  {panError && <p className="text-xs text-destructive">{panError}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Name on PAN <span className="text-muted-foreground text-xs">(optional, improves accuracy)</span></label>
                  <Input placeholder="As printed on PAN card" value={panName} onChange={e => setPanName(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setStep('select_doc'); setSelectedDoc(null); setPan(''); setPanName(''); setPanError(''); }}>Back</Button>
                  <Button className="flex-1 btn-press" onClick={handleDocumentVerify} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    Verify PAN
                  </Button>
                </div>
              </div>
            )}

            {step === 'enter_details' && selectedDoc === 'passport' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Passport Number</label>
                  <Input placeholder="A1234567" maxLength={8} value={passportNumber} onChange={e => { setPassportNumber(e.target.value.toUpperCase()); setPassportError(''); }} className="font-mono tracking-widest uppercase" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input type="date" value={passportDob} onChange={e => { setPassportDob(e.target.value); setPassportError(''); }} />
                  {passportError && <p className="text-xs text-destructive">{passportError}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setStep('select_doc'); setSelectedDoc(null); setPassportNumber(''); setPassportDob(''); setPassportError(''); }}>Back</Button>
                  <Button className="flex-1 btn-press" onClick={handleDocumentVerify} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    Verify Passport
                  </Button>
                </div>
              </div>
            )}

            {step === 'enter_details' && selectedDoc === 'voter_id' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Voter ID (EPIC Number)</label>
                  <Input placeholder="ABC1234567" value={voterId} onChange={e => { setVoterId(e.target.value.toUpperCase()); setVoterIdError(''); }} className="font-mono tracking-widest uppercase" />
                  {voterIdError && <p className="text-xs text-destructive">{voterIdError}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setStep('select_doc'); setSelectedDoc(null); setVoterId(''); setVoterIdError(''); }}>Back</Button>
                  <Button className="flex-1 btn-press" onClick={handleDocumentVerify} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    Verify Voter ID
                  </Button>
                </div>
              </div>
            )}

            {/* DigiLocker redirect step */}
            {step === 'redirect' && (
              <div className="space-y-6 text-center">
                <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                  <p>You'll be redirected to DigiLocker to log in with your Aadhaar-linked mobile number and grant consent.</p>
                  <p className="text-xs">The link expires in 10 minutes.</p>
                </div>
                <Button className="w-full btn-press" onClick={() => window.location.href = digilockerUrl}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open DigiLocker
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setStep('enter_details'); }}>
                  Go back
                </Button>
              </div>
            )}

            {/* Verifying */}
            {step === 'verifying' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Fetching your verified data...</p>
              </div>
            )}

            {/* Success */}
            {step === 'success' && (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-typewriter font-semibold">Verification Complete</h3>
                  {verifiedName && <p className="text-sm font-medium text-foreground">{verifiedName}</p>}
                  {maskedDoc && <p className="text-xs text-muted-foreground font-mono">{maskedDoc}</p>}
                </div>
                {verifiedAddress && (
                  <div className="bg-secondary/50 rounded-lg p-4 text-left">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Registered Address</p>
                        <p className="text-sm font-medium">{verifiedAddress}</p>
                      </div>
                    </div>
                  </div>
                )}
                <Button onClick={() => router.replace(from)} className="w-full btn-press">
                  Continue to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Trust badges */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900/50 dark:to-blue-950/20 border border-slate-200/60 dark:border-slate-700/40">
          <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 text-center">Secured by</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { src: '/logos/uidai.svg', alt: 'UIDAI' },
              { src: '/logos/digilocker.svg', alt: 'DigiLocker' },
              { src: '/logos/cashfree.svg', alt: 'Cashfree' },
              { src: '/logos/meity.svg', alt: 'MeitY' },
            ].map((logo, i) => (
              <div key={logo.alt} className="flex items-center gap-3">
                {i > 0 && <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />}
                <img src={logo.src} alt={logo.alt} className="h-6 w-auto object-contain opacity-80" draggable={false} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <img src="/logos/govt-india.svg" alt="Government of India" className="h-8 w-auto object-contain opacity-70" draggable={false} />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Powered by Cashfree Secure ID · Verified by Government of India
        </p>
      </div>
    </div>
  );
}

export default function KycVerification() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <KycVerificationInner />
    </Suspense>
  );
}
