import { useState, useMemo, useCallback } from 'react';
import { format, addMonths, isSameDay } from 'date-fns';
import { Medicine, getDefaultExpiryDate } from './MedicineCard';
import { ManufacturerSearch } from './ManufacturerSearch';
import { MedicineNameSearch } from './MedicineNameSearch';
import { getHsnCode, type MedicineSuggestion } from '@/lib/medicine/medicineData';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CalendarIcon, Check, X, Info, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicineFormProps {
  medicine: Medicine;
  onSave: (medicine: Medicine) => void;
  onCancel: () => void;
  isEditing: boolean;
}

const MEDICINE_TYPES = [
  { value: 'allopathy', label: 'Allopathy' },
  { value: 'homeopathy', label: 'Homeopathy' },
  { value: 'ayurvedic', label: 'Ayurvedic' },
  { value: 'other', label: 'Other' },
];

const CATEGORIES = [
  { value: 'branded', label: 'Branded' },
  { value: 'generic', label: 'Generic' },
];

const FORMS = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'semi-liquid', label: 'Semi-Liquid' },
  { value: 'powder', label: 'Powder' },
];

const HSN_SUGGESTIONS = [
  { code: '30049099', name: 'Other medicaments' },
  { code: '30042099', name: 'Antibiotics' },
  { code: '30043900', name: 'Hormones' },
  { code: '30044990', name: 'Alkaloids' },
  { code: '30049011', name: 'Ayurvedic medicines' },
];

export const MedicineForm = ({ medicine, onSave, onCancel, isEditing }: MedicineFormProps) => {
  const [formData, setFormData] = useState<Medicine>(medicine);
  const [errors, setErrors] = useState<string[]>([]);

  // Recalculates automatically if today's date changes (component remount)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const sixMonthsFromNow = useMemo(() => addMonths(today, 6), [today]);
  const sevenMonthsFromNow = useMemo(() => addMonths(today, 7), [today]);

  // Check expiry warning (6-7 months)
  const hasExpiryWarning = formData.expiryDate &&
    formData.expiryDate >= sixMonthsFromNow &&
    formData.expiryDate <= sevenMonthsFromNow;

  // Expiry validation: valid if >= 6 months from today
  const isExpiryValid = formData.expiryDate ? formData.expiryDate >= sixMonthsFromNow : false;
  const isExpiryInvalid = formData.expiryDate ? formData.expiryDate < sixMonthsFromNow : false;

  // Check if expiry is still at the auto-set default (same day as 6 months from now)
  const isExpiryAutoSet = formData.expiryDate ? isSameDay(formData.expiryDate, getDefaultExpiryDate()) : false;

  const supplyDays = formData.dailyDosage > 0
    ? Math.ceil(formData.unitCount / formData.dailyDosage)
    : 0;
  const totalValue = formData.unitCount * formData.unitPrice;
  const isOver90Days = supplyDays > 90;
  const isOverValueCap = totalValue > 25000;

  const updateField = useCallback(<K extends keyof Medicine>(key: K, value: Medicine[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setErrors([]);
  }, []);

  const validateAndSave = () => {
    const newErrors: string[] = [];

    if (!formData.medicineType) newErrors.push('Please select medicine type');
    if (!formData.category) newErrors.push('Please select category');
    if (!formData.form) newErrors.push('Please select medicine form');
    if (!formData.medicineName.trim()) newErrors.push('Please enter medicine name');
    if (formData.unitCount <= 0) newErrors.push('Unit count must be greater than 0');
    if (formData.unitPrice <= 0) newErrors.push('Unit price must be greater than 0');
    if (formData.dailyDosage <= 0) newErrors.push('Daily dosage must be greater than 0');
    if (!formData.manufacturerName.trim()) newErrors.push('Please enter manufacturer name');
    if (!formData.manufacturerAddress.trim()) newErrors.push('Please enter manufacturer address');
    if (!formData.batchNo.trim()) newErrors.push('Please enter batch number');
    if (!formData.mfgDate) newErrors.push('Please select manufacturing date');
    if (!formData.expiryDate) newErrors.push('Please select expiry date');
    if (!formData.hsnCode.trim() || formData.hsnCode.length !== 8) newErrors.push('HSN code must be 8 digits');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  };

  return (
    <div className="space-y-6 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-lg">
          {isEditing ? 'Edit Medicine' : 'Add New Medicine'}
        </h4>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={validateAndSave}
            disabled={isOver90Days || isOverValueCap}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Check className="h-4 w-4 mr-1" />
            {isEditing ? 'Update' : 'Add Medicine'}
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside text-sm">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Medicine Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Medicine Type *</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MEDICINE_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updateField('medicineType', type.value as Medicine['medicineType'])}
              className={cn(
                "p-3 rounded-lg border-2 text-center text-sm font-medium transition-all btn-press",
                formData.medicineType === type.value
                  ? "border-destructive bg-destructive/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Category *</Label>
        <RadioGroup
          value={formData.category}
          onValueChange={(value) => updateField('category', value as Medicine['category'])}
          className="flex gap-6"
        >
          {CATEGORIES.map((cat) => (
            <div key={cat.value} className="flex items-center space-x-2">
              <RadioGroupItem value={cat.value} id={`${medicine.id}-${cat.value}`} />
              <Label htmlFor={`${medicine.id}-${cat.value}`} className="cursor-pointer">{cat.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Form */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Form *</Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {FORMS.map((form) => (
            <button
              key={form.value}
              type="button"
              onClick={() => updateField('form', form.value as Medicine['form'])}
              className={cn(
                "p-2.5 rounded-lg border-2 text-center text-sm font-medium transition-all btn-press",
                formData.form === form.value
                  ? "border-destructive bg-destructive/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              {form.label}
            </button>
          ))}
        </div>
      </div>

      {/* Medicine Name — Autocomplete Search */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Medicine Name *</Label>
        <MedicineNameSearch
          value={formData.medicineName}
          onChange={(name) => updateField('medicineName', name)}
          onSelect={(suggestion) => {
            setFormData(prev => ({
              ...prev,
              medicineName: suggestion.name,
              ...(suggestion.form && { form: suggestion.form }),
              ...(suggestion.type && { medicineType: suggestion.type }),
              ...(suggestion.manufacturer && { manufacturerName: suggestion.manufacturer }),
              hsnCode: suggestion.hsnCode,
            }));
            setErrors([]);
          }}
        />
      </div>

      {/* Inventory Data */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Inventory Details *</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Total Units</Label>
            <Input
              type="number"
              min="1"
              placeholder="e.g., 60"
              value={formData.unitCount || ''}
              onChange={(e) => updateField('unitCount', parseInt(e.target.value) || 0)}
              className="input-premium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Price per Unit (₹)</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g., 15.50"
              value={formData.unitPrice || ''}
              onChange={(e) => updateField('unitPrice', parseFloat(e.target.value) || 0)}
              className="input-premium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Daily Dosage ({formData.form === 'liquid' || formData.form === 'semi-liquid' ? 'ml/dose' : 'units/day'})
            </Label>
            <Input
              type="number"
              min="1"
              placeholder={formData.form === 'liquid' || formData.form === 'semi-liquid' ? 'e.g., 10' : 'e.g., 2'}
              value={formData.dailyDosage === 0 ? '' : formData.dailyDosage}
              onChange={(e) => {
                const val = e.target.value;
                updateField('dailyDosage', val === '' ? 0 : parseInt(val) || 0);
              }}
              className="input-premium"
            />
          </div>
        </div>

        {/* Supply & Value Indicators */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg border text-sm",
            isOver90Days ? "bg-destructive/10 border-destructive text-destructive" : "bg-accent/30 border-accent"
          )}>
            <span className="text-muted-foreground">Supply:</span>
            <span className="font-typewriter font-bold">{supplyDays} days</span>
            {isOver90Days && <span className="text-xs">(Max 90)</span>}
          </div>
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg border text-sm",
            isOverValueCap ? "bg-destructive/10 border-destructive text-destructive" : "bg-accent/30 border-accent"
          )}>
            <span className="text-muted-foreground">Value:</span>
            <span className="font-typewriter font-bold">₹{totalValue.toLocaleString('en-IN')}</span>
            {isOverValueCap && <span className="text-xs">(Max ₹25K)</span>}
          </div>
        </div>
      </div>

      {/* Manufacturer Details */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Manufacturer Details *</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Conditional: autocomplete for Branded, plain input for Generic */}
          {formData.category === 'branded' ? (
            <ManufacturerSearch
              value={formData.manufacturerName}
              onSelect={(name, address) => {
                setFormData(prev => ({
                  ...prev,
                  manufacturerName: name,
                  ...(address ? { manufacturerAddress: address } : {}),
                }));
                setErrors([]);
              }}
            />
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Manufacturer Name</Label>
              <Input
                placeholder="e.g., Sun Pharma"
                value={formData.manufacturerName}
                onChange={(e) => updateField('manufacturerName', e.target.value)}
                className="input-premium"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Manufacturer Address</Label>
            <Input
              placeholder="City, State"
              value={formData.manufacturerAddress}
              onChange={(e) => updateField('manufacturerAddress', e.target.value)}
              className={cn(
                'input-premium',
                formData.category === 'branded' && formData.manufacturerAddress && 'border-emerald-500/30'
              )}
              readOnly={formData.category === 'branded' && !!formData.manufacturerAddress && formData.manufacturerAddress.length > 10}
            />
            {formData.category === 'branded' && formData.manufacturerAddress && formData.manufacturerAddress.length > 10 && (
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                onClick={() => updateField('manufacturerAddress', '')}
              >
                Edit address manually
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Manufacturing Date Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Manufacturing Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal input-premium",
                    !formData.mfgDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.mfgDate ? format(formData.mfgDate, "dd MMM yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.mfgDate || undefined}
                  onSelect={(date) => updateField('mfgDate', date || null)}
                  disabled={(date) => date > today}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">Must be today or earlier</p>
          </div>

          {/* Batch Number */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Batch Number *</Label>
            <Input
              placeholder="e.g., BT2024001"
              value={formData.batchNo}
              onChange={(e) => updateField('batchNo', e.target.value)}
              className="input-premium"
            />
          </div>

          {/* Expiry Date Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">Expiry Date *</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    Medicines must have at least 6 months of remaining shelf life.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal input-premium transition-colors",
                    !formData.expiryDate && "text-muted-foreground",
                    isExpiryValid && "border-emerald-500 ring-1 ring-emerald-500/20",
                    isExpiryInvalid && "border-destructive ring-1 ring-destructive/20 text-destructive",
                    hasExpiryWarning && isExpiryValid && "border-warning text-warning ring-1 ring-warning/20"
                  )}
                >
                  <CalendarIcon className={cn(
                    "mr-2 h-4 w-4",
                    isExpiryValid && !hasExpiryWarning && "text-emerald-500",
                    isExpiryInvalid && "text-destructive"
                  )} />
                  {formData.expiryDate ? format(formData.expiryDate, "dd MMM yyyy") : "Select date"}
                  {isExpiryValid && !hasExpiryWarning && (
                    <ShieldCheck className="ml-auto h-4 w-4 text-emerald-500" />
                  )}
                  {isExpiryInvalid && (
                    <AlertTriangle className="ml-auto h-4 w-4 text-destructive" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.expiryDate || undefined}
                  onSelect={(date) => updateField('expiryDate', date || null)}
                  disabled={(date) => date < sixMonthsFromNow}
                  defaultMonth={formData.expiryDate || sixMonthsFromNow}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {/* Auto-set badge */}
            {isExpiryAutoSet && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-normal gap-1">
                <ShieldCheck className="h-3 w-3" />
                Auto-set to 6 months from today
              </Badge>
            )}
            {/* Helper text with validation color */}
            <p className={cn(
              "text-xs",
              isExpiryValid ? "text-emerald-500" : isExpiryInvalid ? "text-destructive" : "text-muted-foreground"
            )}>
              {isExpiryInvalid
                ? "⚠ Expiry is below 6 months — not allowed"
                : "Minimum 6 months shelf life required"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Expiry Warning */}
      {hasExpiryWarning && (
        <Alert className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            This medicine expires within 7 months. Ensure the consignee can use it before expiry.
          </AlertDescription>
        </Alert>
      )}

      {/* HSN Code */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">HSN Code (8 digits) *</Label>
        <Input
          placeholder="e.g., 30049099"
          maxLength={8}
          value={formData.hsnCode}
          onChange={(e) => updateField('hsnCode', e.target.value.replace(/\D/g, '').slice(0, 8))}
          className="input-premium font-typewriter"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {HSN_SUGGESTIONS.map((hsn) => (
            <button
              key={hsn.code}
              type="button"
              onClick={() => updateField('hsnCode', hsn.code)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full border transition-all btn-press",
                formData.hsnCode === hsn.code
                  ? "border-destructive bg-destructive/10"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              {hsn.code} - {hsn.name}
            </button>
          ))}
        </div>
      </div>

      {/* Controlled Drug */}
      <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
        <Checkbox
          id={`controlled-${medicine.id}`}
          checked={formData.isControlled}
          onCheckedChange={(checked) => updateField('isControlled', checked === true)}
        />
        <div className="space-y-0.5">
          <Label htmlFor={`controlled-${medicine.id}`} className="cursor-pointer font-medium text-sm">
            This is a controlled/scheduled substance
          </Label>
          <p className="text-xs text-muted-foreground">
            Controlled drugs require additional documentation
          </p>
        </div>
      </div>

      {formData.isControlled && (
        <Alert className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            <strong>Controlled Substance Notice:</strong> This shipment requires special supervision.
            Additional documentation may be requested.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
