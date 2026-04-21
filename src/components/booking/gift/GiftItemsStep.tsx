import { useState } from 'react';
import { GiftBookingData, GiftItem } from '@/views/GiftBooking';
import { Label } from '@/components/ui/label';
import { DebouncedInput, DebouncedTextarea } from '@/components/ui/debounced-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, IndianRupee, AlertCircle, Check, Pencil, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { HSNCodePicker } from '@/components/booking/HSNCodePicker';

interface GiftItemsStepProps {
  data: GiftBookingData;
  onUpdate: (updates: Partial<GiftBookingData>) => void;
  totalValue: number;
}

// Saved Item Row Component
const SavedItemRow = ({ 
  item, 
  index, 
  onEdit, 
  onDelete 
}: { 
  item: GiftItem; 
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const { lightTap } = useHaptics();
  const itemTotal = item.units * item.unitPrice;

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border hover:border-coke-red/30 transition-colors">
      <div className="p-2.5 rounded-xl bg-coke-red/10">
        <Package className="h-5 w-5 text-coke-red" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground truncate">{item.name || `Item ${index + 1}`}</p>
          <span className="text-xs text-muted-foreground font-mono">HSN: {item.hsnCode || 'N/A'}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {item.units} × ₹{item.unitPrice.toLocaleString('en-IN')} = <span className="font-semibold text-foreground">₹{itemTotal.toLocaleString('en-IN')}</span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { lightTap(); onEdit(); }}
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { lightTap(); onDelete(); }}
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Item Edit Form Component
const ItemEditForm = ({ 
  item, 
  index,
  onSave, 
  onCancel,
  onUpdateField
}: { 
  item: GiftItem;
  index: number;
  onSave: () => void;
  onCancel: () => void;
  onUpdateField: (field: keyof GiftItem, value: any) => void;
}) => {
  const { lightTap } = useHaptics();
  const itemTotal = item.units * item.unitPrice;
  const isValid = item.name.trim() && item.hsnCode.length === 8 && item.units > 0 && item.unitPrice > 0;

  return (
    <Card className="border-coke-red/30">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Item {index + 1}</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Item Name *</Label>
            <DebouncedInput
              placeholder="e.g., Silk Saree"
              value={item.name}
              onChange={(value) => onUpdateField('name', value)}
              className="input-premium"
            />
          </div>
          <div className="space-y-2">
            <Label>HSN Code (8 digits) *</Label>
            <div className="flex gap-2">
              <DebouncedInput
                placeholder="e.g., 50071000"
                maxLength={8}
                value={item.hsnCode}
                onChange={(value) => onUpdateField('hsnCode', value.replace(/\D/g, '').slice(0, 8))}
                className="input-premium font-typewriter flex-1"
              />
              <HSNCodePicker 
                value={item.hsnCode} 
                onSelect={(code) => onUpdateField('hsnCode', code)} 
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <DebouncedTextarea
            placeholder="Brief description of the item..."
            value={item.description}
            onChange={(value) => onUpdateField('description', value)}
            className="input-premium resize-none"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Quantity *</Label>
            <DebouncedInput
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="1"
              value={item.units || ''}
              onChange={(value) => onUpdateField('units', parseInt(value) || 0)}
              className="input-premium"
            />
          </div>
          <div className="space-y-2">
            <Label>Unit Price (₹) *</Label>
            <DebouncedInput
              type="number"
              inputMode="decimal"
              min="1"
              placeholder="0"
              value={item.unitPrice || ''}
              onChange={(value) => onUpdateField('unitPrice', parseFloat(value) || 0)}
              className="input-premium"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Item Total</span>
          <span className="font-typewriter font-bold">₹{itemTotal.toLocaleString('en-IN')}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => { lightTap(); onCancel(); }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => { lightTap(); onSave(); }}
            disabled={!isValid}
            className="bg-coke-red hover:bg-red-600 text-white gap-2"
          >
            <Check className="h-4 w-4" />
            Save Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const GiftItemsStep = ({ data, onUpdate, totalValue }: GiftItemsStepProps) => {
  const { lightTap } = useHaptics();
  const isOverValueCap = totalValue > 25000;
  
  // Track which item is being edited (null = none, 'new' = adding new, or item id)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  // Temporary item data while editing
  const [editingItem, setEditingItem] = useState<GiftItem | null>(null);

  const savedItems = data.items.filter(item => item.id !== editingItemId);
  const isEditing = editingItemId !== null;

  const startAddingItem = () => {
    const newItem: GiftItem = {
      id: Date.now().toString(),
      name: '',
      description: '',
      units: 1,
      unitPrice: 0,
      hsnCode: '',
    };
    setEditingItem(newItem);
    setEditingItemId('new');
  };

  const startEditingItem = (item: GiftItem) => {
    setEditingItem({ ...item });
    setEditingItemId(item.id);
  };

  const updateEditingField = (field: keyof GiftItem, value: any) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, [field]: value });
    }
  };

  const saveItem = () => {
    if (!editingItem) return;
    
    if (editingItemId === 'new') {
      // Adding new item
      onUpdate({ items: [...data.items, editingItem] });
    } else {
      // Updating existing item
      onUpdate({
        items: data.items.map(item => 
          item.id === editingItemId ? editingItem : item
        ),
      });
    }
    
    setEditingItem(null);
    setEditingItemId(null);
  };

  const cancelEditing = () => {
    // If it was a new item that wasn't saved, just close
    // If editing existing, revert changes
    setEditingItem(null);
    setEditingItemId(null);
  };

  const deleteItem = (id: string) => {
    onUpdate({ items: data.items.filter(item => item.id !== id) });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-typewriter text-lg font-bold">Gift Items</h3>
          <p className="text-sm text-muted-foreground">Add all items you want to ship</p>
        </div>
        {/* Only show Add Item button when NOT editing */}
        {!isEditing && data.items.length > 0 && (
          <Button onClick={() => { lightTap(); startAddingItem(); }} className="btn-press gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      {/* Value Summary */}
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-xl border",
        isOverValueCap ? "bg-destructive/10 border-destructive" : "bg-coke-red/5 border-coke-red/30"
      )}>
        <div className="p-2 rounded-lg bg-coke-red/10">
          <IndianRupee className={cn("h-5 w-5", isOverValueCap ? "text-destructive" : "text-coke-red")} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Total Declared Value</p>
          <p className={cn("font-typewriter font-bold text-lg", isOverValueCap ? "text-destructive" : "text-foreground")}>
            ₹{totalValue.toLocaleString('en-IN')}
            {isOverValueCap && <span className="text-xs font-normal ml-2">(Max ₹25,000)</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Items</p>
          <p className="font-typewriter font-bold text-lg">{data.items.length}</p>
        </div>
      </div>

      {/* Saved Items List */}
      {savedItems.length > 0 && (
        <div className="space-y-3">
          {savedItems.map((item, index) => (
            <SavedItemRow
              key={item.id}
              item={item}
              index={index}
              onEdit={() => startEditingItem(item)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      )}

      {/* Edit Form (shown when editing or adding) */}
      {isEditing && editingItem && (
        <ItemEditForm
          item={editingItem}
          index={editingItemId === 'new' ? data.items.length : data.items.findIndex(i => i.id === editingItemId)}
          onSave={saveItem}
          onCancel={cancelEditing}
          onUpdateField={updateEditingField}
        />
      )}

      {/* Empty State - Only show when no items and not editing */}
      {data.items.length === 0 && !isEditing && (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No items added yet</p>
            <Button 
              onClick={() => { lightTap(); startAddingItem(); }} 
              className="btn-press gap-2 bg-coke-red hover:bg-red-600 text-white"
            >
              <Plus className="h-4 w-4" />
              Add Your First Item
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Another Item Button - Show after saved items when not editing */}
      {savedItems.length > 0 && !isEditing && (
        <Button 
          variant="outline" 
          onClick={() => { lightTap(); startAddingItem(); }} 
          className="w-full btn-press gap-2 border-dashed border-2 h-12 hover:border-coke-red/50 hover:bg-coke-red/5"
        >
          <Plus className="h-4 w-4" />
          Add Another Item
        </Button>
      )}

      {/* Warning */}
      <div className="p-4 bg-muted/30 rounded-xl border border-border">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Important</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ensure accurate declaration. Incorrect values may lead to customs delays or penalties.
              Maximum total value allowed is ₹25,000 under CSB IV.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
