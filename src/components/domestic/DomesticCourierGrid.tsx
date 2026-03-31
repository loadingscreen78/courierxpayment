"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Truck, AirplaneTilt, Clock, Star, Check, CaretRight, Package,
  CheckCircle, ShieldCheck, MapPin,
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
  const isAir = courier.mode === 'air';
  const ModeIcon = isAir ? AirplaneTilt : Truck;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={onSelect}
      className={cn(
        "relative rounded-3xl border-2 p-6 transition-all duration-300 flex flex-col h-full cursor-pointer",
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
            className="absolute top-4 left-4 w-6 h-6 rounded-full bg-coke-red flex items-center justify-center">
            <Check size={16} weight="bold" className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Centered content */}
      <div className="text-center space-y-4 flex-1 flex flex-col">
        {/* Icon */}
        <div className={cn(
          "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center",
          isSelected ? "bg-coke-red text-white" : "bg-muted"
        )}>
          <ModeIcon size={28} weight="bold" />
        </div>

        {/* Name & mode */}
        <div>
          <h3 className="font-bold text-base font-typewriter leading-tight">{courier.courier_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{courier.mode} delivery</p>
        </div>

        {/* Price */}
        <div className="py-3 border-y border-border/50">
          <p className={cn("text-3xl font-bold", isSelected ? "text-coke-red" : "text-foreground")}>
            ₹{courier.customer_price.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">incl. all taxes</p>
        </div>

        {/* Delivery time */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Clock size={16} weight="bold" className="text-muted-foreground" />
          <span>{courier.estimated_delivery_days} business day{courier.estimated_delivery_days !== 1 ? 's' : ''}</span>
        </div>

        {/* Features */}
        <div className="space-y-2 pt-1 text-left">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Check size={12} weight="bold" className="text-candlestick-green shrink-0" />
            <span>Real-time tracking</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Check size={12} weight="bold" className="text-candlestick-green shrink-0" />
            <span>{courier.pickup_availability !== false ? 'Doorstep pickup' : 'Drop-off only'}</span>
          </div>
          {courier.rating > 0 && (
            <div className="flex items-center gap-2 text-xs text-foreground">
              <Star size={12} weight="fill" className="text-amber-400 shrink-0" />
              <span>{courier.rating.toFixed(1)} rating</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Check size={12} weight="bold" className="text-candlestick-green shrink-0" />
            <span>GST invoice included</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action button */}
        {showBookButton ? (
          <Button
            size="sm"
            className={cn("w-full mt-2 transition-all bg-coke-red hover:bg-coke-red/90 text-white")}
            onClick={(e) => { e.stopPropagation(); onBook?.(); }}
          >
            Book Now <CaretRight size={16} weight="bold" className="ml-1" />
          </Button>
        ) : (
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className={cn("w-full mt-2 transition-all", isSelected && "bg-coke-red hover:bg-coke-red/90")}
          >
            {isSelected
              ? <><Check size={16} weight="bold" className="mr-1" /> Selected</>
              : <>Select <CaretRight size={16} weight="bold" className="ml-1" /></>
            }
          </Button>
        )}
      </div>
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
    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
