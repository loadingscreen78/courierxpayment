import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Mail, MapPin, FileText, Upload, X, UserPlus } from 'lucide-react';
import { useRef } from 'react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Puducherry'
];

const ID_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'driving_license', label: 'Driving License' },
];

export interface SenderDetails {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  idType: string;
  idNumber: string;
  idDocument: File | null;
}

interface CXBCSenderStepProps {
  data: SenderDetails;
  onUpdate: (data: SenderDetails) => void;
  defaultSender?: {
    name: string;
    phone: string;
    email: string;
  };
  partnerAddress: string;
}

export const CXBCSenderStep = ({ data, onUpdate, defaultSender, partnerAddress }: CXBCSenderStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = (field: keyof SenderDetails, value: string | File | null) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      updateField('idDocument', file);
    }
  };

  const removeFile = () => {
    updateField('idDocument', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const useDefaultSender = () => {
    if (defaultSender) {
      onUpdate({
        ...data,
        fullName: defaultSender.name || '',
        phone: defaultSender.phone || '',
        email: defaultSender.email || '',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Pickup Address Notice */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Pickup Location (Your Shop)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{partnerAddress}</p>
        </CardContent>
      </Card>

      {/* Sender Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Sender Details
            </CardTitle>
            {defaultSender && (
              <Button variant="outline" size="sm" onClick={useDefaultSender}>
                <UserPlus className="h-4 w-4 mr-2" />
                Use Default
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Complete name and address as per Aadhaar/Passport
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name (as per ID) *
              </Label>
              <Input
                value={data.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Complete name as on Aadhaar/Passport"
                className="input-premium"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Mobile Number *
              </Label>
              <Input
                value={data.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+91 9876543210"
                className="input-premium"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="sender@email.com"
              className="input-premium"
            />
          </div>

          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label>Address Line 1 *</Label>
            <Input
              value={data.addressLine1}
              onChange={(e) => updateField('addressLine1', e.target.value)}
              placeholder="House/Flat No., Building Name"
              className="input-premium"
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label>Address Line 2</Label>
            <Input
              value={data.addressLine2}
              onChange={(e) => updateField('addressLine2', e.target.value)}
              placeholder="Street, Area, Landmark"
              className="input-premium"
            />
          </div>

          {/* City, State, Pincode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City *</Label>
              <Input
                value={data.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="City"
                className="input-premium"
              />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Select value={data.state} onValueChange={(value) => updateField('state', value)}>
                <SelectTrigger className="input-premium">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>PIN Code *</Label>
              <Input
                value={data.pincode}
                onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit PIN"
                inputMode="numeric"
                maxLength={6}
                className="input-premium font-mono"
              />
            </div>
          </div>

          {/* ID Document Section */}
          <div className="pt-4 border-t border-border space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Identity Verification *
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID Type *</Label>
                <Select value={data.idType} onValueChange={(value) => updateField('idType', value)}>
                  <SelectTrigger className="input-premium">
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {ID_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {data.idType === 'aadhaar' ? 'Aadhaar Number' : 
                   data.idType === 'passport' ? 'Passport Number' : 
                   data.idType === 'pan' ? 'PAN Number' : 'ID Number'} *
                </Label>
                <Input
                  value={data.idNumber}
                  onChange={(e) => updateField('idNumber', e.target.value.toUpperCase())}
                  placeholder={
                    data.idType === 'aadhaar' ? 'XXXX XXXX XXXX' :
                    data.idType === 'passport' ? 'A1234567' :
                    data.idType === 'pan' ? 'ABCDE1234F' : 'Enter ID number'
                  }
                  className="input-premium font-mono"
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload ID Document *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {data.idDocument ? (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{data.idDocument.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(data.idDocument.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={removeFile}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5" />
                    <span className="text-sm">Click to upload</span>
                    <span className="text-xs text-muted-foreground">PDF, JPG, PNG (max 5MB)</span>
                  </div>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
