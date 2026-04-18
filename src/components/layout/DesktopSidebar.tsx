"use client";

import { 
  Package, 
  Wallet, 
  FolderOpen, 
  Question,
  Truck,
  PaperPlaneTilt,
  House,
  NotePencil,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useHaptics } from '@/hooks/useHaptics';
import { useShipments } from '@/hooks/useShipments';
import { useShippingMode } from '@/contexts/ShippingModeContext';
import { useOnboardingTour } from '@/contexts/OnboardingTourContext';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
  badge?: string;
  tourHighlight?: boolean;
}

const NavItem = ({ icon, label, href, isActive, badge, tourHighlight }: NavItemProps) => {
  const { lightTap } = useHaptics();
  
  return (
    <Link
      href={href}
      onClick={() => lightTap()}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
        tourHighlight && !isActive
          ? "bg-coke-red/5 text-foreground ring-1 ring-coke-red/20"
          : isActive 
            ? "bg-coke-red/8 text-foreground" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      {(isActive || tourHighlight) && (
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-coke-red"
        )} />
      )}
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 shrink-0",
        tourHighlight && !isActive
          ? "bg-coke-red/10 text-coke-red"
          : isActive 
            ? "bg-coke-red/15 text-coke-red" 
            : "group-hover:bg-muted"
      )}>
        {icon}
      </div>
      <span className={cn(
        "font-medium text-sm flex-1 truncate",
        tourHighlight && !isActive && "text-coke-red font-semibold"
      )}>{label}</span>
      {badge && (
        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-coke-red text-white rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
};

export const DesktopSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { mediumTap } = useHaptics();
  const { activeShipments } = useShipments();
  const { mode } = useShippingMode();
  const { highlightedHref } = useOnboardingTour();

  const navGroups = [
    {
      label: 'Main',
      items: [
        { icon: <House className="h-4 w-4" weight="bold" />, label: 'Dashboard', href: '/dashboard' },
        { icon: <Truck className="h-4 w-4" weight="bold" />, label: 'Track Shipments', href: '/shipments', badge: activeShipments.length > 0 ? String(activeShipments.length) : undefined },
        { icon: <Package className="h-4 w-4" weight="bold" />, label: 'History', href: '/history' },
        { icon: <NotePencil className="h-4 w-4" weight="bold" />, label: 'Saved Drafts', href: '/drafts' },
      ]
    },
    {
      label: 'Account',
      items: [
        { icon: <Wallet className="h-4 w-4" weight="bold" />, label: 'Wallet & Billing', href: '/wallet' },
        { icon: <FolderOpen className="h-4 w-4" weight="bold" />, label: 'My Vault', href: '/vault' },
        { icon: <Question className="h-4 w-4" weight="bold" />, label: 'Help & Support', href: '/support' },
      ]
    }
  ];

  return (
    <aside className="desktop-sidebar fixed left-0 top-0 z-40">
      {/* New Shipment CTA */}
      <div className="px-4 pt-5 pb-3">
        <Link
          href="/new-shipment"
          onClick={() => mediumTap()}
          className={cn(
            "group relative flex items-center justify-center gap-2 w-full py-3 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-md overflow-hidden",
            highlightedHref === '/new-shipment'
              ? "bg-gradient-to-r from-[#1A1A2E] to-[#2A2A4E] shadow-[#1A1A2E]/30 ring-2 ring-[#1A1A2E]/30 hover:shadow-lg"
              : "bg-gradient-to-r from-coke-red to-red-600 shadow-coke-red/25 hover:shadow-lg hover:shadow-coke-red/35 hover:brightness-105"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-600" />
          <PaperPlaneTilt className="h-4 w-4 relative z-10" weight="bold" />
          <span className="relative z-10">New Shipment</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  isActive={pathname === item.href}
                  badge={item.badge}
                  tourHighlight={highlightedHref === item.href}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};
