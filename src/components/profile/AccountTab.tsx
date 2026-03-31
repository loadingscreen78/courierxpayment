import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, Mail, Phone, MapPin, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffects } from '@/hooks/useSoundEffects';

export const AccountTab = () => {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const { mediumTap, successFeedback } = useHaptics();
  const { playSuccess } = useSoundEffects();
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    mediumTap();
    setIsSaving(true);
    
    const { error } = await updateProfile({
      full_name: fullName,
      phone_number: phoneNumber,
    });
    
    setIsSaving(false);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } else {
      successFeedback();
      playSuccess();
      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
    }
  };

  const hasChanges = fullName !== (profile?.full_name || '') || 
                     phoneNumber !== (profile?.phone_number || '');

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
              <Label className="flex items-center gap-2">
                Account Number
              </Label>
              <Input
                value={profile.account_number}
                disabled
                className="bg-muted/50 font-mono font-semibold tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Your unique CourierX account number
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email Address
            </Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed after registration
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Phone Number
            </Label>
            <Input
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
        </CardContent>
      </Card>

      {/* KYC Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            KYC Information
          </CardTitle>
          <CardDescription>
            Your Aadhaar-verified address is used for all customs declarations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Sender Address (Aadhaar-linked)
            </Label>
            <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
              <p className="text-sm text-foreground">
                {profile?.aadhaar_address || 'Complete KYC to add your address'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              This address is locked and cannot be modified
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>KYC Status</Label>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                profile?.aadhaar_verified 
                  ? 'bg-success/20 text-success' 
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {profile?.aadhaar_verified ? 'Verified' : 'Pending'}
              </span>
              {profile?.kyc_completed_at && (
                <span className="text-xs text-muted-foreground">
                  Verified on {new Date(profile.kyc_completed_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isSaving}
          className="btn-press gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};
