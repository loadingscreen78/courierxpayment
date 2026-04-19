"use client";

import { useState } from 'react';
import { 
  Package, 
  Wallet, 
  FolderOpen, 
  Question,
  Truck,
  House,
  NotePencil,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  collapsed?: boolean;
}

const NavItem = ({ icon, label, href, isActive, badge, tourHighlight, collapsed }: NavItemProps) => {
  const { lightTap } = useHaptics();
  
  return (
    <Link
      href={href}
      onClick={() => lightTap()}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl transition-all duration-200",
        collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5",
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
      {!collapsed && (
        <>
          <span className={cn(
            "font-medium text-sm flex-1 truncate",
            tourHighlight && !isActive && "text-coke-red font-semibold"
          )}>{label}</span>
          {badge && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-coke-red text-white rounded-full">
              {badge}
            </span>
          )}
        </>
      )}
      {collapsed && badge && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold bg-coke-red text-white rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
};

export const DesktopSidebar = ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { mediumTap } = useHaptics();
  const { activeShipments } = useShipments();
  const { mode } = useShippingMode();
  const { highlightedHref } = useOnboardingTour();
  const [hovered, setHovered] = useState(false);

  // When collapsed, expand on hover
  const isExpanded = !collapsed || hovered;

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
    <aside
      className={cn(
        "desktop-sidebar fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-[72px]"
      )}
      onMouseEnter={() => { if (collapsed) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo + Collapse Toggle */}
      <div className={cn(
        "flex items-center pt-5 pb-3 border-b border-sidebar-border/30",
        isExpanded ? "px-4 justify-between" : "px-2 justify-center"
      )}>
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.svg" alt="CourierX" width={isExpanded ? 120 : 32} height={32} className="h-8 w-auto" />
        </Link>
        <button
          onClick={() => { mediumTap(); onToggle(); }}
          className={cn(
            "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
            !isExpanded && "hidden"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <CaretLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-2 space-y-4 overflow-y-auto scrollbar-thin",
        isExpanded ? "px-3" : "px-2"
      )}>
        {navGroups.map((group) => (
          <div key={group.label}>
            {isExpanded && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {group.label}
              </p>
            )}
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
                  collapsed={!isExpanded}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Expand button when collapsed and not hovered */}
      {collapsed && !hovered && (
        <div className="px-2 pb-4">
          <button
            onClick={() => { mediumTap(); onToggle(); }}
            className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Expand sidebar"
          >
            <CaretRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
