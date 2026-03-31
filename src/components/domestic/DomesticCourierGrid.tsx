"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Truck, AirplaneTilt, Clock, Star, CheckCircle,
} from '@phosphor-icons/react';

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
  const [showBreakdown, setShowBreakdown] = useState(false);
  const isAir = courier.mode === 'air';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 flex flex-col h-full",
        isSelected
          ? "border-coke-red bg-coke-red/5 shadow-lg shadow-coke-red/10"
          : "border-border bg-card hover:border-coke-red/30 hover:shadow-md"
      )}
    >
      {/* Recommended badge */}
      {courier.is_recommended && (
        <div className="absolute -top-2.5 left-3 z-10">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-0.5 rounded-full shadow-sm">
            <Star size={10} weight="fill" /> Best Value
          </span>
        </div>
      )}

      {/* Mode badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
          isAir
            ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
        )}>
          {isAir ? <><AirplaneTilt size={10} weight="bold" /> Air</> : <><Truck size={10} weight="bold" /> Surface</>}
        </span>
        {isSelected && (
          <CheckCircle size={20} weight="fill" className="text-coke-red" />
        )}
      </div>

      {/* Courier name */}
      <h3 className={cn(
        "font-semibold text-sm leading-tight truncate",
        isSelected ? "text-coke-red" : "text-foreground"
      )}>
        {courier.courier_name}
      </h3>

      {/* Price — prominent */}
      <p className={cn(
        "text-2xl font-bold font-typewriter mt-2",
        isSelected ? "text-coke-red" : "text-foreground"
      )}>
        ₹{courier.customer_price.toLocaleString('en-IN')}
      </p>

      {/* Key details */}
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock size={12} weight="bold" />
          {courier.estimated_delivery_days} day{courier.estimated_delivery_days !== 1 ? 's' : ''}
        </span>
        {courier.rating > 0 && (
          <span className="flex items-center gap-1">
            <Star size={12} weight="fill" className="text-amber-400" />
            {courier.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Spacer to push bottom content down */}
      <div className="flex-1" />

      {/* Breakdown toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowBreakdown(!showBreakdown); }}
        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-2 text-left"
      >
        {showBreakdown ? 'Hide' : 'View'} breakdown
      </button>

      <AnimatePresence>
        {showBreakdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">₹{courier.shipping_charge.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">GST (18%)</span>
                <span className="font-medium">₹{courier.gst_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[11px] font-semibold pt-1 border-t border-dashed border-border/50">
                <span>Total</span>
                <span className="text-coke-red">₹{courier.customer_price.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional Book button for guest flows */}
      {showBookButton && (
        <button
          onClick={(e) => { e.stopPropagation(); onBook?.(); }}
          className="mt-3 w-full py-2 rounded-lg bg-coke-red hover:bg-red-600 text-white text-sm font-medium transition-colors"
        >
          Book Now
        </button>
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

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-3">
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
