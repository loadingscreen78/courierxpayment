"use client";

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  House,
  Truck,
  PlusCircle,
  Wallet,
  List,
  Pill,
  FileText,
  Gift,
  X,
  Sparkle,
  MapPin
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { MobileMoreDrawer } from './MobileMoreDrawer';
import { deleteDraftsByType } from '@/lib/drafts/draftService';
import type { Draft } from '@/lib/drafts/draftService';
import { useShippingMode } from '@/contexts/ShippingModeContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
  isPrimary?: boolean;
  onClick?: () => void;
}

const NavItem = ({ icon, label, href, isActive, isPrimary, onClick }: NavItemProps) => {
  const { lightTap, mediumTap } = useHaptics();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      mediumTap();
      onClick();
    } else {
      lightTap();
    }
  };

  if (isPrimary) {
    return (
      <button
        onClick={handleClick}
        className="flex flex-col items-center justify-center gap-1 relative"
      >
        <motion.div
          whileTap={{ scale: 0.92 }}
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-coke-red to-red-600 text-white rounded-2xl shadow-lg shadow-coke-red/40 ring-4 ring-background"
        >
          {icon}
        </motion.div>
        <span className="text-[10px] font-semibold text-foreground/70">{label}</span>
      </button>
    );
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="flex flex-col items-center justify-center gap-1 min-w-[56px] py-2 relative"
    >
      <div className="relative">
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute inset-0 -m-1.5 bg-coke-red/10 rounded-xl"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <div className={cn(
          "relative p-1.5 rounded-xl transition-colors duration-200",
          isActive ? "text-coke-red" : "text-muted-foreground"
        )}>
          {icon}
        </div>
      </div>
      <span className={cn(
        "text-[10px] font-medium transition-colors duration-200",
        isActive ? "text-coke-red font-semibold" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </Link>
  );
};

const internationalOptions = [
  {
    id: 'medicine',
    icon: Pill,
    title: 'Medicine',
    description: 'Prescription medicines & health supplements',
    href: '/book/medicine',
    color: 'bg-blue-500/10 text-blue-600',
    gradient: 'from-blue-500/20 to-blue-600/5',
  },
  {
    id: 'document',
    icon: FileText,
    title: 'Documents',
    description: 'Certificates, legal papers & important docs',
    href: '/book/document',
    color: 'bg-amber-500/10 text-amber-600',
    gradient: 'from-amber-500/20 to-amber-600/5',
  },
  {
    id: 'gift',
    icon: Gift,
    title: 'Gifts & Samples',
    description: 'Personal gifts & product samples',
    href: '/book/gift',
    color: 'bg-pink-500/10 text-pink-600',
    gradient: 'from-pink-500/20 to-pink-600/5',
  },
];

const domesticOptions = [
  {
    id: 'domestic-document',
    icon: FileText,
    title: 'Documents',
    description: 'Send documents up to 1 kg across India',
    href: '/book/domestic?type=document',
    color: 'bg-amber-500/10 text-amber-600',
    gradient: 'from-amber-500/20 to-amber-600/5',
  },
  {
    id: 'domestic-gift',
    icon: Gift,
    title: 'Gifts & Parcels',
    description: 'Ship up to 60 kg anywhere in India',
    href: '/book/domestic?type=gift',
    color: 'bg-pink-500/10 text-pink-600',
    gradient: 'from-pink-500/20 to-pink-600/5',
  },
];

export const MobileNav = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shipDrawerOpen, setShipDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { mediumTap } = useHaptics();
  const { mode } = useShippingMode();
  const isDomestic = mode === 'domestic';

  const shipmentOptions = isDomestic ? domesticOptions : internationalOptions;

  const handleShipmentSelect = (href: string, draftType: Draft['type']) => {
    mediumTap();
    if (!isDomestic) {
      deleteDraftsByType(draftType);
    }
    setShipDrawerOpen(false);
    router.push(isDomestic ? href : href + '?new=1');
  };

  return (
    <>
      <nav className="sticky-nav safe-bottom">
        <div className="flex items-center justify-around h-[60px] px-3">
          <NavItem 
            icon={<House className="h-5 w-5" weight="bold" />}
            label="Home" 
            href="/dashboard"
            isActive={pathname === '/dashboard'} 
          />
          <NavItem 
            icon={<Truck className="h-5 w-5" weight="bold" />}
            label="Track" 
            href="/shipments"
            isActive={pathname === '/shipments'}
          />
          <NavItem 
            icon={<PlusCircle className="h-6 w-6" weight="bold" />}
            label="Ship" 
            href="#"
            isPrimary
            onClick={() => setShipDrawerOpen(true)}
          />
          <NavItem 
            icon={<Wallet className="h-5 w-5" weight="bold" />}
            label="Wallet" 
            href="/wallet"
            isActive={pathname === '/wallet'}
          />
          <NavItem 
            icon={<List className="h-5 w-5" weight="bold" />}
            label="More" 
            href="#"
            isActive={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          />
        </div>
      </nav>

      {/* Ship Options Drawer */}
      <Sheet open={shipDrawerOpen} onOpenChange={setShipDrawerOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] pb-10 px-0">
          <SheetHeader className="pb-2 px-6">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="font-typewriter text-xl">
                  {isDomestic ? 'Ship Across India' : 'What are you shipping?'}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isDomestic ? 'Direct pickup, no warehouse' : 'Choose a shipment type to get started'}
                </p>
              </div>
              <button
                onClick={() => setShipDrawerOpen(false)}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </SheetHeader>

          {/* Drag handle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-muted-foreground/20 rounded-full" />

          <div className="space-y-2 px-4 mt-4">
            {shipmentOptions.map((option, i) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleShipmentSelect(option.href, option.id as Draft['type'])}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]",
                  `bg-gradient-to-r ${option.gradient} border border-border/50 hover:border-border`
                )}
              >
                <div className={cn("p-3 rounded-xl", option.color)}>
                  <option.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">{option.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>
                </div>
                <div className="text-muted-foreground/40">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mx-4 mt-4 p-3 rounded-xl bg-muted/50 flex items-center gap-2">
            <Sparkle className="h-4 w-4 text-coke-red shrink-0" />
            <p className="text-xs text-muted-foreground">
              {isDomestic
                ? 'Pickup raised automatically. AWB label provided instantly.'
                : 'All shipments are CSB-IV compliant & fully insured'}
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <MobileMoreDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
      />
    </>
  );
};
