import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Send, Building2, User, MapPin, FileText, Loader2, Landmark } from "lucide-react";
import { CXBCApplicationData } from "@/views/cxbc/CXBCApply";
import { useState } from "react";

interface ReviewStepProps {
  data: CXBCApplicationData;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const zoneLabels: Record<string, string> = {
  north: "North Zone",
  south: "South Zone",
  east: "East Zone",
  west: "West Zone",
  central: "Central Zone",
  northeast: "Northeast Zone",
};

export const ReviewStep = ({ data, onBack, onSubmit, isSubmitting }: ReviewStepProps) => {
  const [termsAccepted, setTermsAccepted] = useState(false);

  const getFileName = (url: string) => {
    if (!url) return "Not uploaded";
    if (url.startsWith('pending-upload:')) {
      return url.replace('pending-upload:', '');
    }
    return url.split('/').pop() || 'Uploaded';
  };

  return (
    <div className="space-y-6">
      {/* Business Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Building2 className="h-4 w-4 text-primary" />
          Business Details
        </div>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Business Name</span>
            <span className="font-medium">{data.businessName}</span>
          </div>
          {data.gstNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST Number</span>
              <span className="font-medium">{data.gstNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Zone</span>
            <span className="font-medium">{zoneLabels[data.zone] || data.zone}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Owner Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <User className="h-4 w-4 text-primary" />
          Owner Details
        </div>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Owner Name</span>
            <span className="font-medium">{data.ownerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">PAN Number</span>
            <span className="font-medium">{data.panNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium">{data.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{data.email}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Address */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" />
          Shop Address
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <p className="font-medium">{data.address}</p>
          <p className="text-muted-foreground">
            {data.city}, {data.state} - {data.pincode}
          </p>
        </div>
      </div>

      <Separator />

      {/* Bank Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Landmark className="h-4 w-4 text-primary" />
          Bank Details
        </div>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account Holder</span>
            <span className="font-medium">{data.bankAccountHolderName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account Number</span>
            <span className="font-mono font-medium">
              {"•".repeat(Math.max(0, data.bankAccountNumber.length - 4))}{data.bankAccountNumber.slice(-4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account Type</span>
            <span className="font-medium capitalize">{data.bankAccountType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IFSC Code</span>
            <span className="font-mono font-medium">{data.bankIfsc}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bank</span>
            <span className="font-medium">{data.bankName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Branch</span>
            <span className="font-medium">{data.bankBranch}</span>
          </div>
          {data.bankCity && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Branch Location</span>
              <span className="font-medium">{data.bankCity}, {data.bankState}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-primary" />
          Uploaded Documents
        </div>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aadhaar Card</span>
            <span className="font-medium text-green-600">{getFileName(data.kycAadhaarUrl)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">PAN Card</span>
            <span className="font-medium text-green-600">{getFileName(data.kycPanUrl)}</span>
          </div>
          {data.shopPhotoUrl && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shop Photo</span>
              <span className="font-medium text-green-600">{getFileName(data.shopPhotoUrl)}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Terms & Conditions */}
      <div className="flex items-start space-x-3 p-4 bg-primary/5 rounded-lg">
        <Checkbox 
          id="terms" 
          checked={termsAccepted} 
          onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} 
        />
        <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
          I confirm that all the information provided is accurate and I agree to the{" "}
          <a href="#" className="text-primary hover:underline">CXBC Partner Terms & Conditions</a> and{" "}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
        </label>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          type="button" 
          onClick={onSubmit} 
          className="flex-1" 
          disabled={!termsAccepted || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Application
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

