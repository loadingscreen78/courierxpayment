'use client';

import { useShippingMode } from '@/contexts/ShippingModeContext';
import { cn } from '@/lib/utils';
import { Globe, MapPin } from '@phosphor-icons/react';

interface MobileShippingToggleProps {
  className?: string;
}

export const MobileShippingToggle = ({ className }: MobileShippingToggleProps) => {
  const { mode, toggleMode, isSwitching } = useShippingMode();
  const isInternational = mode === 'international';

  return (
    <div className={cn('mobile-shipping-toggle', className)}>
      <label className="switch">
        <input
          type="checkbox"
          className="togglesw"
          checked={!isInternational}
          onChange={toggleMode}
          disabled={isSwitching}
          aria-label={`Switch to ${isInternational ? 'domestic' : 'international'} mode`}
        />
        <span className="indicator left">
          <Globe size={12} weight="bold" className="absolute left-2 top-1/2 -translate-y-1/2 text-white/90" />
        </span>
        <span className="indicator right">
          <MapPin size={10} weight="bold" className="absolute right-2 top-1/2 -translate-y-1/2 text-white/90" />
        </span>
        <span className="button" />
      </label>
    </div>
  );
};