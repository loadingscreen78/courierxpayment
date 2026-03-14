"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  ScanLine, 
  ClipboardCheck, 
  Truck, 
  Package,
  LogOut,
  ShieldCheck,
  Briefcase,
  ChevronRight,
  Zap,
  Tag,
  FileBarChart2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard, end: true },
  { title: 'Inbound Station', href: '/admin/inbound', icon: ScanLine },
  { title: 'AWB Labels', href: '/admin/awb-labels', icon: FileBarChart2 },
  { title: 'QC Workbench', href: '/admin/qc', icon: ClipboardCheck },
  { title: 'Outbound', href: '/admin/outbound', icon: Truck },
  { title: 'All Shipments', href: '/admin/shipments', icon: Package },
  { title: 'CXBC Partners', href: '/admin/cxbc-partners', icon: Briefcase, adminOnly: true },
  { title: 'Coupons', href: '/admin/coupons', icon: Tag, adminOnly: true },
  { title: 'Role Management', href: '/admin/roles', icon: ShieldCheck, adminOnly: true },
];

interface AdminSidebarProps {
  isMobile?: boolean;
  onNavigate?: () => void;
}

export const AdminSidebar = ({ isMobile = false, onNavigate }: AdminSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdminAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  const displayName = user?.email?.split('@')[0] || 'Admin';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-900/30 shrink-0">
            <Package className="text-white h-4 w-4" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-white font-typewriter font-bold text-lg leading-none">Courier</span>
              <span className="text-red-500 font-typewriter font-bold text-sm italic">X</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">Warehouse OS</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Operations</p>
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item, i) => {
            const isActive = item.end 
              ? pathname === item.href
              : pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'text-white bg-white/8'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-red-500 rounded-r-full" />
                )}
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  isActive ? "bg-red-500/20 text-red-400" : "text-gray-500"
                )}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="flex-1">{item.title}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-red-500/60 shrink-0" />}
              </Link>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 space-y-1">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 mb-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{displayName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Zap className="h-2.5 w-2.5 text-red-400" />
              <span className="text-[10px] text-gray-500">{isAdmin ? 'Super Admin' : 'Staff'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all duration-200"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
            <LogOut className="h-4 w-4" />
          </div>
          Sign Out
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="h-full bg-[#0f0f12] text-white">
        {sidebarContent}
      </div>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0f0f12] text-white border-r border-white/5 z-40">
      {sidebarContent}
    </aside>
  );
};
