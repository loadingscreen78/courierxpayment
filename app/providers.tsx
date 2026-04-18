"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { ShippingModeProvider } from "@/contexts/ShippingModeContext";
import { OnboardingTourProvider } from "@/contexts/OnboardingTourContext";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
        disableTransitionOnChange
        storageKey="courierx-theme"
      >
        <AuthProvider>
          <ShippingModeProvider>
          <WalletProvider>
            <OnboardingTourProvider>
            <TooltipProvider>
              {children}
              <Toaster />
              <Sonner />
            </TooltipProvider>
            </OnboardingTourProvider>
          </WalletProvider>
          </ShippingModeProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
