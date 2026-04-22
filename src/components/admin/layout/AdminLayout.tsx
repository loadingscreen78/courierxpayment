"use client";

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Menu, 
  LogOut, 
  ChevronDown,
  Package
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { profile, signOut } = useAuth();
  const { isAdmin, isWarehouseOperator } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const getRoleBadge = () => {
    if (isAdmin) return { label: 'Admin', dotColor: 'bg-red-500', pillClass: 'bg-red-500/10 text-red-500 border-red-500/20' };
    if (isWarehouseOperator) return { label: 'Operator', dotColor: 'bg-blue-500', pillClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    return { label: 'Staff', dotColor: 'bg-gray-500', pillClass: 'bg-white/10 text-gray-400 border-white/10' };
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="admin-dark min-h-screen bg-[#0f0f12] text-white font-sans selection:bg-red-500/30">
      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-h-screen ml-60">
          {/* Glass Header */}
          <header className="h-16 bg-[#0f0f12]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold tracking-tight">
                <span className="text-red-500">CourierX</span>
                <span className="text-white ml-1">Admin</span>
              </h2>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Status Pills */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-3 py-1.5 rounded-full border border-green-500/20 text-xs font-bold">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Online
                </div>
                <div className={`flex items-center gap-2 ${roleBadge.pillClass} px-3 py-1.5 rounded-full border text-xs font-bold`}>
                  <div className={`w-2 h-2 rounded-full ${roleBadge.dotColor}`} />
                  {roleBadge.label}
                </div>
              </div>

              <div className="h-8 w-[1px] bg-white/10" />

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer group">
                    <div className="text-right">
                      <p className="text-sm font-bold group-hover:text-red-500 transition-colors">
                        {profile?.full_name || profile?.email || 'Admin'}
                      </p>
                      <p className="text-xs text-gray-500">{roleBadge.label}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border-2 border-white/10 group-hover:border-red-500 transition-all">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#16161a] border-white/10 text-white">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{profile?.full_name || 'Admin User'}</span>
                      <span className="text-xs text-gray-500 font-normal">{profile?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:text-red-400 focus:bg-red-500/10">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        <header className="h-16 bg-[#0f0f12]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 text-gray-400 hover:text-white hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-[#16161a] border-white/5" aria-describedby={undefined}>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <AdminSidebar isMobile onNavigate={() => setMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-2">
              <div className="bg-red-600 p-1 rounded-lg">
                <Package className="text-white" size={18} />
              </div>
              <span className="font-black text-sm tracking-tight">
                <span className="text-white">Courier</span>
                <span className="text-red-500 text-xs align-top italic ml-0.5">X</span>
              </span>
              <div className={`flex items-center gap-1.5 ${roleBadge.pillClass} px-2 py-1 rounded-full border text-[10px] font-bold ml-1`}>
                <div className={`w-1.5 h-1.5 rounded-full ${roleBadge.dotColor}`} />
                {roleBadge.label}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#16161a] border-white/10 text-white">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium text-white">{profile?.full_name || 'Admin User'}</span>
                  <span className="text-xs text-gray-500 font-normal">{profile?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:text-red-400 focus:bg-red-500/10">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        
        <main className="flex-1 p-4 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
