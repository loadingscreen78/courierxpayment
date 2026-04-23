import { memo, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FileText, Gift, Package, Ruler, Scale, IndianRupee, Laptop, ShieldAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DomesticBookingData, DomesticShipmentType } from '@/lib/domestic/types';
import { DOMESTIC_LIMITS, DOCUMENT_WEIGHT_SLABS } from '@/lib/domestic/types';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  data: DomesticBookingData;
  onUpdate: (updates: Partial<DomesticBookingData>) => void;
  lockedType?: boolean;
}

const DomesticDetailsStepComponent = ({ data, onUpdate, lockedType }: Props) => {
  const limits = DOMESTIC_LIMITS[data.shipmentType];
  const [showProhibitedModal, setShowProhibitedModal] = useState(false);

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
                  inputMode="numeric"
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
              inputMode="numeric"
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

      {/* Prohibited Items Declaration */}
      <div
        className={cn(
          'flex flex-row items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all',
          data.prohibitedItemsConfirmed
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-border bg-muted/30 hover:border-coke-red/30'
        )}
        onClick={() => {
          if (!data.prohibitedItemsConfirmed) setShowProhibitedModal(true);
        }}
      >
        <Checkbox
          checked={!!data.prohibitedItemsConfirmed}
          onCheckedChange={(checked) => {
            if (checked && !data.prohibitedItemsConfirmed) {
              setShowProhibitedModal(true);
            } else if (!checked) {
              onUpdate({ prohibitedItemsConfirmed: false });
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
        <div className="space-y-1 leading-none">
          <p className="text-sm font-medium">
            I confirm this package does not contain prohibited items
          </p>
          <p className="text-xs text-muted-foreground">
            Gold, silver, precious metals, chemicals, narcotics, batteries, currency, physical cash, credit/debit cards, or any restricted substances.
          </p>
        </div>
      </div>

      {/* Prohibited Items Modal */}
      <AnimatePresence>
        {showProhibitedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowProhibitedModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5 text-coke-red" />
                  </div>
                  <h3 className="font-semibold text-lg">Prohibited Items Declaration</h3>
                </div>
                <button onClick={() => setShowProhibitedModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">By proceeding, I confirm that my shipment does NOT contain:</p>
                <ul className="space-y-2 list-disc pl-5">
                  <li><span className="font-semibold text-foreground">Precious metals & valuables</span> — Gold, silver, platinum, gemstones, jewelry, or currency notes</li>
                  <li><span className="font-semibold text-foreground">Financial instruments</span> — Credit/debit cards, cheques, demand drafts, or physical cash</li>
                  <li><span className="font-semibold text-foreground">Hazardous materials</span> — Chemicals, flammables, explosives, or radioactive substances</li>
                  <li><span className="font-semibold text-foreground">Controlled substances</span> — Narcotics, drugs, or any substance prohibited by law</li>
                  <li><span className="font-semibold text-foreground">Batteries (standalone)</span> — Loose lithium-ion or lead-acid batteries not installed in a device</li>
                  <li><span className="font-semibold text-foreground">Perishables</span> — Food items, plants, or biological materials</li>
                  <li><span className="font-semibold text-foreground">Original documents</span> — Passports, land deeds, or irreplaceable legal documents</li>
                </ul>
                <p className="text-xs bg-muted/50 rounded-lg p-3">
                  Shipping prohibited items may result in package seizure, fines, or legal action. CourierX reserves the right to inspect and reject any shipment found to contain prohibited items.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowProhibitedModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button className="flex-1 bg-coke-red hover:bg-red-600 text-white" onClick={() => {
                  onUpdate({ prohibitedItemsConfirmed: true });
                  setShowProhibitedModal(false);
                }}>
                  I Confirm & Agree
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DomesticDetailsStep = memo(DomesticDetailsStepComponent);
