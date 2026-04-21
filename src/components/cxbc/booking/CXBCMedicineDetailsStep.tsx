import { useState } from 'react';
import { format, addMonths } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CalendarIcon, 
  Check, 
  X, 
  Plus, 
  Pencil, 
  Trash2, 
  Clock, 
  IndianRupee,
  Pill
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Medicine {
  id: string;
  medicineType: 'allopathy' | 'homeopathy' | 'ayurvedic' | 'other' | '';
  category: 'branded' | 'generic' | '';
  form: 'tablet' | 'capsule' | 'liquid' | 'semi-liquid' | 'powder' | '';
  medicineName: string;
  unitCount: number;
  unitPrice: number;
  dailyDosage: number;
  manufacturerName: string;
  manufacturerAddress: string;
  mfgDate: Date | null;
  batchNo: string;
  expiryDate: Date | null;
  hsnCode: string;
  isControlled: boolean;
}

interface CXBCMedicineDetailsStepProps {
  medicines: Medicine[];
  onUpdateMedicines: (medicines: Medicine[]) => void;
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

export const createEmptyMedicine = (): Medicine => ({
  id: crypto.randomUUID(),
  medicineType: '',
  category: '',
  form: '',
  medicineName: '',
  unitCount: 0,
  unitPrice: 0,
  dailyDosage: 1,
  manufacturerName: '',
  manufacturerAddress: '',
  mfgDate: null,
  batchNo: '',
  expiryDate: null,
  hsnCode: '',
  isControlled: false,
});

// Medicine Form Component (inline)
const MedicineForm = ({ 
  medicine, 
  onSave, 
  onCancel, 
  isEditing 
}: { 
  medicine: Medicine; 
  onSave: (m: Medicine) => void; 
  onCancel: () => void; 
  isEditing: boolean; 
}) => {
  const [formData, setFormData] = useState<Medicine>(medicine);
  const [errors, setErrors] = useState<string[]>([]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sixMonthsFromNow = addMonths(today, 6);

  const supplyDays = formData.dailyDosage > 0 
    ? Math.ceil(formData.unitCount / formData.dailyDosage) 
    : 0;
  const totalValue = formData.unitCount * formData.unitPrice;
  const isOver90Days = supplyDays > 90;
  const isOverValueCap = totalValue > 25000;

  const updateField = <K extends keyof Medicine>(key: K, value: Medicine[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setErrors([]);
  };

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
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={validateAndSave}
            disabled={isOver90Days || isOverValueCap}
          >
            <Check className="h-4 w-4 mr-1" />
            {isEditing ? 'Update' : 'Add Medicine'}
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside text-sm">
              {errors.map((error, i) => <li key={i}>{error}</li>)}
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
                "p-3 rounded-lg border-2 text-center text-sm font-medium transition-all",
                formData.medicineType === type.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
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
                "p-2.5 rounded-lg border-2 text-center text-sm font-medium transition-all",
                formData.form === form.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              {form.label}
            </button>
          ))}
        </div>
      </div>

      {/* Medicine Name */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Medicine Name *</Label>
        <Input
          placeholder="Enter medicine name (as on prescription)"
          value={formData.medicineName}
          onChange={(e) => updateField('medicineName', e.target.value)}
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
              inputMode="numeric"
              min="1"
              placeholder="e.g., 60"
              value={formData.unitCount || ''}
              onChange={(e) => updateField('unitCount', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Price per Unit (₹)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="e.g., 15.50"
              value={formData.unitPrice || ''}
              onChange={(e) => updateField('unitPrice', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Daily Dosage (units)</Label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="e.g., 2"
              value={formData.dailyDosage || ''}
              onChange={(e) => updateField('dailyDosage', parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        {/* Supply & Value Indicators */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg border text-sm",
            isOver90Days ? "bg-destructive/10 border-destructive text-destructive" : "bg-accent/30 border-accent"
          )}>
            <Clock className="h-4 w-4" />
            <span className="text-muted-foreground">Supply:</span>
            <span className="font-mono font-bold">{supplyDays} days</span>
            {isOver90Days && <span className="text-xs">(Max 90)</span>}
          </div>
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg border text-sm",
            isOverValueCap ? "bg-destructive/10 border-destructive text-destructive" : "bg-accent/30 border-accent"
          )}>
            <IndianRupee className="h-4 w-4" />
            <span className="text-muted-foreground">Value:</span>
            <span className="font-mono font-bold">₹{totalValue.toLocaleString('en-IN')}</span>
            {isOverValueCap && <span className="text-xs">(Max ₹25K)</span>}
          </div>
        </div>
      </div>

      {/* Manufacturer Details */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Manufacturer Details *</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Manufacturer Name</Label>
            <Input
              placeholder="e.g., Sun Pharma"
              value={formData.manufacturerName}
              onChange={(e) => updateField('manufacturerName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Manufacturer Address (Optional)</Label>
            <Input
              placeholder="City, State"
              value={formData.manufacturerAddress}
              onChange={(e) => updateField('manufacturerAddress', e.target.value)}
            />
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
                    "w-full justify-start text-left font-normal",
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
          </div>

          {/* Batch Number */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Batch Number *</Label>
            <Input
              placeholder="e.g., BT2024001"
              value={formData.batchNo}
              onChange={(e) => updateField('batchNo', e.target.value)}
            />
          </div>

          {/* Expiry Date Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Expiry Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.expiryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expiryDate ? format(formData.expiryDate, "dd MMM yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.expiryDate || undefined}
                  onSelect={(date) => updateField('expiryDate', date || null)}
                  disabled={(date) => date < sixMonthsFromNow}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* HSN Code */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">HSN Code (8 digits) *</Label>
        <Input
          placeholder="e.g., 30049099"
          maxLength={8}
          value={formData.hsnCode}
          onChange={(e) => updateField('hsnCode', e.target.value.replace(/\D/g, '').slice(0, 8))}
          className="font-mono"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {HSN_SUGGESTIONS.map((hsn) => (
            <button
              key={hsn.code}
              type="button"
              onClick={() => updateField('hsnCode', hsn.code)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full border transition-all",
                formData.hsnCode === hsn.code
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
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
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Medicine Card Component (inline)
const MedicineCard = ({ 
  medicine, 
  index, 
  onEdit, 
  onRemove, 
  canRemove 
}: { 
  medicine: Medicine; 
  index: number; 
  onEdit: (id: string) => void; 
  onRemove: (id: string) => void; 
  canRemove: boolean; 
}) => {
  const supplyDays = medicine.dailyDosage > 0 
    ? Math.ceil(medicine.unitCount / medicine.dailyDosage) 
    : 0;
  const totalValue = medicine.unitCount * medicine.unitPrice;
  const isOver90Days = supplyDays > 90;
  const isOverValueCap = totalValue > 25000;

  return (
    <div className={cn(
      "p-4 border rounded-lg",
      (isOver90Days || isOverValueCap) && "border-destructive bg-destructive/5"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
            <h4 className="font-semibold">{medicine.medicineName || 'Untitled Medicine'}</h4>
            {medicine.isControlled && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning text-xs">
                Controlled
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Type</p>
              <p className="capitalize">{medicine.medicineType || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Form</p>
              <p className="capitalize">{medicine.form || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Quantity</p>
              <p>{medicine.unitCount} units</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">HSN Code</p>
              <p className="font-mono">{medicine.hsnCode || '-'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
              isOver90Days ? "bg-destructive/10 text-destructive" : "bg-accent/30"
            )}>
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono font-medium">{supplyDays} days</span>
              {isOver90Days && <span className="text-xs">(Max 90)</span>}
            </div>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
              isOverValueCap ? "bg-destructive/10 text-destructive" : "bg-accent/30"
            )}>
              <IndianRupee className="h-3.5 w-3.5" />
              <span className="font-mono font-medium">₹{totalValue.toLocaleString('en-IN')}</span>
              {isOverValueCap && <span className="text-xs">(Max ₹25,000)</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onEdit(medicine.id)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {canRemove && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onRemove(medicine.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Component
export const CXBCMedicineDetailsStep = ({ 
  medicines, 
  onUpdateMedicines 
}: CXBCMedicineDetailsStepProps) => {
  const [editingMedicineId, setEditingMedicineId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(medicines.length === 0);

  const aggregatedTotalValue = medicines.reduce(
    (sum, m) => sum + (m.unitCount * m.unitPrice), 0
  );
  const aggregatedSupplyDays = medicines.reduce(
    (max, m) => Math.max(max, m.dailyDosage > 0 ? Math.ceil(m.unitCount / m.dailyDosage) : 0), 0
  );
  const isOverValueCap = aggregatedTotalValue > 25000;

  const handleAddMedicine = () => {
    const newMedicine = createEmptyMedicine();
    setEditingMedicineId(newMedicine.id);
    setIsAddingNew(true);
  };

  const handleSaveMedicine = (medicine: Medicine) => {
    if (isAddingNew) {
      onUpdateMedicines([...medicines, medicine]);
    } else {
      onUpdateMedicines(medicines.map(m => m.id === medicine.id ? medicine : m));
    }
    setEditingMedicineId(null);
    setIsAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingMedicineId(null);
    setIsAddingNew(false);
  };

  const handleEditMedicine = (id: string) => {
    setEditingMedicineId(id);
    setIsAddingNew(false);
  };

  const handleRemoveMedicine = (id: string) => {
    onUpdateMedicines(medicines.filter(m => m.id !== id));
  };

  const editingMedicine = editingMedicineId 
    ? medicines.find(m => m.id === editingMedicineId) || createEmptyMedicine()
    : null;

  const hasAnyBlockingMedicine = medicines.some(m => {
    const supply = m.dailyDosage > 0 ? Math.ceil(m.unitCount / m.dailyDosage) : 0;
    const value = m.unitCount * m.unitPrice;
    return supply > 90 || value > 25000;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Medicine Details
            </CardTitle>
            <CardDescription>Add all medicines for this shipment</CardDescription>
          </div>
          {!editingMedicineId && medicines.length > 0 && (
            <Button onClick={handleAddMedicine} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Medicine
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Aggregated Totals */}
        {medicines.length > 0 && !editingMedicineId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-accent/30 border-accent">
              <Clock className="h-5 w-5" />
              <div>
                <p className="text-xs text-muted-foreground">Max Supply Duration</p>
                <p className="font-mono font-bold text-lg">
                  {aggregatedSupplyDays} days
                  <span className="text-xs font-normal ml-2 text-muted-foreground">(Max 90 per medicine)</span>
                </p>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-lg border",
              isOverValueCap ? "bg-destructive/10 border-destructive" : "bg-accent/30 border-accent"
            )}>
              <IndianRupee className={cn("h-5 w-5", isOverValueCap && "text-destructive")} />
              <div>
                <p className="text-xs text-muted-foreground">Total Declared Value</p>
                <p className={cn("font-mono font-bold text-lg", isOverValueCap && "text-destructive")}>
                  ₹{aggregatedTotalValue.toLocaleString('en-IN')}
                  {isOverValueCap && <span className="text-xs font-normal ml-2">(Max ₹25,000)</span>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Medicine List */}
        {medicines.length > 0 && !editingMedicineId && (
          <div className="space-y-3">
            {medicines.map((medicine, index) => (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                index={index}
                onEdit={handleEditMedicine}
                onRemove={handleRemoveMedicine}
                canRemove={medicines.length > 1}
              />
            ))}
          </div>
        )}

        {/* Medicine Form (Add/Edit) */}
        {editingMedicineId && editingMedicine && (
          <MedicineForm
            medicine={isAddingNew ? createEmptyMedicine() : editingMedicine}
            onSave={handleSaveMedicine}
            onCancel={handleCancelEdit}
            isEditing={!isAddingNew}
          />
        )}

        {/* Empty State */}
        {medicines.length === 0 && !editingMedicineId && (
          <div className="text-center py-8 space-y-4 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No medicines added yet</p>
            <Button onClick={handleAddMedicine}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Medicine
            </Button>
          </div>
        )}

        {/* Blocking Warning */}
        {hasAnyBlockingMedicine && !editingMedicineId && (
          <Alert variant="destructive">
            <AlertDescription>
              One or more medicines exceed the 90-day supply limit or ₹25,000 value cap. 
              Please edit or remove the affected medicines to proceed.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
