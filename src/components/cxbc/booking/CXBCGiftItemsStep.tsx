import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, IndianRupee, AlertCircle, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GiftItem {
  id: string;
  name: string;
  description: string;
  units: number;
  unitPrice: number;
  hsnCode: string;
}

interface CXBCGiftItemsStepProps {
  items: GiftItem[];
  onUpdateItems: (items: GiftItem[]) => void;
}

const HSN_SUGGESTIONS = [
  { code: '71179010', name: 'Imitation jewellery' },
  { code: '42021290', name: 'Bags and cases' },
  { code: '61091000', name: 'T-shirts' },
  { code: '85177090', name: 'Phone accessories' },
  { code: '95030090', name: 'Toys' },
  { code: '96081010', name: 'Pens' },
  { code: '33049990', name: 'Cosmetics' },
  { code: '62034290', name: 'Trousers' },
];

export const CXBCGiftItemsStep = ({ items, onUpdateItems }: CXBCGiftItemsStepProps) => {
  const totalValue = items.reduce((sum, item) => sum + (item.units * item.unitPrice), 0);
  const isOverValueCap = totalValue > 25000;

  const addItem = () => {
    const newItem: GiftItem = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      units: 1,
      unitPrice: 0,
      hsnCode: '',
    };
    onUpdateItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<GiftItem>) => {
    onUpdateItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id: string) => {
    onUpdateItems(items.filter(item => item.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Gift Items
            </CardTitle>
            <CardDescription>Add all items for this shipment</CardDescription>
          </div>
          <Button onClick={addItem} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Value Summary */}
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-lg border",
          isOverValueCap ? "bg-destructive/10 border-destructive" : "bg-accent/30 border-accent"
        )}>
          <IndianRupee className={cn("h-5 w-5", isOverValueCap ? "text-destructive" : "text-foreground")} />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Total Declared Value</p>
            <p className={cn("font-mono font-bold", isOverValueCap ? "text-destructive" : "text-foreground")}>
              ₹{totalValue.toLocaleString('en-IN')}
              {isOverValueCap && <span className="text-xs font-normal ml-2">(Max ₹25,000)</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Items</p>
            <p className="font-mono font-bold">{items.length}</p>
          </div>
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No items added yet</p>
            <Button onClick={addItem} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Item
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Item {index + 1}</Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Item Name *</Label>
                    <Input
                      placeholder="e.g., Silk Saree"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>HSN Code (8 digits) *</Label>
                    <Input
                      placeholder="e.g., 50071000"
                      maxLength={8}
                      value={item.hsnCode}
                      onChange={(e) => updateItem(item.id, { hsnCode: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of the item..."
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      placeholder="1"
                      value={item.units || ''}
                      onChange={(e) => updateItem(item.id, { units: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price (₹) *</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      placeholder="0"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Item Total</span>
                  <span className="font-mono font-bold">₹{(item.units * item.unitPrice).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HSN Suggestions */}
        {items.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">Common HSN Codes</Label>
            <div className="flex flex-wrap gap-2">
              {HSN_SUGGESTIONS.map((hsn) => (
                <button
                  key={hsn.code}
                  type="button"
                  onClick={() => {
                    const lastItem = items[items.length - 1];
                    if (lastItem && !lastItem.hsnCode) {
                      updateItem(lastItem.id, { hsnCode: hsn.code });
                    }
                  }}
                  className="px-3 py-1 text-xs rounded-full border border-border hover:border-primary/50 transition-all"
                >
                  {hsn.code} - {hsn.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Important</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ensure accurate declaration. Incorrect values may lead to customs delays or penalties.
                Maximum total value allowed is ₹25,000 under CSB IV.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
