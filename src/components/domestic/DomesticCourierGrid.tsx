"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Truck, AirplaneTilt, Clock, Star, Check, CaretRight, Package,
} from '@phosphor-icons/react';
import { getCourierLogo } from '@/lib/shipping/courierLogos';

export interface DomesticCourierData {
  courier_company_id: number;
  courier_name: string;
  shipping_charge: number;
  gst_amount: number;
  customer_price: number;
  estimated_delivery_days: number;
  rating: number;
  mode: 'air' | 'surface';
  is_recommended: boolean;
  pickup_availability?: boolean;
  [key: string]: any;
}

interface DomesticCourierCardProps {
  courier: DomesticCourierData;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
  showBookButton?: boolean;
  onBook?: () => void;
}

export function DomesticCourierCard({
  courier, isSelected, onSelect, index, showBookButton, onBook,
}: DomesticCourierCardProps) {
  const isAir = courier.mode === 'air';
  const ModeIcon = isAir ? AirplaneTilt : Truck;
  const logo = getCourierLogo(courier.courier_name);

  const deliveryText = (() => {
    const days = courier.estimated_delivery_days;
    if (!days || days <= 0) return `${isAir ? '1–3' : '4–7'} days`;
    const d = new Date();
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return `By ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl border-2 p-4 transition-all duration-300 flex flex-col cursor-pointer",
        isSelected
          ? "border-coke-red bg-coke-red/5 shadow-xl shadow-coke-red/10"
          : "border-border bg-card hover:border-coke-red/30 hover:shadow-lg"
      )}
    >
      {/* Best Value badge */}
      {courier.is_recommended && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-3 -right-3 z-10">
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg px-3 py-1">
            <Star size={12} weight="fill" className="mr-1" /> Best Value
          </Badge>
        </motion.div>
      )}

      {/* Selected checkmark */}
      <AnimatePresence>
        {isSelected && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="absolute top-3 right-3 w-5 h-5 rounded-full bg-coke-red flex items-center justify-center">
            <Check size={12} weight="bold" className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top row: logo + name + mode */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-16 h-16 rounded-xl bg-white border border-border/60 flex items-center justify-center shrink-0 overflow-hidden p-1.5 shadow-sm">
          {logo ? (
            <img src={logo} alt={courier.courier_name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
              <ModeIcon size={26} weight="bold" className="text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm font-typewriter leading-tight truncate">{courier.courier_name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <ModeIcon size={11} weight="bold" className="text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground capitalize">{courier.mode} delivery</p>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="py-2.5 border-y border-border/50 mb-3">
        <p className={cn("text-2xl sm:text-3xl font-bold", isSelected ? "text-emerald-600" : "text-emerald-600")}>
          ₹{courier.customer_price.toLocaleString('en-IN')}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">incl. all taxes</p>
      </div>

      {/* Delivery info */}
      <div className="flex items-center gap-1.5 text-sm mb-1">
        <Clock size={13} weight="bold" className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium">{deliveryText}</span>
      </div>
      {courier.estimated_delivery_days > 0 && (
        <p className="text-[10px] text-muted-foreground mb-2">
          {courier.estimated_delivery_days} business day{courier.estimated_delivery_days === 1 ? '' : 's'}
        </p>
      )}

      {/* Rating */}
      {courier.rating > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-foreground mb-2">
          <Star size={11} weight="fill" className="text-amber-400 shrink-0" />
          <span>{courier.rating.toFixed(1)} rating</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Action button */}
      {showBookButton ? (
        <Button
          size="sm"
          className="w-full mt-2 min-h-[44px] text-sm bg-coke-red hover:bg-coke-red/90 text-white"
          onClick={(e) => { e.stopPropagation(); onBook?.(); }}
        >
          Book Now <CaretRight size={16} weight="bold" className="ml-1" />
        </Button>
      ) : (
        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className={cn("w-full mt-2 min-h-[44px] text-sm transition-all", isSelected && "bg-coke-red hover:bg-coke-red/90")}
        >
          {isSelected
            ? <><Check size={16} weight="bold" className="mr-1" /> Selected</>
            : <>Select <CaretRight size={16} weight="bold" className="ml-1" /></>
          }
        </Button>
      )}
    </motion.div>
  );
}

/* ─── Grid Container ─────────────────────────────────────────────── */

interface DomesticCourierGridProps {
  couriers: DomesticCourierData[];
  selectedId?: number | null;
  onSelect: (courier: DomesticCourierData) => void;
  showBookButton?: boolean;
  onBook?: (courier: DomesticCourierData) => void;
  maxItems?: number;
}

export function DomesticCourierGrid({
  couriers, selectedId, onSelect, showBookButton, onBook, maxItems = 15,
}: DomesticCourierGridProps) {
  const visible = couriers.slice(0, maxItems);
  const count = visible.length;

  // Dynamic grid: adapt columns to item count for a clean look
  // 1 item = 1 col centered, 2 = 2 cols, 3 = 3 cols, 4+ = 2 cols on sm, 3 on md, 4 on xl
  const gridClass = count === 1
    ? "grid grid-cols-1 max-w-sm mx-auto gap-4"
    : count === 2
    ? "grid grid-cols-1 xs:grid-cols-2 max-w-2xl mx-auto gap-4"
    : count === 3
    ? "grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 max-w-4xl mx-auto gap-4"
    : "grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4";

  return (
    <div className={gridClass}>
      {visible.map((courier, index) => (
        <DomesticCourierCard
          key={courier.courier_company_id}
          courier={courier}
          isSelected={selectedId === courier.courier_company_id}
          onSelect={() => onSelect(courier)}
          index={index}
          showBookButton={showBookButton}
          onBook={() => onBook?.(courier)}
        />
      ))}
    </div>
  );
}
