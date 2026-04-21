import { memo, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { FileText, Gift, Package, Ruler, Scale, IndianRupee, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DomesticBookingData, DomesticShipmentType } from '@/lib/domestic/types';
import { DOMESTIC_LIMITS, DOCUMENT_WEIGHT_SLABS } from '@/lib/domestic/types';

interface Props {
  data: DomesticBookingData;
  onUpdate: (updates: Partial<DomesticBookingData>) => void;
  lockedType?: boolean;
}

const DomesticDetailsStepComponent = ({ data, onUpdate, lockedType }: Props) => {
  const limits = DOMESTIC_LIMITS[data.shipmentType];

  // Local state for text inputs to prevent parent re-renders on every keystroke
  const [localDeclaredValue, setLocalDeclaredValue] = useState(String(data.declaredValue));
  const [localDescription, setLocalDescription] = useState(data.contentDescription);
  const [localDimensions, setLocalDimensions] = useState({
    lengthCm: String(data.lengthCm),
    widthCm: String(data.widthCm),
    heightCm: String(data.heightCm),
  });

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSync = useCallback((patch: Partial<DomesticBookingData>) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      onUpdateRef.current(patch);
    }, 400);
  }, []);

  const handleTypeChange = (type: DomesticShipmentType) => {
    const newLimits = DOMESTIC_LIMITS[type];
    onUpdate({
      shipmentType: type,
      weightKg: Math.min(data.weightKg, newLimits.maxWeightKg),
      declaredValue: Math.min(data.declaredValue, newLimits.maxValue),
    });
  };

  return (
    <div className="space-y-6">
      {/* Shipment Type — hidden when type is locked via URL param */}
      {!lockedType && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-coke-red" />
              Shipment Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'document' as const, icon: FileText, label: 'Documents', desc: 'Up to 1 kg', emoji: '📄' },
                { type: 'gift' as const, icon: Gift, label: 'Gift / Parcel', desc: 'Up to 60 kg', emoji: '🎁' },
                { type: 'laptop' as const, icon: Laptop, label: 'Laptop', desc: 'Up to 5 kg', emoji: '💻' },
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => handleTypeChange(opt.type)}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                    data.shipmentType === opt.type
                      ? 'border-coke-red bg-coke-red/5 shadow-md'
                      : 'border-border hover:border-coke-red/30'
                  )}
                >
                  <span className="text-3xl">{opt.emoji}</span>
                  <div>
                    <p className={cn(
                      'font-semibold',
                      data.shipmentType === opt.type ? 'text-coke-red' : 'text-foreground'
                    )}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weight */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-coke-red" />
            Package Weight
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.shipmentType === 'document' ? (
            <div className="grid grid-cols-4 gap-2">
              {DOCUMENT_WEIGHT_SLABS.map(slab => (
                <button
                  key={slab.value}
                  onClick={() => onUpdate({ weightKg: slab.value })}
                  className={cn(
                    'p-3 rounded-xl border-2 text-center transition-all',
                    data.weightKg === slab.value
                      ? 'border-coke-red bg-coke-red/5 shadow-sm'
                      : 'border-border hover:border-coke-red/30'
                  )}
                >
                  <p className={cn(
                    'font-bold font-typewriter text-lg',
                    data.weightKg === slab.value ? 'text-coke-red' : 'text-foreground'
                  )}>{slab.label}</p>
                </button>
              ))}
            </div>
          ) : data.shipmentType === 'laptop' ? (
            <div className="space-y-3">
              <div className="text-center py-3 bg-muted/30 rounded-lg">
                <span className="text-4xl font-bold font-typewriter text-coke-red">
                  {data.weightKg}
                </span>
                <span className="text-sm text-muted-foreground ml-1">kg</span>
              </div>
              <Slider
                value={[data.weightKg]}
                onValueChange={([v]) => onUpdate({ weightKg: v })}
                min={0.5}
                max={5}
                step={0.5}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5 kg</span>
                <span>5 kg</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 1.5, 2, 2.5].map(w => (
                  <button
                    key={w}
                    onClick={() => onUpdate({ weightKg: w })}
                    className={cn(
                      'py-2 rounded-lg border text-sm font-medium transition-all',
                      data.weightKg === w
                        ? 'border-coke-red bg-coke-red/5 text-coke-red'
                        : 'border-border hover:border-coke-red/30'
                    )}
                  >
                    {w} kg
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center py-3 bg-muted/30 rounded-lg">
                <span className="text-4xl font-bold font-typewriter text-coke-red">
                  {data.weightKg}
                </span>
                <span className="text-sm text-muted-foreground ml-1">kg</span>
              </div>
              <Slider
                value={[data.weightKg]}
                onValueChange={([v]) => onUpdate({ weightKg: v })}
                min={0.5}
                max={60}
                step={0.5}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5 kg</span>
                <span>60 kg</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 25].map(w => (
                  <button
                    key={w}
                    onClick={() => onUpdate({ weightKg: w })}
                    className={cn(
                      'py-2 rounded-lg border text-sm font-medium transition-all',
                      data.weightKg === w
                        ? 'border-coke-red bg-coke-red/5 text-coke-red'
                        : 'border-border hover:border-coke-red/30'
                    )}
                  >
                    {w} kg
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dimensions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Ruler className="h-5 w-5 text-coke-red" />
            Dimensions (cm)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: 'Length', key: 'lengthCm' as const },
              { label: 'Width', key: 'widthCm' as const },
              { label: 'Height', key: 'heightCm' as const },
            ] as const).map(dim => (
              <div key={dim.key} className="space-y-1.5">
                <Label className="text-xs">{dim.label}</Label>
                <Input
                  type="number"
                  min={1}
                  max={150}
                  value={localDimensions[dim.key]}
                  onChange={e => {
                    const raw = e.target.value;
                    setLocalDimensions(prev => ({ ...prev, [dim.key]: raw }));
                    const num = Math.max(1, Number(raw) || 1);
                    scheduleSync({ [dim.key]: num });
                  }}
                  onBlur={() => {
                    const num = Math.max(1, Number(localDimensions[dim.key]) || 1);
                    onUpdate({ [dim.key]: num });
                  }}
                  className="font-typewriter"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Declared Value & Description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-coke-red" />
            Content Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Declared Value (₹)</Label>
            <Input
              type="number"
              min={0}
              max={limits.maxValue}
              value={localDeclaredValue}
              onChange={e => {
                setLocalDeclaredValue(e.target.value);
                const num = Math.min(limits.maxValue, Math.max(0, Number(e.target.value) || 0));
                scheduleSync({ declaredValue: num });
              }}
              onBlur={() => {
                const num = Math.min(limits.maxValue, Math.max(0, Number(localDeclaredValue) || 0));
                onUpdate({ declaredValue: num });
              }}
              className="font-typewriter"
              placeholder="Enter value in INR"
            />
            <p className="text-xs text-muted-foreground">Maximum ₹{limits.maxValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Content Description</Label>
            <Textarea
              value={localDescription}
              onChange={e => {
                setLocalDescription(e.target.value);
                scheduleSync({ contentDescription: e.target.value });
              }}
              onBlur={() => onUpdate({ contentDescription: localDescription })}
              placeholder={data.shipmentType === 'document' ? 'e.g. Legal documents, certificates...' : data.shipmentType === 'laptop' ? 'e.g. Dell Inspiron 15 laptop, S/N: ABC123...' : 'e.g. Clothing, electronics, books...'}
              rows={2}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const DomesticDetailsStep = memo(DomesticDetailsStepComponent);
