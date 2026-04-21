import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FileText, Package, Ruler, Scale } from 'lucide-react';

export interface DocumentDetails {
  packetType: 'envelope' | 'small-packet' | 'large-packet' | 'tube' | '';
  documentType: string;
  description: string;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

interface CXBCDocumentDetailsStepProps {
  data: DocumentDetails;
  onUpdate: (updates: Partial<DocumentDetails>) => void;
}

const PACKET_TYPES = [
  { value: 'envelope', label: 'Envelope', description: 'Flat documents', icon: FileText, maxWeight: 100 },
  { value: 'small-packet', label: 'Small Packet', description: 'Up to 500g', icon: Package, maxWeight: 500 },
  { value: 'large-packet', label: 'Large Packet', description: 'Up to 2kg', icon: Package, maxWeight: 2000 },
  { value: 'tube', label: 'Tube', description: 'Rolled documents', icon: Package, maxWeight: 1000 },
];

const DOCUMENT_TYPES = [
  'Legal Documents',
  'Educational Certificates',
  'Government Documents',
  'Medical Records',
  'Business Contracts',
  'Property Documents',
  'Tax Documents',
  'Other',
];

export const CXBCDocumentDetailsStep = ({ data, onUpdate }: CXBCDocumentDetailsStepProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Details
        </CardTitle>
        <CardDescription>Specify the type and dimensions of the document package</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Packet Type */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Packet Type *</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PACKET_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => onUpdate({ packetType: type.value as DocumentDetails['packetType'] })}
                  className={cn(
                    "p-4 rounded-lg border-2 text-center transition-all",
                    data.packetType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium text-sm">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Document Type */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Document Type *</Label>
          <div className="flex flex-wrap gap-2">
            {DOCUMENT_TYPES.map((docType) => (
              <button
                key={docType}
                type="button"
                onClick={() => onUpdate({ documentType: docType })}
                className={cn(
                  "px-4 py-2 rounded-lg border text-sm transition-all",
                  data.documentType === docType
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:border-primary/50"
                )}
              >
                {docType}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Brief description of documents being shipped..."
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={3}
          />
        </div>

        {/* Weight */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Weight *
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              max="2000"
              placeholder="Enter weight"
              value={data.weightGrams || ''}
              onChange={(e) => onUpdate({ weightGrams: parseInt(e.target.value) || 0 })}
              className="max-w-[200px]"
            />
            <span className="text-muted-foreground">grams</span>
          </div>
          {data.weightGrams > 0 && (
            <p className="text-sm text-muted-foreground">
              {data.weightGrams < 100 ? 'Light packet' : data.weightGrams < 500 ? 'Medium packet' : 'Heavy packet'}
            </p>
          )}
        </div>

        {/* Dimensions */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Dimensions (Optional)
          </Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="length" className="text-sm">Length (cm)</Label>
              <Input
                id="length"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="L"
                value={data.lengthCm || ''}
                onChange={(e) => onUpdate({ lengthCm: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="width" className="text-sm">Width (cm)</Label>
              <Input
                id="width"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="W"
                value={data.widthCm || ''}
                onChange={(e) => onUpdate({ widthCm: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height" className="text-sm">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="H"
                value={data.heightCm || ''}
                onChange={(e) => onUpdate({ heightCm: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Providing accurate dimensions helps calculate the best shipping rate
          </p>
        </div>

        {/* Info Card */}
        <div className="p-4 bg-accent/30 rounded-lg border border-accent">
          <p className="text-sm font-medium mb-2">Document Shipping Guidelines</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Documents must be properly sealed in tamper-proof packaging</li>
            <li>• Maximum weight: 2kg per shipment</li>
            <li>• No currency, cards, or valuables allowed</li>
            <li>• Document shipments bypass QC and ship directly</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export const initialDocumentDetails: DocumentDetails = {
  packetType: '',
  documentType: '',
  description: '',
  weightGrams: 0,
  lengthCm: 0,
  widthCm: 0,
  heightCm: 0,
};
