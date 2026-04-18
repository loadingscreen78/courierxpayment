"use client";

import { 
  Package, 
  Wallet, 
  FolderOpen, 
  Question,
  Truck,
  PaperPlaneTilt,
  SignOut,
  House,
  NotePencil,
  CaretRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useHaptics } from '@/hooks/useHaptics';
import logoSymbol from '@/assets/logo-symbol.jpeg';
import { useShipments } from '@/hooks/useShipments';
import { motion } from 'framer-motion';
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
          ? "bg-[#1A1A2E]/10 text-sidebar-foreground ring-1 ring-[#1A1A2E]/20"
          : isActive 
            ? "bg-sidebar-accent text-sidebar-foreground" 
            : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      {(isActive || tourHighlight) && (
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full",
          tourHighlight && !isActive ? "bg-[#1A1A2E]" : "bg-sidebar-primary"
        )} />
      )}
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 shrink-0",
        tourHighlight && !isActive
          ? "bg-[#1A1A2E]/15 text-[#1A1A2E]"
          : isActive 
            ? "bg-sidebar-primary/20 text-sidebar-primary" 
            : "group-hover:bg-sidebar-accent/80"
      )}>
        {icon}
      </div>
      <span className={cn(
        "font-medium text-sm flex-1 truncate",
        tourHighlight && !isActive && "text-[#1A1A2E] font-semibold"
      )}>{label}</span>
      {badge && (
        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-sidebar-primary text-white rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
};

// Bold mode card — clickable, no toggle widget
const SidebarModeCard = ({ isInternational, onClick, isSwitching }: { isInternational: boolean; onClick: () => void; isSwitching: boolean }) => (
  <motion.button
    onClick={onClick}
    disabled={isSwitching}
    whileTap={{ scale: 0.97 }}
    className={cn(
      "w-full rounded-2xl border p-3.5 transition-all duration-400 text-left group relative overflow-hidden",
      "disabled:opacity-60 disabled:cursor-not-allowed",
      isInternational
        ? "bg-[#F40000]/8 border-[#F40000]/25 hover:bg-[#F40000]/12 hover:border-[#F40000]/40"
        : "bg-sidebar-accent/60 border-sidebar-border/60 hover:bg-sidebar-accent hover:border-sidebar-border"
    )}
  >
    {/* Subtle glow for international */}
    {isInternational && (
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#F40000]/10 rounded-full blur-xl pointer-events-none" />
    )}

    <div className="flex items-center gap-3 relative z-10">
      {/* Icon */}
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-all duration-300",
        isInternational
          ? "bg-[#F40000]/15"
          : "bg-sidebar-foreground/8"
      )}>
        {isInternational ? (
          // Clean globe — international
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#F40000]">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M12 3c0 0-3.5 4-3.5 9s3.5 9 3.5 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M12 3c0 0 3.5 4 3.5 9s-3.5 9-3.5 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M3.5 12h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M5 7.5h14M5 16.5h14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
          </svg>
        ) : (
          // Clean map pin — domestic India
          <svg width="18" height="20" viewBox="0 0 20 24" fill="none" className="text-sidebar-foreground/65">
            <path d="M10 2C6.13 2 3 5.13 3 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            <circle cx="10" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
        )}
      </div>

      {/* Text + switch row */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              "text-[11px] font-bold uppercase tracking-widest truncate",
              isInternational ? "text-[#F40000]" : "text-sidebar-foreground/80"
            )}>
              {isInternational ? 'International' : 'Domestic'}
            </span>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              isInternational ? "bg-[#F40000] animate-pulse" : "bg-sidebar-foreground/30"
            )} />
          </div>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors shrink-0">
            Switch
          </span>
        </div>
        <p className="text-[10px] text-sidebar-foreground/40 mt-0.5 leading-tight">
          {isInternational ? '150+ countries' : 'Across India'}
        </p>
      </div>
    </div>
  </motion.button>
);

export const DesktopSidebar = () => {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { mediumTap, lightTap } = useHaptics();
  const { activeShipments } = useShipments();
  const { mode, toggleMode, isSwitching } = useShippingMode();
  const { highlightedHref } = useOnboardingTour();
  const isInternational = mode === 'international';

  const handleSignOut = async () => {
    mediumTap();
    await signOut();
    router.replace('/auth');
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

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
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border/60">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img 
              src={logoSymbol.src} 
              alt="CourierX" 
              className="h-9 w-9 rounded-xl object-contain ring-1 ring-sidebar-border"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-sidebar-background" />
          </div>
          <div>
            <h1 className="font-typewriter text-lg font-bold text-sidebar-foreground tracking-tight leading-none">
              CourierX
            </h1>
            <p className="text-[11px] text-sidebar-foreground/40 mt-0.5">Premium Logistics</p>
          </div>
        </div>
      </div>

      {/* New Shipment CTA */}
      <div className="px-4 py-3">
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

      {/* Shipping Mode Card */}
      <div className="px-4 pb-3">
        <SidebarModeCard
          isInternational={isInternational}
          onClick={toggleMode}
          isSwitching={isSwitching}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
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

      {/* User Profile Footer */}
      <div className="p-3 border-t border-sidebar-border/60">
        <Link
          href="/profile"
          onClick={() => lightTap()}
          className={cn(
            "group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 mb-1",
            pathname === '/profile' 
              ? "bg-sidebar-accent" 
              : "hover:bg-sidebar-accent/50"
          )}
        >
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-coke-red to-red-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate leading-none">
              {displayName}
            </p>
            {profile?.account_number && (
              <p className="text-[10px] font-mono text-sidebar-foreground/50 mt-0.5">
                {profile.account_number}
              </p>
            )}
          </div>
          <CaretRight className="h-3.5 w-3.5 text-sidebar-foreground/30 shrink-0" />
        </Link>
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 group"
        >
          <SignOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
