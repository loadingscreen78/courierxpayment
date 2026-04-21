import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Mail, Globe, MapPin, FileText, Upload, X } from 'lucide-react';
import { useRef } from 'react';
import { useCountries } from '@/hooks/useCountries';

const ID_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'residence_permit', label: 'Residence Permit' },
];

export interface ConsigneeDetails {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  // Optional ID proof
  idType: string;
  idNumber: string;
  idDocument: File | null;
}

interface CXBCConsigneeStepProps {
  data: ConsigneeDetails;
  onUpdate: (data: ConsigneeDetails) => void;
  selectedCountryCode: string;
}

export const CXBCConsigneeStep = ({ data, onUpdate, selectedCountryCode }: CXBCConsigneeStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { servedCountries } = useCountries();

  const updateField = (field: keyof ConsigneeDetails, value: string | File | null) => {
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

  // Get country name from code
  const selectedCountryName = servedCountries.find(c => c.code === selectedCountryCode)?.name || selectedCountryCode;

  return (
    <div className="space-y-6">
      {/* Consignee Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Consignee (Recipient) Details
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Full name and address for delivery in {selectedCountryName}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                value={data.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Recipient's full name"
                className="input-premium"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number *
              </Label>
              <Input
                type="tel"
                inputMode="tel"
                value={data.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="With country code (e.g., +971 50 123 4567)"
                className="input-premium"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="recipient@email.com"
              className="input-premium"
            />
          </div>

          {/* Country (Display only - selected in step 1) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Country
            </Label>
            <div className="p-3 bg-muted rounded-lg border border-border">
              <span className="font-medium">{selectedCountryName}</span>
              <span className="text-sm text-muted-foreground ml-2">(Selected in Step 1)</span>
            </div>
          </div>

          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address Line 1 *
            </Label>
            <Input
              value={data.addressLine1}
              onChange={(e) => updateField('addressLine1', e.target.value)}
              placeholder="Street address, apartment, suite"
              className="input-premium"
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label>Address Line 2</Label>
            <Input
              value={data.addressLine2}
              onChange={(e) => updateField('addressLine2', e.target.value)}
              placeholder="Building, floor, etc."
              className="input-premium"
            />
          </div>

          {/* City, State, Zipcode */}
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
              <Label>State/Province</Label>
              <Input
                value={data.state}
                onChange={(e) => updateField('state', e.target.value)}
                placeholder="State or Province"
                className="input-premium"
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP/Postal Code *</Label>
              <Input
                value={data.zipcode}
                onChange={(e) => updateField('zipcode', e.target.value)}
                placeholder="ZIP code"
                className="input-premium font-mono"
              />
            </div>
          </div>

          {/* Optional ID Proof Section */}
          <div className="pt-4 border-t border-border space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              ID Proof (Optional)
              <span className="text-xs text-muted-foreground font-normal">- May be required for customs</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID Type</Label>
                <Select value={data.idType} onValueChange={(value) => updateField('idType', value)}>
                  <SelectTrigger className="input-premium">
                    <SelectValue placeholder="Select ID type (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {ID_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ID Number</Label>
                <Input
                  value={data.idNumber}
                  onChange={(e) => updateField('idNumber', e.target.value.toUpperCase())}
                  placeholder="Enter ID number"
                  className="input-premium font-mono"
                  disabled={!data.idType}
                />
              </div>
            </div>

            {/* Optional File Upload */}
            {data.idType && (
              <div className="space-y-2">
                <Label>Upload ID Document (Optional)</Label>
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
                    className="w-full h-16 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5" />
                      <span className="text-xs text-muted-foreground">PDF, JPG, PNG (max 5MB)</span>
                    </div>
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
