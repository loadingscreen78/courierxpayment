import { useRef, memo, useCallback } from 'react';
import { MedicineBookingData } from '@/views/MedicineBooking';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentUploadStepProps {
  prescription: File | null;
  pharmacyBill: File | null;
  consigneeId: File | null;
  controlledDrugsConfirmed: boolean;
  onUpdate: (updates: Partial<MedicineBookingData>) => void;
}

interface DocumentUploadCardProps {
  title: string;
  description: string;
  file: File | null;
  required: boolean;
  accepts: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

const DocumentUploadCard = memo(function DocumentUploadCard({ 
  title, 
  description, 
  file, 
  required,
  accepts,
  onUpload, 
  onRemove 
}: DocumentUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      onUpload(selectedFile);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer btn-press",
        file 
          ? "border-accent bg-accent/10" 
          : "border-dashed border-2 hover:border-muted-foreground"
      )}
      onClick={handleClick}
      style={{ transform: 'translateZ(0)', willChange: 'transform' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accepts}
        onChange={handleFileChange}
        className="hidden"
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              file ? "bg-accent" : "bg-muted"
            )}>
              {file ? (
                <Check className="h-5 w-5 text-accent-foreground" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {title}
                {required && <span className="text-destructive text-sm">*</span>}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {description}
              </CardDescription>
            </div>
          </div>
          {file && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      {file && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
          </div>
        </CardContent>
      )}
      {!file && (
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-6 border-t border-dashed border-border">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPG, PNG (max 10MB)
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
});

const DocumentUploadStepComponent = ({ prescription, pharmacyBill, consigneeId, controlledDrugsConfirmed, onUpdate }: DocumentUploadStepProps) => {
  // Memoize callbacks to prevent DocumentUploadCard re-renders
  const handlePrescriptionUpload = useCallback((file: File) => {
    onUpdate({ prescription: file });
  }, [onUpdate]);

  const handlePrescriptionRemove = useCallback(() => {
    onUpdate({ prescription: null });
  }, [onUpdate]);

  const handlePharmacyBillUpload = useCallback((file: File) => {
    onUpdate({ pharmacyBill: file });
  }, [onUpdate]);

  const handlePharmacyBillRemove = useCallback(() => {
    onUpdate({ pharmacyBill: null });
  }, [onUpdate]);

  const handleConsigneeIdUpload = useCallback((file: File) => {
    onUpdate({ consigneeId: file });
  }, [onUpdate]);

  const handleConsigneeIdRemove = useCallback(() => {
    onUpdate({ consigneeId: null });
  }, [onUpdate]);

  return (
    <div className="space-y-6" style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
      <div className="space-y-2">
        <h3 className="font-typewriter text-lg font-bold">FDA Documents</h3>
        <p className="text-sm text-muted-foreground">
          Upload clear, legible copies of the following documents. These are required by customs and destination country health authorities to permit medicine imports.
        </p>
      </div>

      <div className="grid gap-4" style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
        <DocumentUploadCard
          title="Doctor's Prescription"
          description="Must be by a registered doctor with registration number on letterhead. Recipient name must match consignee. Max 90-day supply."
          file={prescription}
          required={true}
          accepts=".pdf,.jpg,.jpeg,.png"
          onUpload={handlePrescriptionUpload}
          onRemove={handlePrescriptionRemove}
        />

        <DocumentUploadCard
          title="Medicine Purchase Bill"
          description="Patient name must be printed on the bill. Medicines must not expire within 6 months of shipment date."
          file={pharmacyBill}
          required={true}
          accepts=".pdf,.jpg,.jpeg,.png"
          onUpload={handlePharmacyBillUpload}
          onRemove={handlePharmacyBillRemove}
        />

        <DocumentUploadCard
          title="Consignee ID Document"
          description="Passport or International Driving License of the recipient"
          file={consigneeId}
          required={true}
          accepts=".pdf,.jpg,.jpeg,.png"
          onUpload={handleConsigneeIdUpload}
          onRemove={handleConsigneeIdRemove}
        />
      </div>

      {/* Document Guidelines */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Document Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              Prescription must be issued by a registered doctor with their registration number printed on the letterhead — required for customs clearance.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              Prescription must not cover more than a 90-day medicine supply — larger quantities are not permitted for personal import.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              The recipient (consignee) name on the prescription must exactly match the delivery address name.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              The patient name must be printed on the purchase bill — this links the purchase to the prescription.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              Medicines must not have an expiry date within 6 months from shipment — near-expiry medicines will be rejected at customs.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              All documents should be clearly readable without blur or glare.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Controlled Drugs Declaration */}
      <div
        className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${controlledDrugsConfirmed ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : 'border-border bg-muted/30'}`}
        onClick={() => onUpdate({ controlledDrugsConfirmed: !controlledDrugsConfirmed } as any)}
      >
        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${controlledDrugsConfirmed ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
          {controlledDrugsConfirmed && <Check className="h-3 w-3 text-white" />}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium leading-snug">I confirm these medicines are not controlled or narcotic drugs</p>
          <p className="text-xs text-muted-foreground">Controlled substances (opioids, psychotropics, narcotics, etc.) are strictly prohibited for international shipment regardless of prescription. Shipping such medicines is illegal and will result in seizure and legal action.</p>
        </div>
      </div>

      {/* Upload Status Summary */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
        <span className="text-sm font-medium">Documents Uploaded</span>
        <span className="font-typewriter font-bold text-foreground">
          {[prescription, pharmacyBill, consigneeId].filter(Boolean).length} / 3
        </span>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders on parent state changes
export const DocumentUploadStep = memo(DocumentUploadStepComponent);
