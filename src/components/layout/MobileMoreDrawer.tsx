"use client";

import { 
  User, 
  Package, 
  FolderOpen, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  FileEdit,
  Calculator,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptics } from '@/hooks/useHaptics';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MobileMoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DrawerItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  iconBg?: string;
  delay?: number;
}

const DrawerItem = ({ icon, label, description, href, onClick, destructive, iconBg = 'bg-muted', delay = 0 }: DrawerItemProps) => {
  const router = useRouter();
  const { lightTap } = useHaptics();

  const handleClick = () => {
    lightTap();
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all active:scale-[0.98]",
        destructive 
          ? 'text-destructive hover:bg-destructive/8 active:bg-destructive/12' 
          : 'hover:bg-muted/80 active:bg-muted'
      )}
    >
      <div className={cn(
        "p-2.5 rounded-xl shrink-0",
        destructive ? 'bg-destructive/10' : iconBg
      )}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium text-sm">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </motion.button>
  );
};

export const MobileMoreDrawer = ({ open, onOpenChange }: MobileMoreDrawerProps) => {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const { mediumTap } = useHaptics();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';

  const handleSignOut = async () => {
    mediumTap();
    await signOut();
    router.replace('/auth');
    onOpenChange(false);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh] rounded-t-[2rem] px-0">
        {/* Drag handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-muted-foreground/20 rounded-full" />

        <DrawerHeader className="border-b border-border/50 pb-4 px-5 pt-6">
          <div className="flex items-center justify-between">
            <DrawerTitle className="font-typewriter text-lg">Menu</DrawerTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </DrawerHeader>
        
        <div className="p-4 space-y-1 overflow-y-auto">
          {/* User Profile Card */}
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => handleNavigate('/profile')}
            className="w-full p-4 bg-gradient-to-r from-muted/80 to-muted/40 rounded-2xl mb-3 flex items-center gap-3 hover:from-muted hover:to-muted/60 transition-all active:scale-[0.98] border border-border/40"
          >
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-coke-red to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-coke-red/20 shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold truncate text-sm">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
          </motion.button>

          {/* Navigation Items */}
          <DrawerItem
            icon={<Package className="h-4 w-4 text-blue-600" />}
            label="Shipment History"
            description="View all past shipments"
            iconBg="bg-blue-500/10"
            onClick={() => handleNavigate('/history')}
            delay={0.04}
          />
          <DrawerItem
            icon={<FileEdit className="h-4 w-4 text-amber-600" />}
            label="Saved Drafts"
            description="Resume incomplete bookings"
            iconBg="bg-amber-500/10"
            onClick={() => handleNavigate('/drafts')}
            delay={0.08}
          />
          <DrawerItem
            icon={<FolderOpen className="h-4 w-4 text-purple-600" />}
            label="My Vault"
            description="Addresses & documents"
            iconBg="bg-purple-500/10"
            onClick={() => handleNavigate('/vault')}
            delay={0.12}
          />
          <DrawerItem
            icon={<Calculator className="h-4 w-4 text-green-600" />}
            label="Rate Calculator"
            description="Estimate shipping costs"
            iconBg="bg-green-500/10"
            onClick={() => handleNavigate('/rate-calculator')}
            delay={0.16}
          />
          <DrawerItem
            icon={<HelpCircle className="h-4 w-4 text-orange-600" />}
            label="Help & Support"
            description="FAQs & raise a ticket"
            iconBg="bg-orange-500/10"
            onClick={() => handleNavigate('/support')}
            delay={0.20}
          />
          
          {/* Divider */}
          <div className="border-t border-border/50 my-2" />
          
          {/* Sign Out */}
          <DrawerItem
            icon={<LogOut className="h-4 w-4" />}
            label="Sign Out"
            onClick={handleSignOut}
            destructive
            delay={0.24}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};
