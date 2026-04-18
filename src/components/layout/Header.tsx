"use client";

import { Wallet, Calculator, Bell, SignOut, Warning, CaretDown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export const Header = () => {
  const { user, profile, signOut } = useAuth();
  const { balance } = useWallet();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || profile?.phone_number || '';
  const isLowBalance = balance <= 0;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
      <div className="flex items-center justify-end h-14 px-4 lg:px-6">
        {/* Right Actions - Rate Calculator, Wallet, Notifications, Profile */}
        <div className="flex items-center gap-1.5">
          {/* Rate Calculator */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 rounded-xl text-muted-foreground hover:text-foreground h-9"
            onClick={() => router.push('/rate-calculator')}
          >
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Calculate</span>
          </Button>

          {/* Wallet Balance */}
          <button
            onClick={() => router.push('/wallet')}
            className={cn(
              "group flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-200 border",
              isLowBalance 
                ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                : 'bg-muted/60 border-border/50 hover:bg-muted hover:border-border'
            )}
          >
            {isLowBalance ? (
            <Warning className="h-3.5 w-3.5 text-destructive shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-md bg-green-500/15 flex items-center justify-center shrink-0">
                <Wallet className="h-3 w-3 text-green-600" />
              </div>
            )}
            <div className="flex flex-col items-start leading-none">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Balance</span>
              <span className={cn(
                "font-typewriter text-sm font-bold mt-0.5",
                isLowBalance ? 'text-destructive' : 'text-foreground'
              )}>
                ₹{balance.toLocaleString('en-IN')}
              </span>
            </div>
            {isLowBalance && (
              <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse shrink-0" />
            )}
          </button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/80 relative h-9 w-9">
            <Bell className="h-4 w-4" weight="bold" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-coke-red rounded-full border-2 border-background" />
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-xl hover:bg-muted/80 gap-2 h-9 px-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-coke-red to-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium max-w-[80px] truncate">{displayName.split(' ')[0]}</span>
                <CaretDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-border/60">
              <DropdownMenuLabel className="font-normal p-3 bg-muted/50 rounded-xl mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-coke-red to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-semibold leading-none truncate">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground mt-1 truncate">{displayEmail}</p>
                    {profile?.account_number && (
                      <p className="text-[10px] font-mono text-coke-red mt-1">{profile.account_number}</p>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuItem onClick={() => router.push('/profile')} className="rounded-lg text-sm">
                Profile & Settings
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-1" />
              
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg text-sm">
                <SignOut className="mr-2 h-3.5 w-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
