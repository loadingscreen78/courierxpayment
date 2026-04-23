import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Lock, Mail, Phone, MapPin, Save, ArrowRightLeft, Clock, CheckCircle2, XCircle,
  User, Calendar, CreditCard, Building2, FileText, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { supabase } from '@/integrations/supabase/client';

export const AccountTab = () => {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const { mediumTap, successFeedback } = useHaptics();
  const { playSuccess } = useSoundEffects();
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);

  // Mobile change request
  const [showMobileDialog, setShowMobileDialog] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [pendingMobileRequest, setPendingMobileRequest] = useState<any>(null);

  // Extended KYC profile data
  const [kycData, setKycData] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      fetchKycData();
      fetchPendingRequests();
    }
  }, [user?.id]);

  const fetchKycData = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone_number, date_of_birth, sex, address_line1, address_line2, landmark, city, state, pincode, aadhaar_number, pan_number, bank_account_number, bank_ifsc, bank_name, estimated_shipments_per_month, aadhaar_verified, aadhaar_address, kyc_completed_at, account_number')
      .eq('user_id', user.id)
      .single();
    if (data) setKycData(data);
  };

  const fetchPendingRequests = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/user/request-change', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      const pending = data.requests?.find(
        (r: any) => r.request_type === 'mobile_change' && r.status === 'pending'
      );
      setPendingMobileRequest(pending || null);
    } catch {}
  };

  const handleSave = async () => {
    mediumTap();
    setIsSaving(true);
    const { error } = await updateProfile({ full_name: fullName });
    setIsSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } else {
      successFeedback();
      playSuccess();
      toast({ title: 'Profile Updated', description: 'Your name has been saved.' });
    }
  };

  const handleMobileChangeRequest = async () => {
    if (!newPhone.match(/^\+91[0-9]{10}$/)) {
      toast({ title: 'Invalid number', description: 'Enter a valid Indian number (+91XXXXXXXXXX)', variant: 'destructive' });
      return;
    }
    setSubmittingRequest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');
      const res = await fetch('/api/user/request-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          request_type: 'mobile_change',
          current_value: profile?.phone_number || '',
          requested_value: newPhone,
          reason: changeReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      toast({ title: 'Request Submitted', description: 'Admin will review your mobile change request.' });
      setShowMobileDialog(false);
      setNewPhone('');
      setChangeReason('');
      fetchPendingRequests();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const hasChanges = fullName !== (profile?.full_name || '');

  const maskValue = (val: string | null | undefined) => {
    if (!val) return '—';
    if (val.length <= 4) return val;
    return val.slice(0, 2) + '•'.repeat(val.length - 4) + val.slice(-2);
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.account_number && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">Account Number</Label>
              <Input value={profile.account_number} disabled className="bg-muted/50 font-mono font-semibold tracking-wider" />
              <p className="text-xs text-muted-foreground">Your unique CourierX account number</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" /> Email Address
            </Label>
            <Input id="email" value={user?.email || ''} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Email cannot be changed after registration</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" /> Phone Number
            </Label>
            <div className="flex gap-2">
              <Input id="phone" value={profile?.phone_number || ''} disabled className="bg-muted/50 flex-1" />
              {pendingMobileRequest ? (
                <Badge variant="outline" className="shrink-0 text-amber-600 border-amber-300 bg-amber-50 gap-1">
                  <Clock className="h-3 w-3" /> Pending
                </Badge>
              ) : (
                <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => setShowMobileDialog(true)}>
                  <ArrowRightLeft className="h-3 w-3" /> Request Change
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Mobile number changes require admin approval for security
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KYC Information - Full details from account opening */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" /> KYC Information
          </CardTitle>
          <CardDescription>Your verified identity details from account opening</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KYC Status */}
          <div className="flex items-center gap-2 mb-2">
            <Label>KYC Status</Label>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              (kycData?.aadhaar_verified || kycData?.kyc_verified) ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
            }`}>
              {(kycData?.aadhaar_verified || kycData?.kyc_verified) ? 'Verified' : 'Pending'}
            </span>
            {kycData?.kyc_completed_at && (
              <span className="text-xs text-muted-foreground">
                Verified on {new Date(kycData.kyc_completed_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Personal Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoField icon={User} label="Full Name" value={kycData?.full_name} />
            <InfoField icon={Calendar} label="Date of Birth" value={kycData?.date_of_birth ? new Date(kycData.date_of_birth).toLocaleDateString() : null} />
            <InfoField icon={User} label="Gender" value={kycData?.sex ? kycData.sex.charAt(0).toUpperCase() + kycData.sex.slice(1) : null} />
            <InfoField icon={Phone} label="Phone" value={kycData?.phone_number} />
          </div>

          {/* Address */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-muted-foreground" /> Registered Address
            </Label>
            <div className="p-3 bg-muted/50 rounded-lg border border-border/50 text-sm">
              {kycData?.address_line1 ? (
                <>
                  <p>{kycData.address_line1}</p>
                  {kycData.address_line2 && <p>{kycData.address_line2}</p>}
                  {kycData.landmark && <p className="text-muted-foreground">Near: {kycData.landmark}</p>}
                  <p>{kycData.city}, {kycData.state} - {kycData.pincode}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Complete KYC to add your address</p>
              )}
            </div>
          </div>

          {/* Aadhaar Address */}
          {kycData?.aadhaar_address && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" /> Sender Address (Aadhaar-linked)
              </Label>
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <p className="text-sm">{kycData.aadhaar_address}</p>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> This address is locked and cannot be modified
              </p>
            </div>
          )}

          {/* Document Details */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-sm font-medium">Document Details</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField icon={FileText} label="Aadhaar Number" value={maskValue(kycData?.aadhaar_number)} />
              <InfoField icon={CreditCard} label="PAN Number" value={maskValue(kycData?.pan_number)} />
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-sm font-medium">Bank Details</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField icon={Building2} label="Bank Name" value={kycData?.bank_name} />
              <InfoField icon={Hash} label="Account Number" value={maskValue(kycData?.bank_account_number)} />
              <InfoField icon={Hash} label="IFSC Code" value={kycData?.bank_ifsc} />
              <InfoField icon={FileText} label="Est. Shipments/Month" value={kycData?.estimated_shipments_per_month} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-accent/30 p-3 rounded-lg">
            All KYC information is locked after verification. Contact support if you need to update any details.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="btn-press gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Mobile Change Request Dialog */}
      <Dialog open={showMobileDialog} onOpenChange={setShowMobileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" /> Request Mobile Number Change
            </DialogTitle>
            <DialogDescription>
              Your request will be reviewed by our admin team. Current number: {profile?.phone_number || 'Not set'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>New Phone Number</Label>
              <Input
                placeholder="+91XXXXXXXXXX"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Reason for Change</Label>
              <Input
                placeholder="e.g. Changed my SIM card"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowMobileDialog(false)}>Cancel</Button>
            <Button onClick={handleMobileChangeRequest} disabled={submittingRequest || !newPhone}>
              {submittingRequest ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function InfoField({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2 p-2.5 bg-muted/30 rounded-lg">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );
}
