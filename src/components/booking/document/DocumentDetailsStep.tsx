import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { DocumentBookingData } from '@/views/DocumentBooking';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FileText, Package, Ruler, Scale } from 'lucide-react';

interface DocumentDetailsStepProps {
  data: DocumentBookingData;
  onUpdate: (updates: Partial<DocumentBookingData>) => void;
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

// ─── Stable text input that uses local state to prevent parent re-render blink ──
interface StableInputProps {
  value: string | number;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  min?: string;
  max?: string;
  rows?: number;
  isTextarea?: boolean;
}

const StableInput = memo(({
  value,
  onChange,
  type = 'text',
  placeholder,
  id,
  className = '',
  min,
  max,
  rows,
  isTextarea = false,
}: StableInputProps) => {
  const [localValue, setLocalValue] = useState(String(value ?? ''));
  const isFocused = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only sync from parent when the input is NOT focused (programmatic updates only)
  useEffect(() => {
    if (!isFocused.current) {
      const parentStr = String(value ?? '');
      setLocalValue(parentStr);
    }
  }, [value]);

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);

    // Debounce the parent update to avoid re-render storms
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange(newVal);
    }, 300);
  }, [onChange]);

  // Flush on blur so parent always gets the latest value
  const handleBlur = useCallback(() => {
    isFocused.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onChange(localValue);
  }, [localValue, onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const inputClasses = cn(
    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
    "ring-offset-background placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    className,
  );

  if (isTextarea) {
    return (
      <textarea
        id={id}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows || 3}
        className={cn(inputClasses, "min-h-[80px] resize-none")}
      />
    );
  }

  return (
    <input
      id={id}
      type={type}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      min={min}
      max={max}
      className={cn(inputClasses, "h-10")}
    />
  );
});

StableInput.displayName = 'StableInput';

// ─── Main Component ─────────────────────────────────────────────────────────────

export const DocumentDetailsStep = memo(({ data, onUpdate }: DocumentDetailsStepProps) => {
  const handleDescriptionChange = useCallback((val: string) => {
    onUpdate({ description: val });
  }, [onUpdate]);

  const handleWeightChange = useCallback((val: string) => {
    onUpdate({ weight: parseInt(val) || 0 });
  }, [onUpdate]);

  const handleLengthChange = useCallback((val: string) => {
    onUpdate({ length: parseInt(val) || 0 });
  }, [onUpdate]);

  const handleWidthChange = useCallback((val: string) => {
    onUpdate({ width: parseInt(val) || 0 });
  }, [onUpdate]);

  const handleHeightChange = useCallback((val: string) => {
    onUpdate({ height: parseInt(val) || 0 });
  }, [onUpdate]);

  return (
    <div className="space-y-8">
      {/* Packet Type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Packet Type *</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PACKET_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => onUpdate({ packetType: type.value as DocumentBookingData['packetType'] })}
                className={cn(
                  "p-4 rounded-lg border-2 text-center",
                  data.packetType === type.value
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:border-muted-foreground/50"
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
        <Label className="text-base font-semibold">Document Type *</Label>
        <div className="flex flex-wrap gap-2">
          {DOCUMENT_TYPES.map((docType) => (
            <button
              key={docType}
              type="button"
              onClick={() => onUpdate({ documentType: docType })}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm",
                data.documentType === docType
                  ? "border-destructive bg-destructive/5 text-foreground"
                  : "border-border hover:border-muted-foreground/50"
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
        <StableInput
          id="description"
          value={data.description}
          onChange={handleDescriptionChange}
          placeholder="Brief description of documents being shipped..."
          isTextarea
          rows={3}
        />
      </div>

      {/* Weight */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Weight *
        </Label>
        <div className="flex items-center gap-3">
          <StableInput
            type="number"
            min="1"
            max="2000"
            placeholder="Enter weight"
            value={data.weight || ''}
            onChange={handleWeightChange}
            className="max-w-[200px]"
          />
          <span className="text-muted-foreground">grams</span>
        </div>
        {data.weight > 0 && (
          <p className="text-sm text-muted-foreground">
            {data.weight < 100 ? 'Light packet' : data.weight < 500 ? 'Medium packet' : 'Heavy packet'}
          </p>
        )}
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Ruler className="h-4 w-4" />
          Dimensions (Optional)
        </Label>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="length" className="text-sm">Length (cm)</Label>
            <StableInput
              id="length"
              type="number"
              min="1"
              placeholder="L"
              value={data.length || ''}
              onChange={handleLengthChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width" className="text-sm">Width (cm)</Label>
            <StableInput
              id="width"
              type="number"
              min="1"
              placeholder="W"
              value={data.width || ''}
              onChange={handleWidthChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height" className="text-sm">Height (cm)</Label>
            <StableInput
              id="height"
              type="number"
              min="1"
              placeholder="H"
              value={data.height || ''}
              onChange={handleHeightChange}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Providing accurate dimensions helps us calculate the best shipping rate
        </p>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-accent/30 rounded-lg border border-accent">
        <p className="text-sm text-foreground font-medium mb-2">Document Shipping Guidelines</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Documents must be properly sealed in tamper-proof packaging</li>
          <li>• Maximum weight: 2kg per shipment</li>
          <li>• Original documents should be backed up before shipping</li>
          <li>• No currency, cards, or valuables allowed</li>
        </ul>
      </div>
    </div>
  );
});

DocumentDetailsStep.displayName = 'DocumentDetailsStep';
