import { Check, Clock, Truck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CourierOption, Carrier, RateCalculationResult } from '@/lib/shipping/rateCalculator';
import { getCarrierInfo } from '@/lib/shipping/courierSelection';

interface RateDisplayProps {
  courierOptions: CourierOption[];
  selectedCourier: CourierOption | null;
  onSelectCourier: (carrier: Carrier) => void;
  className?: string;
}

export const RateDisplay = ({
  courierOptions,
  selectedCourier,
  onSelectCourier,
  className,
}: RateDisplayProps) => {
  if (courierOptions.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {courierOptions.map((option) => {
        const carrierInfo = getCarrierInfo(option.carrier);
        const isSelected = selectedCourier?.carrier === option.carrier;

        return (
          <Card
            key={option.carrier}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md btn-press',
              isSelected && 'ring-2 ring-primary border-primary'
            )}
            onClick={() => onSelectCourier(option.carrier)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* Selection indicator */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{carrierInfo.fullName}</span>
                      {option.isRecommended && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {carrierInfo.description}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {option.features.slice(0, 3).map((feature, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold">
                    ₹{option.price.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{option.transitDays.min}-{option.transitDays.max} days</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// Price breakdown component
interface PriceBreakdownProps {
  breakdown: RateCalculationResult;
  className?: string;
}

export const PriceBreakdown = ({ breakdown, className }: PriceBreakdownProps) => {
  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-2">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Price Breakdown
        </h4>
        
        <div className="space-y-1.5">
          {breakdown.breakdown.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span>₹{item.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-2 border-t border-dashed">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-lg">₹{breakdown.total.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Compact rate display for review screens
interface RateSummaryProps {
  selectedCourier: CourierOption;
  total: number;
  className?: string;
}

export const RateSummary = ({ selectedCourier, total, className }: RateSummaryProps) => {
  const carrierInfo = getCarrierInfo(selectedCourier.carrier);

  return (
    <div className={cn('flex items-center justify-between p-3 bg-muted/50 rounded-lg', className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Truck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{carrierInfo.fullName}</p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{selectedCourier.transitDays.min}-{selectedCourier.transitDays.max} business days</span>
          </div>
        </div>
      </div>
      <p className="text-lg font-bold">₹{total.toLocaleString()}</p>
    </div>
  );
};
